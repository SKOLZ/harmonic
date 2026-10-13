/**
 * Browser-only Web Audio synth: one triangle oscillator per voice with a
 * short attack/release gain envelope (a raw start/stop clicks at note
 * boundaries). No Solid, no VexFlow, no theory logic — frequencies arrive
 * ready-made from ./frequency and ./sequence.
 *
 * Deliberate test-first exception: happy-dom implements no Web Audio API,
 * and mocking AudioContext would test the mock rather than the browser, so
 * this file is verified by typecheck/build and manual playback only.
 */

import type { ScaleType } from "../theory";
import { intervalFrequencies, scaleFrequencies } from "./sequence";

/** Default per-note length for playScale/playInterval, in seconds. */
export const DEFAULT_NOTE_DURATION_SEC = 0.5;

/** Default peak gain of one voice's envelope, 0..1. */
export const DEFAULT_GAIN = 0.2;

/** Envelope attack: linear ramp from silence to peak, in seconds. */
const ATTACK_SEC = 0.01;

/** Envelope release: linear ramp from peak back to silence, in seconds. */
const RELEASE_SEC = 0.05;

/** Gap between the release ramp ending and oscillator.stop(), in seconds. */
const STOP_MARGIN_SEC = 0.001;

/** Slack so setTimeout jitter does not resolve a note before its release ends. */
const TIMER_SLACK_SEC = 0.02;

/** Timbre: triangle carries a clear fundamental plus soft harmonics. */
const WAVEFORM: OscillatorType = "triangle";

/** Options accepted by every play function. */
export interface PlayOptions {
  /** Custom A4 reference in Hz, forwarded to the theory adapters. */
  a4Hz?: number;
  /** Peak gain of each voice's envelope, 0..1. Default {@link DEFAULT_GAIN}. */
  gain?: number;
  /** Per-note length in seconds. Default {@link DEFAULT_NOTE_DURATION_SEC}. */
  durationSec?: number;
}

/** Options for functions that take absolute frequencies. */
export interface NotePlayOptions {
  /**
   * Accepted for call-site uniformity with the theory-driven functions;
   * playNote/playChord already receive absolute frequencies, so this has
   * no effect there.
   */
  a4Hz?: number;
  /** Peak gain of each voice's envelope, 0..1. Default {@link DEFAULT_GAIN}. */
  gain?: number;
}

/** Options for {@link playInterval}. */
export interface PlayIntervalOptions extends PlayOptions {
  /** Also sound both notes together after playing them separately. */
  playTogether?: boolean;
}

interface ScheduledVoice {
  source: AudioScheduledSourceNode;
  envelope: GainNode;
}

/** Shared context, created on first use — never at module import time. */
let sharedContext: AudioContext | null = null;

/** Voices scheduled but not yet finished; cancelled by {@link stopAll}. */
const scheduledVoices = new Set<ScheduledVoice>();

/**
 * Returns the shared AudioContext, creating it on first call. Browsers keep
 * a fresh context `'suspended'` until a user gesture, so a suspended
 * context is resumed here; because every public play function calls this
 * first, a play triggered from a click handler creates and resumes the
 * context inside that gesture.
 */
export function ensureAudioContext(): AudioContext {
  if (sharedContext === null) {
    if (typeof AudioContext === "undefined") {
      throw new Error("Web Audio API is unavailable: AudioContext is not defined");
    }
    sharedContext = new AudioContext();
  }
  if (sharedContext.state === "suspended") {
    void sharedContext.resume();
  }
  return sharedContext;
}

function waitSeconds(seconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, seconds * 1000);
  });
}

/** Resolves after the note's body plus its release ramp and timer slack. */
function settledAfter(durationSec: number): Promise<void> {
  return waitSeconds(Math.max(durationSec, 0) + RELEASE_SEC + TIMER_SLACK_SEC);
}

/**
 * Schedules one tone on `ctx`: a single oscillator shaped by a gain
 * envelope with a 10 ms attack and a 50 ms release. `startAt` is an
 * AudioContext time, so several voices can share an exact onset.
 */
export function playTone(
  ctx: AudioContext,
  frequency: number,
  startAt: number,
  durationSec: number,
  gain: number = DEFAULT_GAIN,
): void {
  const oscillator = ctx.createOscillator();
  const envelope = ctx.createGain();
  oscillator.type = WAVEFORM;
  oscillator.frequency.value = frequency;

  const peak = Math.max(gain, 0);
  const releaseStart = startAt + Math.max(durationSec, ATTACK_SEC);
  const releaseEnd = releaseStart + RELEASE_SEC;
  envelope.gain.setValueAtTime(0, startAt);
  envelope.gain.linearRampToValueAtTime(peak, startAt + ATTACK_SEC);
  envelope.gain.setValueAtTime(peak, releaseStart);
  envelope.gain.linearRampToValueAtTime(0, releaseEnd);

  oscillator.connect(envelope);
  envelope.connect(ctx.destination);

  const voice: ScheduledVoice = { source: oscillator, envelope };
  scheduledVoices.add(voice);
  oscillator.onended = () => {
    oscillator.disconnect();
    envelope.disconnect();
    scheduledVoices.delete(voice);
  };
  oscillator.start(startAt);
  oscillator.stop(releaseEnd + STOP_MARGIN_SEC);
}

/** Plays one absolute frequency; resolves once its release finishes. */
export async function playNote(
  frequency: number,
  durationSec: number,
  opts: NotePlayOptions = {},
): Promise<void> {
  const ctx = ensureAudioContext();
  playTone(ctx, frequency, ctx.currentTime, durationSec, opts.gain ?? DEFAULT_GAIN);
  await settledAfter(durationSec);
}

/**
 * Plays all frequencies with the same onset (a chord). Per-voice gain is
 * divided by √n so wide chords stay below clipping.
 */
export async function playChord(
  frequencies: number[],
  durationSec: number,
  opts: NotePlayOptions = {},
): Promise<void> {
  const ctx = ensureAudioContext();
  const voiceGain = (opts.gain ?? DEFAULT_GAIN) / Math.sqrt(Math.max(frequencies.length, 1));
  const startAt = ctx.currentTime;
  for (const frequency of frequencies) {
    playTone(ctx, frequency, startAt, durationSec, voiceGain);
  }
  await settledAfter(durationSec);
}

/** Plays the scale's seven degrees in sequence with equal durations. */
export async function playScale(
  root: string,
  scaleType: ScaleType,
  opts: PlayOptions = {},
): Promise<void> {
  ensureAudioContext();
  const durationSec = opts.durationSec ?? DEFAULT_NOTE_DURATION_SEC;
  const frequencies = scaleFrequencies(root, scaleType, opts.a4Hz);
  for (const frequency of frequencies) {
    await playNote(frequency, durationSec, opts);
  }
}

/**
 * Plays the interval's two notes one after the other, then — when
 * `opts.playTogether` is set — both as a chord.
 */
export async function playInterval(
  root: string,
  genericNumber: number,
  specificQuality: string,
  opts: PlayIntervalOptions = {},
): Promise<void> {
  ensureAudioContext();
  const durationSec = opts.durationSec ?? DEFAULT_NOTE_DURATION_SEC;
  const [lower, upper] = intervalFrequencies(root, genericNumber, specificQuality, opts.a4Hz);
  await playNote(lower, durationSec, opts);
  await playNote(upper, durationSec, opts);
  if (opts.playTogether === true) {
    await playChord([lower, upper], durationSec, opts);
  }
}

/** Immediately stops every scheduled voice; the context stays open. */
export function stopAll(): void {
  for (const voice of scheduledVoices) {
    try {
      voice.source.stop();
    } catch {
      // Already stopped or never started; still tear the node down.
    }
    voice.source.disconnect();
    voice.envelope.disconnect();
  }
  scheduledVoices.clear();
}

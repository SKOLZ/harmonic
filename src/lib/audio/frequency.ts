/**
 * Note-to-frequency conversion in 12-tone equal temperament.
 * Pure math plus the theory layer's note parser — no DOM, no audio.
 */

import { midiNumber, parseNote } from "../theory";

/** Reference pitch for MIDI 69 (A4) in equal temperament. */
export const DEFAULT_A4_HZ = 440;

/**
 * Frequency of a MIDI note number in equal temperament:
 * `a4Hz * 2 ** ((midi - 69) / 12)`. MIDI 69 → 440 Hz by default.
 */
export function noteToFrequency(midi: number, a4Hz: number = DEFAULT_A4_HZ): number {
  return a4Hz * 2 ** ((midi - 69) / 12);
}

/**
 * Frequency of a scientific note name such as `A4`, `F#4` or `Bb3`.
 * Throws on an invalid name, or when the name omits the octave — a
 * frequency needs an absolute pitch, not a pitch class.
 */
export function noteNameToFrequency(name: string, a4Hz: number = DEFAULT_A4_HZ): number {
  const note = parseNote(name);
  if (note.octave === undefined) {
    throw new Error(
      `Note "${name}" has no octave; frequency needs an absolute pitch (e.g. "${name}4")`,
    );
  }
  return noteToFrequency(midiNumber(note), a4Hz);
}

/** Frequencies for a list of scientific note names, in order. */
export function frequenciesForNotes(names: string[], a4Hz: number = DEFAULT_A4_HZ): number[] {
  return names.map((name) => noteNameToFrequency(name, a4Hz));
}

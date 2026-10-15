import type { PromptSpec } from "../../lib/rounds/types";
import { chordFrequencies } from "../../lib/audio/sequence";
import {
  DEFAULT_NOTE_DURATION_SEC,
  playChord,
  playInterval,
  playNote,
  playScale,
} from "../../lib/audio/synth";
import {
  buildScale,
  genericIntervalNumber,
  halfSteps,
  notesAreEnharmonic,
  parseNote,
  semitoneIndex,
  specificQuality,
  type IntervalQuality,
  type Note,
  type ScaleType,
} from "../../lib/theory";

export interface AudioPromptProps {
  prompt: PromptSpec;
}

/** Every scale the prompt layer can name; order only affects detection ties. */
const SCALE_TYPES: readonly ScaleType[] = [
  "major",
  "naturalMinor",
  "harmonicMinor",
  "melodicMinor",
];

/**
 * Whichever known scale sounds exactly these pitches, starting on the first
 * note as root. Compared per degree with `notesAreEnharmonic`, so the match
 * is by pitch (spelling- and octave-tolerant) rather than by string equality.
 */
function detectScaleType(names: string[]): ScaleType {
  const given = names.map((name) => parseNote(name));
  // A scale written with its closing octave repeat still describes the same
  // seven degrees; playScale sounds those seven either way.
  if (given.length === 8 && notesAreEnharmonic(given[0], given[7])) {
    given.pop();
  }
  const root = given[0];
  for (const type of SCALE_TYPES) {
    let built: Note[];
    try {
      built = buildScale(root, type);
    } catch {
      // This root cannot spell that scale type (accidental overflow) — that
      // makes it not a match, not an error worth aborting detection for.
      continue;
    }
    if (
      built.length === given.length &&
      built.every((note, index) => notesAreEnharmonic(note, given[index]))
    ) {
      return type;
    }
  }
  throw new Error(
    `AudioPrompt: play "scale" notes ${names.join(" ")} do not spell a known scale`,
  );
}

interface IntervalCall {
  root: string;
  number: number;
  quality: IntervalQuality;
}

/**
 * The two notes as the synth's `playInterval(root, number, quality)`
 * arguments. The root is the lower pitch and the interval is derived through
 * the theory layer (`genericIntervalNumber` + `halfSteps` + `specificQuality`);
 * `playInterval` then re-spells the upper note from exactly those arguments.
 */
function intervalCall(names: string[]): IntervalCall {
  if (names.length !== 2) {
    throw new Error(
      `AudioPrompt: play "interval" needs exactly two notes, got ${names.length}`,
    );
  }
  const [first, second] = names.map((name) => parseNote(name));
  // The synth always sounds root-then-upper, so a pair listed high-to-low is
  // reordered: the same two pitches, low note first, instead of an ascending
  // reconstruction from the wrong root.
  const descending =
    first.octave !== undefined &&
    second.octave !== undefined &&
    semitoneIndex(second) < semitoneIndex(first);
  const root = descending ? names[1] : names[0];
  const lower = descending ? second : first;
  const upper = descending ? first : second;
  const number = genericIntervalNumber(lower, upper);
  const quality = specificQuality(number, halfSteps(lower, upper));
  if (quality === null) {
    throw new Error(
      `AudioPrompt: ${names.join(" ")} does not spell a playable interval`,
    );
  }
  return { root, number, quality };
}

/**
 * Renders a `kind: "audio"` PromptSpec.
 *
 * Browsers refuse to start audio outside a user gesture, so the synth is
 * reachable only from the Play button's click handler — never during render
 * and never from an effect. The `play` verb dispatches to the matching synth
 * function; the kind check is defensive so a registry mistake fails loud
 * with the actual kind instead of rendering silently empty.
 */
export default function AudioPrompt(props: AudioPromptProps) {
  const spec = () => {
    const prompt = props.prompt;
    if (prompt.kind !== "audio") {
      throw new Error(
        `AudioPrompt: expected prompt kind "audio", got "${prompt.kind}"`,
      );
    }
    return prompt;
  };

  function play(): void {
    const { play: verb, notes } = spec();
    if (notes.length === 0) {
      throw new Error("AudioPrompt: prompt has no notes to play");
    }
    switch (verb) {
      case "note": {
        if (notes.length !== 1) {
          throw new Error(
            `AudioPrompt: play "note" needs exactly one note, got ${notes.length}`,
          );
        }
        const [frequency] = chordFrequencies(notes);
        void playNote(frequency, DEFAULT_NOTE_DURATION_SEC);
        return;
      }
      case "chord":
        void playChord(chordFrequencies(notes), DEFAULT_NOTE_DURATION_SEC);
        return;
      case "scale":
        void playScale(notes[0], detectScaleType(notes));
        return;
      case "interval": {
        const { root, number, quality } = intervalCall(notes);
        void playInterval(root, number, quality);
        return;
      }
    }
  }

  return (
    <div class="prompt--audio">
      <button
        type="button"
        class="prompt--audio-play"
        aria-label={`Play ${spec().play}`}
        onClick={play}
      >
        Play
      </button>
    </div>
  );
}

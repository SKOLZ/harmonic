/**
 * Pure mapping from theory-domain values to VexFlow notation descriptions.
 * No VexFlow import here: the shape of what will be drawn is a plain
 * serialisable object, assertable without a DOM.
 */

import type { Note } from "../theory";

export type Clef = "treble" | "bass";

export interface NotationSpec {
  clef: Clef;
  /** VexFlow key-signature name such as `Eb` or `F#`; null when omitted. */
  keySignature: string | null;
  /** VexFlow key strings such as `c/4`, one per note. */
  keys: string[];
  /** Accidental code per note: `#`, `b`, `##`, `bb`, or null for naturals. */
  accidentals: (string | null)[];
  /** VexFlow duration code, e.g. `q`. */
  duration: string;
}

export interface NotationSpecInput {
  notes: readonly Note[];
  clef?: Clef;
  keySignature?: Note;
  duration?: string;
}

export const DEFAULT_CLEF: Clef = "treble";
export const DEFAULT_DURATION = "q";

const ACCIDENTAL_CODES: Readonly<Record<number, string>> = {
  [-2]: "bb",
  [-1]: "b",
  1: "#",
  2: "##",
};

/**
 * VexFlow key string for a note: lowercase letter, accidentals, `/octave`.
 * Naturals carry no accidental character (`c/4`, not `nc/4`). An octave is
 * required because VexFlow places notes on the staff by note/octave.
 */
export function noteToVexKey(note: Note): string {
  if (note.octave === undefined) {
    throw new Error(`noteToVexKey requires an octave: ${note.letter}`);
  }
  return `${note.letter.toLowerCase()}${accidentalCode(note) ?? ""}/${note.octave}`;
}

/**
 * Accidental code handed to VexFlow's `Accidental`: `#`, `b`, `##`, `bb`,
 * or null for naturals (never the `n` code).
 */
export function noteToAccidental(note: Note): string | null {
  return accidentalCode(note);
}

export function toVexKeys(notes: readonly Note[]): string[] {
  return notes.map(noteToVexKey);
}

/** Key-signature name for `Stave.addKeySignature`, e.g. `Eb`, `F#`, `C`. */
export function keySignatureToVexName(key: Note): string {
  const accidental = accidentalCode(key);
  return accidental === null ? key.letter : key.letter + accidental;
}

/**
 * Voice time whose total tick count matches `noteCount` notes of `duration`,
 * so a STRICT voice fills exactly. Dotted durations scale into whole beats
 * (a dotted quarter over 2 notes is 6 eighth-beats).
 */
export function durationToVoiceTime(
  duration: string,
  noteCount: number,
): { numBeats: number; beatValue: number } {
  if (!Number.isInteger(noteCount) || noteCount < 0) {
    throw new Error(`noteCount must be a non-negative integer, got ${noteCount}`);
  }
  const { beatValue, dots } = parseDuration(duration);
  // Each dot doubles the beat resolution and adds one extra beat per note.
  const dotNumerator = 2 ** (dots + 1) - 1;
  const dotDenominator = 2 ** dots;
  return {
    numBeats: noteCount * dotNumerator,
    beatValue: beatValue * dotDenominator,
  };
}

/** Plain description of the notation the Staff component will draw. */
export function buildNotationSpec(input: NotationSpecInput): NotationSpec {
  if (input.notes.length === 0) {
    throw new Error("buildNotationSpec requires at least one note");
  }
  const clef = input.clef ?? DEFAULT_CLEF;
  if (clef !== "treble" && clef !== "bass") {
    throw new Error(`Unsupported clef: ${String(clef)}`);
  }
  const duration = input.duration ?? DEFAULT_DURATION;
  parseDuration(duration); // validate eagerly with a clear error
  return {
    clef,
    keySignature: input.keySignature === undefined ? null : keySignatureToVexName(input.keySignature),
    keys: toVexKeys(input.notes),
    accidentals: input.notes.map(noteToAccidental),
    duration,
  };
}

function accidentalCode(note: Note): string | null {
  if (note.accidental === 0) {
    return null;
  }
  const code = ACCIDENTAL_CODES[note.accidental];
  if (code === undefined) {
    throw new Error(
      `Accidental out of range: ${note.accidental} (expected -2..2)`,
    );
  }
  return code;
}

const BEAT_VALUES: Readonly<Record<string, number>> = {
  w: 1,
  h: 2,
  q: 4,
  8: 8,
  16: 16,
  32: 32,
  64: 64,
};

function parseDuration(duration: string): { beatValue: number; dots: number } {
  const match = /^(w|h|q|8|16|32|64)(d*)(r?)$/.exec(duration);
  if (match === null) {
    throw new Error(`Unsupported duration: "${duration}"`);
  }
  return { beatValue: BEAT_VALUES[match[1]], dots: match[2].length };
}

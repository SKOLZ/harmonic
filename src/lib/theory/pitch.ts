/**
 * Pitch spelling primitives. Pure data and pure functions — no DOM, no audio.
 *
 * Accidental is an integer semitone alteration: -2 double flat, -1 flat,
 * 0 natural, +1 sharp, +2 double sharp. Anything outside that range is
 * rejected by the parser and unreachable by the spelling helpers.
 */

export type Letter = "C" | "D" | "E" | "F" | "G" | "A" | "B";

/** Integer semitone alteration from -2 (double flat) to +2 (double sharp). */
export type Accidental = number;

export interface Note {
  letter: Letter;
  accidental: Accidental;
  /** Required for MIDI/audio consumers; omitted for abstract pitch spelling. */
  octave?: number;
}

export const MIN_ACCIDENTAL = -2;
export const MAX_ACCIDENTAL = 2;

const LETTERS: readonly Letter[] = ["C", "D", "E", "F", "G", "A", "B"];

const LETTER_PITCH: Readonly<Record<Letter, number>> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

const NOTE_PATTERN = /^([A-G])(#{1,2}|b{1,2})?(-?\d+)?$/;

/** Parses ASCII scientific notation such as `C#4`, `Bbb`, `F##`, `E`. */
export function parseNote(input: string): Note {
  const match = NOTE_PATTERN.exec(input);
  if (match === null) {
    throw new Error(`Invalid note: "${input}"`);
  }
  const letter = match[1] as Letter;
  const accidentalText = match[2] ?? "";
  const accidental =
    accidentalText === ""
      ? 0
      : accidentalText.startsWith("#")
        ? accidentalText.length
        : -accidentalText.length;
  const octaveText = match[3];
  if (octaveText === undefined) {
    return { letter, accidental };
  }
  return { letter, accidental, octave: Number(octaveText) };
}

function assertAccidental(note: Note): void {
  if (
    !Number.isInteger(note.accidental) ||
    note.accidental < MIN_ACCIDENTAL ||
    note.accidental > MAX_ACCIDENTAL
  ) {
    throw new Error(
      `Accidental out of range: ${note.accidental} (expected ${MIN_ACCIDENTAL}..${MAX_ACCIDENTAL})`,
    );
  }
}

const UNICODE_ACCIDENTAL: Readonly<Record<number, string>> = {
  [-2]: "\u{1D12B}", // 𝄫 double flat
  [-1]: "\u266D", // ♭ flat
  0: "",
  1: "\u266F", // ♯ sharp
  2: "\u{1D12A}", // 𝄪 double sharp
};

/** Display form with unicode accidentals, e.g. `C♯`, `B𝄫`. No octave. */
export function displayName(note: Note): string {
  assertAccidental(note);
  return note.letter + UNICODE_ACCIDENTAL[note.accidental];
}

/** Alias of {@link displayName}: the display string for a note. */
export function formatNote(note: Note): string {
  return displayName(note);
}

/** ASCII scientific form used for comparisons and parsing, e.g. `C#4`, `Bbb`. */
export function scientificName(note: Note): string {
  assertAccidental(note);
  const accidental =
    note.accidental === 0
      ? ""
      : note.accidental > 0
        ? "#".repeat(note.accidental)
        : "b".repeat(-note.accidental);
  return note.letter + accidental + (note.octave === undefined ? "" : String(note.octave));
}

/** Index of a letter in the C..B cycle: C = 0, D = 1, … B = 6. */
export function letterIndex(letter: Letter): number {
  return LETTERS.indexOf(letter);
}

/** Letter at a cyclic index; wraps modulo 7. */
export function letterAt(index: number): Letter {
  return LETTERS[((index % 7) + 7) % 7];
}

/** Natural semitone of a letter within its octave: C = 0 … B = 11. */
export function letterPitch(letter: Letter): number {
  return LETTER_PITCH[letter];
}

/** Pitch class 0..11 (C = 0), ignoring octave. */
export function pitchClass(note: Note): number {
  assertAccidental(note);
  return (((LETTER_PITCH[note.letter] + note.accidental) % 12) + 12) % 12;
}

/**
 * Absolute chromatic position with C = 0, octave-adjusted when present
 * (C4 → 48). Accidentals are applied before the octave is added so that
 * Cb4 = 47, not 59. Without an octave this is the pitch class.
 */
export function semitoneIndex(note: Note): number {
  assertAccidental(note);
  const absolute = LETTER_PITCH[note.letter] + note.accidental;
  return note.octave === undefined
    ? (((absolute % 12) + 12) % 12)
    : note.octave * 12 + absolute;
}

/** MIDI number with C4 = 60. Requires an octave on the note. */
export function midiNumber(note: Note): number {
  if (note.octave === undefined) {
    throw new Error(`midiNumber requires an octave: ${scientificName(note)}`);
  }
  return semitoneIndex(note) + 12;
}

/**
 * Finds the accidental (within ±2) that puts `letter` on `pitchClassTarget`.
 * Returns null when no such accidental exists.
 */
export function accidentalForPitchClass(letter: Letter, pitchClassTarget: number): number | null {
  const natural = LETTER_PITCH[letter];
  const wanted = ((pitchClassTarget % 12) + 12) % 12;
  for (let accidental = MIN_ACCIDENTAL; accidental <= MAX_ACCIDENTAL; accidental++) {
    if ((((natural + accidental) % 12) + 12) % 12 === wanted) {
      return accidental;
    }
  }
  return null;
}

/**
 * The note on `letter` whose pitch is closest to `semitoneTarget`
 * (in {@link semitoneIndex} units), choosing the octave that gets closest.
 * The result may miss the target by up to a few semitones when the letter
 * cannot spell that pitch within double accidentals; callers that need an
 * exact hit must verify.
 */
export function noteFromLetterAndAlteration(
  letter: Letter,
  octave: number,
  semitoneTarget: number,
): Note {
  const natural = LETTER_PITCH[letter];
  let best: { accidental: number; octave: number; distance: number } | null = null;
  for (let accidental = MIN_ACCIDENTAL; accidental <= MAX_ACCIDENTAL; accidental++) {
    const candidateOctave = Math.round((semitoneTarget - natural - accidental) / 12);
    const pitch = candidateOctave * 12 + natural + accidental;
    const distance = Math.abs(semitoneTarget - pitch);
    const closer =
      best === null ||
      distance < best.distance ||
      // Ties (unreachable targets only): prefer the octave nearest the hint.
      (distance === best.distance && Math.abs(candidateOctave - octave) < Math.abs(best.octave - octave));
    if (closer) {
      best = { accidental, octave: candidateOctave, distance };
    }
  }
  if (best === null) {
    throw new Error("unreachable: the accidental loop always yields a candidate");
  }
  return { letter, accidental: best.accidental, octave: best.octave };
}

/**
 * Same pitch spelled on a requested letter, e.g. C# → Db on D, B# → C on C.
 * Throws when the letter cannot reach the pitch within double accidentals.
 */
export function enharmonicEquivalent(note: Note, letter: Letter): Note {
  const spelled = noteFromLetterAndAlteration(letter, note.octave ?? 0, semitoneIndex(note));
  if (semitoneIndex(spelled) !== semitoneIndex(note)) {
    throw new Error(
      `No enharmonic equivalent of ${scientificName(note)} on letter ${letter} within double accidentals`,
    );
  }
  if (note.octave === undefined) {
    return { letter: spelled.letter, accidental: spelled.accidental };
  }
  return spelled;
}

/** True when two notes sound the same pitch. */
export function notesAreEnharmonic(a: Note, b: Note): boolean {
  if (a.octave !== undefined && b.octave !== undefined) {
    return semitoneIndex(a) === semitoneIndex(b);
  }
  return pitchClass(a) === pitchClass(b);
}

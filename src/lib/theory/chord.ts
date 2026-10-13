/**
 * Chord construction, detection, and inversion. Pure functions over {@link Note}.
 *
 * Chords are built by letter, never by chromatic shortcut: each chord tone
 * takes the next-but-one letter from the root, and the accidental is chosen
 * to land on the required half-step count (within double sharp/flat).
 */

import { halfSteps } from "./interval";
import {
  accidentalForPitchClass,
  letterAt,
  letterIndex,
  noteFromLetterAndAlteration,
  semitoneIndex,
  type Letter,
  type Note,
} from "./pitch";

export type TriadQuality = "major" | "minor" | "diminished" | "augmented";

export type SeventhQuality =
  | "majorSeventh"
  | "minorSeventh"
  | "dominantSeventh"
  | "halfDiminishedSeventh"
  | "fullyDiminishedSeventh"
  | "minorMajorSeventh"
  | "augmentedMajorSeventh"
  | "augmentedSeventh";

/** Ascending half-step offsets from the root to the third and fifth. */
export const TRIAD_INTERVALS: Readonly<Record<TriadQuality, readonly [number, number]>> = {
  major: [4, 7],
  minor: [3, 7],
  diminished: [3, 6],
  augmented: [4, 8],
};

/** Ascending half-step offsets from the root to the third, fifth and seventh. */
export const SEVENTH_INTERVALS: Readonly<Record<SeventhQuality, readonly [number, number, number]>> =
  {
    majorSeventh: [4, 7, 11],
    minorSeventh: [3, 7, 10],
    dominantSeventh: [4, 7, 10],
    halfDiminishedSeventh: [3, 6, 10],
    fullyDiminishedSeventh: [3, 6, 9],
    minorMajorSeventh: [3, 7, 11],
    augmentedMajorSeventh: [4, 8, 11],
    augmentedSeventh: [4, 8, 10],
  };

/**
 * Builds the chord by stacking letters a third apart from `root`, then
 * picking each accidental to hit the quality's half-step offsets.
 * Throws when a tone would need an accidental beyond double sharp/flat.
 */
function buildByOffsets(root: Note, offsets: readonly number[]): Note[] {
  const start = semitoneIndex(root);
  const chord: Note[] = [{ letter: root.letter, accidental: root.accidental, ...(root.octave === undefined ? {} : { octave: root.octave }) }];
  for (let index = 0; index < offsets.length; index++) {
    const letter = letterAt(letterIndex(root.letter) + 2 * (index + 1));
    const target = start + offsets[index];
    if (root.octave === undefined) {
      const accidental = accidentalForPitchClass(letter, target);
      if (accidental === null) {
        throw unspellable(root, letter);
      }
      chord.push({ letter, accidental });
    } else {
      const note = noteFromLetterAndAlteration(letter, root.octave, target);
      if (semitoneIndex(note) !== target) {
        throw unspellable(root, letter);
      }
      chord.push(note);
    }
  }
  return chord;
}

function unspellable(root: Note, letter: Letter): Error {
  return new Error(
    `Cannot spell chord tone on letter ${letter} from root ${letter}${describe(root.accidental)}: needs an accidental beyond double sharp/flat`,
  );
}

function describe(accidental: number): string {
  if (accidental === 0) return "";
  return accidental > 0 ? "#".repeat(accidental) : "b".repeat(-accidental);
}

/** Root-position triad of the given quality, spelled by letter. */
export function buildTriad(root: Note, quality: TriadQuality): Note[] {
  return buildByOffsets(root, TRIAD_INTERVALS[quality]);
}

/** Root-position seventh chord of the given quality, spelled by letter. */
export function buildSeventh(root: Note, quality: SeventhQuality): Note[] {
  return buildByOffsets(root, SEVENTH_INTERVALS[quality]);
}

/**
 * Ascending half-step counts from `notes[0]` to each following tone.
 * Used as the quality fingerprint.
 */
function intervalSet(notes: readonly Note[]): number[] {
  const [root, ...rest] = notes;
  return rest.map((note) => halfSteps(root, note));
}

/**
 * Quality of a root-position triad given as half-step offsets from its
 * first note. Returns null when the set matches no triad quality.
 */
export function detectTriadQuality(notes: readonly Note[]): TriadQuality | null {
  if (notes.length !== 3) return null;
  const intervals = intervalSet(notes);
  const qualities = Object.keys(TRIAD_INTERVALS) as TriadQuality[];
  for (const quality of qualities) {
    const expected = TRIAD_INTERVALS[quality];
    if (intervals[0] === expected[0] && intervals[1] === expected[1]) {
      return quality;
    }
  }
  return null;
}

/**
 * Quality of a root-position seventh chord given as half-step offsets from
 * its first note. Returns null when the set matches no seventh quality.
 */
export function detectSeventhQuality(notes: readonly Note[]): SeventhQuality | null {
  if (notes.length !== 4) return null;
  const intervals = intervalSet(notes);
  const qualities = Object.keys(SEVENTH_INTERVALS) as SeventhQuality[];
  for (const quality of qualities) {
    const expected = SEVENTH_INTERVALS[quality];
    if (
      intervals[0] === expected[0] &&
      intervals[1] === expected[1] &&
      intervals[2] === expected[2]
    ) {
      return quality;
    }
  }
  return null;
}

/**
 * Rotates the chord bottom-to-top `rotations` times; 0 keeps root position.
 * Three rotations return any triad to its original spelling.
 */
export function chordInversion(notes: readonly Note[], rotations: number): Note[] {
  if (notes.length === 0) {
    throw new Error("chordInversion requires a non-empty chord");
  }
  if (!Number.isInteger(rotations)) {
    throw new Error(`Rotations must be an integer, got ${rotations}`);
  }
  const size = notes.length;
  const shift = ((rotations % size) + size) % size;
  if (shift === 0) return [...notes];
  return [...notes.slice(shift), ...notes.slice(0, shift)];
}

/** The lowest-sounding note of a chord as written. */
export function bassNote(notes: readonly Note[]): Note {
  if (notes.length === 0) {
    throw new Error("bassNote requires a non-empty chord");
  }
  return notes[0];
}

/**
 * Names the inversion by which chord tone sits in the bass, judged by the
 * bass note's letter relative to the root (0 = root, 2 = third, 4 = fifth,
 * 6 = seventh). Throws when the bass letter is not a chord tone.
 */
export function identifyInversion(
  root: Note,
  notes: readonly Note[],
): "rootPosition" | "first" | "second" | "third" {
  const bass = bassNote(notes);
  const offset = ((letterIndex(bass.letter) - letterIndex(root.letter)) % 7 + 7) % 7;
  switch (offset) {
    case 0:
      return "rootPosition";
    case 2:
      return "first";
    case 4:
      return "second";
    case 6:
      return "third";
    default:
      throw new Error(
        `Bass note ${bass.letter}${describe(bass.accidental)} is not a chord tone of a root on ${root.letter}`,
      );
  }
}

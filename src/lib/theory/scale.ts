/**
 * Scale construction and degree naming. Pure functions over {@link Note}.
 *
 * Every scale uses each of the seven letters exactly once; spelling is
 * driven by the interval pattern, never by chromatic shortcuts.
 */

import {
  accidentalForPitchClass,
  letterAt,
  letterIndex,
  noteFromLetterAndAlteration,
  semitoneIndex,
  type Note,
} from "./pitch";

export type ScaleType = "major" | "naturalMinor" | "harmonicMinor" | "melodicMinor";

/** Steps in semitones between consecutive degrees (7 notes, no octave repeat). */
export const SCALE_INTERVALS: Readonly<Record<ScaleType, readonly number[]>> = {
  major: [2, 2, 1, 2, 2, 2, 1],
  naturalMinor: [2, 1, 2, 2, 1, 2, 2],
  harmonicMinor: [2, 1, 2, 2, 1, 3, 1],
  // Ascending form: raised 6th and 7th.
  melodicMinor: [2, 1, 2, 2, 2, 2, 1],
};

/**
 * Builds the seven notes of `type` from `root`, each on a different letter
 * and correctly spelled. When the root carries an octave, so do the results.
 * Throws when the spelling would need accidentals beyond double sharp/flat.
 */
export function buildScale(root: Note, type: ScaleType): Note[] {
  const steps = SCALE_INTERVALS[type];
  const start = semitoneIndex(root);
  const cumulative: number[] = [];
  let total = 0;
  for (const step of steps) {
    cumulative.push(total);
    total += step;
  }

  const scale: Note[] = [];
  for (let degree = 0; degree < 7; degree++) {
    const letter = letterAt(letterIndex(root.letter) + degree);
    const target = start + cumulative[degree];
    if (root.octave === undefined) {
      const accidental = accidentalForPitchClass(letter, target);
      if (accidental === null) {
        throw new Error(
          `Cannot spell ${type} degree ${degree + 1} on letter ${letter} from root ${root.letter}${describeAccidental(root.accidental)}: needs an accidental beyond double sharp/flat`,
        );
      }
      scale.push({ letter, accidental });
    } else {
      const note = noteFromLetterAndAlteration(letter, root.octave, target);
      if (semitoneIndex(note) !== target) {
        throw new Error(
          `Cannot spell ${type} degree ${degree + 1} on letter ${letter} from root ${root.letter}${describeAccidental(root.accidental)}: needs an accidental beyond double sharp/flat`,
        );
      }
      scale.push(note);
    }
  }
  return scale;
}

function describeAccidental(accidental: number): string {
  if (accidental === 0) return "";
  return accidental > 0 ? "#".repeat(accidental) : "b".repeat(-accidental);
}

/** Standard names for scale degrees 1–7. */
export const scaleDegreeNames: Readonly<Record<number, string>> = {
  1: "tonic",
  2: "supertonic",
  3: "mediant",
  4: "subdominant",
  5: "dominant",
  6: "submediant",
  7: "leading tone",
};

/**
 * Name of a scale degree. The natural-minor 7th — a whole step below the
 * tonic — is a subtonic; every other 7th is a leading tone.
 */
export function degreeName(type: ScaleType, degree: number): string {
  if (!Number.isInteger(degree) || degree < 1 || degree > 7) {
    throw new Error(`Scale degree must be an integer 1–7, got ${degree}`);
  }
  if (type === "naturalMinor" && degree === 7) {
    return "subtonic";
  }
  return scaleDegreeNames[degree];
}

/** 1-based scale degree, wrapping within the scale's notes. */
export function degreeNote(scale: readonly Note[], degree: number): Note {
  if (!Number.isInteger(degree)) {
    throw new Error(`Scale degree must be an integer, got ${degree}`);
  }
  if (scale.length === 0) {
    throw new Error("degreeNote requires a non-empty scale");
  }
  const index = (((degree - 1) % scale.length) + scale.length) % scale.length;
  return scale[index];
}

/**
 * Key signatures and relative keys. Pure functions over {@link Note}.
 *
 * Accidentals are returned in canonical staff order: sharp keys read
 * F C G D A E B, flat keys read B E A D G C F.
 */

import { buildScale } from "./scale";
import {
  accidentalForPitchClass,
  letterAt,
  letterIndex,
  noteFromLetterAndAlteration,
  semitoneIndex,
  type Letter,
  type Note,
} from "./pitch";

/** Order in which sharps appear in a key signature. */
export const SHARP_ORDER: readonly Letter[] = ["F", "C", "G", "D", "A", "E", "B"];

/** Order in which flats appear in a key signature. */
export const FLAT_ORDER: readonly Letter[] = ["B", "E", "A", "D", "G", "C", "F"];

/**
 * The accidentals of a major key's key signature in canonical staff order.
 * Derived from the major scale: filter the altered degrees, then sort by
 * the sharp or flat order. C major yields none; Eb major yields Bb Eb Ab.
 */
export function keySignatureAccidentals(majorKey: Note): Note[] {
  const scale = buildScale(majorKey, "major");
  const altered = scale.filter((note) => note.accidental !== 0);
  if (altered.length === 0) {
    return [];
  }
  const usesSharps = altered.some((note) => note.accidental > 0);
  const order = usesSharps ? SHARP_ORDER : FLAT_ORDER;
  return [...altered].sort(
    (a, b) => order.indexOf(a.letter) - order.indexOf(b.letter),
  );
}

/**
 * Signed count of a major key's signature: sharps positive, flats negative,
 * C = 0. Exotic keys beyond the standard 15 count altered scale degrees,
 * so a double sharp still counts as one altered degree.
 */
export function accidentalCount(majorKey: Note): number {
  const altered = keySignatureAccidentals(majorKey);
  if (altered.length === 0) {
    return 0;
  }
  return altered[0].accidental > 0 ? altered.length : -altered.length;
}

const SHARP_KEYS: readonly Letter[] = ["G", "D", "A", "E", "B", "F", "C"];
const FLAT_KEYS: readonly Letter[] = ["F", "B", "E", "A", "D", "G", "C"];

/**
 * The standard major key with `count` accidentals (sharps positive, flats
 * negative). G = +1, F = −1. Throws outside −7…+7.
 */
export function majorKeyFromAccidentalCount(count: number): Note {
  if (!Number.isInteger(count) || count < -7 || count > 7) {
    throw new Error(`Accidental count must be an integer from -7 to 7, got ${count}`);
  }
  if (count > 0) {
    // F at +6 and C at +7 carry a written sharp; G..F at +1..+5 are natural letters.
    return { letter: SHARP_KEYS[count - 1], accidental: count >= 6 ? 1 : 0 };
  }
  if (count < 0) {
    // F at −1 is the natural letter; every flatter key carries a written flat.
    return { letter: FLAT_KEYS[-count - 1], accidental: count === -1 ? 0 : -1 };
  }
  return { letter: "C", accidental: 0 };
}

/**
 * Spells the note a generic third above `note` with the half-step count
 * `semitones`, choosing the accidental on the letter two steps up/down.
 */
function spellThird(
  note: Note,
  letterSteps: number,
  semitones: number,
): Note {
  const letter = letterAt(letterIndex(note.letter) + letterSteps);
  const target = semitoneIndex(note) + semitones;
  if (note.octave === undefined) {
    const accidental = accidentalForPitchClass(letter, target);
    if (accidental === null) {
      throw new Error(
        `Cannot spell the relative key on letter ${letter} from ${note.letter}: needs an accidental beyond double sharp/flat`,
      );
    }
    return { letter, accidental };
  }
  const spelled = noteFromLetterAndAlteration(letter, note.octave, target);
  if (semitoneIndex(spelled) !== target) {
    throw new Error(
      `Cannot spell the relative key on letter ${letter} from ${note.letter}: needs an accidental beyond double sharp/flat`,
    );
  }
  return spelled;
}

/** Relative minor: a minor third below the major key, correctly spelled. */
export function relativeMinor(majorKey: Note): Note {
  return spellThird(majorKey, -2, -3);
}

/** Relative major: a minor third above the minor key, correctly spelled. */
export function relativeMajor(minorKey: Note): Note {
  return spellThird(minorKey, 2, 3);
}

/**
 * Signed count of a natural minor key's signature — the same as its
 * relative major's.
 */
export function minorAccidentalCount(minorKey: Note): number {
  return accidentalCount(relativeMajor(minorKey));
}

export interface MajorKeySignature {
  key: Note;
  sharps: number;
  flats: number;
}

/** All 15 standard major keys, ordered −7…+7 accidentals. */
export function allMajorKeys(): MajorKeySignature[] {
  const keys: MajorKeySignature[] = [];
  for (let count = -7; count <= 7; count++) {
    const key = majorKeyFromAccidentalCount(count);
    keys.push({
      key,
      sharps: Math.max(0, accidentalCount(key)),
      flats: Math.max(0, -accidentalCount(key)),
    });
  }
  return keys;
}

/**
 * Lesson 25 (Key Signature Calculation): the memorised value that turns a
 * major key's accidental count into its relative minor's key signature.
 * The lesson's method is: memorise the count, add 7 to flip sharp/flat
 * spelling, subtract 3 to reach the relative minor.
 */
export const relativeMinorOffsetFromMajor = -3;

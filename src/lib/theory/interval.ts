/**
 * Generic and specific intervals. Pure functions over {@link Note}.
 *
 * Distances are measured ascending from `a` to `b` when both notes lack
 * octaves (pitch-class distance); with octaves on both notes, halfSteps is
 * the absolute semitone distance and the generic number accounts for the
 * octave span.
 */

import {
  accidentalForPitchClass,
  letterAt,
  letterIndex,
  noteFromLetterAndAlteration,
  pitchClass,
  semitoneIndex,
  type Letter,
  type Note,
} from "./pitch";

export type IntervalQuality =
  | "perfect"
  | "major"
  | "minor"
  | "augmented"
  | "diminished"
  | "doublyAugmented"
  | "doublyDiminished";

/** Letter distance plus 1, ignoring accidentals (C→E = 3). */
export function genericIntervalNumber(a: Note, b: Note): number {
  const letterDistance = letterIndex(b.letter) - letterIndex(a.letter);
  if (a.octave !== undefined && b.octave !== undefined) {
    const generic = (b.octave - a.octave) * 7 + letterDistance;
    return Math.abs(generic) + 1;
  }
  return (((letterDistance % 7) + 7) % 7) + 1;
}

/** Non-negative semitone distance from `a` to `b`. */
export function halfSteps(a: Note, b: Note): number {
  if (a.octave !== undefined && b.octave !== undefined) {
    return Math.abs(semitoneIndex(b) - semitoneIndex(a));
  }
  return ((((pitchClass(b) - pitchClass(a)) % 12) + 12) % 12);
}

const PERFECT_SEMITONES: Readonly<Record<number, number>> = { 1: 0, 4: 5, 5: 7 };
const MAJOR_SEMITONES: Readonly<Record<number, number>> = { 2: 2, 3: 4, 6: 9, 7: 11 };
/**
 * Simple numbers of the perfect *class*: unison, fourth, fifth, octave.
 * The semitone tables above are keyed by the octave-folded base (where 8
 * folds to 1), but quality-class validation also meets the unfolded
 * octave, so class membership is asserted against this set instead.
 */
const PERFECT_CLASS_NUMBERS: ReadonlySet<number> = new Set([1, 4, 5, 8]);

/**
 * Quality of the interval with the given generic number and half-step count.
 * Numbers 1/4/5/8 (and their compound forms) use perfect-based qualities;
 * 2/3/6/7 use major/minor-based. Returns null when the combination is
 * impossible.
 */
export function specificQuality(number: number, halfStepCount: number): IntervalQuality | null {
  assertIntervalNumber(number);
  assertHalfStepCount(halfStepCount);
  const { base, semitones } = reduceThroughOctave(number, halfStepCount);

  const perfect = PERFECT_SEMITONES[base];
  if (perfect !== undefined) {
    switch (semitones - perfect) {
      case 0:
        return "perfect";
      case 1:
        return "augmented";
      case 2:
        return "doublyAugmented";
      case -1:
        return "diminished";
      case -2:
        return "doublyDiminished";
      default:
        return null;
    }
  }

  const major = MAJOR_SEMITONES[base];
  switch (semitones - major) {
    case 0:
      return "major";
    case -1:
      return "minor";
    case 1:
      return "augmented";
    case 2:
      return "doublyAugmented";
    case -2:
      return "diminished";
    case -3:
      return "doublyDiminished";
    default:
      return null;
  }
}

const QUALITY_LABELS: Readonly<Record<IntervalQuality, string>> = {
  perfect: "Perfect",
  major: "Major",
  minor: "Minor",
  augmented: "Augmented",
  diminished: "Diminished",
  doublyAugmented: "Doubly Augmented",
  doublyDiminished: "Doubly Diminished",
};

/** Human-readable interval name, e.g. `Perfect 5th`, `Minor 3rd`. Null when impossible. */
export function intervalName(number: number, halfStepCount: number): string | null {
  const quality = specificQuality(number, halfStepCount);
  if (quality === null) {
    return null;
  }
  return `${QUALITY_LABELS[quality]} ${ordinalName(number)}`;
}

function ordinalName(number: number): string {
  if (number === 1) return "Unison";
  if (number === 8) return "Octave";
  const mod100 = number % 100;
  const mod10 = number % 10;
  if (mod100 >= 11 && mod100 <= 13) return `${number}th`;
  if (mod10 === 1) return `${number}st`;
  if (mod10 === 2) return `${number}nd`;
  if (mod10 === 3) return `${number}rd`;
  return `${number}th`;
}

const INVERTED_QUALITY: Readonly<Record<IntervalQuality, IntervalQuality>> = {
  perfect: "perfect",
  major: "minor",
  minor: "major",
  augmented: "diminished",
  diminished: "augmented",
  doublyAugmented: "doublyDiminished",
  doublyDiminished: "doublyAugmented",
};

/**
 * Interval inversion: a simple interval and its inverse sum to 9, and the
 * quality flips along perfect↔perfect, major↔minor, augmented↔diminished.
 * Compound numbers invert to the simple inverse of their simple form —
 * a 9th inverts to a 7th, a 15th (compound unison) to a plain octave.
 * Throws when the quality cannot apply to the number's interval class.
 */
export function invertInterval(
  number: number,
  quality: IntervalQuality,
): { number: number; quality: IntervalQuality } {
  assertIntervalNumber(number);
  assertQualityIsKnown(quality);
  const base = simpleNumberForInversion(number);
  assertQualityFitsClass(base, quality);
  return { number: 9 - base, quality: INVERTED_QUALITY[quality] };
}

const QUALITY_SEMITONE_OFFSET: Readonly<Record<IntervalQuality, number>> = {
  perfect: 0,
  major: 0,
  minor: -1,
  augmented: 1,
  diminished: -1,
  doublyAugmented: 2,
  doublyDiminished: -2,
};

/**
 * Spells the interval `quality number` above `root` using the lesson's
 * three-step method: place the generic interval on its letter first, then
 * adjust the accidental to reach the required half-step count.
 *
 * Examples: spellInterval(C, 3, 'minor') → Eb; spellInterval(B, 5,
 * 'diminished') → F; spellInterval(C, 4, 'augmented') → F#.
 * Throws when the quality does not fit the number's class, or when the
 * interval needs an accidental beyond double sharp/flat.
 */
export function spellInterval(root: Note, number: number, quality: IntervalQuality): Note {
  assertIntervalNumber(number);
  assertQualityIsKnown(quality);
  const { base, octaves } = reduceNumber(number);
  assertQualityFitsClass(base, quality);

  const halfStepCount = expectedHalfSteps(base, quality) + 12 * octaves;
  const letter = letterAt(letterIndex(root.letter) + number - 1);

  if (root.octave === undefined) {
    const wanted = pitchClass(root) + halfStepCount;
    const accidental = accidentalForPitchClass(letter, wanted);
    if (accidental === null) {
      throw unspellable(root, number, quality, letter);
    }
    return { letter, accidental };
  }

  const target = semitoneIndex(root) + halfStepCount;
  const spelled = noteFromLetterAndAlteration(letter, root.octave, target);
  if (semitoneIndex(spelled) !== target) {
    throw unspellable(root, number, quality, letter);
  }
  return spelled;
}

function expectedHalfSteps(base: number, quality: IntervalQuality): number {
  const offset = QUALITY_SEMITONE_OFFSET[quality];
  const perfect = PERFECT_SEMITONES[base];
  if (perfect !== undefined) {
    return perfect + offset;
  }
  return MAJOR_SEMITONES[base] + offset;
}

function unspellable(root: Note, number: number, quality: IntervalQuality, letter: Letter): Error {
  return new Error(
    `Cannot spell ${quality} ${ordinalName(number)} above ${root.letter} on letter ${letter}: needs an accidental beyond double sharp/flat`,
  );
}

/** Splits a (possibly compound) number into its simple base and octave count. */
function reduceNumber(number: number): { base: number; octaves: number } {
  const octaves = Math.floor((number - 1) / 7);
  const base = ((number - 1) % 7) + 1;
  return { base, octaves };
}

/**
 * The simple number an inversion reduces to before applying `9 − n`.
 *
 * Numbers 1–8 are *all simple*: the octave (8) must stay 8 so it inverts
 * to a unison, never fold into "unison + one octave" the way
 * {@link reduceNumber} folds it for semitone arithmetic (where divisor 7
 * is right — a 9th is C→D′ and reduces to a 2nd). Only genuinely compound
 * numbers (≥ 9) reduce to their simple base first.
 */
function simpleNumberForInversion(number: number): number {
  return number <= 8 ? number : reduceNumber(number).base;
}

/** Reduces number and half-steps together through whole octaves. */
function reduceThroughOctave(
  number: number,
  halfStepCount: number,
): { base: number; semitones: number } {
  const { base, octaves } = reduceNumber(number);
  return { base, semitones: halfStepCount - 12 * octaves };
}

function assertIntervalNumber(number: number): void {
  if (!Number.isInteger(number) || number < 1) {
    throw new Error(`Interval number must be a positive integer, got ${number}`);
  }
}

function assertHalfStepCount(halfStepCount: number): void {
  if (!Number.isInteger(halfStepCount) || halfStepCount < 0) {
    throw new Error(`Half-step count must be a non-negative integer, got ${halfStepCount}`);
  }
}

function assertQualityIsKnown(quality: IntervalQuality): void {
  if (!(quality in QUALITY_SEMITONE_OFFSET)) {
    throw new Error(`Unknown interval quality: ${String(quality)}`);
  }
}

/** Perfect-class numbers (1/4/5/8) reject major/minor; major-class reject perfect. */
function assertQualityFitsClass(base: number, quality: IntervalQuality): void {
  const perfectClass = PERFECT_CLASS_NUMBERS.has(base);
  if (perfectClass && (quality === "major" || quality === "minor")) {
    throw new Error(`Quality "${quality}" cannot apply to interval number class ${base}`);
  }
  if (!perfectClass && quality === "perfect") {
    throw new Error(`Quality "${quality}" cannot apply to interval number class ${base}`);
  }
}

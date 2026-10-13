/**
 * Roman-numeral analysis helpers. Pure functions over {@link Note} and
 * {@link ScaleType}. Diatonic chords are derived by stacking thirds from
 * buildScale, so triads and sevenths share one source of truth and cannot
 * disagree about a degree's quality.
 */

import {
  detectSeventhQuality,
  detectTriadQuality,
  type SeventhQuality,
  type TriadQuality,
} from "./chord";
import { buildScale, degreeNote, type ScaleType } from "./scale";
import { parseNote, type Note } from "./pitch";

/**
 * Triad quality of the three scale tones on `degree` (1-based) and above,
 * derived from their half-step set. Throws when the tones match no quality.
 */
function stackedTriad(scale: readonly Note[], degree: number, label: string): DiatonicTriad {
  const notes = [degreeNote(scale, degree), degreeNote(scale, degree + 2), degreeNote(scale, degree + 4)];
  const quality = detectTriadQuality(notes);
  if (quality === null) {
    throw new Error(`No triad quality for degree ${degree} of ${label}`);
  }
  return { degree, quality, notes };
}

/**
 * Qualities of the diatonic triads on degrees 1–7 of `scaleType`, derived by
 * stacking every other scale tone. Qualities depend only on the scale's
 * interval pattern, so a C reference root yields the same row as any root.
 */
export function diatonicTriadQualities(scaleType: ScaleType): TriadQuality[] {
  const scale = buildScale(parseNote("C"), scaleType);
  return scale.map((_, index) => stackedTriad(scale, index + 1, scaleType).quality);
}

export interface DiatonicTriad {
  degree: number;
  quality: TriadQuality;
  notes: Note[];
}

/**
 * The seven diatonic triads of `scaleType` from `root`, each built by
 * stacking every other scale tone and detected from its half-step set.
 */
export function diatonicTriads(root: Note, scaleType: ScaleType): DiatonicTriad[] {
  const scale = buildScale(root, scaleType);
  const label = `${root.letter} ${scaleType}`;
  return scale.map((_, index) => stackedTriad(scale, index + 1, label));
}

export interface DiatonicSeventh {
  degree: number;
  quality: SeventhQuality;
  notes: Note[];
}

/**
 * The seven diatonic seventh chords of `scaleType` from `root`: each stacks
 * one more third on the scale degrees. Major yields
 * Imaj7 ii7 iii7 IVmaj7 V7 vi7 viiø7. The quality is derived from the
 * half-step set of the four stacked scale notes.
 */
export function diatonicSevenths(root: Note, scaleType: ScaleType): DiatonicSeventh[] {
  const scale = buildScale(root, scaleType);
  return scale.map((_, index) => {
    const tones = [
      degreeNote(scale, index + 1),
      degreeNote(scale, index + 3),
      degreeNote(scale, index + 5),
      degreeNote(scale, index + 7),
    ];
    const quality = detectSeventhQuality(tones);
    if (quality === null) {
      throw new Error(
        `No seventh quality for degree ${index + 1} of ${root.letter} ${scaleType}`,
      );
    }
    return { degree: index + 1, quality, notes: tones };
  });
}

const ROMAN_UPPER = ["I", "II", "III", "IV", "V", "VI", "VII"] as const;

function romanBase(degree: number): { upper: string; lower: string } {
  if (!Number.isInteger(degree) || degree < 1 || degree > 7) {
    throw new Error(`Degree must be an integer 1–7, got ${degree}`);
  }
  const upper = ROMAN_UPPER[degree - 1];
  return { upper, lower: upper.toLowerCase() };
}

const TRIAD_SUFFIX: Readonly<Record<TriadQuality, string>> = {
  major: "",
  minor: "",
  diminished: "\u{00B0}", // °
  augmented: "+",
};

/**
 * Roman numeral for a triad quality: uppercase for major/augmented,
 * lowercase for minor/diminished; `°` for diminished, `+` for augmented.
 * Examples: major/1 → I, minor/2 → ii, diminished/7 → vii°, augmented/3 → III+.
 */
export function romanNumeral(quality: TriadQuality, degree: number): string {
  const { upper, lower } = romanBase(degree);
  const isUpper = quality === "major" || quality === "augmented";
  return (isUpper ? upper : lower) + TRIAD_SUFFIX[quality];
}

const SEVENTH_SUFFIX: Readonly<Record<SeventhQuality, string>> = {
  majorSeventh: "maj7",
  minorSeventh: "7",
  dominantSeventh: "7",
  halfDiminishedSeventh: "\u{00F8}7", // ø7
  fullyDiminishedSeventh: "\u{00B0}7", // °7
  minorMajorSeventh: "mMaj7",
  augmentedMajorSeventh: "+maj7",
  augmentedSeventh: "+7",
};

/**
 * Roman numeral for a seventh chord: the triad base plus the seventh's
 * suffix. Examples: majorSeventh/1 → Imaj7, dominantSeventh/5 → V7,
 * halfDiminishedSeventh/7 → viiø7, augmentedSeventh/3 → III+7.
 */
export function romanNumeralSeventh(quality: SeventhQuality, degree: number): string {
  const { upper, lower } = romanBase(degree);
  // Uppercase when the underlying triad is major/augmented: major, dominant
  // and the augmented sevenths; lowercase for minor and diminished roots.
  const isUpper =
    quality === "majorSeventh" ||
    quality === "dominantSeventh" ||
    quality.startsWith("augmented");
  return (isUpper ? upper : lower) + SEVENTH_SUFFIX[quality];
}

const TRIAD_FIGURES = ["", "6", "6/4"] as const;
const SEVENTH_FIGURES = ["7", "6/5", "4/3", "2"] as const;

/**
 * Figured-bass inversion figure. Triads: 6, 6/4. Sevenths: 7, 6/5, 4/3, 2.
 * The root-position triad figure is the empty string. Throws out of range.
 */
export function inversionFigure(kind: "triad" | "seventh", inversion: number): string {
  const figures = kind === "triad" ? TRIAD_FIGURES : SEVENTH_FIGURES;
  if (!Number.isInteger(inversion) || inversion < 0 || inversion >= figures.length) {
    throw new Error(
      `${kind} inversion must be an integer 0–${figures.length - 1}, got ${inversion}`,
    );
  }
  return figures[inversion];
}

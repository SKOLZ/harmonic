import {
  buildSeventh,
  chordInversion,
  inversionFigure,
  parseNote,
  romanNumeral,
  scientificName,
  semitoneIndex,
  type Note,
  type SeventhQuality,
  type TriadQuality,
} from "../lib/theory";
import type { AnswerSpec, Round } from "../lib/rounds/types";
import { requireLessonEntry } from "./catalog";
import { sampleStratifiedRounds } from "./rng";
import type { LessonModule } from "./types";

/**
 * Lesson 49 — Roman Numeral Analysis: Seventh Chords.
 *
 * Content source: musictheory.net lesson 49 (slide text pulled from the live
 * `lesson49.js`): "In addition to triads, the Roman numeral analysis system
 * also identifies diatonic seventh chords", covered "of the major and
 * harmonic minor scales" through "A three step process": "First, write the
 * analysis symbols for the corresponding diatonic triads", "Next, add a
 * small seven", "Finally, add a slash through the circle of each
 * half-diminished seventh chord." The site then declines the M-variant
 * ("They prefer to add an upper-case 'M' … Although we will not use their
 * system"), and walks the inversion figures — "The previously-discussed 7
 * identifies a root position seventh chord", "6 and 5 identify a first
 * inversion seventh", "4 and 3 identify a second inversion seventh", "A
 * lone 2 identifies a third inversion seventh chord."
 *
 * Numerals are rebuilt from the core: `romanNumeral` on the triad base
 * plus a small seven, with the half-diminished slash replacing the degree
 * circle — so a major seventh is written plain `I7`, never the M-variant's
 * `maj7`, exactly as the site declines it (tests forbid maj7 options).
 * Chord rounds answer with the four figures (from the core's
 * `inversionFigure` table) and voice each chord by rotating
 * `buildSeventh`'s tones into ascending position. The pool is 12 `staff` +
 * 19 `text` + 4 `keyboard` = 35, drawn stratified with one staff and one
 * text round guaranteed per 12-round draw.
 */
const choices = (options: string[], correctIndex: number): AnswerSpec => ({
  kind: "choices",
  options,
  correctIndex,
});

/** The four seventh-chord figures, from the core's own figure table. */
const FIGURES: readonly string[] = [0, 1, 2, 3].map((inversion) =>
  inversionFigure("seventh", inversion),
);

/** The site's figure sentences, verbatim (lesson 49 slides [13]–[16]). */
const FIGURE_SENTENCE: readonly string[] = [
  "The previously-discussed 7 identifies a root position seventh chord.",
  "6 and 5 identify a first inversion seventh.",
  "4 and 3 identify a second inversion seventh.",
  "A lone 2 identifies a third inversion seventh chord.",
];

/** The chord tone each inversion drops into the bass (site chart language). */
const TONE_WORD: readonly string[] = ["root", "third", "fifth", "seventh"];

/** The site's type names, as lesson 46 writes them (shared vocabulary). */
const TYPE_DISPLAY: Readonly<Record<SeventhQuality, string>> = {
  majorSeventh: "major",
  minorSeventh: "minor",
  dominantSeventh: "dominant",
  halfDiminishedSeventh: "half-diminished",
  minorMajorSeventh: "minor-major",
  augmentedMajorSeventh: "augmented-major",
  fullyDiminishedSeventh: "fully-diminished",
  augmentedSeventh: "augmented",
};

/** The triad base the site's process starts from, per seventh quality. */
const TRIAD_BASE: Readonly<Record<SeventhQuality, TriadQuality>> = {
  majorSeventh: "major",
  minorSeventh: "minor",
  dominantSeventh: "major",
  halfDiminishedSeventh: "diminished",
  fullyDiminishedSeventh: "diminished",
  minorMajorSeventh: "minor",
  augmentedMajorSeventh: "augmented",
  augmentedSeventh: "augmented",
};

/** English ordinals for scale degrees, matching the slides' phrasing. */
const ORDINALS: Readonly<Record<number, string>> = {
  1: "first",
  2: "second",
  3: "third",
  4: "fourth",
  5: "fifth",
  6: "sixth",
  7: "seventh",
};

/** "Eb4" → "Eb": the root's name as the site writes it in prose. */
const rootLabel = (root: string): string =>
  scientificName(parseNote(root)).replace(/\d+$/, "");

/**
 * Rebuild the site's three-step numeral: the core's triad symbol plus a
 * small seven, with a slash through the half-diminished circle. The site
 * declines the M-variant, so major sevenths stay plain 7.
 */
const siteNumeral = (quality: SeventhQuality, degree: number): string => {
  const base = romanNumeral(TRIAD_BASE[quality], degree);
  const slashed = quality === "halfDiminishedSeventh" ? base.replace("°", "ø") : base;
  return `${slashed}7`;
};

/**
 * Voice a seventh chord in an inversion: rotate the core's tones, then
 * raise any tone that would sit at or below its left neighbour so the
 * voicing reads ascending with the inversion's bass on the left.
 */
const voicing = (root: string, quality: SeventhQuality, inversion: number): string[] => {
  const rotated = chordInversion(buildSeventh(parseNote(root), quality), inversion);
  const lifted: Note[] = [];
  for (const note of rotated) {
    let tone = note;
    while (
      lifted.length > 0 &&
      semitoneIndex(tone) <= semitoneIndex(lifted[lifted.length - 1]!)
    ) {
      tone = { ...tone, octave: (tone.octave ?? 0) + 1 };
    }
    lifted.push(tone);
  }
  return lifted.map(scientificName);
};

/** A chord round: an inverted seventh chord answered with its figure. */
const inversionRound = (
  id: string,
  kind: "staff" | "keyboard",
  root: string,
  quality: SeventhQuality,
  inversion: number,
): Round => {
  const tones = voicing(root, quality, inversion);
  const label = `${rootLabel(root)} ${TYPE_DISPLAY[quality]} seventh chord`;
  return {
    id,
    prompt:
      kind === "staff"
        ? { kind: "staff", clef: "treble", notes: tones, duration: "q", simultaneous: true }
        : { kind: "keyboard", highlight: tones },
    answer: choices([...FIGURES], inversion),
    rule:
      `The ${label} chord is spelled ` +
      `${tones.map((tone) => tone.replace(/\d+$/, "")).join("–")}. ` +
      `${FIGURE_SENTENCE[inversion]} Its bass is the ${TONE_WORD[inversion]}.`,
  };
};

/** A text round answering with the core-computed numeral for a worked chord. */
const numeralRound = (
  id: string,
  quality: SeventhQuality,
  degree: number,
  scaleLabel: string,
  distractors: [string, string],
  correctIndex: 0 | 1 | 2,
): Round => {
  const numeral = siteNumeral(quality, degree);
  const options = [distractors[0], distractors[1]];
  options.splice(correctIndex, 0, numeral);
  return {
    id,
    prompt: {
      kind: "text",
      text: `Which numeral identifies the ${ORDINALS[degree]} seventh chord of the ${scaleLabel} scale?`,
    },
    answer: choices(options, correctIndex),
    rule: `In the ${scaleLabel} scale, the ${ORDINALS[degree]} chord is ${numeral}.`,
  };
};

/** Rounds drawn per visit; the pool is larger so replays vary. */
const ROUND_COUNT = 12;

/** Kinds every draw must contain; `sampleStratifiedRounds` enforces it. */
const REQUIRED_KINDS = ["staff", "text"] as const;

export const lesson49Pool: readonly Round[] = [
  // --- staff prompts: three chords through all four inversions --------------
  inversionRound("l49-staff-c-major7-root", "staff", "C4", "majorSeventh", 0),
  inversionRound("l49-staff-c-major7-first", "staff", "C4", "majorSeventh", 1),
  inversionRound("l49-staff-c-major7-second", "staff", "C4", "majorSeventh", 2),
  inversionRound("l49-staff-c-major7-third", "staff", "C4", "majorSeventh", 3),
  inversionRound("l49-staff-c-min7-root", "staff", "C4", "minorSeventh", 0),
  inversionRound("l49-staff-c-min7-first", "staff", "C4", "minorSeventh", 1),
  inversionRound("l49-staff-c-min7-second", "staff", "C4", "minorSeventh", 2),
  inversionRound("l49-staff-c-min7-third", "staff", "C4", "minorSeventh", 3),
  inversionRound("l49-staff-g-dom-root", "staff", "G4", "dominantSeventh", 0),
  inversionRound("l49-staff-g-dom-first", "staff", "G4", "dominantSeventh", 1),
  inversionRound("l49-staff-g-dom-second", "staff", "G4", "dominantSeventh", 2),
  inversionRound("l49-staff-g-dom-third", "staff", "G4", "dominantSeventh", 3),

  // --- keyboard prompts: C minor seventh through all four figures -----------
  inversionRound("l49-keyboard-c-min7-root", "keyboard", "C4", "minorSeventh", 0),
  inversionRound("l49-keyboard-c-min7-first", "keyboard", "C4", "minorSeventh", 1),
  inversionRound("l49-keyboard-c-min7-second", "keyboard", "C4", "minorSeventh", 2),
  inversionRound("l49-keyboard-c-min7-third", "keyboard", "C4", "minorSeventh", 3),

  // --- text prompts: scope, process, M-variant, numerals, figures -----------
  {
    id: "l49-text-scales",
    prompt: {
      kind: "text",
      text: "Which scales' diatonic seventh chords does this analysis system cover?",
    },
    answer: choices(
      [
        "The major and harmonic minor scales",
        "All four minor scales only",
        "The major and natural minor scales",
        "Every scale equally",
      ],
      0,
    ),
    rule: "In addition to triads, the Roman numeral analysis system also identifies diatonic seventh chords of the major and harmonic minor scales.",
  },
  {
    id: "l49-text-steps",
    prompt: { kind: "text", text: "How many steps does the analysis process use?" },
    answer: choices(["Two", "Three", "Four", "Five"], 1),
    rule: "A three step process is used to build each seventh chord's analysis symbol.",
  },
  {
    id: "l49-text-step-1",
    prompt: { kind: "text", text: "What is the first step of the analysis process?" },
    answer: choices(
      ["Write the analysis symbols for the corresponding diatonic triads", "Add a small seven", "Add a slash through the circle", "Invert the chord"],
      0,
    ),
    rule: "First, write the analysis symbols for the corresponding diatonic triads.",
  },
  {
    id: "l49-text-step-2",
    prompt: { kind: "text", text: "What is the second step of the analysis process?" },
    answer: choices(["Add a small seven", "Add a small circle", "Change the case", "Write a slash"], 0),
    rule: "Next, add a small seven to the triad's numeral.",
  },
  {
    id: "l49-text-step-3",
    prompt: { kind: "text", text: "What is the last step of the analysis process?" },
    answer: choices(
      ["Add a slash through the circle of each half-diminished seventh chord", "Add a small six", "Lower-case the numeral", "Add a plus sign"],
      0,
    ),
    rule: "Finally, add a slash through the circle of each half-diminished seventh chord.",
  },
  {
    id: "l49-text-m-add",
    prompt: {
      kind: "text",
      text: "What does the variation some theorists use add to a numeral for a chord with a major seventh?",
    },
    answer: choices(
      ["An upper-case 'M'", "A lower-case 'm'", "A small plus sign", "A slashed circle"],
      0,
    ),
    rule: "Some theorists add an upper-case 'M' to each seventh chord which uses a major seventh.",
  },
  {
    id: "l49-text-m-skip",
    prompt: { kind: "text", text: "Does this system use that upper-case 'M' variation?" },
    answer: choices(
      ["We will not use their system", "Yes, always", "Only for minor chords", "Only in harmonic minor"],
      0,
    ),
    rule: "Although we will not use their system, you should be aware of its existence.",
  },
  // C major numerals.
  numeralRound("l49-text-I7", "majorSeventh", 1, "C major", ["IV7", "V7"], 0),
  numeralRound("l49-text-IV7", "majorSeventh", 4, "C major", ["I7", "ii7"], 1),
  numeralRound("l49-text-viio7", "halfDiminishedSeventh", 7, "C major", ["vii°7", "V7"], 1),
  // C harmonic minor numerals.
  numeralRound("l49-text-i7", "minorSeventh", 1, "C harmonic minor", ["I7", "v7"], 0),
  numeralRound("l49-text-iio7", "halfDiminishedSeventh", 2, "C harmonic minor", ["ii°7", "iv7"], 0),
  numeralRound("l49-text-III7", "augmentedMajorSeventh", 3, "C harmonic minor", ["III7", "V7"], 0),
  numeralRound("l49-text-V7", "dominantSeventh", 5, "C harmonic minor", ["iv7", "vi7"], 0),
  numeralRound("l49-text-vii7", "fullyDiminishedSeventh", 7, "C harmonic minor", ["viiø7", "VII7"], 0),
  // Inversion figures.
  {
    id: "l49-text-root-fig",
    prompt: { kind: "text", text: "Which figure identifies a root position seventh chord?" },
    answer: choices(["7", "6 and 5", "4 and 3", "2"], 0),
    rule: FIGURE_SENTENCE[0],
  },
  {
    id: "l49-text-first-fig",
    prompt: { kind: "text", text: "Which figures identify a first inversion seventh chord?" },
    answer: choices(["6 and 5", "4 and 3", "7", "2"], 0),
    rule: FIGURE_SENTENCE[1],
  },
  {
    id: "l49-text-second-fig",
    prompt: { kind: "text", text: "Which figures identify a second inversion seventh chord?" },
    answer: choices(["4 and 3", "6 and 5", "7", "2"], 0),
    rule: FIGURE_SENTENCE[2],
  },
  {
    id: "l49-text-third-fig",
    prompt: { kind: "text", text: "Which figure identifies a third inversion seventh chord?" },
    answer: choices(["2", "7", "6 and 5", "4 and 3"], 0),
    rule: FIGURE_SENTENCE[3],
  },
];

export const lesson49: LessonModule = {
  entry: requireLessonEntry(49),
  generateRounds: (rng) =>
    sampleStratifiedRounds(lesson49Pool, REQUIRED_KINDS, rng, ROUND_COUNT),
};

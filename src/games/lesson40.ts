import {
  TRIAD_INTERVALS,
  buildTriad,
  parseNote,
  scientificName,
  type TriadQuality,
} from "../lib/theory";
import type { AnswerSpec, Round } from "../lib/rounds/types";
import { requireLessonEntry } from "./catalog";
import { sampleStratifiedRounds } from "./rng";
import type { LessonModule } from "./types";

/**
 * Lesson 40 — Introduction to Chords.
 *
 * Content source: musictheory.net lesson 40 (slide text pulled from the live
 * `lesson40.js`): "A *chord* is a combination of three or more notes";
 * "Chords are built off of a single note, called the *root*"; "In this
 * lesson, we will discuss *triads*. They are created with a root, third, and
 * fifth." Then the four triad types, each with its formula and its site-
 * worked examples — major triad, "built with a major third and a perfect
 * fifth from the root" (C–E–G, Eb–G–Bb, B–D#–F#); minor triad, "a _minor_
 * third and a perfect fifth" (C–Eb–G, Eb–Gb–Bb, B–D–F#); augmented triad,
 * "a major third and an _augmented_ fifth" (C–E–G#, Eb–G–B, B–D#–Fx);
 * diminished triad, "a minor third and a _diminished_ fifth" (C–Eb–Gb,
 * Eb–Gb–Bbb, B–D–F). The slides count the intervals on the keyboard as they
 * build: four and seven half steps (major), three and seven (minor), four
 * and eight (augmented), three and six (diminished).
 *
 * Corrections to the task's accepted reference, from the live site: the
 * reference says a triad "is built by stacking thirds" — those exact words
 * appear nowhere in the lesson; the site says triads "are created with a
 * root, third, and fifth" and builds each one by writing "the generic third
 * and generic fifth from the root" and then counting half steps on the
 * keyboard, so stacking is shown, not stated. The reference also omits the
 * lesson's actual bulk: the site's index describes lesson 40 as "Learn about
 * the four types of triads", and eight of the twelve worked spellings are
 * minor, augmented and diminished rather than major. Both enrichments are
 * reflected in the pool; nothing in the reference contradicts the site.
 *
 * Every staff and keyboard round derives its tones from `buildTriad` in the
 * theory core — the twelve spellings are asserted against the site's own
 * slide text in the tests, so a core-vs-site disagreement fails loudly
 * instead of shipping. Rules take their half-step counts from
 * `TRIAD_INTERVALS`, so prose cannot drift from the built chords. The pool
 * is 12 `staff` + 12 `text` + 4 `keyboard` = 28 and the draw is stratified
 * (`sampleStratifiedRounds`): one staff and one text round are guaranteed in
 * every 12-round draw, which a plain `sampleRounds` call could no longer
 * promise once keyboard rounds joined the pool.
 */
const choices = (options: string[], correctIndex: number): AnswerSpec => ({
  kind: "choices",
  options,
  correctIndex,
});

/** The site's four triad types, in the order its slides introduce them. */
const QUALITY_ORDER: readonly TriadQuality[] = ["major", "minor", "augmented", "diminished"];

/** The site's formula words for each type (lesson 40 slides). */
const FORMULA_NAMES: Readonly<Record<TriadQuality, { third: string; fifth: string }>> = {
  major: { third: "major third", fifth: "perfect fifth" },
  minor: { third: "minor third", fifth: "perfect fifth" },
  augmented: { third: "major third", fifth: "augmented fifth" },
  diminished: { third: "minor third", fifth: "diminished fifth" },
};

const STEP_WORDS: Readonly<Record<number, string>> = {
  3: "three",
  4: "four",
  6: "six",
  7: "seven",
  8: "eight",
};

/** Half-step counts for a triad type, straight from the theory core. */
const stepsOf = (quality: TriadQuality): readonly [number, number] => TRIAD_INTERVALS[quality];

const stepWord = (steps: number): string => STEP_WORDS[steps] ?? String(steps);

/** "Eb4" → "Eb": the root's name as the site writes it in prose. */
const rootLabel = (root: string): string =>
  scientificName(parseNote(root)).replace(/\d+$/, "");

/** The triad's tones, spelled by the core — never hand-typed. */
const triad = (root: string, quality: TriadQuality): string[] =>
  buildTriad(parseNote(root), quality).map(scientificName);

/** The four triad names on one root: the options every chord round offers. */
const qualityOptions = (root: string): string[] =>
  QUALITY_ORDER.map((quality) => `${rootLabel(root)} ${quality} triad`);

const qualityIndex = (quality: TriadQuality): number => QUALITY_ORDER.indexOf(quality);

/** Staff/keyboard rule: the site's spelled example with its own formula. */
const triadRule = (quality: TriadQuality, prefix: string): string => {
  const [thirdSteps, fifthSteps] = stepsOf(quality);
  const { third, fifth } = FORMULA_NAMES[quality];
  return (
    `${prefix} a ${third} (${stepWord(thirdSteps)} half steps) ` +
    `and a ${fifth} (${stepWord(fifthSteps)} half steps) from the root.`
  );
};

const staffRule = (root: string, quality: TriadQuality): string =>
  triadRule(
    quality,
    `The ${quality} triad on ${rootLabel(root)} is spelled ` +
      `${triad(root, quality).map((tone) => tone.replace(/\d+$/, "")).join("–")}:`,
  );

const keyboardRule = (root: string, quality: TriadQuality): string => {
  const [thirdSteps, fifthSteps] = stepsOf(quality);
  const { third, fifth } = FORMULA_NAMES[quality];
  return (
    `On the keyboard the highlighted tones sit ${stepWord(thirdSteps)} half steps ` +
    `and ${stepWord(fifthSteps)} half steps above the ${rootLabel(root)} root: ` +
    `a ${third} and a ${fifth} — the formula for a ${quality} triad.`
  );
};

/** Rounds drawn per visit; the pool is larger so replays vary. */
const ROUND_COUNT = 12;

/** Kinds every draw must contain; `sampleStratifiedRounds` enforces it. */
const REQUIRED_KINDS = ["staff", "text"] as const;

export const lesson40Pool: readonly Round[] = [
  // --- staff prompts: read the triad on the page, name its type -------------
  ...QUALITY_ORDER.map((quality): Round => ({
    id: `l40-staff-c-${quality}`,
    prompt: { kind: "staff", clef: "treble", notes: triad("C4", quality), duration: "q", simultaneous: true },
    answer: choices(qualityOptions("C4"), qualityIndex(quality)),
    rule: staffRule("C4", quality),
  })),
  ...QUALITY_ORDER.map((quality): Round => ({
    id: `l40-staff-eb-${quality}`,
    prompt: { kind: "staff", clef: "treble", notes: triad("Eb4", quality), duration: "q", simultaneous: true },
    answer: choices(qualityOptions("Eb4"), qualityIndex(quality)),
    rule: staffRule("Eb4", quality),
  })),
  ...QUALITY_ORDER.map((quality): Round => ({
    id: `l40-staff-b-${quality}`,
    prompt: { kind: "staff", clef: "treble", notes: triad("B4", quality), duration: "q", simultaneous: true },
    answer: choices(qualityOptions("B4"), qualityIndex(quality)),
    rule: staffRule("B4", quality),
  })),

  // --- keyboard prompts: the site's four C-rooted examples ------------------
  ...QUALITY_ORDER.map((quality): Round => ({
    id: `l40-keyboard-c-${quality}`,
    prompt: { kind: "keyboard", highlight: triad("C4", quality) },
    answer: choices(qualityOptions("C4"), qualityIndex(quality)),
    rule: keyboardRule("C4", quality),
  })),

  // --- text prompts: the definitions and the four formulas ------------------
  {
    id: "l40-text-chord-definition",
    prompt: { kind: "text", text: "How many notes does a chord combine?" },
    answer: choices(["Exactly two", "Three or more", "Exactly four", "Only one"], 1),
    rule: "A chord is a combination of three or more notes.",
  },
  {
    id: "l40-text-chord-root",
    prompt: { kind: "text", text: "What is the single note a chord is built off of called?" },
    answer: choices(["The root", "The third", "The fifth", "The key"], 0),
    rule: "Chords are built off of a single note, called the root.",
  },
  {
    id: "l40-text-triad-tones",
    prompt: { kind: "text", text: "Which notes make up a triad?" },
    answer: choices(
      ["A root, a third, and a fifth", "A root and a third only", "Two notes an octave apart", "A root, third, fifth, and seventh"],
      0,
    ),
    rule: "A triad is created with a root, third, and fifth.",
  },
  {
    id: "l40-text-major-formula",
    prompt: {
      kind: "text",
      text: "Which pair of intervals builds a major triad from its root?",
    },
    answer: choices(
      ["A major third and a perfect fifth", "A minor third and a perfect fifth", "A major third and an augmented fifth", "A minor third and a diminished fifth"],
      0,
    ),
    rule: "A major triad is built with a major third and a perfect fifth from the root: four half steps above the root to the third, seven half steps to the fifth.",
  },
  {
    id: "l40-text-minor-formula",
    prompt: {
      kind: "text",
      text: "Which pair of intervals builds a minor triad from its root?",
    },
    answer: choices(
      ["A major third and a perfect fifth", "A minor third and a perfect fifth", "A major third and an augmented fifth", "A minor third and a diminished fifth"],
      1,
    ),
    rule: "A minor triad is built with a minor third and a perfect fifth from the root: three half steps above the root to the third, seven half steps to the fifth.",
  },
  {
    id: "l40-text-augmented-formula",
    prompt: {
      kind: "text",
      text: "Which pair of intervals builds an augmented triad from its root?",
    },
    answer: choices(
      ["A major third and a perfect fifth", "A minor third and a perfect fifth", "A major third and an augmented fifth", "A minor third and a diminished fifth"],
      2,
    ),
    rule: "The augmented triad is built with a major third and an augmented fifth from the root: four half steps above the root to the third, eight half steps to the fifth.",
  },
  {
    id: "l40-text-diminished-formula",
    prompt: {
      kind: "text",
      text: "Which pair of intervals builds a diminished triad from its root?",
    },
    answer: choices(
      ["A major third and a perfect fifth", "A minor third and a perfect fifth", "A major third and an augmented fifth", "A minor third and a diminished fifth"],
      3,
    ),
    rule: "The diminished triad is built with a minor third and a diminished fifth from the root: three half steps above the root to the third, six half steps to the fifth.",
  },
  {
    id: "l40-text-major-half-steps",
    prompt: {
      kind: "text",
      text: "Which half steps above its root hold a major triad's third and fifth?",
    },
    answer: choices(["Four and seven", "Three and seven", "Four and eight", "Three and six"], 0),
    rule: "A major triad's third sits four half steps above the root and its fifth seven half steps above it.",
  },
  {
    id: "l40-text-minor-half-steps",
    prompt: {
      kind: "text",
      text: "Which half steps above its root hold a minor triad's third and fifth?",
    },
    answer: choices(["Four and seven", "Three and seven", "Four and eight", "Three and six"], 1),
    rule: "A minor triad's third sits three half steps above the root and its fifth seven half steps above it.",
  },
  {
    id: "l40-text-augmented-half-steps",
    prompt: {
      kind: "text",
      text: "Which half steps above its root hold an augmented triad's third and fifth?",
    },
    answer: choices(["Four and seven", "Three and seven", "Four and eight", "Three and six"], 2),
    rule: "An augmented triad's third sits four half steps above the root and its fifth eight half steps above it.",
  },
  {
    id: "l40-text-diminished-half-steps",
    prompt: {
      kind: "text",
      text: "Which half steps above its root hold a diminished triad's third and fifth?",
    },
    answer: choices(["Four and seven", "Three and seven", "Four and eight", "Three and six"], 3),
    rule: "A diminished triad's third sits three half steps above the root and its fifth six half steps above it.",
  },
  {
    id: "l40-text-eb-diminished-spelling",
    prompt: { kind: "text", text: "How is an Eb diminished triad spelled?" },
    answer: choices(["Eb–Gb–Bbb", "Eb–G–B", "Eb–Gb–Bb", "Eb–Ab–Bbb"], 0),
    rule: "An Eb diminished triad is spelled Eb–Gb–Bbb: three half steps from Eb to Gb and six half steps from Eb to Bbb.",
  },
];

export const lesson40: LessonModule = {
  entry: requireLessonEntry(40),
  generateRounds: (rng) =>
    sampleStratifiedRounds(lesson40Pool, REQUIRED_KINDS, rng, ROUND_COUNT),
};

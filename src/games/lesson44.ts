import {
  buildTriad,
  parseNote,
  romanNumeral,
  scientificName,
  type ScaleType,
  type TriadQuality,
} from "../lib/theory";
import type { AnswerSpec, Round } from "../lib/rounds/types";
import { requireLessonEntry } from "./catalog";
import { sampleStratifiedRounds } from "./rng";
import type { LessonModule } from "./types";

/**
 * Lesson 44 — Roman Numeral Analysis: Triads.
 *
 * Content source: musictheory.net lesson 44 (slide text pulled from the live
 * `lesson44.js`): "When analyzing music, each diatonic triad is identified by
 * a *Roman numeral*"; "The first diatonic triad of a scale uses the Roman
 * numeral for one." Then the four styles — "Upper-case numerals represent
 * major triads", "Lower-case numerals represent minor triads", "Upper-case
 * numerals with a small plus sign represent augmented triads", "Lower-case
 * numerals with a small circle represent diminished triads" — worked through
 * C major, C natural minor, harmonic minor (augmented third, major fifth,
 * diminished seventh) and melodic minor (minor second, major fourth,
 * diminished sixth), and finally inversions: a small 6 first inversion
 * ("due to the root being a generic sixth above the bass note"), a 6 and 4
 * second inversion, the 6/3 alternative some theorists use, and the lesson's
 * own choice of the 6 alone.
 *
 * Chord rounds answer with the numeral's *style* (the site's four style
 * sentences are the rule text); text rounds answer with the numerals
 * themselves, each pinned to the core's own `romanNumeral` so the chart
 * glyphs come from theory code rather than hand-typed strings. Tones come
 * from `buildTriad`; the sixteen site spellings are asserted against the
 * live slide text in the tests. The pool is 12 `staff` + 19 `text` +
 * 4 `keyboard` = 35, drawn stratified with one staff and one text round
 * guaranteed per 12-round draw.
 */
const choices = (options: string[], correctIndex: number): AnswerSpec => ({
  kind: "choices",
  options,
  correctIndex,
});

/** The site's four numeral styles, keyed by triad quality (slides [6]–[9]). */
const STYLE_BY_QUALITY: Readonly<Record<TriadQuality, string>> = {
  major: "Upper-case",
  minor: "Lower-case",
  augmented: "Upper-case with a small plus sign",
  diminished: "Lower-case with a small circle",
};

/** The site's four style sentences, verbatim (lesson 44 slides [6]–[9]). */
const STYLE_SENTENCE: Readonly<Record<TriadQuality, string>> = {
  major: "Upper-case numerals represent major triads.",
  minor: "Lower-case numerals represent minor triads.",
  augmented: "Upper-case numerals with a small plus sign represent augmented triads.",
  diminished: "Lower-case numerals with a small circle represent diminished triads.",
};

/** The site's four triad qualities, in slide order. */
const QUALITY_ORDER: readonly TriadQuality[] = ["major", "minor", "augmented", "diminished"];

/** The four style options every chord round offers, in slide order. */
const styleOptions = (): string[] => QUALITY_ORDER.map((quality) => STYLE_BY_QUALITY[quality]);

const styleIndex = (quality: TriadQuality): number => QUALITY_ORDER.indexOf(quality);

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

/** Scale labels as the lesson names its four worked scales. */
const SCALE_LABELS: Readonly<Record<ScaleType, string>> = {
  major: "C major",
  naturalMinor: "C natural minor",
  harmonicMinor: "C harmonic minor",
  melodicMinor: "C melodic minor",
};

/** The triad's tones, spelled by the core — never hand-typed. */
const triad = (root: string, quality: TriadQuality): string[] =>
  buildTriad(parseNote(root), quality).map(scientificName);

/**
 * A chord round's rule: the site's reanalysis sentence plus its style
 * sentence and the numeral the core computes for this triad.
 */
const chordRule = (quality: TriadQuality, scale: ScaleType, degree: number): string =>
  `The ${ORDINALS[degree]} triad of the ${SCALE_LABELS[scale]} scale is ` +
  `${quality}. ${STYLE_SENTENCE[quality]} ` +
  `Its numeral is ${romanNumeral(quality, degree)}.`;

/** One site-worked triad: tones from the core, style answer, site rule. */
const chordRound = (
  id: string,
  kind: "staff" | "keyboard",
  root: string,
  quality: TriadQuality,
  scale: ScaleType,
  degree: number,
): Round => {
  const spelling = triad(root, quality);
  return {
    id,
    prompt:
      kind === "staff"
        ? { kind: "staff", clef: "treble", notes: spelling, duration: "q", simultaneous: true }
        : { kind: "keyboard", highlight: spelling },
    answer: choices(styleOptions(), styleIndex(quality)),
    rule: chordRule(quality, scale, degree),
  };
};

/** A text round answering with the core's own numeral for a worked triad. */
const numeralRound = (
  id: string,
  quality: TriadQuality,
  degree: number,
  scale: ScaleType,
  distractors: [string, string],
  correctIndex: 0 | 1 | 2,
): Round => {
  const options = [distractors[0], distractors[1]];
  options.splice(correctIndex, 0, romanNumeral(quality, degree));
  return {
    id,
    prompt: {
      kind: "text",
      text: `Which numeral identifies the ${ORDINALS[degree]} triad of the ${SCALE_LABELS[scale]} scale?`,
    },
    answer: choices(options, correctIndex),
    rule:
      `The ${ORDINALS[degree]} triad of the ${SCALE_LABELS[scale]} scale is ${quality}, ` +
      `so its numeral is ${romanNumeral(quality, degree)}.`,
  };
};

/** Rounds drawn per visit; the pool is larger so replays vary. */
const ROUND_COUNT = 12;

/** Kinds every draw must contain; `sampleStratifiedRounds` enforces it. */
const REQUIRED_KINDS = ["staff", "text"] as const;

export const lesson44Pool: readonly Round[] = [
  // --- staff prompts: the numerals the site works through -------------------
  chordRound("l44-staff-c-major", "staff", "C4", "major", "major", 1),
  chordRound("l44-staff-c-minor", "staff", "D4", "minor", "major", 2),
  chordRound("l44-staff-c-dim", "staff", "B4", "diminished", "major", 7),
  chordRound("l44-staff-nm-i", "staff", "C4", "minor", "naturalMinor", 1),
  chordRound("l44-staff-nm-ii", "staff", "D4", "diminished", "naturalMinor", 2),
  chordRound("l44-staff-nm-iii", "staff", "Eb4", "major", "naturalMinor", 3),
  chordRound("l44-staff-nm-v", "staff", "G4", "minor", "naturalMinor", 5),
  chordRound("l44-staff-nm-vi", "staff", "Ab4", "major", "naturalMinor", 6),
  chordRound("l44-staff-nm-vii", "staff", "Bb4", "major", "naturalMinor", 7),
  chordRound("l44-staff-hm-iii", "staff", "Eb4", "augmented", "harmonicMinor", 3),
  chordRound("l44-staff-mm-vi", "staff", "A4", "diminished", "melodicMinor", 6),
  chordRound("l44-staff-mm-iv", "staff", "F4", "major", "melodicMinor", 4),

  // --- keyboard prompts: the site's four anchor examples --------------------
  chordRound("l44-keyboard-c-major", "keyboard", "C4", "major", "major", 1),
  chordRound("l44-keyboard-c-min", "keyboard", "C4", "minor", "naturalMinor", 1),
  chordRound("l44-keyboard-eb-aug", "keyboard", "Eb4", "augmented", "harmonicMinor", 3),
  chordRound("l44-keyboard-d-dim", "keyboard", "D4", "diminished", "naturalMinor", 2),

  // --- text prompts: identification, styles, worked numerals, inversions ----
  {
    id: "l44-text-identify",
    prompt: {
      kind: "text",
      text: "When analyzing music, what identifies each diatonic triad?",
    },
    answer: choices(["A Roman numeral", "A chord symbol", "A note name", "A finger number"], 0),
    rule: "When analyzing music, each diatonic triad is identified by a Roman numeral.",
  },
  {
    id: "l44-text-first-uses",
    prompt: { kind: "text", text: "Which numeral does the first diatonic triad of a scale use?" },
    answer: choices(
      ["The Roman numeral for one", "The Roman numeral for two", "The Roman numeral for five", "The Roman numeral for seven"],
      0,
    ),
    rule: "The first diatonic triad of a scale uses the Roman numeral for one.",
  },
  {
    id: "l44-text-styles",
    prompt: { kind: "text", text: "How does the modern Roman numeral system mark each triad type?" },
    answer: choices(
      ["Different styles for each triad type", "The same numeral for every triad", "Capital letters only", "Numbers instead of letters"],
      0,
    ),
    rule: "The modern Roman numeral system uses different styles for each triad type.",
  },
  {
    id: "l44-text-major-style",
    prompt: { kind: "text", text: "How are major triads written in the modern Roman numeral system?" },
    answer: choices(styleOptions(), 0),
    rule: STYLE_SENTENCE.major,
  },
  {
    id: "l44-text-minor-style",
    prompt: { kind: "text", text: "How are minor triads written in the modern Roman numeral system?" },
    answer: choices(styleOptions(), 1),
    rule: STYLE_SENTENCE.minor,
  },
  {
    id: "l44-text-aug-style",
    prompt: { kind: "text", text: "How are augmented triads written in the modern Roman numeral system?" },
    answer: choices(styleOptions(), 2),
    rule: STYLE_SENTENCE.augmented,
  },
  {
    id: "l44-text-dim-style",
    prompt: { kind: "text", text: "How are diminished triads written in the modern Roman numeral system?" },
    answer: choices(styleOptions(), 3),
    rule: STYLE_SENTENCE.diminished,
  },
  // C major walk-through.
  numeralRound("l44-text-major-i", "major", 1, "major", ["ii", "iv"], 0),
  numeralRound("l44-text-major-ii", "minor", 2, "major", ["I", "V"], 1),
  numeralRound("l44-text-major-vii", "diminished", 7, "major", ["vi", "VII"], 1),
  // C natural minor walk-through.
  numeralRound("l44-text-nm-i", "minor", 1, "naturalMinor", ["III", "v"], 0),
  numeralRound("l44-text-nm-ii", "diminished", 2, "naturalMinor", ["i", "VI"], 1),
  // Harmonic minor reanalysis.
  numeralRound("l44-text-hm-iii", "augmented", 3, "harmonicMinor", ["III", "III°"], 1),
  numeralRound("l44-text-hm-v", "major", 5, "harmonicMinor", ["iv", "v"], 0),
  // Melodic minor reanalysis.
  numeralRound("l44-text-mm-vi", "diminished", 6, "melodicMinor", ["VI", "vi"], 1),
  numeralRound("l44-text-mm-ii", "minor", 2, "melodicMinor", ["ii°", "III"], 0),
  // Inversion symbols.
  {
    id: "l44-text-first-inv-reason",
    prompt: { kind: "text", text: "Why does a small 6 mark first inversion?" },
    answer: choices(
      ["The root is a generic sixth above the bass note", "The third is a generic sixth above the bass note", "The fifth is a generic sixth above the bass note", "A first inversion has six notes"],
      0,
    ),
    rule: "First inversion is represented by a small 6 after the numeral. This is due to the root being a generic sixth above the bass note.",
  },
  {
    id: "l44-text-second-inv",
    prompt: { kind: "text", text: "Which numbers represent second inversion?" },
    answer: choices(["A small 6 and 4", "A small 6 alone", "A small 7", "A small 2"], 0),
    rule: "Second inversion is represented with both a small 6 and 4, due to the root and third being a generic sixth and fourth above the bass note.",
  },
  {
    id: "l44-text-first-inv-63",
    prompt: {
      kind: "text",
      text: "Some theorists use both a 6 and a 3 to represent first inversion. Which representation does this system use?",
    },
    answer: choices(["The 6 alone", "A 6 and a 3", "A 6 and a 4", "An a, b, or c suffix"], 0),
    rule: "Some theorists use both a 6 and a 3 to represent first inversion, but this system will use the 6 alone.",
  },
];

export const lesson44: LessonModule = {
  entry: requireLessonEntry(44),
  generateRounds: (rng) =>
    sampleStratifiedRounds(lesson44Pool, REQUIRED_KINDS, rng, ROUND_COUNT),
};

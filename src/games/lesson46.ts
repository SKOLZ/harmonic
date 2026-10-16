import {
  buildSeventh,
  parseNote,
  scientificName,
  type ScaleType,
  type SeventhQuality,
  type TriadQuality,
} from "../lib/theory";
import type { AnswerSpec, Round } from "../lib/rounds/types";
import { requireLessonEntry } from "./catalog";
import { sampleStratifiedRounds } from "./rng";
import type { LessonModule } from "./types";

/**
 * Lesson 46 — Diatonic Seventh Chords.
 *
 * Content source: musictheory.net lesson 46 (slide text pulled from the live
 * `lesson46.js`): "In addition to diatonic triads, every major and minor
 * scale has seven *diatonic seventh chords*." The lesson repeats lesson 43's
 * three-step process with "stack three generic thirds" and then walks every
 * chord of C major ("The first chord is C–E–G–B, a major triad and a major
 * seventh. Therefore, it is a major seventh chord."), every chord of C
 * natural minor, the harmonic minor reanalysis (raised seventh: minor-major,
 * augmented-major, dominant, fully-diminished) and the melodic minor
 * reanalysis (raised sixth: minor, dominant, half-diminished chords).
 *
 * Staff and keyboard spellings come from `buildSeventh` in the theory core —
 * the nineteen unique site spellings are asserted against the live slide
 * text in the tests, so a core-vs-site disagreement fails loudly. Rules
 * restate the site's own formula sentence (triad word + seventh word +
 * conclusion) with quality names taken from the same tables the answers use.
 * The pool is 19 `staff` + 17 `text` + 5 `keyboard` = 41, drawn stratified
 * with one staff and one text round guaranteed per 12-round draw.
 */
const choices = (options: string[], correctIndex: number): AnswerSpec => ({
  kind: "choices",
  options,
  correctIndex,
});

/**
 * The seven types lesson 46 names, in the order its slides walk the major
 * scale and then the reanalysed chords. Every chord round offers all seven.
 */
const TYPE_ORDER: readonly SeventhQuality[] = [
  "majorSeventh",
  "minorSeventh",
  "dominantSeventh",
  "halfDiminishedSeventh",
  "minorMajorSeventh",
  "augmentedMajorSeventh",
  "fullyDiminishedSeventh",
];

/** The site's type names as the slides write them in prose. */
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

/** The base triad each formula names before the seventh is stacked. */
const BASE_TRIAD: Readonly<Record<SeventhQuality, TriadQuality>> = {
  majorSeventh: "major",
  minorSeventh: "minor",
  dominantSeventh: "major",
  halfDiminishedSeventh: "diminished",
  minorMajorSeventh: "minor",
  augmentedMajorSeventh: "augmented",
  fullyDiminishedSeventh: "diminished",
  augmentedSeventh: "augmented",
};

/** The seventh word each formula uses. */
const SEVENTH_WORD: Readonly<Record<SeventhQuality, string>> = {
  majorSeventh: "major seventh",
  minorSeventh: "minor seventh",
  dominantSeventh: "minor seventh",
  halfDiminishedSeventh: "minor seventh",
  minorMajorSeventh: "major seventh",
  augmentedMajorSeventh: "major seventh",
  fullyDiminishedSeventh: "diminished seventh",
  augmentedSeventh: "minor seventh",
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

/** Scale labels as the lesson names its four worked scales. */
const SCALE_LABELS: Readonly<Record<ScaleType, string>> = {
  major: "C major",
  naturalMinor: "C natural minor",
  harmonicMinor: "C harmonic minor",
  melodicMinor: "C melodic minor",
};

/** English "a"/"an" before a word ("an augmented triad"). */
const article = (word: string): string => (/^[aeiou]/i.test(word) ? "an" : "a");

/** "Eb4" → "Eb": the root's name as the site writes it in prose. */
const rootLabel = (root: string): string =>
  scientificName(parseNote(root)).replace(/\d+$/, "");

/** The seventh chord's tones, spelled by the core — never hand-typed. */
const seventh = (root: string, quality: SeventhQuality): string[] =>
  buildSeventh(parseNote(root), quality).map(scientificName);

/** The seven type names on one root: every chord round's options. */
const typeOptions = (root: string): string[] =>
  TYPE_ORDER.map(
    (quality) => `${rootLabel(root)} ${TYPE_DISPLAY[quality]} seventh chord`,
  );

const typeIndex = (quality: SeventhQuality): number => TYPE_ORDER.indexOf(quality);

/**
 * A chord round's rule: the site's own analysis sentence — degree, scale,
 * spelling, triad word, seventh word, conclusion.
 */
const chordRule = (
  quality: SeventhQuality,
  scale: ScaleType,
  degree: number,
  spelling: readonly string[],
): string => {
  const triad = `${BASE_TRIAD[quality]} triad`;
  const seventhWord = SEVENTH_WORD[quality];
  const display = TYPE_DISPLAY[quality];
  return (
    `The ${ORDINALS[degree]} chord of the ${SCALE_LABELS[scale]} scale is spelled ` +
    `${spelling.map((tone) => tone.replace(/\d+$/, "")).join("–")}, ` +
    `${article(triad)} ${triad} and ${article(seventhWord)} ${seventhWord}. ` +
    `Therefore, it is ${article(display)} ${display} seventh chord.`
  );
};

/** One site-worked seventh chord: tones from the core, site rule. */
const chordRound = (
  id: string,
  kind: "staff" | "keyboard",
  root: string,
  quality: SeventhQuality,
  scale: ScaleType,
  degree: number,
): Round => {
  const spelling = seventh(root, quality);
  return {
    id,
    prompt:
      kind === "staff"
        ? { kind: "staff", clef: "treble", notes: spelling, duration: "q", simultaneous: true }
        : { kind: "keyboard", highlight: spelling },
    answer: choices(typeOptions(root), typeIndex(quality)),
    rule: chordRule(quality, scale, degree, spelling),
  };
};

/** Rounds drawn per visit; the pool is larger so replays vary. */
const ROUND_COUNT = 12;

/** Kinds every draw must contain; `sampleStratifiedRounds` enforces it. */
const REQUIRED_KINDS = ["staff", "text"] as const;

export const lesson46Pool: readonly Round[] = [
  // --- staff prompts: the nineteen unique site spellings --------------------
  // C major, all seven chords.
  chordRound("l46-staff-c-maj7", "staff", "C4", "majorSeventh", "major", 1),
  chordRound("l46-staff-d-m7", "staff", "D4", "minorSeventh", "major", 2),
  chordRound("l46-staff-e-m7", "staff", "E4", "minorSeventh", "major", 3),
  chordRound("l46-staff-f-maj7", "staff", "F4", "majorSeventh", "major", 4),
  chordRound("l46-staff-g-dom", "staff", "G4", "dominantSeventh", "major", 5),
  chordRound("l46-staff-a-m7", "staff", "A4", "minorSeventh", "major", 6),
  chordRound("l46-staff-b-hd", "staff", "B4", "halfDiminishedSeventh", "major", 7),
  // C natural minor, all seven chords.
  chordRound("l46-staff-c-m7", "staff", "C4", "minorSeventh", "naturalMinor", 1),
  chordRound("l46-staff-d-hd", "staff", "D4", "halfDiminishedSeventh", "naturalMinor", 2),
  chordRound("l46-staff-eb-maj7", "staff", "Eb4", "majorSeventh", "naturalMinor", 3),
  chordRound("l46-staff-f-m7", "staff", "F4", "minorSeventh", "naturalMinor", 4),
  chordRound("l46-staff-g-m7", "staff", "G4", "minorSeventh", "naturalMinor", 5),
  chordRound("l46-staff-ab-maj7", "staff", "Ab4", "majorSeventh", "naturalMinor", 6),
  chordRound("l46-staff-bb-dom", "staff", "Bb4", "dominantSeventh", "naturalMinor", 7),
  // Reanalysed by raising a tone.
  chordRound("l46-staff-c-mma7", "staff", "C4", "minorMajorSeventh", "harmonicMinor", 1),
  chordRound("l46-staff-eb-am7", "staff", "Eb4", "augmentedMajorSeventh", "harmonicMinor", 3),
  chordRound("l46-staff-b-fdim", "staff", "B4", "fullyDiminishedSeventh", "harmonicMinor", 7),
  chordRound("l46-staff-f-dom", "staff", "F4", "dominantSeventh", "melodicMinor", 4),
  chordRound("l46-staff-a-hd", "staff", "A4", "halfDiminishedSeventh", "melodicMinor", 6),

  // --- keyboard prompts: the site's five anchor examples --------------------
  chordRound("l46-keyboard-c-maj7", "keyboard", "C4", "majorSeventh", "major", 1),
  chordRound("l46-keyboard-c-m7", "keyboard", "C4", "minorSeventh", "naturalMinor", 1),
  chordRound("l46-keyboard-g-dom", "keyboard", "G4", "dominantSeventh", "major", 5),
  chordRound("l46-keyboard-b-hd", "keyboard", "B4", "halfDiminishedSeventh", "major", 7),
  chordRound("l46-keyboard-b-fdim", "keyboard", "B4", "fullyDiminishedSeventh", "harmonicMinor", 7),

  // --- text prompts: definition, process, patterns, reanalysis --------------
  {
    id: "l46-text-definition",
    prompt: {
      kind: "text",
      text: "How many diatonic seventh chords does every major and minor scale have?",
    },
    answer: choices(["Five", "Seven", "Three", "Four"], 1),
    rule: "Every major and minor scale has seven diatonic seventh chords, formed from that scale's notes.",
  },
  {
    id: "l46-text-process-1",
    prompt: {
      kind: "text",
      text: "What is the first step of the process for discovering diatonic seventh chords?",
    },
    answer: choices(
      ["Construct the scale", "Stack three generic thirds", "Analyze the seventh chords", "Raise the seventh tone"],
      0,
    ),
    rule: "To discover the diatonic seventh chords, a three step process must be used. First, construct the scale.",
  },
  {
    id: "l46-text-process-2",
    prompt: { kind: "text", text: "What is the second step of the three step process?" },
    answer: choices(
      ["Stack three generic thirds", "Construct the scale", "Analyze the seventh chords", "Raise the sixth tone"],
      0,
    ),
    rule: "Next, stack three generic thirds on top of each note of the scale.",
  },
  {
    id: "l46-text-process-3",
    prompt: { kind: "text", text: "What is the last step of the three step process?" },
    answer: choices(
      ["Analyze the resulting seventh chords", "Stack three generic thirds", "Construct the scale", "Raise the seventh tone"],
      0,
    ),
    rule: "Finally, analyze the resulting seventh chords by their triads and sevenths.",
  },
  // The major-scale pattern.
  {
    id: "l46-text-major-14",
    prompt: { kind: "text", text: "Which seventh chords are the first and fourth chords of a major scale?" },
    answer: choices(
      ["Major seventh", "Minor seventh", "Dominant seventh", "Half-diminished seventh"],
      0,
    ),
    rule: "The first and fourth chords of a major scale are both major sevenths: a major triad and a major seventh.",
  },
  {
    id: "l46-text-major-236",
    prompt: {
      kind: "text",
      text: "Which seventh chords are the second, third and sixth chords of a major scale?",
    },
    answer: choices(
      ["Major seventh", "Minor seventh", "Dominant seventh", "Half-diminished seventh"],
      1,
    ),
    rule: "The second, third and sixth chords of a major scale are minor sevenths: a minor triad and a minor seventh.",
  },
  {
    id: "l46-text-major-5",
    prompt: { kind: "text", text: "Which seventh chord is the fifth chord of a major scale?" },
    answer: choices(
      ["Major seventh", "Minor seventh", "Dominant seventh", "Half-diminished seventh"],
      2,
    ),
    rule: "The fifth chord of a major scale is a dominant seventh: a major triad and a minor seventh.",
  },
  {
    id: "l46-text-major-7",
    prompt: { kind: "text", text: "Which seventh chord is the seventh chord of a major scale?" },
    answer: choices(
      ["Major seventh", "Minor seventh", "Dominant seventh", "Half-diminished seventh"],
      3,
    ),
    rule: "The seventh chord of a major scale is a half-diminished seventh: a diminished triad and a minor seventh.",
  },
  {
    id: "l46-text-recap-first",
    prompt: { kind: "text", text: "Which seventh chord does a major scale always start with?" },
    answer: choices(
      ["A major seventh", "A minor seventh", "A dominant seventh", "A half-diminished seventh"],
      0,
    ),
    rule: "The first seventh chord of a major scale will always be a major seventh, the second and third seventh chords will always be minor sevenths, etc.",
  },
  {
    id: "l46-text-recap-23",
    prompt: { kind: "text", text: "Which seventh chords are always the second and third chords of a major scale?" },
    answer: choices(
      ["Minor sevenths", "Major sevenths", "Dominant sevenths", "Diminished sevenths"],
      0,
    ),
    rule: "The second and third seventh chords of a major scale will always be minor sevenths.",
  },
  // Natural minor pattern.
  {
    id: "l46-text-nm-i",
    prompt: { kind: "text", text: "Which seventh chord is the first chord of the C natural minor scale?" },
    answer: choices(
      ["Major seventh", "Minor seventh", "Dominant seventh", "Half-diminished seventh"],
      1,
    ),
    rule: "The first chord of C natural minor is C–Eb–G–Bb, a minor triad and a minor seventh. Therefore, it is a minor seventh chord.",
  },
  // Harmonic minor reanalysis.
  {
    id: "l46-text-harmonic-build",
    prompt: { kind: "text", text: "How is natural minor converted to harmonic minor?" },
    answer: choices(
      ["Raise the seventh tone a half step", "Raise the sixth tone a half step", "Lower the second tone a half step", "Raise the third tone a half step"],
      0,
    ),
    rule: "To convert natural minor to harmonic minor, the seventh tone is raised a half step.",
  },
  {
    id: "l46-text-harmonic-i",
    prompt: { kind: "text", text: "Which seventh chord becomes the first chord of harmonic minor?" },
    answer: choices(
      ["Minor-major seventh", "Minor seventh", "Major seventh", "Augmented-major seventh"],
      0,
    ),
    rule: "The first chord of harmonic minor is C–Eb–G–B, a minor triad and a major seventh. Therefore, it is a minor-major seventh chord.",
  },
  {
    id: "l46-text-harmonic-iii",
    prompt: { kind: "text", text: "Which seventh chord becomes the third chord of harmonic minor?" },
    answer: choices(
      ["Minor-major seventh", "Minor seventh", "Major seventh", "Augmented-major seventh"],
      3,
    ),
    rule: "The third chord of harmonic minor is Eb–G–B–D, an augmented triad and a major seventh. Therefore, it is an augmented-major seventh chord.",
  },
  {
    id: "l46-text-harmonic-vii",
    prompt: { kind: "text", text: "Which seventh chord becomes the seventh chord of harmonic minor?" },
    answer: choices(
      ["Fully-diminished seventh", "Half-diminished seventh", "Dominant seventh", "Major seventh"],
      0,
    ),
    rule: "The seventh chord of harmonic minor is B–D–F–Ab, a diminished triad and a diminished seventh. Therefore, it is a fully-diminished seventh chord.",
  },
  // Melodic minor reanalysis.
  {
    id: "l46-text-melodic-build",
    prompt: { kind: "text", text: "How is harmonic minor converted to melodic minor?" },
    answer: choices(
      ["Raise the sixth tone a half step", "Raise the seventh tone a half step", "Lower the third tone a half step", "Raise the fourth tone a half step"],
      0,
    ),
    rule: "To convert harmonic minor to melodic minor, the sixth tone is raised a half step.",
  },
  {
    id: "l46-text-melodic-iv",
    prompt: { kind: "text", text: "Which seventh chord becomes the fourth chord of melodic minor?" },
    answer: choices(
      ["Major seventh", "Minor seventh", "Dominant seventh", "Half-diminished seventh"],
      2,
    ),
    rule: "The fourth chord of melodic minor is F–A–C–Eb, a major triad and a minor seventh. Therefore, it is a dominant seventh chord.",
  },
];

export const lesson46: LessonModule = {
  entry: requireLessonEntry(46),
  generateRounds: (rng) =>
    sampleStratifiedRounds(lesson46Pool, REQUIRED_KINDS, rng, ROUND_COUNT),
};

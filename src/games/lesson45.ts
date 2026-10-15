import {
  buildSeventh,
  parseNote,
  scientificName,
} from "../lib/theory";
import type { AnswerSpec, Round } from "../lib/rounds/types";
import { requireLessonEntry } from "./catalog";
import { sampleStratifiedRounds } from "./rng";
import type { LessonModule } from "./types";

/**
 * Lesson 45 — Seventh Chords.
 *
 * Content source: musictheory.net lesson 45 (slide text pulled from the live
 * `lesson45.js`): "A *seventh chord* is the combination of a triad and an
 * interval of a seventh"; "Five types of seventh chords are commonly used."
 * Then one block per type, each pairing a triad with a seventh and walking
 * three worked spellings on roots C, F# and Ab — dominant seventh ("a major
 * triad and a minor seventh", abbreviated "with a simple 7": C–E–G–Bb,
 * F#–A#–C#–E, Ab–C–Eb–Gb); major seventh ("a major triad and a major
 * seventh", "a capital 'M' and a 7": C–E–G–B, F#–A#–C#–E#, Ab–C–Eb–G);
 * minor seventh ("a minor triad and a minor seventh", "a lower-case 'm' and
 * a 7": C–Eb–G–Bb, F#–A–C#–E, Ab–Cb–Eb–Gb); half-diminished seventh ("a
 * diminished triad and a minor seventh", "a slashed circle and a 7":
 * C–Eb–Gb–Bb, F#–A–C–E, Ab–Cb–Ebb–Gb); diminished seventh ("a diminished
 * triad and a diminished seventh … or fully-diminished seventh chord", "an
 * open circle and a 7": C–Eb–Gb–Bbb, F#–A–C–Eb, Ab–Cb–Ebb–Gbb). The closing
 * chart repeats the five as Dominant 7th, Major 7th, Minor 7th,
 * Half-diminished 7th, Diminished 7th.
 *
 * Corrections to the task's accepted reference, from the live site: the
 * reference defines a seventh chord as "a seventh above the root to a triad"
 * — the site's own words are "the combination of a triad and an interval of a
 * seventh", which the text rounds quote verbatim. The reference says nothing
 * about the five types the lesson is actually built from, so the pool is
 * structured around the site's five formula blocks and all fifteen of its
 * worked spellings.
 *
 * Every staff and keyboard round derives its tones from `buildSeventh` in the
 * theory core — the fifteen spellings are asserted against the site's own
 * slide text in the tests, so a core-vs-site disagreement fails loudly
 * instead of shipping. Rules take their formula words from the slides, so
 * prose cannot drift from the built chords. The pool is 15 `staff` + 12
 * `text` + 5 `keyboard` = 32 and the draw is stratified
 * (`sampleStratifiedRounds`): one staff and one text round are guaranteed in
 * every 12-round draw for every seed.
 */
const choices = (options: string[], correctIndex: number): AnswerSpec => ({
  kind: "choices",
  options,
  correctIndex,
});

/** The five common seventh types — lesson 45's own set from the site's chart. */
type CommonSeventh =
  | "dominantSeventh"
  | "majorSeventh"
  | "minorSeventh"
  | "halfDiminishedSeventh"
  | "fullyDiminishedSeventh";

/** The site's five common types, in the order its slides introduce them. */
const QUALITY_ORDER: readonly CommonSeventh[] = [
  "dominantSeventh",
  "majorSeventh",
  "minorSeventh",
  "halfDiminishedSeventh",
  "fullyDiminishedSeventh",
];

/**
 * The site's formula words for each type: the triad and seventh that
 * combine (lesson 45 slides), how the type is written in prose, and the
 * abbreviation the slides state.
 */
const FORMULA_NAMES: Readonly<
  Record<CommonSeventh, { triad: string; seventh: string; display: string; abbreviation: string }>
> = {
  dominantSeventh: {
    triad: "major triad",
    seventh: "minor seventh",
    display: "dominant",
    abbreviation: "a simple 7",
  },
  majorSeventh: {
    triad: "major triad",
    seventh: "major seventh",
    display: "major",
    abbreviation: "a capital 'M' and a 7",
  },
  minorSeventh: {
    triad: "minor triad",
    seventh: "minor seventh",
    display: "minor",
    abbreviation: "a lower-case 'm' and a 7",
  },
  halfDiminishedSeventh: {
    triad: "diminished triad",
    seventh: "minor seventh",
    display: "half-diminished",
    abbreviation: "a slashed circle and a 7",
  },
  fullyDiminishedSeventh: {
    triad: "diminished triad",
    seventh: "diminished seventh",
    display: "diminished",
    abbreviation: "an open circle and a 7",
  },
};

/** The three roots the site works every type on. */
const ROOTS: readonly { slug: string; note: string }[] = [
  { slug: "c", note: "C4" },
  { slug: "fs", note: "F#4" },
  { slug: "ab", note: "Ab4" },
];

/** The short type slug used in round ids (the site's own visual names). */
const QUALITY_SLUG: Readonly<Record<CommonSeventh, string>> = {
  dominantSeventh: "dom",
  majorSeventh: "maj",
  minorSeventh: "min",
  halfDiminishedSeventh: "hd",
  fullyDiminishedSeventh: "dim",
};

/** The seventh chord's tones, spelled by the core — never hand-typed. */
const seventhChord = (root: string, quality: CommonSeventh): string[] =>
  buildSeventh(parseNote(root), quality).map(scientificName);

/** "Eb4" → "Eb": the root's name as the site writes it in prose. */
const rootLabel = (root: string): string =>
  scientificName(parseNote(root)).replace(/\d+$/, "");

/** Tones without octaves, joined the way the site writes them: C–E–G–Bb. */
const spelling = (notes: readonly string[]): string =>
  notes.map((tone) => tone.replace(/\d+$/, "")).join("–");

/** The five type names on one root: the options every chord round offers. */
const qualityOptions = (root: string): string[] =>
  QUALITY_ORDER.map((quality) => `${rootLabel(root)} ${FORMULA_NAMES[quality].display} seventh chord`);

const qualityIndex = (quality: CommonSeventh): number => QUALITY_ORDER.indexOf(quality);

/**
 * Staff/keyboard rule: the site's own formula ("a major triad and a minor
 * seventh combine to form a dominant seventh chord") applied to this exact
 * spelling.
 */
const chordRule = (root: string, quality: CommonSeventh): string => {
  const { triad, seventh, display } = FORMULA_NAMES[quality];
  return (
    `The ${display} seventh chord on ${rootLabel(root)} is spelled ` +
    `${spelling(seventhChord(root, quality))}: a ${triad} combined with a ${seventh}.`
  );
};

/** Rounds drawn per visit; the pool is larger so replays vary. */
const ROUND_COUNT = 12;

/** Kinds every draw must contain; `sampleStratifiedRounds` enforces it. */
const REQUIRED_KINDS = ["staff", "text"] as const;

/** A staff round: name the seventh chord written on the page. */
const staffRound = (rootSlug: string, root: string, quality: CommonSeventh): Round => ({
  id: `l45-staff-${rootSlug}-${QUALITY_SLUG[quality]}`,
  prompt: { kind: "staff", clef: "treble", notes: seventhChord(root, quality), duration: "q", simultaneous: true },
  answer: choices(qualityOptions(root), qualityIndex(quality)),
  rule: chordRule(root, quality),
});

/** A keyboard round: the chord tones lit, the leftmost key is the root. */
const keyboardRound = (rootSlug: string, root: string, quality: CommonSeventh): Round => ({
  id: `l45-keyboard-${rootSlug}-${QUALITY_SLUG[quality]}`,
  prompt: { kind: "keyboard", highlight: seventhChord(root, quality) },
  answer: choices(qualityOptions(root), qualityIndex(quality)),
  rule: chordRule(root, quality),
});

export const lesson45Pool: readonly Round[] = [
  // --- staff prompts: the site's fifteen worked spellings -------------------
  ...ROOTS.flatMap(({ slug, note }) =>
    QUALITY_ORDER.map((quality) => staffRound(slug, note, quality)),
  ),

  // --- keyboard prompts: the site's five C-rooted examples ------------------
  ...QUALITY_ORDER.map((quality) => keyboardRound("c", "C4", quality)),

  // --- text prompts: the definition, the count, five formulas, five abbrevs -
  {
    id: "l45-text-definition",
    prompt: { kind: "text", text: "What is a seventh chord?" },
    answer: choices(
      ["The combination of a triad and an interval of a seventh", "Any chord with five or more notes", "A triad with a doubled root", "An interval spanning seven half steps"],
      0,
    ),
    rule: "A seventh chord is the combination of a triad and an interval of a seventh.",
  },
  {
    id: "l45-text-count",
    prompt: { kind: "text", text: "How many types of seventh chords are commonly used?" },
    answer: choices(["Five", "Three", "Four", "Seven"], 0),
    rule: "Five types of seventh chords are commonly used: dominant, major, minor, half-diminished, and diminished.",
  },
  {
    id: "l45-text-dom-formula",
    prompt: {
      kind: "text",
      text: "Which pair of parts combines to form a dominant seventh chord?",
    },
    answer: choices(
      ["A major triad and a minor seventh", "A major triad and a major seventh", "A minor triad and a minor seventh", "A diminished triad and a minor seventh"],
      0,
    ),
    rule: "A major triad and a minor seventh combine to form a dominant seventh chord.",
  },
  {
    id: "l45-text-dom-abbrev",
    prompt: { kind: "text", text: "How is a dominant seventh chord abbreviated?" },
    answer: choices(["A simple 7", "A capital 'M' and a 7", "A lower-case 'm' and a 7", "An open circle and a 7"], 0),
    rule: "Dominant seventh chords are abbreviated with a simple 7.",
  },
  {
    id: "l45-text-maj-formula",
    prompt: { kind: "text", text: "Which pair of parts combines to form a major seventh chord?" },
    answer: choices(
      ["A major triad and a major seventh", "A major triad and a minor seventh", "A minor triad and a major seventh", "A diminished triad and a major seventh"],
      0,
    ),
    rule: "A major triad and a major seventh combine to form a major seventh chord.",
  },
  {
    id: "l45-text-maj-abbrev",
    prompt: { kind: "text", text: "How is a major seventh chord abbreviated?" },
    answer: choices(["A capital 'M' and a 7", "A simple 7", "A lower-case 'm' and a 7", "A plus and a 7"], 0),
    rule: "Major seventh chords are abbreviated with a capital 'M' and a 7.",
  },
  {
    id: "l45-text-min-formula",
    prompt: { kind: "text", text: "Which pair of parts combines to form a minor seventh chord?" },
    answer: choices(
      ["A minor triad and a minor seventh", "A minor triad and a major seventh", "A major triad and a minor seventh", "A diminished triad and a diminished seventh"],
      0,
    ),
    rule: "A minor triad and a minor seventh combine to form a minor seventh chord.",
  },
  {
    id: "l45-text-min-abbrev",
    prompt: { kind: "text", text: "How is a minor seventh chord abbreviated?" },
    answer: choices(["A lower-case 'm' and a 7", "A capital 'M' and a 7", "A simple 7", "A slashed circle and a 7"], 0),
    rule: "Minor seventh chords are abbreviated with a lower-case 'm' and a 7.",
  },
  {
    id: "l45-text-hd-formula",
    prompt: {
      kind: "text",
      text: "Which pair of parts combines to form a half-diminished seventh chord?",
    },
    answer: choices(
      ["A diminished triad and a minor seventh", "A diminished triad and a diminished seventh", "A major triad and a minor seventh", "A minor triad and a minor seventh"],
      0,
    ),
    rule: "A diminished triad and a minor seventh combine to form a half-diminished seventh chord.",
  },
  {
    id: "l45-text-hd-abbrev",
    prompt: { kind: "text", text: "How is a half-diminished seventh chord abbreviated?" },
    answer: choices(["A slashed circle and a 7", "An open circle and a 7", "A simple 7", "A lower-case 'm' and a 7"], 0),
    rule: "Half-diminished seventh chords are abbreviated with a slashed circle and a 7.",
  },
  {
    id: "l45-text-dim-formula",
    prompt: {
      kind: "text",
      text: "Which pair of parts combines to form a diminished seventh chord?",
    },
    answer: choices(
      ["A diminished triad and a diminished seventh", "A diminished triad and a minor seventh", "A minor triad and a diminished seventh", "A major triad and a major seventh"],
      0,
    ),
    rule: "A diminished triad and a diminished seventh combine to form a diminished seventh chord, also called a fully-diminished seventh chord.",
  },
  {
    id: "l45-text-dim-abbrev",
    prompt: { kind: "text", text: "How is a diminished seventh chord abbreviated?" },
    answer: choices(["An open circle and a 7", "A slashed circle and a 7", "A plus and a 7", "A capital 'M' and a 7"], 0),
    rule: "Diminished seventh chords are abbreviated with an open circle and a 7.",
  },
];

export const lesson45: LessonModule = {
  entry: requireLessonEntry(45),
  generateRounds: (rng) =>
    sampleStratifiedRounds(lesson45Pool, REQUIRED_KINDS, rng, ROUND_COUNT),
};

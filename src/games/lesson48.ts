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
 * Lesson 48 — More Seventh Chords.
 *
 * Content source: musictheory.net lesson 48 (slide text pulled from the live
 * `lesson48.js`): "Additional types of seventh chords can occur in popular
 * music and jazz"; "Let's learn about three of these additional types." The
 * three the site names are minor-major seventh ("a minor triad and a major
 * seventh", abbreviated "with a lower-case 'm', capital 'M', and a 7":
 * C–Eb–G–B, F#–A–C#–E#, Ab–Cb–Eb–G), augmented-major seventh ("an augmented
 * triad and a major seventh", "with a plus, capital 'M', and a 7":
 * C–E–G#–B, F#–A#–Cx–E#, Ab–C–E–G), and augmented seventh ("an augmented
 * triad and a minor seventh", "with a plus and a 7": C–E–G#–Bb,
 * F#–A#–Cx–E, Ab–C–E–Gb). The closing chart labels them Minor-major 7th,
 * Augmented-major 7th, Augmented 7th — and repeats the five from lesson 45
 * alongside, which is why this lesson calls its own subject "the additional
 * types covered in this lesson".
 *
 * Corrections to the task's accepted reference, from the live site: the
 * reference says only "the quality families — verify which ones the site
 * actually names". Verified: the site names exactly three additional types
 * (minor-major, augmented-major, augmented), frames them as popular-music
 * and jazz chords, and distinguishes each by pairing one of the four triad
 * types with one of the seventh intervals — the augmented triad appears
 * twice, split by a major versus a minor seventh, and that contrast is the
 * one distinction the pool quizzes directly.
 *
 * Every staff and keyboard round derives its tones from `buildSeventh` in the
 * theory core — the nine spellings are asserted against the site's own slide
 * text in the tests, so a core-vs-site disagreement fails loudly instead of
 * shipping. Rules take their formula words from the slides, so prose cannot
 * drift from the built chords. The pool is 9 `staff` + 12 `text` + 3
 * `keyboard` = 24 and the draw is stratified (`sampleStratifiedRounds`): one
 * staff and one text round are guaranteed in every 12-round draw for every
 * seed.
 */
const choices = (options: string[], correctIndex: number): AnswerSpec => ({
  kind: "choices",
  options,
  correctIndex,
});

/** The three additional seventh types — lesson 48's own set from the site. */
type AdditionalSeventh =
  | "minorMajorSeventh"
  | "augmentedMajorSeventh"
  | "augmentedSeventh";

/** The site's three additional types, in the order its slides introduce them. */
const QUALITY_ORDER: readonly AdditionalSeventh[] = [
  "minorMajorSeventh",
  "augmentedMajorSeventh",
  "augmentedSeventh",
];

/**
 * The site's formula words for each type: the triad and seventh that
 * combine (lesson 48 slides), how the type is written in prose, and the
 * abbreviation the slides state.
 */
const FORMULA_NAMES: Readonly<
  Record<AdditionalSeventh, { triad: string; seventh: string; display: string; abbreviation: string }>
> = {
  minorMajorSeventh: {
    triad: "minor triad",
    seventh: "major seventh",
    display: "minor-major",
    abbreviation: "a lower-case 'm', capital 'M', and a 7",
  },
  augmentedMajorSeventh: {
    triad: "augmented triad",
    seventh: "major seventh",
    display: "augmented-major",
    abbreviation: "a plus, capital 'M', and a 7",
  },
  augmentedSeventh: {
    triad: "augmented triad",
    seventh: "minor seventh",
    display: "augmented",
    abbreviation: "a plus and a 7",
  },
};

/** The three roots the site works every type on. */
const ROOTS: readonly { slug: string; note: string }[] = [
  { slug: "c", note: "C4" },
  { slug: "fs", note: "F#4" },
  { slug: "ab", note: "Ab4" },
];

/** The short type slug used in round ids (the site's own visual names). */
const QUALITY_SLUG: Readonly<Record<AdditionalSeventh, string>> = {
  minorMajorSeventh: "mm",
  augmentedMajorSeventh: "am",
  augmentedSeventh: "aug",
};

/** The seventh chord's tones, spelled by the core — never hand-typed. */
const seventhChord = (root: string, quality: AdditionalSeventh): string[] =>
  buildSeventh(parseNote(root), quality).map(scientificName);

/** "Eb4" → "Eb": the root's name as the site writes it in prose. */
const rootLabel = (root: string): string =>
  scientificName(parseNote(root)).replace(/\d+$/, "");

/** Tones without octaves, joined the way the site writes them: C–Eb–G–B. */
const spelling = (notes: readonly string[]): string =>
  notes.map((tone) => tone.replace(/\d+$/, "")).join("–");

/** The three type names on one root: the options every chord round offers. */
const qualityOptions = (root: string): string[] =>
  QUALITY_ORDER.map(
    (quality) => `${rootLabel(root)} ${FORMULA_NAMES[quality].display} seventh chord`,
  );

const qualityIndex = (quality: AdditionalSeventh): number => QUALITY_ORDER.indexOf(quality);

/**
 * Staff/keyboard rule: the site's own formula ("a minor triad and a major
 * seventh combine to form a minor-major seventh chord") applied to this
 * exact spelling.
 */
const chordRule = (root: string, quality: AdditionalSeventh): string => {
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

/** A staff round: name the additional seventh chord written on the page. */
const staffRound = (rootSlug: string, root: string, quality: AdditionalSeventh): Round => ({
  id: `l48-staff-${rootSlug}-${QUALITY_SLUG[quality]}`,
  prompt: { kind: "staff", clef: "treble", notes: seventhChord(root, quality), duration: "q", simultaneous: true },
  answer: choices(qualityOptions(root), qualityIndex(quality)),
  rule: chordRule(root, quality),
});

/** A keyboard round: the chord tones lit, the leftmost key is the root. */
const keyboardRound = (rootSlug: string, root: string, quality: AdditionalSeventh): Round => ({
  id: `l48-keyboard-${rootSlug}-${QUALITY_SLUG[quality]}`,
  prompt: { kind: "keyboard", highlight: seventhChord(root, quality) },
  answer: choices(qualityOptions(root), qualityIndex(quality)),
  rule: chordRule(root, quality),
});

export const lesson48Pool: readonly Round[] = [
  // --- staff prompts: the site's nine worked spellings ----------------------
  ...ROOTS.flatMap(({ slug, note }) =>
    QUALITY_ORDER.map((quality) => staffRound(slug, note, quality)),
  ),

  // --- keyboard prompts: the site's three C-rooted examples -----------------
  ...QUALITY_ORDER.map((quality) => keyboardRound("c", "C4", quality)),

  // --- text prompts: context, three formulas, three abbreviations, names ----
  {
    id: "l48-text-occurrence",
    prompt: {
      kind: "text",
      text: "Where do the additional types of seventh chords commonly occur?",
    },
    answer: choices(["Popular music and jazz", "Classical church music", "Twelve-tone serialism", "Only in bass clef"], 0),
    rule: "Additional types of seventh chords can occur in popular music and jazz.",
  },
  {
    id: "l48-text-count",
    prompt: { kind: "text", text: "How many additional types of seventh chords does this lesson teach?" },
    answer: choices(["Three", "Five", "Two", "Four"], 0),
    rule: "This lesson teaches three additional types of seventh chords: minor-major, augmented-major, and augmented.",
  },
  {
    id: "l48-text-mm-formula",
    prompt: {
      kind: "text",
      text: "Which pair of parts combines to form a minor-major seventh chord?",
    },
    answer: choices(
      ["A minor triad and a major seventh", "A major triad and a major seventh", "A minor triad and a minor seventh", "An augmented triad and a major seventh"],
      0,
    ),
    rule: "A minor triad and a major seventh combine to form a minor-major seventh chord.",
  },
  {
    id: "l48-text-am-formula",
    prompt: {
      kind: "text",
      text: "Which pair of parts combines to form an augmented-major seventh chord?",
    },
    answer: choices(
      ["An augmented triad and a major seventh", "An augmented triad and a minor seventh", "A major triad and a major seventh", "A minor triad and a major seventh"],
      0,
    ),
    rule: "An augmented triad and a major seventh combine to form an augmented-major seventh chord.",
  },
  {
    id: "l48-text-aug-formula",
    prompt: {
      kind: "text",
      text: "Which pair of parts combines to form an augmented seventh chord?",
    },
    answer: choices(
      ["An augmented triad and a minor seventh", "An augmented triad and a major seventh", "A diminished triad and a minor seventh", "A minor triad and a minor seventh"],
      0,
    ),
    rule: "An augmented triad and a minor seventh combine to form an augmented seventh chord.",
  },
  {
    id: "l48-text-mm-abbrev",
    prompt: { kind: "text", text: "How is a minor-major seventh chord abbreviated?" },
    answer: choices(
      ["A lower-case 'm', capital 'M', and a 7", "A plus, capital 'M', and a 7", "A plus and a 7", "A simple 7"],
      0,
    ),
    rule: "Minor-major seventh chords are abbreviated with a lower-case 'm', capital 'M', and a 7.",
  },
  {
    id: "l48-text-am-abbrev",
    prompt: { kind: "text", text: "How is an augmented-major seventh chord abbreviated?" },
    answer: choices(
      ["A plus, capital 'M', and a 7", "A lower-case 'm', capital 'M', and a 7", "A plus and a 7", "A capital 'M' and a 7"],
      0,
    ),
    rule: "Augmented-major seventh chords are abbreviated with a plus, capital 'M', and a 7.",
  },
  {
    id: "l48-text-aug-abbrev",
    prompt: { kind: "text", text: "How is an augmented seventh chord abbreviated?" },
    answer: choices(
      ["A plus and a 7", "A plus, capital 'M', and a 7", "A slashed circle and a 7", "A lower-case 'm' and a 7"],
      0,
    ),
    rule: "Augmented seventh chords are abbreviated with a plus and a 7.",
  },
  {
    id: "l48-text-mm-name",
    prompt: {
      kind: "text",
      text: "Which seventh chord is a minor triad topped by a major seventh?",
    },
    answer: choices(
      ["A minor-major seventh chord", "A major seventh chord", "A minor seventh chord", "A dominant seventh chord"],
      0,
    ),
    rule: "A minor triad topped by a major seventh makes a minor-major seventh chord, spelled C–Eb–G–B on C.",
  },
  {
    id: "l48-text-am-name",
    prompt: {
      kind: "text",
      text: "Which seventh chord is an augmented triad topped by a major seventh?",
    },
    answer: choices(
      ["An augmented-major seventh chord", "An augmented seventh chord", "A major seventh chord", "A dominant seventh chord"],
      0,
    ),
    rule: "An augmented triad topped by a major seventh makes an augmented-major seventh chord, spelled C–E–G#–B on C.",
  },
  {
    id: "l48-text-aug-name",
    prompt: {
      kind: "text",
      text: "Which seventh chord is an augmented triad topped by a minor seventh?",
    },
    answer: choices(
      ["An augmented seventh chord", "An augmented-major seventh chord", "A diminished seventh chord", "A half-diminished seventh chord"],
      0,
    ),
    rule: "An augmented triad topped by a minor seventh makes an augmented seventh chord, spelled C–E–G#–Bb on C.",
  },
  {
    id: "l48-text-distinction",
    prompt: {
      kind: "text",
      text: "How does an augmented seventh chord differ from an augmented-major seventh chord?",
    },
    answer: choices(
      ["It has a minor seventh instead of a major seventh", "It has a major seventh instead of a minor seventh", "It uses a diminished triad instead of an augmented triad", "It omits the third"],
      0,
    ),
    rule: "Both chords sit on an augmented triad: the augmented seventh adds a minor seventh, while the augmented-major seventh adds a major seventh.",
  },
];

export const lesson48: LessonModule = {
  entry: requireLessonEntry(48),
  generateRounds: (rng) =>
    sampleStratifiedRounds(lesson48Pool, REQUIRED_KINDS, rng, ROUND_COUNT),
};

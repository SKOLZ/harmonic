import {
  buildTriad,
  parseNote,
  scientificName,
  type ScaleType,
  type TriadQuality,
} from "../lib/theory";
import type { AnswerSpec, Round } from "../lib/rounds/types";
import { requireLessonEntry } from "./catalog";
import { sampleStratifiedRounds } from "./rng";
import type { LessonModule } from "./types";

/**
 * Lesson 43 — Diatonic Triads.
 *
 * Content source: musictheory.net lesson 43 (slide text pulled from the live
 * `lesson43.js`): "Every major and minor scale has seven special triads,
 * called *diatonic triads*, which are formed from that scale's notes";
 * "To discover the diatonic triads, a three step process must be used" —
 * "First, construct the scale", "Next, stack two generic thirds on top of
 * each note", "Finally, analyze the resulting triads." Every chord slide
 * states its own intervals and conclusion ("The first triad is C–E–G, a
 * major third and a perfect fifth. Therefore, the triad is major."), the
 * recap pins the major-scale pattern, and the harmonic and melodic minor
 * walk-throughs reanalyze the thirds, fifths, sevenths (raised seventh) and
 * the second, fourth, sixth (raised sixth).
 *
 * Staff and keyboard spellings come from `buildTriad` in the theory core —
 * the sixteen site spellings are asserted against the live slide text in the
 * tests, so a core-vs-site disagreement fails loudly. Rules take their
 * interval words from the site's own sentences and restate the quality the
 * core detects, so prose cannot drift from the built chords. The pool is 16
 * `staff` + 16 `text` + 4 `keyboard` = 36 and the draw is stratified
 * (`sampleStratifiedRounds`): one staff and one text round are guaranteed in
 * every 12-round draw.
 */
const choices = (options: string[], correctIndex: number): AnswerSpec => ({
  kind: "choices",
  options,
  correctIndex,
});

/** The site's four triad qualities, in the order its slides introduce them. */
const QUALITY_ORDER: readonly TriadQuality[] = ["major", "minor", "augmented", "diminished"];

/** The site's interval words per quality (lesson 43 slides use these). */
const INTERVAL_WORDS: Readonly<Record<TriadQuality, { third: string; fifth: string }>> = {
  major: { third: "major third", fifth: "perfect fifth" },
  minor: { third: "minor third", fifth: "perfect fifth" },
  augmented: { third: "major third", fifth: "augmented fifth" },
  diminished: { third: "minor third", fifth: "diminished fifth" },
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

/** English "a"/"an" before a word ("an augmented fifth"). */
const article = (word: string): string => (/^[aeiou]/i.test(word) ? "an" : "a");

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

/**
 * A chord round's rule: the site's reanalysis sentence — degree, scale,
 * spelling, interval words, conclusion — rebuilt from site words.
 */
const chordRule = (
  quality: TriadQuality,
  scale: ScaleType,
  degree: number,
  spelling: readonly string[],
): string => {
  const { third, fifth } = INTERVAL_WORDS[quality];
  return (
    `The ${ORDINALS[degree]} triad of the ${SCALE_LABELS[scale]} scale is spelled ` +
    `${spelling.map((tone) => tone.replace(/\d+$/, "")).join("–")}, ` +
    `${article(third)} ${third} and ${article(fifth)} ${fifth}. ` +
    `Therefore, the triad is ${quality}.`
  );
};

/** One site-worked triad: tones from the core, rule from the site's words. */
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
    answer: choices(qualityOptions(root), qualityIndex(quality)),
    rule: chordRule(quality, scale, degree, spelling),
  };
};

/** Rounds drawn per visit; the pool is larger so replays vary. */
const ROUND_COUNT = 12;

/** Kinds every draw must contain; `sampleStratifiedRounds` enforces it. */
const REQUIRED_KINDS = ["staff", "text"] as const;

export const lesson43Pool: readonly Round[] = [
  // --- staff prompts: the sixteen triads the site spells out ----------------
  // C major, all seven degrees.
  chordRound("l43-staff-c-major", "staff", "C4", "major", "major", 1),
  chordRound("l43-staff-d-minor", "staff", "D4", "minor", "major", 2),
  chordRound("l43-staff-e-minor", "staff", "E4", "minor", "major", 3),
  chordRound("l43-staff-f-major", "staff", "F4", "major", "major", 4),
  chordRound("l43-staff-g-major", "staff", "G4", "major", "major", 5),
  chordRound("l43-staff-a-minor", "staff", "A4", "minor", "major", 6),
  chordRound("l43-staff-b-dim", "staff", "B4", "diminished", "major", 7),
  // C natural minor, all seven degrees.
  chordRound("l43-staff-c-min", "staff", "C4", "minor", "naturalMinor", 1),
  chordRound("l43-staff-d-dim", "staff", "D4", "diminished", "naturalMinor", 2),
  chordRound("l43-staff-eb-major", "staff", "Eb4", "major", "naturalMinor", 3),
  chordRound("l43-staff-f-min", "staff", "F4", "minor", "naturalMinor", 4),
  chordRound("l43-staff-g-min", "staff", "G4", "minor", "naturalMinor", 5),
  chordRound("l43-staff-ab-major", "staff", "Ab4", "major", "naturalMinor", 6),
  chordRound("l43-staff-bb-major", "staff", "Bb4", "major", "naturalMinor", 7),
  // Reanalysed by raising a tone.
  chordRound("l43-staff-eb-aug", "staff", "Eb4", "augmented", "harmonicMinor", 3),
  chordRound("l43-staff-a-dim", "staff", "A4", "diminished", "melodicMinor", 6),

  // --- keyboard prompts: the site's four anchor examples --------------------
  chordRound("l43-keyboard-c-major", "keyboard", "C4", "major", "major", 1),
  chordRound("l43-keyboard-c-min", "keyboard", "C4", "minor", "naturalMinor", 1),
  chordRound("l43-keyboard-eb-aug", "keyboard", "Eb4", "augmented", "harmonicMinor", 3),
  chordRound("l43-keyboard-b-dim", "keyboard", "B4", "diminished", "major", 7),

  // --- text prompts: definition, process, pattern, reanalysis ---------------
  {
    id: "l43-text-definition",
    prompt: {
      kind: "text",
      text: "What do we call the seven special triads every major and minor scale forms from its own notes?",
    },
    answer: choices(
      [
        "Seven special triads formed from a scale's notes",
        "Five chromatic chords formed outside the scale",
        "Only the tonic triad formed on the first degree",
        "Four secondary chords borrowed from another key",
      ],
      0,
    ),
    rule: "Every major and minor scale has seven special triads, called diatonic triads, which are formed from that scale's notes.",
  },
  {
    id: "l43-text-count",
    prompt: { kind: "text", text: "How many diatonic triads does a scale have?" },
    answer: choices(["Four", "Five", "Seven", "Three"], 2),
    rule: "Every major and minor scale has exactly seven diatonic triads, one on each scale degree.",
  },
  {
    id: "l43-text-process-1",
    prompt: {
      kind: "text",
      text: "To discover the diatonic triads, a three step process must be used. What is the first step?",
    },
    answer: choices(["Construct the scale", "Raise the seventh tone", "Invert the tonic", "Mark the key signature"], 0),
    rule: "To discover the diatonic triads, a three step process must be used. First, construct the scale.",
  },
  {
    id: "l43-text-process-2",
    prompt: { kind: "text", text: "What is the second step of the three step process?" },
    answer: choices(
      ["Stack two generic thirds on top of each note", "Analyze the resulting triads", "Construct the scale", "Play the chords in sequence"],
      0,
    ),
    rule: "Next, stack two generic thirds on top of each note of the scale.",
  },
  {
    id: "l43-text-process-3",
    prompt: { kind: "text", text: "What is the last step of the three step process?" },
    answer: choices(
      ["Analyze the resulting triads", "Stack two generic thirds", "Construct the scale", "Raise a tone a half step"],
      0,
    ),
    rule: "Finally, analyze the resulting triads by their thirds and fifths.",
  },
  {
    id: "l43-text-major-recap",
    prompt: { kind: "text", text: "Which triads of a major scale are always minor?" },
    answer: choices(
      ["The second and third", "The first and fourth", "The third and fifth", "The sixth and seventh"],
      0,
    ),
    rule: "The first triad of a major scale will always be major, the second and third triads will always be minor, etc.",
  },
  {
    id: "l43-text-major-vii",
    prompt: { kind: "text", text: "What quality is the seventh triad of a major scale?" },
    answer: choices(["Major", "Minor", "Diminished", "Augmented"], 2),
    rule: "The seventh triad of a major scale is diminished: B–D–F is spelled a minor third and a diminished fifth.",
  },
  {
    id: "l43-text-minor-majors",
    prompt: { kind: "text", text: "Which triads of the C natural minor scale are always major?" },
    answer: choices(
      ["The third, sixth and seventh", "The first and fifth", "The second and fourth", "Only the fifth"],
      0,
    ),
    rule: "In the C natural minor scale the third, sixth and seventh triads are major: Eb–G–Bb, Ab–C–Eb and Bb–D–F.",
  },
  {
    id: "l43-text-minor-ii",
    prompt: { kind: "text", text: "What quality is the second triad of a natural minor scale?" },
    answer: choices(["Major", "Minor", "Diminished", "Augmented"], 2),
    rule: "The second triad of a natural minor scale is diminished: D–F–Ab is spelled a minor third and a diminished fifth.",
  },
  {
    id: "l43-text-harmonic-build",
    prompt: { kind: "text", text: "How is natural minor converted to harmonic minor?" },
    answer: choices(
      ["Raise the seventh tone a half step", "Raise the sixth tone a half step", "Lower the second tone a half step", "Raise the third tone a half step"],
      0,
    ),
    rule: "To convert natural minor to harmonic minor, the seventh tone is raised a half step.",
  },
  {
    id: "l43-text-harmonic-reanalyzed",
    prompt: { kind: "text", text: "Which harmonic minor triads need reanalysis after the seventh tone is raised?" },
    answer: choices(
      ["The third, fifth and seventh", "The first, second and third", "The fourth and sixth", "All seven triads"],
      0,
    ),
    rule: "Since the third, fifth, and seventh chords have been altered, they need to be reanalyzed.",
  },
  {
    id: "l43-text-harmonic-iii",
    prompt: { kind: "text", text: "What quality does the third triad become in harmonic minor?" },
    answer: choices(["Major", "Minor", "Diminished", "Augmented"], 3),
    rule: "The third triad of harmonic minor is now Eb–G–B, a major third and an augmented fifth, therefore it is augmented.",
  },
  {
    id: "l43-text-harmonic-v",
    prompt: { kind: "text", text: "What quality does the fifth triad become in harmonic minor?" },
    answer: choices(["Major", "Minor", "Diminished", "Augmented"], 0),
    rule: "The fifth triad of harmonic minor is now G–B–D, a major third and a perfect fifth, therefore it is major.",
  },
  {
    id: "l43-text-melodic-build",
    prompt: { kind: "text", text: "How is harmonic minor converted to melodic minor?" },
    answer: choices(
      ["Raise the sixth tone a half step", "Raise the seventh tone a half step", "Lower the fourth tone a half step", "Raise the second tone a half step"],
      0,
    ),
    rule: "To convert harmonic minor to melodic minor, the sixth tone is raised a half step.",
  },
  {
    id: "l43-text-melodic-reanalyzed",
    prompt: { kind: "text", text: "Which melodic minor triads need reanalysis after the sixth tone is raised?" },
    answer: choices(
      ["The second, fourth and sixth", "The third, fifth and seventh", "The first and seventh", "All seven triads"],
      0,
    ),
    rule: "Since the second, fourth, and sixth chords have been altered, they need to be reanalyzed.",
  },
  {
    id: "l43-text-melodic-vi",
    prompt: { kind: "text", text: "What quality does the sixth triad become in melodic minor?" },
    answer: choices(["Major", "Minor", "Diminished", "Augmented"], 2),
    rule: "The sixth triad of melodic minor is now A–C–Eb, a minor third and a diminished fifth, therefore it is diminished.",
  },
];

export const lesson43: LessonModule = {
  entry: requireLessonEntry(43),
  generateRounds: (rng) =>
    sampleStratifiedRounds(lesson43Pool, REQUIRED_KINDS, rng, ROUND_COUNT),
};

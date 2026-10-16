import {
  identifyInversion,
  inversionFigure,
  letterIndex,
  parseNote,
  romanNumeral,
  romanNumeralSeventh,
  type SeventhQuality,
  type TriadQuality,
} from "../lib/theory";
import type { AnswerSpec, Round } from "../lib/rounds/types";
import { requireLessonEntry } from "./catalog";
import { sampleStratifiedRounds } from "./rng";
import type { LessonModule } from "./types";

/**
 * Lesson 62 — Analysis: Auld Lang Syne.
 *
 * Content source: musictheory.net lesson 62 (slide text pulled from the live
 * `lesson62.js`). The lesson analyses an F-major excerpt step by step: "First,
 * we must determine the key. The key signature contains one flat, so two
 * possibilities exist: F major or D minor"; "Since this is I in F Major, we
 * are most likely in that key"; the first chord repeats "there is no need to
 * write it again"; the second chord "contains C–C–D–F; this doesn't fit
 * nicely into a triad, so the analysis skips it for now" and later "can be
 * analyze[d] … as A continuation of the V with two neighboring tones" (and the
 * escape tone beside it); the site's V7 reminder that "when voicing seventh
 * chords, composers sometimes leave out the fifth" — here "the bottom three
 * notes are the root, third, and seventh of a C dominant seventh chord. Only
 * the G (the fifth) is missing", with a nonharmonic A above — and the closing
 * check "V chords commonly resolve to I".
 *
 * SCOPE + CONTRACT GAP (reported to the parent, not invented here): the site
 * presents a continuous multi-measure score with bar lines, a melodic line and
 * a running analysis down the page. The existing `Round` contract has ONE
 * staff prompt that renders a single stacked chord, so this module faithfully
 * captures the part that IS a single prompt/answer pair: each chord's
 * Roman-numeral analysis in F major as one stacked chord under the F key
 * signature (same staff + choices shape as lessons 44/49/52), plus the
 * lesson's key-determination, shorthand, skipped-chord, omitted-fifth and
 * escape-tone conclusions as text rounds. A multi-measure score prompt kind is
 * a contract decision handed back to the parent and is deliberately NOT
 * invented here.
 *
 * The site's engraved score is an image, so the exact vertical spacing of
 * every chord is reconstructed; the analytically decisive facts — pitch
 * classes, which tone is the bass, and the analysis symbols the site states —
 * match the slide text and are asserted against the core (`romanNumeral`,
 * `romanNumeralSeventh`, `inversionFigure`, `identifyInversion`). Every symbol
 * the site writes is unfigured (I, V, IV, V7), so the core must find root
 * position in every one of those voicings. The pool is 7 `staff` + 8 `text` =
 * 15, drawn stratified with one staff and one text round guaranteed per
 * 12-round draw.
 *
 * Note on site wording: slide 21 reads "can be analyze". This module ships the
 * corrected participle and the typo is reported to the parent rather than
 * encoded.
 */
const choices = (options: string[], correctIndex: number): AnswerSpec => ({
  kind: "choices",
  options,
  correctIndex,
});

/** The analysis key every chord is read in (the lesson's conclusion). */
const KEY = "F";

/** Degree of a root letter within the F major scale (letters F–E are 1–7). */
function degreeOfFMajor(letter: string): number {
  return (((letterIndex(letter as never) - letterIndex("F")) % 7 + 7) % 7) + 1;
}

/** Numeric inversion index `inversionFigure` expects, keyed by the core's label. */
const INVERSION_NUM: Readonly<Record<"rootPosition" | "first" | "second" | "third", number>> = {
  rootPosition: 0,
  first: 1,
  second: 2,
  third: 3,
};

interface ChordEntry {
  notes: readonly string[];
  root: string;
  quality: TriadQuality | SeventhQuality;
  seventh: boolean;
  /**
   * The symbol the site states for this chord. Present whenever the site
   * names a numeral; the round throws at load if the core derives anything
   * else, so a hand-typed symbol cannot survive a re-derivation.
   */
  symbol?: string;
  /** The correct option — the site's stated analysis or its phrase. */
  answer: string;
  options: readonly string[];
  rule: string;
}

/** One analysed Auld Lang Syne chord: symbol re-derived, answer from the site. */
const chordRound = (id: string, entry: ChordEntry): Round => {
  const rootNote = parseNote(entry.root);
  const inversion = identifyInversion(
    rootNote,
    entry.notes.map((note) => parseNote(note)),
  );
  const degree = degreeOfFMajor(rootNote.letter);
  // `romanNumeralSeventh` already carries the seventh's suffix — its own
  // contract states dominantSeventh/5 → "V7" — so a root-position seventh
  // takes no extra figure (`inversionFigure("seventh", 0)` would be a second
  // "7" glued on). The site states no seventh-chord inversions in this
  // lesson, so anything but root position fails loudly here instead of
  // shipping an unverified symbol.
  if (entry.seventh && inversion !== "rootPosition") {
    throw new Error(
      `${id}: this lesson only analyses root-position seventh chords, core found ${inversion}`,
    );
  }
  const derived = entry.seventh
    ? romanNumeralSeventh(entry.quality as SeventhQuality, degree)
    : romanNumeral(entry.quality as TriadQuality, degree) +
      inversionFigure("triad", INVERSION_NUM[inversion]);
  if (entry.symbol !== undefined && entry.symbol !== derived) {
    throw new Error(`${id}: site states ${entry.symbol} but the core derives ${derived}`);
  }
  const correctIndex = entry.options.indexOf(entry.answer);
  if (correctIndex < 0) {
    throw new Error(`${id}: answer ${entry.answer} missing from options`);
  }
  return {
    id,
    prompt: {
      kind: "staff",
      clef: "treble",
      notes: [...entry.notes],
      keySignature: KEY,
      duration: "q",
      simultaneous: true,
    },
    answer: choices([...entry.options], correctIndex),
    rule: entry.rule,
  };
};

/** Rounds drawn per visit; the pool is larger so replays vary. */
const ROUND_COUNT = 12;

/** Kinds every draw must contain; `sampleStratifiedRounds` enforces it. */
const REQUIRED_KINDS = ["staff", "text"] as const;

export const lesson62Pool: readonly Round[] = [
  // --- staff prompts: the site's Auld Lang Syne chords in F major ----------
  chordRound("l62-staff-i-measure1", {
    notes: ["F4", "A4", "C5"],
    root: "F4",
    quality: "major",
    seventh: false,
    symbol: "I",
    answer: "I",
    options: ["I", "IV", "V", "vi"],
    rule:
      "F–A–C is an F major triad with F in the bass — root position, so in F major it is I; " +
      "the key signature holds one flat, so F major or D minor are possible, and since this is I in F major " +
      "we are most likely in that key.",
  }),
  chordRound("l62-staff-i-measure2", {
    notes: ["F4", "C5", "F5"],
    root: "F4",
    quality: "major",
    seventh: false,
    symbol: "I",
    answer: "I",
    options: ["IV6", "I", "ii", "I6"],
    rule:
      "F–C–F holds only F's and C's from the same F major triad with F in the bass — root position, so in F major it is I; " +
      "the measure repeats this analysis symbol, so there is no need to write it again.",
  }),
  chordRound("l62-staff-i-measure4", {
    notes: ["F4", "A4", "F5"],
    root: "F4",
    quality: "major",
    seventh: false,
    symbol: "I",
    answer: "I",
    options: ["vi", "IV", "I", "V6"],
    rule:
      "F–A–F is an F major triad with F in the bass — root position; " +
      "in F major it is I, the fourth such chord of the measure.",
  }),
  chordRound("l62-staff-v", {
    notes: ["C4", "C5", "E5", "G5"],
    root: "C4",
    quality: "major",
    seventh: false,
    symbol: "V",
    answer: "V",
    options: ["vi", "ii6", "V7", "V"],
    rule: "C–C–E–G is a C major triad with C in the bass — root position, so in F major it is V.",
  }),
  chordRound("l62-staff-iv", {
    notes: ["Bb3", "Bb4", "F5", "D6"],
    root: "Bb3",
    quality: "major",
    seventh: false,
    symbol: "IV",
    answer: "IV",
    options: ["IV", "ii", "V", "IV6"],
    rule:
      "Bb–Bb–F–D is a Bb major triad with Bb in the bass — root position, so in F major it is IV.",
  }),
  chordRound("l62-staff-v7-skipped2", {
    // The site: "the bottom three notes are the root, third, and seventh of a
    // C dominant seventh chord. Only the G (the fifth) is missing" and "we can
    // analyze it as V7 with a nonharmonic A" — so the A is NOT a chord tone.
    notes: ["C4", "Bb4", "E5", "A5"],
    root: "C4",
    quality: "dominantSeventh",
    seventh: true,
    symbol: "V7",
    answer: "V7",
    options: ["V", "V7", "vi7", "IV7"],
    rule:
      "C–Bb–E–A: the bottom three tones are the root, third, and seventh of a C dominant seventh chord — only its fifth is missing — " +
      "and the A above them is nonharmonic, so in F major this chord is V7.",
  }),
  chordRound("l62-staff-skip-neighbors", {
    // The first skipped chord; the site's analysis is a phrase, not a numeral.
    notes: ["C4", "C5", "D5", "F5"],
    root: "C4",
    quality: "major",
    seventh: false,
    answer: "A continuation of the V with two neighboring tones",
    options: [
      "A ii chord in first inversion",
      "A IV chord with a suspension",
      "A continuation of the V with two neighboring tones",
      "A diminished seventh chord",
    ],
    rule:
      "C–C–D–F doesn't fit nicely into a triad, so the analysis skips it for now; " +
      "in F major, nonharmonic tones show it to be a continuation of the V with two neighboring tones.",
  }),

  // --- text prompts: key, shorthand, skipped chord, omitted fifth -----------
  {
    id: "l62-text-key",
    prompt: {
      kind: "text",
      text: "The key signature contains one flat. Which two keys are possible?",
    },
    answer: choices(
      ["Bb major or G minor", "F major or D minor", "D major or B minor", "F major or A minor"],
      1,
    ),
    rule: "The key signature contains one flat, so two possibilities exist: F major or D minor.",
  },
  {
    id: "l62-text-first-step",
    prompt: {
      kind: "text",
      text: "What is the first step when analyzing a passage?",
    },
    answer: choices(
      ["Name every note", "Find the tempo", "Determine the key", "Write the bass line"],
      2,
    ),
    rule: "First, we must determine the key before naming any chord in it.",
  },
  {
    id: "l62-text-conclude",
    prompt: {
      kind: "text",
      text: "The first chord is F–A–C, an F major triad that is I in F major. What does this suggest about the key?",
    },
    answer: choices(
      ["We are most likely in that key, F major", "We are in D minor", "The key is still ambiguous", "We are in Bb major"],
      0,
    ),
    rule:
      "The first chord is F–A–C, an F major triad in root position; since this is I in F major, " +
      "we are most likely in that key, F major.",
  },
  {
    id: "l62-text-repeat",
    prompt: {
      kind: "text",
      text: "The next chord carries the same analysis as the one before it. What do we do with its symbol?",
    },
    answer: choices(
      ["We must write it again", "We erase the previous symbol", "We change it to a numeral", "There is no need to write it again"],
      3,
    ),
    rule: "The chord repeats the previous analysis symbol, so there is no need to write it again.",
  },
  {
    id: "l62-text-skip-first",
    prompt: {
      kind: "text",
      text: "The second chord contains C–C–D–F. How does the analysis handle it first?",
    },
    answer: choices(
      ["Ignore the rest of the measure", "Skip it for now", "Analyze it as ii", "Write a question mark"],
      1,
    ),
    rule:
      "The second chord contains C–C–D–F; this doesn't fit nicely into a triad, so the analysis skips it for now.",
  },
  {
    id: "l62-text-fifth-omitted",
    prompt: {
      kind: "text",
      text: "Which chord tone do composers sometimes leave out when voicing seventh chords?",
    },
    answer: choices(["The fifth", "The third", "The root", "The seventh"], 0),
    rule:
      "When voicing seventh chords, composers sometimes leave out the fifth, as the V7 in this measure does.",
  },
  {
    id: "l62-text-escape",
    prompt: {
      kind: "text",
      text: "A tone approaches E by step and then leaves the chord by skip. What is it?",
    },
    answer: choices(
      ["A passing tone", "A suspension", "An escape tone", "A chromatic neighbor"],
      2,
    ),
    rule: "The tone is approached by step and leaves the chord by skip, so it is an escape tone.",
  },
  {
    id: "l62-text-resolve",
    prompt: {
      kind: "text",
      text: "Which resolution pattern confirms this analysis?",
    },
    answer: choices(
      ["I chords resolve to V", "V chords rarely resolve anywhere", "Only minor V chords resolve", "V chords commonly resolve to I"],
      3,
    ),
    rule: "The progression reads V7 to I because V chords commonly resolve to I in this key.",
  },
];

export const lesson62: LessonModule = {
  entry: requireLessonEntry(62),
  generateRounds: (rng) =>
    sampleStratifiedRounds(lesson62Pool, REQUIRED_KINDS, rng, ROUND_COUNT),
};

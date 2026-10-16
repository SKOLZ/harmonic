import {
  identifyInversion,
  inversionFigure,
  letterIndex,
  parseNote,
  romanNumeral,
  type TriadQuality,
} from "../lib/theory";
import type { AnswerSpec, Round } from "../lib/rounds/types";
import { requireLessonEntry } from "./catalog";
import { sampleStratifiedRounds } from "./rng";
import type { LessonModule } from "./types";

/**
 * Lesson 52 — Analysis: O Canada.
 *
 * Content source: musictheory.net lesson 52 (slide text pulled from the live
 * `lesson52.js`). The lesson analyses the first four measures of O Canada in
 * E♭ major: "The first step in analysis is to determine the key. Since the key
 * signature contains three flats, we have two possibilities: Eb major or C
 * minor." It then reads each chord — e.g. "an Eb, Bb, Eb, and G — an Eb major
 * triad. Since this is I in Eb Major"; "a Bb major triad … Since the third is
 * the lowest note, the triad is in first inversion" (V6); "a C minor triad.
 * Thus, it is vi"; "an Ab major triad in first inversion" (IV6); "an Eb major
 * triad in first inversion" (I6) — and notes "we do not have to repeat the
 * analysis symbol" when a chord repeats.
 *
 * SCOPE + CONTRACT GAP (reported to the parent, not invented here): the site
 * presents a continuous multi-measure score and analyses it chord-by-chord in
 * context. The existing `Round` contract has ONE staff prompt that renders a
 * single measure or a single stacked chord — it cannot draw a four-measure
 * phrase with bar lines, nor the melodic line the chords support, nor the
 * cross-measure "repeat the symbol" convention. This module therefore
 * faithfully captures the part that IS a single prompt/answer pair: each
 * chord's Roman-numeral-plus-inversion analysis in E♭ major, shown as one
 * stacked chord under the E♭ key signature (the same staff + choices shape as
 * lessons 44/49). A multi-measure score prompt kind is a contract decision
 * handed back to the parent; it is deliberately NOT invented here.
 *
 * Every chord's voicing is bass-first. The Roman-numeral symbol is re-derived
 * by the core (`romanNumeral` + `inversionFigure` + `identifyInversion`) and
 * asserted equal to the site's own analysis. The exact vertical spacing is
 * reconstructed (the engraved score is an image); pitch classes and the lowest
 * note — the analytically decisive facts — match the site's slide text. The
 * pool is 12 `staff` + 4 `text` = 16, drawn stratified with one staff and one
 * text round guaranteed per 12-round draw.
 */
const choices = (options: string[], correctIndex: number): AnswerSpec => ({
  kind: "choices",
  options,
  correctIndex,
});

/** The analysis key every chord is read in (the lesson's conclusion). */
const KEY = "Eb";

/** Degree of a root letter within the E♭ major scale (letters E–D are 1–7). */
function degreeOfEbMajor(letter: string): number {
  return (((letterIndex(letter as never) - letterIndex("E")) % 7 + 7) % 7) + 1;
}

/** Numeric inversion index `inversionFigure` expects, keyed by the core's label. */
const INVERSION_NUM: Readonly<Record<"rootPosition" | "first" | "second" | "third", number>> = {
  rootPosition: 0,
  first: 1,
  second: 2,
  third: 3,
};

/** "Eb4" → "Eb": a tone's name without its octave, as prose writes it. */
const toneLabel = (note: string): string => note.replace(/\d+$/, "");

/** English "a"/"an" before a word ("an augmented triad"). */
const article = (word: string): string => (/^[aeiou]/i.test(word) ? "an" : "a");

interface ChordEntry {
  notes: readonly string[];
  root: string;
  quality: TriadQuality;
  options: readonly string[];
}

/** One analysed O Canada chord: symbol derived, answer from the site's set. */
const chordRound = (id: string, entry: ChordEntry): Round => {
  const rootNote = parseNote(entry.root);
  const inversion = identifyInversion(
    rootNote,
    entry.notes.map((note) => parseNote(note)),
  );
  if (inversion === "third") {
    throw new Error(`chordRound ${id}: a triad has no third inversion`);
  }
  const figure = inversionFigure("triad", INVERSION_NUM[inversion]);
  const numeral = romanNumeral(entry.quality, degreeOfEbMajor(rootNote.letter));
  const symbol = numeral + figure;
  const correctIndex = entry.options.indexOf(symbol);
  if (correctIndex < 0) {
    throw new Error(`chordRound ${id}: derived symbol ${symbol} missing from options`);
  }
  const inversionClause =
    inversion === "rootPosition"
      ? ""
      : inversion === "first"
        ? " Since the third is the lowest note, the triad is in first inversion."
        : " Since the fifth is the lowest note, the triad is in second inversion.";
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
    rule:
      `${entry.notes.map(toneLabel).join("–")} is ${article(entry.quality)} ${entry.quality} triad. ` +
      `In ${KEY} major it is ${symbol}.${inversionClause}`,
  };
};

/** Rounds drawn per visit; the pool is larger so replays vary. */
const ROUND_COUNT = 12;

/** Kinds every draw must contain; `sampleStratifiedRounds` enforces it. */
const REQUIRED_KINDS = ["staff", "text"] as const;

export const lesson52Pool: readonly Round[] = [
  // --- staff prompts: the site's O Canada chords in E♭ major ---------------
  // Measure 1.
  chordRound("l52-staff-i", {
    notes: ["Eb4", "Bb4", "Eb5", "G5"],
    root: "Eb4",
    quality: "major",
    options: ["I", "V", "vi", "IV"],
  }),
  chordRound("l52-staff-v6", {
    notes: ["D4", "Bb4", "F5", "Bb5"],
    root: "Bb4",
    quality: "major",
    options: ["V6", "V", "vi6", "V6/4"],
  }),
  // Measure 2.
  chordRound("l52-staff-vi", {
    notes: ["C4", "G4", "C5", "Eb5"],
    root: "C4",
    quality: "minor",
    options: ["vi", "I", "IV", "V"],
  }),
  chordRound("l52-staff-v", {
    notes: ["Bb4", "D5", "F5", "Bb5"],
    root: "Bb4",
    quality: "major",
    options: ["V", "V6", "I", "vi"],
  }),
  // Measure 3.
  chordRound("l52-staff-iv6", {
    notes: ["C4", "Ab4", "Eb5", "Ab5"],
    root: "Ab4",
    quality: "major",
    options: ["IV6", "IV", "I6", "ii6"],
  }),
  chordRound("l52-staff-i6", {
    notes: ["G4", "Eb5", "G5", "Bb5"],
    root: "Eb4",
    quality: "major",
    options: ["I6", "I", "V6", "iii6"],
  }),
  chordRound("l52-staff-iv", {
    notes: ["Ab4", "C5", "Eb5", "C6"],
    root: "Ab4",
    quality: "major",
    options: ["IV", "IV6", "I", "ii"],
  }),
  // Measure 4.
  chordRound("l52-staff-v-close", {
    notes: ["Bb4", "D5", "F5"],
    root: "Bb4",
    quality: "major",
    options: ["V", "V6", "I", "vi"],
  }),
  // Additional voicings of the same analyses (spacing varies, bass and triad do not).
  chordRound("l52-staff-i-close", {
    notes: ["Eb4", "G4", "Bb4", "Eb5"],
    root: "Eb4",
    quality: "major",
    options: ["I", "V", "vi", "IV"],
  }),
  chordRound("l52-staff-vi-close", {
    notes: ["C4", "Eb4", "G4", "C5"],
    root: "C4",
    quality: "minor",
    options: ["vi", "I", "IV", "V"],
  }),
  chordRound("l52-staff-iv-close", {
    notes: ["Ab4", "C5", "Eb5"],
    root: "Ab4",
    quality: "major",
    options: ["IV", "IV6", "I", "ii"],
  }),
  chordRound("l52-staff-v6-close", {
    notes: ["D4", "F4", "Bb4", "D5"],
    root: "Bb4",
    quality: "major",
    options: ["V6", "V", "vi6", "V6/4"],
  }),

  // --- text prompts: the site's key-determination and shorthand steps ------
  {
    id: "l52-text-first-step",
    prompt: { kind: "text", text: "What is the first step in analysis?" },
    answer: choices(
      ["Determine the key", "Name every note", "Find the tempo", "Write the bass line"],
      0,
    ),
    rule: "The first step in analysis is to determine the key.",
  },
  {
    id: "l52-text-key-sig",
    prompt: {
      kind: "text",
      text: "The key signature contains three flats. Which two keys are possible?",
    },
    answer: choices(["Eb major or C minor", "Bb major or G minor", "Ab major or F minor", "Eb major or Ab minor"], 0),
    rule: "Since the key signature contains three flats, we have two possibilities: Eb major or C minor.",
  },
  {
    id: "l52-text-key-conclude",
    prompt: {
      kind: "text",
      text: "The first chord is an Eb major triad, which is I in Eb major. What does this suggest about the key?",
    },
    answer: choices(
      ["We are most likely in that key, Eb major", "We are in C minor", "We are in Bb major", "The key is still ambiguous"],
      0,
    ),
    rule: "The first chord is an Eb major triad. Since this is I in Eb Major, we are most likely in that key.",
  },
  {
    id: "l52-text-repeat",
    prompt: {
      kind: "text",
      text: "The third chord is the same as the previous one. What do we do with its analysis symbol?",
    },
    answer: choices(
      ["We do not have to repeat the analysis symbol", "We must write it again", "We change it to a numeral", "We erase the previous one"],
      0,
    ),
    rule: "Since the third chord is the same as the previous one, we do not have to repeat the analysis symbol.",
  },
];

export const lesson52: LessonModule = {
  entry: requireLessonEntry(52),
  generateRounds: (rng) =>
    sampleStratifiedRounds(lesson52Pool, REQUIRED_KINDS, rng, ROUND_COUNT),
};

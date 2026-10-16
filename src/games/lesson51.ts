import { identifyInversion, parseNote } from "../lib/theory";
import type { AnswerSpec, Round } from "../lib/rounds/types";
import { requireLessonEntry } from "./catalog";
import { sampleStratifiedRounds } from "./rng";
import type { LessonModule } from "./types";

/**
 * Lesson 51 — Voicing Chords.
 *
 * Content source: musictheory.net lesson 51 (slide text pulled from the live
 * `lesson51.js`): "Composers will often arrange the notes of a chord in
 * numerous ways in order to vary its sound. This process is called voicing."
 * The lesson voices an F major triad three ways: root position — "arrange the
 * notes in any order as long as F, A, and C are used and F is the lowest
 * note"; first inversion — "a chord is in first inversion when the third is
 * the lowest note" (A at the bottom); second inversion — "we must be certain
 * that the fifth (C) is used as the lowest note."
 *
 * Staff rounds show an F major voicing (tones from the core, bass first) and
 * ask which inversion it is; the inversion is re-derived by `identifyInversion`
 * from the bass, never hand-typed. Text rounds pin the site's definitions. The
 * pool is 10 `staff` + 7 `text` = 17, drawn stratified with one staff and one
 * text round guaranteed per 12-round draw.
 */
const choices = (options: string[], correctIndex: number): AnswerSpec => ({
  kind: "choices",
  options,
  correctIndex,
});

/** The three inversion answers a voicing round offers, in slide order. */
const INVERSION_OPTIONS = ["Root position", "First inversion", "Second inversion"] as const;
type Inversion = "rootPosition" | "first" | "second";
const INVERSION_INDEX: Readonly<Record<Inversion, number>> = {
  rootPosition: 0,
  first: 1,
  second: 2,
};

/** The site's fact for each inversion, restated from its slides. */
const INVERSION_FACT: Readonly<Record<Inversion, string>> = {
  rootPosition:
    "The notes may be arranged in any order as long as F, A and C are used and F is the lowest note.",
  first:
    "By definition, a chord is in first inversion when the third is the lowest note, so A is the bottom note.",
  second: "In second inversion the fifth (C) is the lowest note.",
};

/** The site's inversion name as prose writes it. */
const INVERSION_PHRASE: Readonly<Record<Inversion, string>> = {
  rootPosition: "root position",
  first: "first inversion",
  second: "second inversion",
};

/**
 * Inversion of an F major voicing, re-derived by the core from the bass note.
 * An F major triad has no third inversion, so that case is unreachable.
 */
function inversionOf(notes: readonly string[]): Inversion {
  const identified = identifyInversion(
    parseNote("F4"),
    notes.map((note) => parseNote(note)),
  );
  if (identified === "third") {
    throw new Error("an F major triad has no third inversion");
  }
  return identified;
}

/** One F major voicing: tones from the core, inversion from the bass. */
const voicingRound = (id: string, notes: readonly string[]): Round => {
  const inversion = inversionOf(notes);
  return {
    id,
    prompt: {
      kind: "staff",
      clef: "treble",
      notes: [...notes],
      duration: "q",
      simultaneous: true,
    },
    answer: choices([...INVERSION_OPTIONS], INVERSION_INDEX[inversion]),
    rule:
      `${notes.map((note) => toneLabel(note)).join("–")} is an F major triad in ` +
      `${INVERSION_PHRASE[inversion]}. ${INVERSION_FACT[inversion]}`,
  };
};

/** "F4" → "F": a tone's name without its octave, as prose writes it. */
const toneLabel = (note: string): string => note.replace(/\d+$/, "");

/** Rounds drawn per visit; the pool is larger so replays vary. */
const ROUND_COUNT = 12;

/** Kinds every draw must contain; `sampleStratifiedRounds` enforces it. */
const REQUIRED_KINDS = ["staff", "text"] as const;

export const lesson51Pool: readonly Round[] = [
  // --- staff prompts: F major voiced in every inversion --------------------
  // Root position: F is lowest.
  voicingRound("l51-staff-root-close", ["F4", "A4", "C5"]),
  voicingRound("l51-staff-root-spread", ["F4", "C5", "A5"]),
  voicingRound("l51-staff-root-double", ["F4", "A4", "C5", "F5"]),
  voicingRound("l51-staff-root-wide", ["F4", "C5", "F5", "A5"]),
  // First inversion: the third (A) is lowest.
  voicingRound("l51-staff-first-close", ["A4", "C5", "F5"]),
  voicingRound("l51-staff-first-double", ["A4", "C5", "F5", "A5"]),
  voicingRound("l51-staff-first-low", ["A3", "C4", "F4"]),
  // Second inversion: the fifth (C) is lowest.
  voicingRound("l51-staff-second-close", ["C5", "F5", "A5"]),
  voicingRound("l51-staff-second-low", ["C4", "F4", "A4"]),
  voicingRound("l51-staff-second-double", ["C4", "F4", "A4", "C5"]),

  // --- text prompts: the site's voicing definitions -------------------------
  {
    id: "l51-text-voicing-def",
    prompt: { kind: "text", text: "What is voicing?" },
    answer: choices(
      [
        "Arrange the notes of a chord in numerous ways in order to vary its sound",
        "Stack every chord tone a third apart",
        "Play the chord tones one at a time",
        "Lower the chord by an octave",
      ],
      0,
    ),
    rule:
      "Composers will often arrange the notes of a chord in numerous ways in order to vary its sound. " +
      "This process is called voicing.",
  },
  {
    id: "l51-text-root-lowest",
    prompt: {
      kind: "text",
      text: "In a root-position voicing of an F major triad, which note must be the lowest?",
    },
    answer: choices(["The root, F", "The third, A", "The fifth, C", "Any of them"], 0),
    rule: "We can arrange the notes in any order as long as F, A, and C are used and F is the lowest note.",
  },
  {
    id: "l51-text-root-order",
    prompt: {
      kind: "text",
      text: "When voicing a root-position F major triad, how may the upper notes be arranged?",
    },
    answer: choices(
      ["Any order, as long as F, A and C are used and F is lowest", "Only F–A–C ascending", "Only C–A–F descending", "The third must be on top"],
      0,
    ),
    rule: "We can arrange the notes in any order as long as F, A, and C are used and F is the lowest note.",
  },
  {
    id: "l51-text-first-def",
    prompt: { kind: "text", text: "By definition, when is a chord in first inversion?" },
    answer: choices(
      ["When the third is the lowest note", "When the root is the lowest note", "When the fifth is the lowest note", "When the seventh is the lowest note"],
      0,
    ),
    rule: "By definition, a chord is in first inversion when the third is the lowest note.",
  },
  {
    id: "l51-text-first-lowest",
    prompt: {
      kind: "text",
      text: "In a first-inversion F major voicing, which chord tone is the lowest note?",
    },
    answer: choices(["The third", "The root", "The fifth", "The leading tone"], 0),
    rule: "By definition, a chord is in first inversion when the third is the lowest note, so A is the bottom note.",
  },
  {
    id: "l51-text-second-def",
    prompt: {
      kind: "text",
      text: "For a second-inversion F major voicing, which note must be the lowest?",
    },
    answer: choices(["The fifth, C", "The root, F", "The third, A", "Any of them"], 0),
    rule: "In second inversion the fifth (C) is the lowest note.",
  },
  {
    id: "l51-text-second-lowest",
    prompt: {
      kind: "text",
      text: "In a second-inversion voicing, which chord tone is the lowest note?",
    },
    answer: choices(["The fifth", "The root", "The third", "The seventh"], 0),
    rule: "The process is the same; however, we must be certain that the fifth (C) is used as the lowest note.",
  },
];

export const lesson51: LessonModule = {
  entry: requireLessonEntry(51),
  generateRounds: (rng) =>
    sampleStratifiedRounds(lesson51Pool, REQUIRED_KINDS, rng, ROUND_COUNT),
};

import type { AnswerSpec, Round } from "../lib/rounds/types";
import { requireLessonEntry } from "./catalog";
import { sampleRounds } from "./rng";
import type { LessonModule } from "./types";

/**
 * Lesson 30 — Generic Intervals.
 *
 * Content source: musictheory.net lesson 30 (slide text pulled from the live
 * `lesson30.js`): "An *interval* measures the distance between two notes."
 * Generic intervals "are measured on the staff": when two notes occupy the
 * same line or space "they are a *first* (or a *prime*) apart" (C–C, D–D,
 * E–E), and "Accidentals are ignored when measuring generic intervals, only
 * staff position matters" (C–C#, D–Db and A#–Ab "are still firsts"). The
 * interval type increases with staff distance; the site's worked rows are
 * seconds C–D / D–E / E–F, thirds C–E / D–F / E–G ("thirds will always
 * share the same staff position type --- either both on a line or both on a
 * space"), fourths C–F / D–G / E–A, fifths C–G / D–A / E–B, sixths C–A /
 * D–B / E–C, sevenths C–B / D–C / E–D, and eighths C–C / D–D / E–E.
 *
 * Corrections to the task's accepted reference, from the live site: the
 * counting rule matches, but the site's own vocabulary for the ends of the
 * range is *first* (or *prime*) through *eighth* — "unison" and "octave"
 * never appear in this lesson's slide text (the octave is the "eighth";
 * lesson 31 later calls it the "perfect eighth / perfect octave"). Rounds
 * use the site's words. The test suite re-derives every staff answer with
 * `genericIntervalNumber` from the theory core, so the unison/octave
 * off-by-one cannot creep in unnoticed. The pool is 11 `staff` rounds + 11
 * `text` rounds = 22: any draw of 12 must include at least one of each
 * kind — the mix is structural, not luck.
 */
const choices = (options: string[], correctIndex: number): AnswerSpec => ({
  kind: "choices",
  options,
  correctIndex,
});

/** Rounds drawn per visit; the pool is larger so replays vary. */
const ROUND_COUNT = 12;

export const lesson30Pool: readonly Round[] = [
  // --- staff prompts: name the generic interval the two notes form ---------
  {
    id: "l30-staff-c4-c4-first",
    prompt: { kind: "staff", clef: "treble", notes: ["C4", "C4"], duration: "q" },
    answer: choices(["First", "Second", "Third", "Fourth"], 0),
    rule: "When two notes occupy the same line or space they are a first — also called a prime — apart, as C to C shows.",
  },
  {
    id: "l30-staff-c4-cs4-first",
    prompt: { kind: "staff", clef: "treble", notes: ["C4", "C#4"], duration: "q" },
    answer: choices(["First", "Second", "Third", "Eighth"], 0),
    rule: "Accidentals are ignored when measuring generic intervals — only staff position matters — so C to C# is still a first, like D to Db and A# to Ab.",
  },
  {
    id: "l30-staff-c4-d4-second",
    prompt: { kind: "staff", clef: "treble", notes: ["C4", "D4"], duration: "q" },
    answer: choices(["First", "Second", "Third", "Fourth"], 1),
    rule: "C to D spans two letter names on the staff, so it is a second — the site's {C}–{D} example.",
  },
  {
    id: "l30-staff-e4-f4-second",
    prompt: { kind: "staff", clef: "treble", notes: ["E4", "F4"], duration: "q" },
    answer: choices(["Second", "Third", "Fourth", "Fifth"], 0),
    rule: "E to F is a second: the notes occupy adjacent staff positions, even though E–F is only a half step wide — generic intervals ignore that.",
  },
  {
    id: "l30-staff-c4-e4-third",
    prompt: { kind: "staff", clef: "treble", notes: ["C4", "E4"], duration: "q" },
    answer: choices(["Second", "Third", "Fourth", "Fifth"], 1),
    rule: "Counting letter names inclusive — C, D, E — gives three, so C to E is a third.",
  },
  {
    id: "l30-staff-e4-g4-third",
    prompt: { kind: "staff", clef: "treble", notes: ["E4", "G4"], duration: "q" },
    answer: choices(["Third", "Fourth", "Fifth", "Sixth"], 0),
    rule: "Thirds always share the same staff position type — either both on a line or both on a space — as E and G, both on lines, show.",
  },
  {
    id: "l30-staff-c4-f4-fourth",
    prompt: { kind: "staff", clef: "treble", notes: ["C4", "F4"], duration: "q" },
    answer: choices(["Third", "Fourth", "Fifth", "Sixth"], 1),
    rule: "C, D, E, F — four letter names counted inclusive — make C to F a fourth.",
  },
  {
    id: "l30-staff-c4-g4-fifth",
    prompt: { kind: "staff", clef: "treble", notes: ["C4", "G4"], duration: "q" },
    answer: choices(["Fourth", "Fifth", "Sixth", "Seventh"], 1),
    rule: "C to G counts five letter names — C, D, E, F, G — so it is a fifth.",
  },
  {
    id: "l30-staff-c4-a4-sixth",
    prompt: { kind: "staff", clef: "treble", notes: ["C4", "A4"], duration: "q" },
    answer: choices(["Fifth", "Sixth", "Seventh", "Eighth"], 1),
    rule: "C to A spans six letter names, so it is a sixth — the site's {C}–{A} example.",
  },
  {
    id: "l30-staff-c4-b4-seventh",
    prompt: { kind: "staff", clef: "treble", notes: ["C4", "B4"], duration: "q" },
    answer: choices(["Fifth", "Sixth", "Seventh", "Eighth"], 2),
    rule: "C to B spans seven letter names — every letter of the staff between them included — so it is a seventh.",
  },
  {
    id: "l30-staff-c4-c5-eighth",
    prompt: { kind: "staff", clef: "treble", notes: ["C4", "C5"], duration: "q" },
    answer: choices(["Seventh", "Eighth", "First", "Fifth"], 1),
    rule: "When the same letter sounds one octave higher on the staff — C to C — the interval is an eighth, the generic interval of an octave.",
  },

  // --- text prompts: the definition, the prime, and the site's worked rows --
  {
    id: "l30-text-what-is-interval",
    prompt: { kind: "text", text: "What does an interval measure?" },
    answer: choices(
      ["The distance between two notes", "The length of a measure", "The speed of a piece", "The number of beats"],
      0,
    ),
    rule: "An interval measures the distance between two notes.",
  },
  {
    id: "l30-text-generic-staff",
    prompt: { kind: "text", text: "How are generic intervals measured?" },
    answer: choices(
      ["On the staff", "In half steps on the keyboard", "By counting beats", "With the tempo marking"],
      0,
    ),
    rule: "Generic intervals are measured on the staff — later lessons add half steps on the keyboard to make them specific.",
  },
  {
    id: "l30-text-prime",
    prompt: { kind: "text", text: "What is another name for a first?" },
    answer: choices(["A prime", "An octave", "A second", "A fifth"], 0),
    rule: "Two notes on the same line or space are a first — also called a prime — apart.",
  },
  {
    id: "l30-text-accidentals-ignored",
    prompt: {
      kind: "text",
      text: "When measuring generic intervals, what matters?",
    },
    answer: choices(
      ["Only staff position — accidentals are ignored", "Only the half-step count", "Both accidentals and staff position equally", "The key signature"],
      0,
    ),
    rule: "Accidentals are ignored when measuring generic intervals; only staff position matters.",
  },
  {
    id: "l30-text-c-cs-first",
    prompt: { kind: "text", text: "What generic interval is C to C#?" },
    answer: choices(["A first", "A second", "A seventh", "An eighth"], 0),
    rule: "C to C# is still a first: the sharp does not move the note off its staff position — D–Db and A#–Ab are firsts for the same reason.",
  },
  {
    id: "l30-text-increase",
    prompt: {
      kind: "text",
      text: "As notes become further apart on the staff, what happens to the interval type?",
    },
    answer: choices(
      ["It increases", "It decreases", "It stays the same", "It is reset to a first"],
      0,
    ),
    rule: "As the notes become further apart on the staff, the interval type increases.",
  },
  {
    id: "l30-text-seconds-examples",
    prompt: { kind: "text", text: "C–D, D–E, and E–F are all what?" },
    answer: choices(["Seconds", "Thirds", "Fourths", "Fifths"], 0),
    rule: "C–D, D–E and E–F are all seconds — each pair occupies adjacent staff positions.",
  },
  {
    id: "l30-text-fifths-examples",
    prompt: { kind: "text", text: "C–G, D–A, and E–B are all what?" },
    answer: choices(["Fourths", "Fifths", "Sixths", "Sevenths"], 1),
    rule: "C–G, D–A and E–B are all fifths — five letter names in each pair, counted inclusive.",
  },
  {
    id: "l30-text-sixths-examples",
    prompt: { kind: "text", text: "C–A, D–B, and E–C are all what?" },
    answer: choices(["Fifths", "Sixths", "Sevenths", "Eighths"], 1),
    rule: "C–A, D–B and E–C are all sixths: counting E, F, G, A, B, C gives six letter names.",
  },
  {
    id: "l30-text-sevenths-examples",
    prompt: { kind: "text", text: "C–B, D–C, and E–D are all what?" },
    answer: choices(["Sixths", "Sevenths", "Eighths", "Fifths"], 1),
    rule: "C–B, D–C and E–D are all sevenths — one staff position short of the eighth.",
  },
  {
    id: "l30-text-eighths-examples",
    prompt: { kind: "text", text: "C–C, D–D, and E–E are all what?" },
    answer: choices(["Firsts", "Seconds", "Thirds", "Eighths"], 3),
    rule: "C–C, D–D and E–E are all eighths: each pair repeats its letter one octave higher on the staff.",
  },
];

export const lesson30: LessonModule = {
  entry: requireLessonEntry(30),
  generateRounds: (rng) => sampleRounds(lesson30Pool, rng, ROUND_COUNT),
};

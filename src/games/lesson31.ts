import type { AnswerSpec, Round } from "../lib/rounds/types";
import { requireLessonEntry } from "./catalog";
import { sampleRounds } from "./rng";
import type { LessonModule } from "./types";

/**
 * Lesson 31 — Specific Intervals.
 *
 * Content source: musictheory.net lesson 31 (slide text pulled from the live
 * `lesson31.js`): "Specific intervals are measured both on the staff and in
 * half steps on the keyboard." The site builds each quality from its half-
 * step count with worked examples: major second, two half steps (C–D,
 * E–F#); major third, four (C–E, E–G#); perfect fourth, five (C–F, F–Bb);
 * perfect fifth, seven (C–G, B–F#); major sixth, nine (C–A, Eb–C); major
 * seventh, eleven (C–B, D–C#); "a *perfect eighth* (or *perfect octave*)"
 * twelve (C–C). Then the quality rules: "Only seconds, thirds, sixths, and
 * sevenths can have a major quality. Firsts, fourths, fifths, and eighths
 * use ''perfect'' instead."; "A minor interval has one less half step than
 * a major interval" (C–Eb is a minor third because C–E is a major third;
 * E–G is one because E–G# is a major third); "An *augmented* interval has
 * one more half step than a perfect interval" (C–F# augmented fourth;
 * F–B likewise) and "Major intervals can be augmented by adding a half
 * step" (C–A# augmented sixth; Db–B likewise); "A *diminished* interval
 * has one less half step than a perfect interval" (C–Gb diminished fifth;
 * B–F likewise) and "Minor intervals can also be diminished by subtracting
 * a half step" (C–Bbb diminished seventh after C–B major / C–Bb minor).
 *
 * Corrections to the task's accepted reference, from the live site: none —
 * the quality-by-family split and the both-ways reach of augmented and
 * diminished all match. Two nuances the site adds that the reference
 * compresses: augmented is introduced *from perfect* and then extended to
 * major ("Major intervals can be augmented"), diminished *from perfect* and
 * then extended to minor; and the site's word for the 1/4/5/8 family
 * includes firsts ("Firsts, fourths, fifths, and eighths"), not just
 * unison/4th/5th/octave. Every staff answer is the theory core's own
 * `intervalName` string (verified in the test oracle), so wording cannot
 * drift from the core. The pool is 11 `staff` rounds + 11 `text` rounds =
 * 22: any draw of 12 must include at least one of each kind — the mix is
 * structural, not luck.
 */
const choices = (options: string[], correctIndex: number): AnswerSpec => ({
  kind: "choices",
  options,
  correctIndex,
});

/** Rounds drawn per visit; the pool is larger so replays vary. */
const ROUND_COUNT = 12;

export const lesson31Pool: readonly Round[] = [
  // --- staff prompts: name the specific interval the two notes form --------
  {
    id: "l31-staff-c4-d4-major-second",
    prompt: { kind: "staff", clef: "treble", notes: ["C4", "D4"], duration: "q" },
    answer: choices(["Major 2nd", "Minor 2nd", "Major 3rd", "Perfect 4th"], 0),
    rule: "A major second is made up of two half steps — C to D is the site's first worked example.",
  },
  {
    id: "l31-staff-c4-e4-major-third",
    prompt: { kind: "staff", clef: "treble", notes: ["C4", "E4"], duration: "q" },
    answer: choices(["Minor 3rd", "Major 3rd", "Perfect 4th", "Major 2nd"], 1),
    rule: "A major third is made up of four half steps — C to E is the site's example.",
  },
  {
    id: "l31-staff-c4-f4-perfect-fourth",
    prompt: { kind: "staff", clef: "treble", notes: ["C4", "F4"], duration: "q" },
    answer: choices(["Perfect 4th", "Augmented 4th", "Diminished 5th", "Major 3rd"], 0),
    rule: "A perfect fourth is made up of five half steps — C to F is the site's example.",
  },
  {
    id: "l31-staff-c4-g4-perfect-fifth",
    prompt: { kind: "staff", clef: "treble", notes: ["C4", "G4"], duration: "q" },
    answer: choices(["Perfect 5th", "Diminished 5th", "Augmented 4th", "Minor 6th"], 0),
    rule: "A perfect fifth is made up of seven half steps — C to G is the site's example.",
  },
  {
    id: "l31-staff-c4-a4-major-sixth",
    prompt: { kind: "staff", clef: "treble", notes: ["C4", "A4"], duration: "q" },
    answer: choices(["Major 6th", "Minor 6th", "Perfect 5th", "Augmented 6th"], 0),
    rule: "A major sixth is made up of nine half steps — C to A is the site's example.",
  },
  {
    id: "l31-staff-c4-b4-major-seventh",
    prompt: { kind: "staff", clef: "treble", notes: ["C4", "B4"], duration: "q" },
    answer: choices(["Major 7th", "Minor 7th", "Perfect Octave", "Diminished 7th"], 0),
    rule: "A major seventh is made up of eleven half steps — C to B is the site's example.",
  },
  {
    id: "l31-staff-c4-c5-perfect-octave",
    prompt: { kind: "staff", clef: "treble", notes: ["C4", "C5"], duration: "q" },
    answer: choices(["Perfect Octave", "Major 7th", "Diminished Octave", "Perfect Unison"], 0),
    rule: "A perfect eighth — the perfect octave — is made up of twelve half steps, as C to C shows.",
  },
  {
    id: "l31-staff-c4-eb4-minor-third",
    prompt: { kind: "staff", clef: "treble", notes: ["C4", "Eb4"], duration: "q" },
    answer: choices(["Major 3rd", "Minor 3rd", "Diminished 3rd", "Perfect 4th"], 1),
    rule: "A minor interval has one less half step than a major interval: C to Eb is a minor third (3 half steps) because C to E is a major third (4).",
  },
  {
    id: "l31-staff-e4-g4-minor-third",
    prompt: { kind: "staff", clef: "treble", notes: ["E4", "G4"], duration: "q" },
    answer: choices(["Minor 3rd", "Major 3rd", "Minor 2nd", "Diminished 4th"], 0),
    rule: "E to G is a minor third — one half step less than the major third E to G#, exactly as the site derives it.",
  },
  {
    id: "l31-staff-c4-fs4-augmented-fourth",
    prompt: { kind: "staff", clef: "treble", notes: ["C4", "F#4"], duration: "q" },
    answer: choices(["Augmented 4th", "Perfect 4th", "Diminished 5th", "Minor 5th"], 0),
    rule: "An augmented interval has one more half step than a perfect interval: C to F# is an augmented fourth (6 half steps) because C to F is a perfect fourth (5).",
  },
  {
    id: "l31-staff-c4-gb4-diminished-fifth",
    prompt: { kind: "staff", clef: "treble", notes: ["C4", "Gb4"], duration: "q" },
    answer: choices(["Diminished 5th", "Augmented 4th", "Perfect 5th", "Minor 5th"], 0),
    rule: "A diminished interval has one less half step than a perfect interval: C to Gb is a diminished fifth (6 half steps) because C to G is a perfect fifth (7).",
  },

  // --- text prompts: the half-step counts and the quality families ---------
  {
    id: "l31-text-major-second-half-steps",
    prompt: { kind: "text", text: "How many half steps does a major second contain?" },
    answer: choices(["Three", "Two", "Four", "Five"], 1),
    rule: "A major second is made up of two half steps — C to D, or E to F#.",
  },
  {
    id: "l31-text-major-third-half-steps",
    prompt: { kind: "text", text: "How many half steps does a major third contain?" },
    answer: choices(["Three", "Four", "Five", "Two"], 1),
    rule: "A major third is made up of four half steps — C to E, or E to G#.",
  },
  {
    id: "l31-text-perfect-fourth-half-steps",
    prompt: { kind: "text", text: "How many half steps does a perfect fourth contain?" },
    answer: choices(["Five", "Four", "Six", "Seven"], 0),
    rule: "A perfect fourth is made up of five half steps — C to F, or F to Bb.",
  },
  {
    id: "l31-text-perfect-fifth-half-steps",
    prompt: { kind: "text", text: "How many half steps does a perfect fifth contain?" },
    answer: choices(["Six", "Seven", "Eight", "Five"], 1),
    rule: "A perfect fifth is made up of seven half steps — C to G, or B to F#.",
  },
  {
    id: "l31-text-major-sixth-half-steps",
    prompt: { kind: "text", text: "How many half steps does a major sixth contain?" },
    answer: choices(["Eight", "Nine", "Ten", "Seven"], 1),
    rule: "A major sixth is made up of nine half steps — C to A, or Eb to C.",
  },
  {
    id: "l31-text-major-seventh-half-steps",
    prompt: { kind: "text", text: "How many half steps does a major seventh contain?" },
    answer: choices(["Ten", "Eleven", "Nine", "Twelve"], 1),
    rule: "A major seventh is made up of eleven half steps — C to B, or D to C#.",
  },
  {
    id: "l31-text-perfect-eighth-half-steps",
    prompt: {
      kind: "text",
      text: "How many half steps does a perfect eighth (perfect octave) contain?",
    },
    answer: choices(["Eleven", "Twelve", "Ten", "Thirteen"], 1),
    rule: "A perfect eighth — the perfect octave — is made up of twelve half steps, as C to C shows.",
  },
  {
    id: "l31-text-major-family",
    prompt: { kind: "text", text: "Which interval numbers can have a major quality?" },
    answer: choices(
      ["Seconds, thirds, sixths, and sevenths", "Firsts, fourths, fifths, and eighths", "Only thirds and sixths", "Every interval number"],
      0,
    ),
    rule: "Only seconds, thirds, sixths, and sevenths can have a major quality.",
  },
  {
    id: "l31-text-perfect-family",
    prompt: {
      kind: "text",
      text: "Which interval numbers use perfect instead of major?",
    },
    answer: choices(
      ["Firsts, fourths, fifths, and eighths", "Seconds, thirds, sixths, and sevenths", "Only fourths and fifths", "Only firsts and eighths"],
      0,
    ),
    rule: "Firsts, fourths, fifths, and eighths use perfect instead of major — the terms name the interval's quality.",
  },
  {
    id: "l31-text-minor-vs-major",
    prompt: {
      kind: "text",
      text: "Compared with its major interval, how many half steps does a minor interval have?",
    },
    answer: choices(
      ["One less", "One more", "The same amount", "Two less"],
      0,
    ),
    rule: "A minor interval has one less half step than a major interval — and only seconds, thirds, sixths and sevenths can be minor, because minor transforms from major.",
  },
  {
    id: "l31-text-augmented-vs-perfect",
    prompt: {
      kind: "text",
      text: "Compared with its perfect interval, how many half steps does an augmented interval have?",
    },
    answer: choices(
      ["One more", "One less", "The same amount", "Two more"],
      0,
    ),
    rule: "An augmented interval has one more half step than a perfect interval — and major intervals can be augmented the same way, as C to A# is an augmented sixth above the major sixth C to A.",
  },
];

export const lesson31: LessonModule = {
  entry: requireLessonEntry(31),
  generateRounds: (rng) => sampleRounds(lesson31Pool, rng, ROUND_COUNT),
};

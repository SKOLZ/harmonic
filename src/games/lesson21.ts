import { buildScale, parseNote, scientificName } from "../lib/theory";
import type { AnswerSpec, Round } from "../lib/rounds/types";
import { requireLessonEntry } from "./catalog";
import { sampleRounds } from "./rng";
import type { LessonModule } from "./types";

/**
 * Lesson 21 — The Major Scale.
 *
 * Content source: musictheory.net lesson 21 (slide text pulled from the live
 * `lesson21.js`): a scale is a selection of certain notes within an octave;
 * the major scale is built from a repeating formula of whole steps (W) and
 * half steps (h) — W–W–H–W–W–W–H, confirmed against the site's own step-by-
 * step builds. The site walks three examples: C major (C D E F G A B C, no
 * accidentals at all), Eb major (Eb F G Ab Bb C D — three flats, with both
 * Eb's only counting once — and the half step from G lands on Ab, "not A"),
 * and D major (two sharps). It closes with "It is possible to build any major
 * scale — just start on the first note and follow the formula."
 *
 * Corrections to the task's accepted reference, from the live site: none — the
 * title, the W–W–H–W–W–W–H pattern, the all-white-keys reading of C major and
 * the root-plus-formula construction all match. Two phrasings are the site's,
 * not the reference's: the site never writes the formula as one string (the
 * formula visual carries the W/h labels over the C-major build), and it never
 * says "white keys" — it shows C major spelled with no accidentals, which is
 * the same fact. The half-step pair E–F / B–C that lesson 20 previewed is this
 * lesson's C-major build.
 *
 * Every staff prompt derives its note list from `buildScale` in the theory
 * core rather than a hand-typed spelling, so the engraving and the rules
 * cannot drift apart. Scale content stays on the staff (not the keyboard) so
 * the pool is 11 `staff` rounds + 11 `text` rounds = 22: any draw of 12 must
 * include at least one of each kind — the mix is structural, not luck.
 *
 * Companion illustrations (T5c Scales pass): exactly the two starting-root
 * text rounds carry an `illustration` — "Starting from G, which note is the
 * second degree of G major?" engraves G alone, never A; the F fourth-degree
 * round engraves F alone, never Bb. That is the T5a/T5b archetype twice:
 * the question names a concrete root, and the degree the learner builds is
 * kept off the page. The remaining nine text rounds are rejected by class:
 * four counts (a quantity has no question pitch to draw), four definitions
 * and method rounds (class-level subjects — no prompt names a concrete
 * pitch), and the C-major accidentals round, whose only faithful engraving
 * (C major in plain naturals) displays the very "None" the learner must
 * state. Each rejection reason is recorded in the suite, and every pool
 * round is swept through the shared `assertNoAnswerLeak` helper there.
 */
const choices = (options: string[], correctIndex: number): AnswerSpec => ({
  kind: "choices",
  options,
  correctIndex,
});

/** The seven degrees of a major scale, spelled for the staff or for prose. */
const scaleNotes = (root: string): string[] =>
  buildScale(parseNote(root), "major").map(scientificName);

/** Rounds drawn per visit; the pool is larger so replays vary. */
const ROUND_COUNT = 12;

export const lesson21Pool: readonly Round[] = [
  // --- staff prompts: read the scale on the page, apply the formula ---------
  {
    id: "l21-staff-c-major-half-step",
    prompt: { kind: "staff", clef: "treble", notes: scaleNotes("C4"), duration: "q" },
    answer: choices(["E–F", "C–D", "G–A", "A–B"], 0),
    rule: "The major-scale formula W–W–H–W–W–W–H puts its half steps between degrees 3 and 4 and between degrees 7 and 1: in C major that is E–F (and B–C).",
  },
  {
    id: "l21-staff-c-major-next",
    prompt: { kind: "staff", clef: "treble", notes: scaleNotes("C4").slice(0, 6), duration: "q" },
    answer: choices(["Bb", "A#", "B", "C"], 2),
    rule: "After the sixth degree the formula takes a whole step, so A rises to B in C major and a half step then returns to the tonic.",
  },
  {
    id: "l21-staff-eb-major-name",
    prompt: { kind: "staff", clef: "treble", notes: scaleNotes("Eb4"), duration: "q" },
    answer: choices(["Ab major", "Eb major", "Bb major", "Eb minor"], 1),
    rule: "Eb major is spelled Eb F G Ab Bb C D — three flats — by following the formula W–W–H–W–W–W–H from Eb.",
  },
  {
    id: "l21-staff-d-major-name",
    prompt: { kind: "staff", clef: "treble", notes: scaleNotes("D4"), duration: "q" },
    answer: choices(["A major", "G major", "D major", "D minor"], 2),
    rule: "D major is spelled D E F# G A B C# — two sharps — because the formula from D lands on F# and C#.",
  },
  {
    id: "l21-staff-c-major-wrong-note",
    prompt: {
      kind: "staff",
      clef: "treble",
      notes: [...scaleNotes("C4").slice(0, 6), "Bb4"],
      duration: "q",
    },
    answer: choices(["A4", "G4", "Bb4", "F4"], 2),
    rule: "The seventh degree of a major scale sits a half step below the tonic, so C major needs B natural; Bb is a whole step below C and belongs to natural minor.",
  },
  {
    id: "l21-staff-eb-major-next",
    prompt: { kind: "staff", clef: "treble", notes: scaleNotes("Eb4").slice(0, 3), duration: "q" },
    answer: choices(["A4", "Ab4", "Bb4", "B4"], 1),
    rule: "The third-to-fourth step of the formula is a half step, so the half step from G takes Eb major to Ab, not A.",
  },
  {
    id: "l21-staff-g-major-name-bass",
    prompt: { kind: "staff", clef: "bass", notes: scaleNotes("G2"), duration: "q" },
    answer: choices(["C major", "D major", "G minor", "G major"], 3),
    rule: "G major is spelled G A B C D E F# — a single sharp, F#, produced by the whole step from E.",
  },
  {
    id: "l21-staff-f-major-flats",
    prompt: { kind: "staff", clef: "treble", notes: scaleNotes("F4"), duration: "q" },
    answer: choices(["Two", "Three", "One", "Four"], 2),
    rule: "F major is spelled F G A Bb C D E — one flat — because the formula's half step falls between the third and fourth degrees, A and Bb.",
  },
  {
    id: "l21-staff-a-major-name",
    prompt: { kind: "staff", clef: "treble", notes: scaleNotes("A4"), duration: "q" },
    answer: choices(["D major", "A minor", "E major", "A major"], 3),
    rule: "A major is spelled A B C# D E F# G# — three sharps — from applying W–W–H–W–W–W–H to A.",
  },
  {
    id: "l21-staff-d-major-half-step",
    prompt: { kind: "staff", clef: "treble", notes: scaleNotes("D4"), duration: "q" },
    answer: choices(["D–E", "F#–G", "G–A", "B–C#"], 1),
    rule: "In D major the half steps fall between F# and G and between C# and D, exactly where the formula's two h's sit.",
  },
  {
    id: "l21-staff-a-major-degree-bass",
    prompt: { kind: "staff", clef: "bass", notes: scaleNotes("A2"), duration: "q" },
    answer: choices(["The fourth degree", "The seventh degree", "The fifth degree", "The second degree"], 1),
    rule: "The seventh degree of A major is G#, a half step below the tonic — the formula's final step is an h.",
  },

  // --- text prompts: the formula and the accidentals it produces ------------
  {
    id: "l21-text-what-is-a-scale",
    prompt: { kind: "text", text: "What is a scale?" },
    answer: choices(
      ["A selection of certain notes within an octave", "The distance between two notes", "A group of four notes played together", "A pattern of rhythm"],
      0,
    ),
    rule: "A scale is a selection of certain notes within an octave.",
  },
  {
    id: "l21-text-major-formula",
    prompt: { kind: "text", text: "Which pattern of steps builds a major scale?" },
    answer: choices(
      ["Whole, half, whole, whole, half, whole, whole", "Whole, whole, half, whole, whole, whole, half", "Whole, whole, whole, half, whole, whole, half", "Half, whole, half, whole, half, whole, half"],
      1,
    ),
    rule: "The major scale is constructed with the formula W–W–H–W–W–W–H: whole steps and half steps in that order.",
  },
  {
    id: "l21-text-half-step-count",
    prompt: { kind: "text", text: "How many half steps does the major-scale formula contain?" },
    answer: choices(["One", "Two", "Three", "Four"], 1),
    rule: "The major-scale formula contains two half steps — between degrees 3 and 4, and between degrees 7 and 1 — and five whole steps.",
  },
  {
    id: "l21-text-c-major-accidentals",
    prompt: { kind: "text", text: "Which accidentals does C major need?" },
    answer: choices(
      ["None — every note is a natural", "One sharp", "One flat", "Three flats"],
      0,
    ),
    rule: "C major needs no accidentals: starting on C, every step of the formula lands on a natural note.",
  },
  {
    id: "l21-text-eb-major-flats",
    prompt: { kind: "text", text: "How many flats does Eb major have?" },
    answer: choices(["Two", "Three", "Four", "One"], 1),
    rule: "Eb major has three flats — Eb, Ab and Bb — because both Eb's only count once.",
  },
  {
    id: "l21-text-d-major-sharps",
    prompt: { kind: "text", text: "How many sharps does D major have?" },
    answer: choices(["One", "Three", "Two", "Four"], 2),
    rule: "D major has two sharps, F# and C#, as the worked build from D shows.",
  },
  {
    id: "l21-text-half-step-degrees",
    prompt: {
      kind: "text",
      text: "Where do the half steps of every major scale fall?",
    },
    answer: choices(
      ["Between degrees 2 and 3, and between degrees 5 and 6", "Between degrees 4 and 5, and between degrees 6 and 7", "Between degrees 3 and 4, and between degrees 7 and 1", "Between degrees 1 and 2, and between degrees 4 and 5"],
      2,
    ),
    rule: "The two half steps of every major scale fall between degrees 3 and 4 and between degrees 7 and 1.",
  },
  {
    id: "l21-text-g-major-second",
    prompt: { kind: "text", text: "Starting from G, which note is the second degree of G major?" },
    answer: choices(["Ab", "A", "F#", "B"], 1),
    // The question's pitch is G; the answer is A. The illustration engraves G
    // alone — the learner applies the formula to the root on the page and
    // never reads the second degree off the picture.
    illustration: { clef: "treble", notes: ["G4"] },
    rule: "The first step of the formula is a whole step, so G major begins on G and rises a whole step to A.",
  },
  {
    id: "l21-text-f-major-fourth",
    prompt: { kind: "text", text: "Starting from F, which note is the fourth degree of F major?" },
    answer: choices(["B", "A", "Bb", "C"], 2),
    // The question's pitch is F; the answer is Bb. F alone goes on the page —
    // the flat is the half step the third formula step produces, and drawing
    // it would hand the learner the answer.
    illustration: { clef: "treble", notes: ["F4"] },
    rule: "The third step of the formula is a half step, so F major's fourth degree is Bb, a half step above A.",
  },
  {
    id: "l21-text-build-any-major",
    prompt: { kind: "text", text: "How do you build any major scale?" },
    answer: choices(
      ["Start on the fifth note and work downward", "Add a sharp to every degree", "Use only the white keys", "Start on the first note and follow the formula"],
      3,
    ),
    rule: "It is possible to build any major scale — just start on the first note and follow the formula.",
  },
  {
    id: "l21-text-seven-notes",
    prompt: {
      kind: "text",
      text: "How many distinct notes does a major scale hold before the octave repeats?",
    },
    answer: choices(["Eight", "Seven", "Five", "Twelve"], 1),
    rule: "The formula has seven steps, so a major scale holds seven distinct notes and the eighth note returns to the tonic.",
  },
];

export const lesson21: LessonModule = {
  entry: requireLessonEntry(21),
  generateRounds: (rng) => sampleRounds(lesson21Pool, rng, ROUND_COUNT),
};

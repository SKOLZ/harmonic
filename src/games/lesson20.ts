import type { AnswerSpec, Round } from "../lib/rounds/types";
import { requireLessonEntry } from "./catalog";
import { sampleRounds } from "./rng";
import type { LessonModule } from "./types";

/**
 * Lesson 20 — Steps and Accidentals.
 *
 * Content source: musictheory.net lesson 20 (slide text pulled from the live
 * `lesson20.js`): a half step (semitone) is the distance from one key to the
 * next adjacent key; a whole step (whole tone) is two half steps; the flat
 * lowers a note by a half step and the sharp raises it by one; the double flat
 * and double sharp alter by a whole step; the natural cancels an accidental
 * and returns a note to its original white key; when one pitch has several
 * names it is an enharmonic spelling (the site's own examples: C♯ a half step
 * above C, D♭ a half step below D, E/F♭, F/E♯). Two items in the accepted
 * reference come from elsewhere: the major-scale step pattern (half steps
 * between E–F and B–C) is lesson 21's C-major build — a preview here, the way
 * lesson 11 previewed lesson 14's dot — and the diatonic/chromatic step
 * distinction (diatonic steps change the letter name, chromatic steps keep it)
 * is standard theory that the site's lesson texts never state; nothing on the
 * site contradicts it.
 *
 * The pool is 11 `staff` rounds + 11 `text` rounds = 22, so any draw of 12
 * must include at least one of each kind: the mix is structural, not luck.
 *
 * Companion illustrations (T5 pilot): exactly two text rounds carry an
 * `illustration` — the ones whose subject is a concrete pitch and whose
 * answer the picture does not reveal. "Which note is enharmonic with C#?"
 * shows C# (the question's pitch), never Db (the answer). The major-scale
 * pair question shows the C major scale in plain naturals, so no pair is
 * privileged by the engraving — the half-step knowledge stays with the
 * learner. Every other text round here is conceptual, or its picture would
 * leak the answer (counting rounds, rest glyphs, line identification).
 */
const choices = (options: string[], correctIndex: number): AnswerSpec => ({
  kind: "choices",
  options,
  correctIndex,
});

/** Rounds drawn per visit; the pool is larger so replays vary. */
const ROUND_COUNT = 12;

export const lesson20Pool: readonly Round[] = [
  // --- staff prompts: read the accidental on the page ----------------------
  {
    id: "l20-staff-sharp-name",
    prompt: { kind: "staff", clef: "treble", notes: ["C#4"] },
    answer: choices(["C4", "C#4", "Db4", "D4"], 1),
    rule: "A sharp raises a note by one half step, so C# is the key immediately above C.",
  },
  {
    id: "l20-staff-flat-name",
    prompt: { kind: "staff", clef: "treble", notes: ["Db4"] },
    answer: choices(["C#4", "D4", "Db4", "C4"], 2),
    rule: "A flat lowers a note by one half step, so Db is the key immediately below D.",
  },
  {
    id: "l20-staff-e-sharp-enharmonic",
    prompt: { kind: "staff", clef: "treble", notes: ["E#4"] },
    answer: choices(["F4", "Fb4", "E4", "Gb4"], 0),
    rule: "E# and F are the same sound spelled two ways — an enharmonic pair.",
  },
  {
    id: "l20-staff-f-flat-enharmonic",
    prompt: { kind: "staff", clef: "treble", notes: ["Fb4"] },
    answer: choices(["E4", "F4", "Gb4", "E#4"], 0),
    rule: "Fb and E are enharmonic: the same pitch reached a half step below F.",
  },
  {
    id: "l20-staff-b-sharp-enharmonic",
    prompt: { kind: "staff", clef: "treble", notes: ["B#4"] },
    answer: choices(["C5", "B4", "Cb5", "Db5"], 0),
    rule: "B# sounds the same as the C above it — a half step above B is C, an enharmonic pair.",
  },
  {
    id: "l20-staff-c-flat-enharmonic",
    prompt: { kind: "staff", clef: "treble", notes: ["Cb5"] },
    answer: choices(["B4", "C5", "A#4", "Bb4"], 0),
    rule: "Cb sounds the same as the B below it: a half step below C is B, an enharmonic pair.",
  },
  {
    id: "l20-staff-cd-whole-step",
    prompt: { kind: "staff", clef: "treble", notes: ["C4", "D4"], duration: "q" },
    answer: choices(["A half step", "A whole step", "A unison", "Three half steps"], 1),
    rule: "A whole step equals two half steps: C to D passes over the black key between them.",
  },
  {
    id: "l20-staff-ef-half-step",
    prompt: { kind: "staff", clef: "treble", notes: ["E4", "F4"], duration: "q" },
    answer: choices(["A half step", "A whole step", "A unison", "Two whole steps"], 0),
    rule: "E to F is a half step — there is no black key between them.",
  },
  {
    id: "l20-staff-ga-whole-step-bass",
    prompt: { kind: "staff", clef: "bass", notes: ["G3", "A3"], duration: "q" },
    answer: choices(["A half step", "A whole step", "A unison", "Three half steps"], 1),
    rule: "G to A is a whole step: two half steps with the black key between.",
  },
  {
    id: "l20-staff-c-cs-chromatic-bass",
    prompt: { kind: "staff", clef: "bass", notes: ["C3", "C#3"], duration: "q" },
    answer: choices(
      ["A chromatic half step", "A diatonic whole step", "A whole step", "A unison"],
      0,
    ),
    rule: "A chromatic step changes the pitch while the letter name stays the same — C to C#.",
  },
  {
    id: "l20-staff-double-sharp-name",
    prompt: { kind: "staff", clef: "treble", notes: ["C##4"] },
    answer: choices(["C#4", "C##4", "Db4", "D4"], 1),
    rule: "A double sharp raises a note by a whole step — two half steps — so C## sounds a whole step above C.",
  },

  // --- text prompts: the keyboard and the accidentals ----------------------
  {
    id: "l20-text-half-step",
    prompt: { kind: "text", text: "What is a half step?" },
    answer: choices(
      ["The distance from one key to the next adjacent key", "The distance of two half steps", "The distance from one white key to the next white key", "A step inside a major scale"],
      0,
    ),
    rule: "A half step (semitone) is the distance from one key on the keyboard to the next adjacent key.",
  },
  {
    id: "l20-text-whole-step",
    prompt: { kind: "text", text: "What is a whole step?" },
    answer: choices(["Two half steps", "One half step", "Three half steps", "Four half steps"], 0),
    rule: "A whole step (whole tone) is the same distance as two half steps.",
  },
  {
    id: "l20-text-sharp-effect",
    prompt: { kind: "text", text: "What does a sharp do to a note?" },
    answer: choices(
      ["Raises it one half step", "Lowers it one half step", "Raises it a whole step", "Cancels the accidental"],
      0,
    ),
    rule: "The sharp raises a note by a half step.",
  },
  {
    id: "l20-text-flat-effect",
    prompt: { kind: "text", text: "What does a flat do to a note?" },
    answer: choices(
      ["Lowers it one half step", "Raises it one half step", "Lowers it a whole step", "Raises it a whole step"],
      0,
    ),
    rule: "The flat lowers a note by a half step.",
  },
  {
    id: "l20-text-natural-effect",
    prompt: { kind: "text", text: "What does a natural do?" },
    answer: choices(
      ["Cancels an accidental and returns the note to its original white key", "Raises the note a half step", "Lowers the note a whole step", "Marks a tie between two notes"],
      0,
    ),
    rule: "A natural cancels out any accidental and returns a note to its original white key.",
  },
  {
    id: "l20-text-double-sharp-effect",
    prompt: { kind: "text", text: "What does a double sharp do?" },
    answer: choices(
      ["Raises the note a whole step", "Raises the note a half step", "Lowers the note a whole step", "Cancels both accidentals"],
      0,
    ),
    rule: "While sharps alter a note by a half step, the double sharp alters it by a whole step.",
  },
  {
    id: "l20-text-double-flat-effect",
    prompt: { kind: "text", text: "What does a double flat do?" },
    answer: choices(
      ["Lowers the note a whole step", "Lowers the note a half step", "Raises the note a whole step", "Cancels both accidentals"],
      0,
    ),
    rule: "While flats alter a note by a half step, the double flat alters it by a whole step.",
  },
  {
    id: "l20-text-enharmonic-definition",
    prompt: { kind: "text", text: "When one pitch has more than one name, what is that called?" },
    answer: choices(
      ["An enharmonic spelling", "A chromatic step", "An inversion", "A key change"],
      0,
    ),
    rule: "Whenever a certain pitch has multiple names, it is called an enharmonic spelling.",
  },
  {
    id: "l20-text-enharmonic-cs-db",
    prompt: { kind: "text", text: "Which note is enharmonic with C#?" },
    answer: choices(["Db", "D", "B", "Eb"], 0),
    // The question's pitch is C#; the answer is Db. The illustration shows
    // C# alone — never Db, which would hand the learner the answer.
    illustration: { clef: "treble", notes: ["C#4"] },
    rule: "C# is a half step above C and Db is a half step below D — the same pitch spelled two ways.",
  },
  {
    id: "l20-text-major-scale-half-steps",
    prompt: {
      kind: "text",
      text: "In the major scale, which pair of letter names is always a half step?",
    },
    answer: choices(["E-F", "C-D", "F-G", "G-A"], 0),
    // The question's subject is the major scale itself; the engraving shows
    // its notes in plain naturals, so every letter sits equally and the
    // picture cannot point at the E-F answer.
    illustration: {
      clef: "treble",
      notes: ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"],
      duration: "q",
    },
    rule: "The major scale's half steps fall between E and F and between B and C; every other step is a whole step.",
  },
  {
    id: "l20-text-diatonic-vs-chromatic",
    prompt: { kind: "text", text: "How does a diatonic step differ from a chromatic step?" },
    answer: choices(
      ["A diatonic step moves to the adjacent letter name; a chromatic step changes pitch without changing the letter", "A diatonic step keeps the same letter; a chromatic step changes it", "Diatonic steps are always whole steps; chromatic steps are always half steps", "There is no difference"],
      0,
    ),
    rule: "A diatonic step moves to the adjacent letter name (C to D), while a chromatic step changes pitch without changing the letter (C to C#).",
  },
];

export const lesson20: LessonModule = {
  entry: requireLessonEntry(20),
  generateRounds: (rng) => sampleRounds(lesson20Pool, rng, ROUND_COUNT),
};

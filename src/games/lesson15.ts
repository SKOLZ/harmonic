import type { AnswerSpec, Round } from "../lib/rounds/types";
import { requireLessonEntry } from "./catalog";
import { sampleRounds } from "./rng";
import type { LessonModule } from "./types";

/**
 * Lesson 15 — Simple and Compound Meter.
 *
 * Content source: musictheory.net lesson 15 (slide text pulled from the live
 * `lesson15.js`): every time signature is classified into a meter; duple,
 * triple, and quadruple refer to the number of beats in a measure; simple
 * means each beat can be broken into two notes (so simple meters always have
 * a 2, 3, or 4 on top — 2/4 simple duple, 3/4 simple triple with 3/2 and 3/8
 * alongside, 4/4 simple quadruple with 4/2 and 4/8); compound beats are
 * divided into three. The lesson's worked example is 6/8: its six eighth notes
 * can be grouped into two beats (compound duple) or three (simple triple), and
 * because the simple triple pattern already belongs to 3/4 time, 6/8 is
 * compound duple — each of its beats a dotted quarter, as in every compound
 * meter. 9/8 is compound triple, 12/8 compound quadruple, and a 6, 9, or 12
 * on top marks those compound meters.
 *
 * Corrections to the task's accepted reference, from the live site: the
 * lesson's title is "Simple and Compound Meter" (there is no "Beat and Time
 * Signature" lesson among the site's 39), the beat-as-basic-pulse definition
 * appears in no lesson text, and the bottom-number framing ("the note value
 * the measure is counted in") is lesson 12's phrasing — restated here only
 * where a rule touches the top number, never as "gets one beat".
 *
 * The pool is 11 `staff` rounds + 11 `text` rounds = 22, so any draw of 12
 * must include at least one of each kind: the mix is structural, not luck.
 * Staff prompts read the meter straight off the page: `q` fills simple-meter
 * measures, `8` fills eighth-based measures (6/8, 9/8), and `qd` draws the
 * dotted-quarter beats compound meters are built from.
 */
const choices = (options: string[], correctIndex: number): AnswerSpec => ({
  kind: "choices",
  options,
  correctIndex,
});

/** Rounds drawn per visit; the pool is larger so replays vary. */
const ROUND_COUNT = 12;

export const lesson15Pool: readonly Round[] = [
  // --- staff prompts: classify the meter the engraving shows ---------------
  {
    id: "l15-staff-24-simple-duple",
    prompt: { kind: "staff", clef: "treble", notes: ["E4", "G4"], duration: "q" },
    answer: choices(["Simple duple", "Simple triple", "Simple quadruple", "Compound duple"], 0),
    rule: "Duple means two beats per measure and simple divides each beat into two notes, so 2/4 is simple duple.",
  },
  {
    id: "l15-staff-34-simple-triple",
    prompt: { kind: "staff", clef: "treble", notes: ["G4", "A4", "B4"], duration: "q" },
    answer: choices(["Simple duple", "Simple triple", "Compound triple", "Compound duple"], 1),
    rule: "3/4 has three beats, each of which can be divided into two notes, so 3/4 is simple triple.",
  },
  {
    id: "l15-staff-44-simple-quadruple",
    prompt: { kind: "staff", clef: "treble", notes: ["C5", "D5", "E5", "F5"], duration: "q" },
    answer: choices(["Simple quadruple", "Simple triple", "Compound quadruple", "Compound duple"], 0),
    rule: "4/4 is simple quadruple: four beats, each of which can be divided into two notes.",
  },
  {
    id: "l15-staff-68-compound-duple",
    prompt: {
      kind: "staff",
      clef: "treble",
      notes: ["C5", "D5", "E5", "F5", "G5", "A5"],
      duration: "8",
    },
    answer: choices(["Compound duple", "Simple triple", "Simple duple", "Compound quadruple"], 0),
    rule: "In 6/8 the six eighth notes group into two beats of a dotted quarter each, so 6/8 is compound duple.",
  },
  {
    id: "l15-staff-68-beat-value",
    prompt: {
      kind: "staff",
      clef: "treble",
      notes: ["D5", "E5", "F5", "G5", "A5", "B5"],
      duration: "8",
    },
    answer: choices(["A dotted quarter note", "A quarter note", "An eighth note", "A half note"], 0),
    rule: "Each beat in 6/8 is a dotted quarter note — in fact, all compound meters will have some dotted note as their beat.",
  },
  {
    id: "l15-staff-98-compound-triple",
    prompt: { kind: "staff", clef: "treble", notes: ["C5", "D5", "E5"], duration: "qd" },
    answer: choices(["Compound triple", "Compound duple", "Simple triple", "Simple quadruple"], 0),
    rule: "9/8 has three beats of a dotted quarter note each, and each beat is made up of three notes, so it is compound triple.",
  },
  {
    id: "l15-staff-128-compound-quadruple",
    prompt: { kind: "staff", clef: "treble", notes: ["C5", "D5", "E5", "F5"], duration: "qd" },
    answer: choices(["Compound quadruple", "Compound triple", "Simple quadruple", "Compound duple"], 0),
    rule: "12/8 has four beats of a dotted quarter note each, so it is compound quadruple.",
  },
  {
    id: "l15-staff-98-beat-count",
    prompt: {
      kind: "staff",
      clef: "treble",
      notes: ["C5", "D5", "E5", "F5", "G5", "A5", "B5", "C6", "D6"],
      duration: "8",
    },
    answer: choices(["Two", "Three", "Four", "Six"], 1),
    rule: "9/8 contains three beats, each one a dotted quarter note, which is why the meter is triple.",
  },
  {
    id: "l15-staff-24-bass-simple-two",
    prompt: { kind: "staff", clef: "bass", notes: ["A2", "F2"], duration: "q" },
    answer: choices(["One", "Two", "Three", "Four"], 1),
    rule: "Simple meter means each beat can be broken into two notes — in 2/4 each quarter-note beat splits into two eighths.",
  },
  {
    id: "l15-staff-68-bass-compound-three",
    prompt: {
      kind: "staff",
      clef: "bass",
      notes: ["G2", "A2", "B2", "C3", "D3", "E3"],
      duration: "8",
    },
    answer: choices(["Two", "Three", "Four", "Six"], 1),
    rule: "Beats in compound meter are divided into three notes, while a simple beat divides into two.",
  },
  {
    id: "l15-staff-128-bass-top-number",
    prompt: { kind: "staff", clef: "bass", notes: ["E2", "F2", "G2", "A2"], duration: "qd" },
    answer: choices(["Compound quadruple", "Compound triple", "Simple quadruple", "Compound duple"], 0),
    rule: "Any time signature with a 12 on top is compound quadruple; 12/8 and 12/16 are the most commonly used.",
  },

  // --- text prompts: the classification vocabulary -------------------------
  {
    id: "l15-text-duple-triple-quadruple-meaning",
    prompt: { kind: "text", text: "What do the terms duple, triple, and quadruple refer to?" },
    answer: choices(
      ["The number of beats in a measure", "The type of each beat", "The tempo of the piece", "The number of measures"],
      0,
    ),
    rule: "Duple, triple, and quadruple refer to the number of beats in a measure.",
  },
  {
    id: "l15-text-simple-meaning",
    prompt: { kind: "text", text: "What does the term simple mean for a beat?" },
    answer: choices(
      ["It can be broken into two notes", "It can be broken into three notes", "It always lasts one quarter note", "It has no division"],
      0,
    ),
    rule: "The term simple means that each beat can be broken into two notes.",
  },
  {
    id: "l15-text-compound-division",
    prompt: { kind: "text", text: "Beats in compound meter are divided into how many notes?" },
    answer: choices(["Two", "Three", "Four", "Six"], 1),
    rule: "While beats in simple meter are divided into two notes, beats in compound meter are divided into three.",
  },
  {
    id: "l15-text-22-28-simple-duple",
    prompt: { kind: "text", text: "2/2 and 2/8 are also classified as which meter?" },
    answer: choices(["Simple duple", "Simple triple", "Compound duple", "Compound quadruple"], 0),
    rule: "2/2 and 2/8 are also simple duple, like 2/4 — a 2 on top over simple beats.",
  },
  {
    id: "l15-text-44-why-quadruple",
    prompt: { kind: "text", text: "Why is 4/4 classified as simple quadruple?" },
    answer: choices(
      ["It has four beats which can be divided into two notes", "It has three beats", "Its beats divide into three notes", "It has six beats"],
      0,
    ),
    rule: "4/4 time is classified as simple quadruple due to its four beats which can be divided into two notes.",
  },
  {
    id: "l15-text-simple-top-number",
    prompt: { kind: "text", text: "A time signature in simple meter always has which numbers on top?" },
    answer: choices(["2, 3, or 4", "6, 9, or 12", "5, 7, or 11", "Any number at all"], 0),
    rule: "A time signature in simple meter will always have a 2, 3, or 4 for the top number.",
  },
  {
    id: "l15-text-six-on-top",
    prompt: { kind: "text", text: "Which time signatures are compound duple?" },
    answer: choices(
      ["Any with a 6 on top, such as 6/8 and 6/4", "Any with a 4 on top", "Any with a 3 on top", "Only 9/8"],
      0,
    ),
    rule: "Any time signature with a 6 on top is compound duple; 6/8 and 6/4 are the most commonly used.",
  },
  {
    id: "l15-text-68-not-simple-triple",
    prompt: { kind: "text", text: "Why is 6/8 compound duple rather than simple triple?" },
    answer: choices(
      ["Because the simple triple pattern already belongs to 3/4 time", "Because 6/8 has only six notes", "Because 6/8 has a 2 on top", "Because compound meters cannot have dotted notes"],
      0,
    ),
    rule: "Since the simple triple pattern already belongs to 3/4 time, the six eighths of 6/8 are compound duple.",
  },
  {
    id: "l15-text-compound-dotted-beat",
    prompt: { kind: "text", text: "What kind of note is the beat of every compound meter?" },
    answer: choices(
      ["Some dotted note — in 6/8, a dotted quarter", "A whole note", "An undotted eighth note", "A quarter note"],
      0,
    ),
    rule: "In fact, all compound meters will have some dotted note as their beat — in 6/8 that beat is a dotted quarter.",
  },
  {
    id: "l15-text-98-compound-triple",
    prompt: { kind: "text", text: "9/8 time is classified as which meter?" },
    answer: choices(["Compound triple", "Compound duple", "Simple triple", "Simple quadruple"], 0),
    rule: "9/8 time has three beats of a dotted quarter note each, so it is compound triple.",
  },
  {
    id: "l15-text-42-48-simple-quadruple",
    prompt: { kind: "text", text: "4/2 and 4/8 are also classified as which meter?" },
    answer: choices(["Simple quadruple", "Compound quadruple", "Simple triple", "Compound duple"], 0),
    rule: "4/2 and 4/8 are also simple quadruple, like 4/4.",
  },
];

export const lesson15: LessonModule = {
  entry: requireLessonEntry(15),
  generateRounds: (rng) => sampleRounds(lesson15Pool, rng, ROUND_COUNT),
};

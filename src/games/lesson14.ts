import type { AnswerSpec, Round } from "../lib/rounds/types";
import { requireLessonEntry } from "./catalog";
import { sampleRounds } from "./rng";
import type { LessonModule } from "./types";

/**
 * Lesson 14 — Dots and Ties.
 *
 * Content source: musictheory.net lesson 14 (slide text pulled from the live
 * `lesson14.js`): augmentation dots and tenuto ties alter a note's duration;
 * a dot increases duration by one half (a dotted quarter = a quarter plus an
 * eighth = three eighths); ties merge multiple notes of the same pitch and
 * let a duration travel across barriers such as the measure line. The
 * double-dot rule (a second dot adds half of the first dot's value, ×1.75) and
 * the tie-vs-slur distinction are standard notation the site does not state on
 * this lesson — its lesson texts mention neither double dots nor slurs — and
 * nothing on the site contradicts them. A dotted whole filling six beats in
 * 4/4 follows from the site's own dot rule.
 *
 * The pool is 11 `staff` rounds + 11 `text` rounds = 22, so any draw of 12
 * must include at least one of each kind: the mix is structural, not luck.
 * Every staff prompt carries a dotted duration code (`wd`, `hd`, `qd`, `8d`)
 * so the learner reads the augmentation dot where it lives — after the note.
 */
const choices = (options: string[], correctIndex: number): AnswerSpec => ({
  kind: "choices",
  options,
  correctIndex,
});

/** Rounds drawn per visit; the pool is larger so replays vary. */
const ROUND_COUNT = 12;

export const lesson14Pool: readonly Round[] = [
  // --- staff prompts: count the dotted note's beats ------------------------
  {
    id: "l14-staff-dotted-quarter-beats",
    prompt: { kind: "staff", clef: "treble", notes: ["C5"], duration: "qd" },
    answer: choices(["0.5", "1", "1.5", "2"], 2),
    rule: "A dot increases duration by one half: a dotted quarter lasts 1.5 beats in 4/4.",
  },
  {
    id: "l14-staff-dotted-quarter-eighths",
    prompt: { kind: "staff", clef: "treble", notes: ["D5"], duration: "qd" },
    answer: choices(["Two", "Three", "Four", "Six"], 1),
    rule: "A dotted quarter equals a quarter plus an eighth — three eighth notes.",
  },
  {
    id: "l14-staff-dotted-half-beats",
    prompt: { kind: "staff", clef: "treble", notes: ["E5"], duration: "hd" },
    answer: choices(["2", "2.5", "3", "4"], 2),
    rule: "A dotted half adds half of two beats, so it lasts three beats in 4/4.",
  },
  {
    id: "l14-staff-dotted-whole-beats",
    prompt: { kind: "staff", clef: "treble", notes: ["F5"], duration: "wd" },
    answer: choices(["4", "5", "6", "8"], 2),
    rule: "A dotted whole adds half of four beats, filling six beats in 4/4.",
  },
  {
    id: "l14-staff-dotted-eighth-beats",
    prompt: { kind: "staff", clef: "treble", notes: ["G5"], duration: "8d" },
    answer: choices(["0.25", "0.5", "0.75", "1"], 2),
    rule: "A dotted eighth adds half of half a beat, so it lasts three quarters of a beat in 4/4.",
  },

  // --- staff prompts: name the dotted note value ---------------------------
  {
    id: "l14-staff-name-dotted-quarter",
    prompt: { kind: "staff", clef: "treble", notes: ["A4"], duration: "qd" },
    answer: choices(["A dotted quarter", "A plain quarter", "A dotted half", "A dotted eighth"], 0),
    rule: "A dot after the note head adds half the note's own value: a dotted quarter is a quarter plus an eighth.",
  },
  {
    id: "l14-staff-name-dotted-half",
    prompt: { kind: "staff", clef: "treble", notes: ["B4"], duration: "hd" },
    answer: choices(["A half note", "A dotted half", "A dotted quarter", "A dotted whole"], 1),
    rule: "A dot after a half note adds one beat, giving a dotted half of three beats.",
  },
  {
    id: "l14-staff-name-dotted-whole-bass",
    prompt: { kind: "staff", clef: "bass", notes: ["C3"], duration: "wd" },
    answer: choices(["A whole note", "A dotted half", "A dotted whole", "A double whole"], 2),
    rule: "A dotted whole lasts six beats — a whole note plus half of itself.",
  },
  {
    id: "l14-staff-name-dotted-eighth",
    prompt: { kind: "staff", clef: "treble", notes: ["E4"], duration: "8d" },
    answer: choices(["An eighth note", "A dotted quarter", "A dotted sixteenth", "A dotted eighth"], 3),
    rule: "A dotted eighth lasts one and a half eighth notes — three sixteenths, or 0.75 beats in 4/4.",
  },

  // --- staff prompts: two dotted notes side by side ------------------------
  {
    id: "l14-staff-two-dotted-quarters",
    prompt: { kind: "staff", clef: "treble", notes: ["C5", "D5"], duration: "qd" },
    answer: choices(["2", "3", "4", "6"], 1),
    rule: "Two dotted quarters are 1.5 + 1.5 = three beats — the same as a dotted half.",
  },
  {
    id: "l14-staff-two-dotted-halves-bass",
    prompt: { kind: "staff", clef: "bass", notes: ["A2", "C3"], duration: "hd" },
    answer: choices(["4", "5", "6", "8"], 2),
    rule: "Each dotted half lasts three beats, so together they last six beats — one and a half measures of 4/4.",
  },

  // --- text prompts: dots, ties, and the difference from a slur ------------
  {
    id: "l14-text-dot-effect",
    prompt: { kind: "text", text: "What does a dot after a note do?" },
    answer: choices(
      ["Increases the duration by one half", "Adds exactly one beat", "Doubles the note", "Halves the note"],
      0,
    ),
    rule: "A dot increases duration by one half.",
  },
  {
    id: "l14-text-dotted-quarter-value",
    prompt: { kind: "text", text: "A dotted quarter note equals which sum?" },
    answer: choices(
      ["A quarter plus an eighth", "A quarter plus a sixteenth", "A half plus a quarter", "Two quarters"],
      0,
    ),
    rule: "A dotted quarter note equals a quarter note plus an eighth note — three eighths.",
  },
  {
    id: "l14-text-second-dot",
    prompt: { kind: "text", text: "What does a second dot after a note add?" },
    answer: choices(
      ["Half the value of the first dot", "A full extra beat", "Nothing more", "The same amount as the first dot"],
      0,
    ),
    rule: "A second dot adds half of the first dot's value, so a double-dotted note lasts 1.75 times the plain note.",
  },
  {
    id: "l14-text-dotted-whole-44",
    prompt: { kind: "text", text: "How many beats does a dotted whole fill in 4/4?" },
    answer: choices(["Four", "Five", "Six", "Eight"], 2),
    rule: "A dotted whole is four beats plus two, filling six beats in 4/4.",
  },
  {
    id: "l14-text-what-is-tie",
    prompt: { kind: "text", text: "What is a tie?" },
    answer: choices(
      ["A curved line joining two notes of the same pitch so their lengths add", "A curved line over different notes played smoothly", "A dot placed after a note", "A line dividing measures"],
      0,
    ),
    rule: "Ties merge multiple notes of the same pitch, adding their durations into one longer note.",
  },
  {
    id: "l14-text-tie-crosses-bar-line",
    prompt: { kind: "text", text: "Can a tie cross a bar line?" },
    answer: choices(
      ["Yes — a tie lets a duration travel across the measure line", "No — ties stay inside one measure", "Only in 4/4 time", "Only for whole notes"],
      0,
    ),
    rule: "A tie lets the duration of a note travel across barriers such as the measure line.",
  },
  {
    id: "l14-text-tie-vs-slur",
    prompt: { kind: "text", text: "How does a tie differ from a slur?" },
    answer: choices(
      ["A tie joins the same pitch into one longer note; a slur connects different pitches played legato", "A slur joins the same pitch; a tie connects different pitches", "They are two names for the same mark", "A tie is only ever drawn under the staff"],
      0,
    ),
    rule: "A tie joins two notes of the same pitch into one longer note, while a slur connects different pitches played smoothly.",
  },
  {
    id: "l14-text-dotted-quarter-beats",
    prompt: { kind: "text", text: "In 4/4 time, how many beats is a dotted quarter worth?" },
    answer: choices(["0.5", "1", "1.5", "2"], 2),
    rule: "A dotted quarter is a quarter plus an eighth: 1 + 0.5 = 1.5 beats in 4/4.",
  },
  {
    id: "l14-text-three-eighths",
    prompt: { kind: "text", text: "Three eighth notes together equal which note?" },
    answer: choices(["A quarter note", "A dotted quarter", "A half note", "A dotted half"], 1),
    rule: "A dotted quarter can also equal three eighth notes.",
  },
  {
    id: "l14-text-tied-halves",
    prompt: { kind: "text", text: "Two half notes of the same pitch tied together last how long?" },
    answer: choices(["Two beats", "Three beats", "Four beats", "Six beats"], 2),
    rule: "A tie adds the durations of two notes of the same pitch: two tied halves last four beats.",
  },
  {
    id: "l14-text-tied-wholes",
    prompt: { kind: "text", text: "Two whole notes of the same pitch tied together sound for how many beats?" },
    answer: choices(["Four", "Six", "Eight", "Twelve"], 2),
    rule: "Two tied whole notes sound as one note of eight beats.",
  },
];

export const lesson14: LessonModule = {
  entry: requireLessonEntry(14),
  generateRounds: (rng) => sampleRounds(lesson14Pool, rng, ROUND_COUNT),
};

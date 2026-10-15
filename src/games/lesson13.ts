import type { AnswerSpec, Round } from "../lib/rounds/types";
import { requireLessonEntry } from "./catalog";
import { sampleRounds } from "./rng";
import type { LessonModule } from "./types";

/**
 * Lesson 13 — Rest Duration.
 *
 * Content source: musictheory.net lesson 13 (slide text pulled from the live
 * `lesson13.js`): rests represent periods of silence; each type of rest shares
 * a duration with a certain type of note (a quarter rest lasts as long as a
 * quarter note); the whole rest is a box descending from the fourth staff
 * line; the half rest is a box ascending from the middle (third) line; an
 * eighth rest has one flag, a sixteenth rest two, and although rarer rests can
 * have three or more flags. The "whole rest fills a 4/4 measure" phrasing
 * follows from its four-beat length (lesson 12: 4/4 holds four quarter notes).
 *
 * The pool is 11 `staff` rounds + 11 `text` rounds = 22, so any draw of 12
 * must include at least one of each kind: the mix is structural, not luck.
 * Every staff prompt carries a rest duration code (`wr`, `hr`, `qr`, `8r`,
 * `16r`) so the learner reads real rest notation, not note heads.
 */
const choices = (options: string[], correctIndex: number): AnswerSpec => ({
  kind: "choices",
  options,
  correctIndex,
});

/** Rounds drawn per visit; the pool is larger so replays vary. */
const ROUND_COUNT = 12;

export const lesson13Pool: readonly Round[] = [
  // --- staff prompts: identify the engraved rest ---------------------------
  {
    id: "l13-staff-quarter-rest-name",
    prompt: { kind: "staff", clef: "treble", notes: ["C5"], duration: "qr" },
    answer: choices(["A whole rest", "A half rest", "A quarter rest", "An eighth rest"], 2),
    rule: "The quarter rest (the squiggle) lasts as long as a quarter note — one beat in 4/4.",
  },
  {
    id: "l13-staff-eighth-rest-name",
    prompt: { kind: "staff", clef: "treble", notes: ["D5"], duration: "8r" },
    answer: choices(["A whole rest", "A half rest", "A quarter rest", "An eighth rest"], 3),
    rule: "An eighth rest carries one flag and lasts as long as an eighth note — half a beat in 4/4.",
  },
  {
    id: "l13-staff-sixteenth-rest-name",
    prompt: { kind: "staff", clef: "treble", notes: ["E5"], duration: "16r" },
    answer: choices(["A quarter rest", "An eighth rest", "A half rest", "A sixteenth rest"], 3),
    rule: "A sixteenth rest has two flags and lasts as long as a sixteenth note — a quarter of a beat in 4/4.",
  },
  {
    id: "l13-staff-half-rest-name",
    prompt: { kind: "staff", clef: "treble", notes: ["F5"], duration: "hr" },
    answer: choices(["A whole rest", "A half rest", "A quarter rest", "An eighth rest"], 1),
    rule: "The half rest sits on top of the middle (third) line and lasts two beats in 4/4.",
  },
  {
    id: "l13-staff-whole-rest-name",
    prompt: { kind: "staff", clef: "treble", notes: ["G5"], duration: "wr" },
    answer: choices(["A whole rest", "A half rest", "A quarter rest", "An eighth rest"], 0),
    rule: "The whole rest hangs below the fourth line and lasts four beats, filling a whole measure of 4/4.",
  },

  // --- staff prompts: read the silent length of a rest ---------------------
  {
    id: "l13-staff-quarter-rest-beats-bass",
    prompt: { kind: "staff", clef: "bass", notes: ["D3"], duration: "qr" },
    answer: choices(["0.25", "0.5", "1", "2"], 2),
    rule: "A quarter rest lasts one beat in 4/4 — the same as a quarter note.",
  },
  {
    id: "l13-staff-half-rest-beats-bass",
    prompt: { kind: "staff", clef: "bass", notes: ["F3"], duration: "hr" },
    answer: choices(["0.5", "1", "2", "4"], 2),
    rule: "A half rest lasts two beats in 4/4 — the same as a half note.",
  },
  {
    id: "l13-staff-whole-rest-beats-bass",
    prompt: { kind: "staff", clef: "bass", notes: ["A2"], duration: "wr" },
    answer: choices(["2", "3", "4", "8"], 2),
    rule: "A whole rest lasts four beats in 4/4, so it fills an entire measure.",
  },
  {
    id: "l13-staff-eighth-rest-beats-bass",
    prompt: { kind: "staff", clef: "bass", notes: ["G2"], duration: "8r" },
    answer: choices(["0.25", "0.5", "1", "2"], 1),
    rule: "An eighth rest lasts half a beat in 4/4 — the same as an eighth note.",
  },
  {
    id: "l13-staff-sixteenth-rest-beats",
    prompt: { kind: "staff", clef: "treble", notes: ["B4"], duration: "16r" },
    answer: choices(["0.25", "0.5", "1", "2"], 0),
    rule: "A sixteenth rest lasts a quarter of a beat in 4/4 — the same as a sixteenth note.",
  },
  {
    id: "l13-staff-four-quarter-rests",
    prompt: {
      kind: "staff",
      clef: "treble",
      notes: ["C5", "D5", "E5", "F5"],
      duration: "qr",
    },
    answer: choices(["2", "3", "4", "6"], 2),
    rule: "Four quarter rests silence the four beats of a 4/4 measure — a whole measure of silence.",
  },

  // --- text prompts: what rests are and how they are drawn -----------------
  {
    id: "l13-text-what-is-rest",
    prompt: { kind: "text", text: "What does a rest represent?" },
    answer: choices(
      ["A period of silence in a measure", "A louder passage", "A change of key", "A repeat of the music"],
      0,
    ),
    rule: "Rests represent periods of silence in a measure.",
  },
  {
    id: "l13-text-rest-shares-note-length",
    prompt: { kind: "text", text: "Each type of rest shares its length with what?" },
    answer: choices(
      ["A certain type of note", "A certain clef", "A certain key signature", "A certain dynamic"],
      0,
    ),
    rule: "Each type of rest shares a duration with a certain type of note — a quarter rest lasts as long as a quarter note.",
  },
  {
    id: "l13-text-whole-rest-line",
    prompt: { kind: "text", text: "The whole rest is drawn as a box hanging below which line?" },
    answer: choices(["The fourth line", "The bottom line", "The middle line", "The top line"], 0),
    rule: "The whole rest is drawn as a box descending from the fourth staff line.",
  },
  {
    id: "l13-text-half-rest-line",
    prompt: { kind: "text", text: "The half rest sits on top of which line?" },
    answer: choices(["The middle (third) line", "The bottom line", "The fourth line", "The top line"], 0),
    rule: "The half rest is drawn as a box ascending from the middle staff line.",
  },
  {
    id: "l13-text-eighth-rest-flags",
    prompt: { kind: "text", text: "How many flags does an eighth rest carry?" },
    answer: choices(["None", "One", "Two", "Three"], 1),
    rule: "With one flag, an eighth rest has the same duration as an eighth note.",
  },
  {
    id: "l13-text-sixteenth-rest-flags",
    prompt: { kind: "text", text: "How many flags does a sixteenth rest carry?" },
    answer: choices(["None", "One", "Two", "Three"], 2),
    rule: "With two flags, a sixteenth rest has the same duration as a sixteenth note.",
  },
  {
    id: "l13-text-more-flags",
    prompt: { kind: "text", text: "Can a rest carry more than two flags?" },
    answer: choices(
      ["Yes — rests can have three or more flags, though rarely", "No — two flags is the maximum", "Only whole rests can", "Only in odd meters"],
      0,
    ),
    rule: "Although rarer, rests can have three or more flags.",
  },
  {
    id: "l13-text-quarter-rest-beats",
    prompt: { kind: "text", text: "In 4/4 time, how many beats of silence does a quarter rest give?" },
    answer: choices(["0.5", "1", "2", "4"], 1),
    rule: "A quarter rest lasts one beat in 4/4 — the same length as a quarter note.",
  },
  {
    id: "l13-text-four-quarter-rests",
    prompt: { kind: "text", text: "How many quarter rests fill one measure of 4/4?" },
    answer: choices(["Two", "Three", "Four", "Eight"], 2),
    rule: "A 4/4 measure holds four beats, so four quarter rests silence it completely.",
  },
  {
    id: "l13-text-note-vs-rest",
    prompt: { kind: "text", text: "What is the difference between a quarter note and a quarter rest?" },
    answer: choices(
      ["The note sounds; the rest is silent, and both last the same length", "The rest lasts twice as long", "The note is the silent one", "There is no difference"],
      0,
    ),
    rule: "While the note would make a sound, the rest is silent — both occupy the same amount of time.",
  },
  {
    id: "l13-text-eighth-rest-beats",
    prompt: { kind: "text", text: "In 4/4 time, how long does an eighth rest last?" },
    answer: choices(["0.25", "0.5", "1", "2"], 1),
    rule: "An eighth rest lasts as long as an eighth note — half a beat in 4/4.",
  },
];

export const lesson13: LessonModule = {
  entry: requireLessonEntry(13),
  generateRounds: (rng) => sampleRounds(lesson13Pool, rng, ROUND_COUNT),
};

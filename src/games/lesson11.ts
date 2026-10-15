import type { AnswerSpec, Round } from "../lib/rounds/types";
import { requireLessonEntry } from "./catalog";
import { sampleRounds } from "./rng";
import type { LessonModule } from "./types";

/**
 * Lesson 11 — Note Duration (assumes 4/4, where the beat is a quarter note).
 *
 * Content source: musictheory.net lesson 11 (slides pulled from the live
 * lesson JSON): a whole note has the longest duration; a half note is half a
 * whole; four quarters fill a whole and two quarters make a half; notes
 * smaller than a quarter carry flags and each flag halves the value, so an
 * eighth has one flag and a sixteenth two; two eighths make a quarter and four
 * sixteenths make a quarter. Beat counts (whole 4, half 2, quarter 1, eighth
 * 0.5, sixteenth 0.25) follow from 4/4 = four quarter notes per measure
 * (lesson 12). The single dot question is a passing preview: lesson 14 owns
 * dots ("a dot increases duration by one half").
 *
 * The pool is 11 `staff` rounds (every one carrying a `duration` code, so the
 * learner reads real note values) + 11 `text` rounds = 22, so any draw of 12
 * must include at least one of each kind: the mix is structural, not luck.
 */
const choices = (options: string[], correctIndex: number): AnswerSpec => ({
  kind: "choices",
  options,
  correctIndex,
});

/** Rounds drawn per visit; the pool is larger so replays vary. */
const ROUND_COUNT = 12;

export const lesson11Pool: readonly Round[] = [
  // --- staff prompts: read the engraved note value -------------------------
  {
    id: "l11-staff-whole-beats",
    prompt: { kind: "staff", clef: "treble", notes: ["C5"], duration: "w" },
    answer: choices(["1", "2", "4", "8"], 2),
    rule: "A whole note lasts four beats in 4/4 time.",
  },
  {
    id: "l11-staff-half-beats",
    prompt: { kind: "staff", clef: "treble", notes: ["C5"], duration: "h" },
    answer: choices(["1", "2", "3", "4"], 1),
    rule: "A half note lasts two beats in 4/4 time — half the length of a whole note.",
  },
  {
    id: "l11-staff-quarter-beats",
    prompt: { kind: "staff", clef: "treble", notes: ["C5"], duration: "q" },
    answer: choices(["0.5", "1", "2", "4"], 1),
    rule: "A quarter note lasts one beat in 4/4 time.",
  },
  {
    id: "l11-staff-eighth-beats",
    prompt: { kind: "staff", clef: "treble", notes: ["C5"], duration: "8" },
    answer: choices(["0.25", "0.5", "1", "2"], 1),
    rule: "An eighth note has one flag and lasts half a beat in 4/4.",
  },
  {
    id: "l11-staff-sixteenth-beats",
    prompt: { kind: "staff", clef: "treble", notes: ["C5"], duration: "16" },
    answer: choices(["0.25", "0.5", "1", "2"], 0),
    rule: "A sixteenth note has two flags and lasts a quarter of a beat in 4/4.",
  },
  {
    id: "l11-staff-two-eighths",
    prompt: { kind: "staff", clef: "treble", notes: ["C5", "D5"], duration: "8" },
    answer: choices(["One flag each", "Two flags each", "No flags", "Four flags each"], 0),
    rule: "An eighth note carries one flag, and each flag halves the value of a note.",
  },
  {
    id: "l11-staff-two-sixteenths",
    prompt: { kind: "staff", clef: "treble", notes: ["C5", "D5"], duration: "16" },
    answer: choices(["No flags", "One flag each", "Two flags each", "Three flags each"], 2),
    rule: "A sixteenth note has two flags, halving the value again from an eighth note.",
  },
  {
    id: "l11-staff-two-quarters",
    prompt: { kind: "staff", clef: "treble", notes: ["C5", "D5"], duration: "q" },
    answer: choices(["1", "2", "3", "4"], 1),
    rule: "A quarter note lasts one beat, so two quarter notes last two beats — the same as a half note.",
  },
  {
    id: "l11-staff-half-name",
    prompt: { kind: "staff", clef: "treble", notes: ["A4"], duration: "h" },
    answer: choices(["G4", "A4", "B4", "C5"], 1),
    rule: "A half note has a hollow head and one stem; here it sits on the second treble space: A.",
  },
  {
    id: "l11-staff-eighth-name",
    prompt: { kind: "staff", clef: "treble", notes: ["B4"], duration: "8" },
    answer: choices(["A4", "B4", "C5", "D5"], 1),
    rule: "An eighth note carries one flag, and this one sits on the middle treble line: B.",
  },
  {
    id: "l11-staff-bass-whole",
    prompt: { kind: "staff", clef: "bass", notes: ["D3"], duration: "w" },
    answer: choices(["1", "2", "4", "8"], 2),
    rule: "A whole note lasts four beats in 4/4 time, whatever the clef.",
  },

  // --- text prompts: the arithmetic behind the notation --------------------
  {
    id: "l11-text-four-quarters",
    prompt: { kind: "text", text: "How many quarter notes equal one whole note?" },
    answer: choices(["Two", "Three", "Four", "Eight"], 2),
    rule: "Four quarter notes occupy the same amount of time as one whole note.",
  },
  {
    id: "l11-text-two-halves",
    prompt: { kind: "text", text: "How many half notes equal one whole note?" },
    answer: choices(["One", "Two", "Three", "Four"], 1),
    rule: "Two half notes occupy the same amount of time as one whole note.",
  },
  {
    id: "l11-text-quarters-make-half",
    prompt: { kind: "text", text: "Two quarter notes together are the same length as which note?" },
    answer: choices(["A whole note", "A half note", "An eighth note", "A sixteenth note"], 1),
    rule: "Two quarter notes equal the duration of a half note.",
  },
  {
    id: "l11-text-eighths-make-quarter",
    prompt: { kind: "text", text: "Two eighth notes together are the same length as which note?" },
    answer: choices(["A whole note", "A half note", "A quarter note", "A sixteenth note"], 2),
    rule: "Two eighth notes occupy the same amount of time as one quarter note.",
  },
  {
    id: "l11-text-eighth-flags",
    prompt: { kind: "text", text: "How many flags does an eighth note carry?" },
    answer: choices(["None", "One", "Two", "Four"], 1),
    rule: "An eighth note has one flag.",
  },
  {
    id: "l11-text-sixteenth-flags",
    prompt: { kind: "text", text: "How many flags does a sixteenth note carry?" },
    answer: choices(["None", "One", "Two", "Three"], 2),
    rule: "A sixteenth note has two flags, halving the value again.",
  },
  {
    id: "l11-text-flag-effect",
    prompt: { kind: "text", text: "What does each flag do to a note's value?" },
    answer: choices(["It halves it", "It doubles it", "It adds one beat", "It leaves it unchanged"], 0),
    rule: "Each flag halves the value of a note.",
  },
  {
    id: "l11-text-four-sixteenths",
    prompt: { kind: "text", text: "How many sixteenth notes equal one quarter note?" },
    answer: choices(["Two", "Three", "Four", "Eight"], 2),
    rule: "Four sixteenth notes occupy the same amount of time as one quarter note.",
  },
  {
    id: "l11-text-half-beats",
    prompt: { kind: "text", text: "In 4/4 time, how many beats is a half note worth?" },
    answer: choices(["1", "2", "3", "4"], 1),
    rule: "A half note lasts two beats in 4/4 time — half of a whole note's four.",
  },
  {
    id: "l11-text-eighth-beats",
    prompt: { kind: "text", text: "In 4/4 time, how many beats is an eighth note worth?" },
    answer: choices(["0.25", "0.5", "1", "2"], 1),
    rule: "An eighth note is half the duration of a quarter note, so it lasts half a beat in 4/4.",
  },
  {
    id: "l11-text-dot-preview",
    prompt: { kind: "text", text: "What does a dot after a note do?" },
    answer: choices(
      ["Adds half the note's own value", "Adds one beat", "Doubles the note", "Cuts the note in half"],
      0,
    ),
    rule: "A dot increases duration by one half: a dotted quarter note equals a quarter note plus an eighth note.",
  },
];

export const lesson11: LessonModule = {
  entry: requireLessonEntry(11),
  generateRounds: (rng) => sampleRounds(lesson11Pool, rng, ROUND_COUNT),
};

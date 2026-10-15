import type { AnswerSpec, Round } from "../lib/rounds/types";
import { requireLessonEntry } from "./catalog";
import { sampleRounds } from "./rng";
import type { LessonModule } from "./types";

/**
 * Lesson 10 — The Staff, Clefs, and Ledger Lines.
 *
 * Content source: musictheory.net lesson 10 (slides pulled from the live
 * lesson JSON), plus the standard line/space spellings that lesson 10 shows
 * graphically: treble lines E G B D F and spaces F A C E, bass lines G B D F A
 * and spaces A C E G. The staff is five lines and four spaces; the treble
 * (G) clef wraps the second line from the bottom, the bass (F) clef straddles
 * the second line from the top; ledger lines extend the staff; the grand
 * staff joins the two clefs at middle C. Alto/tenor C clefs (centred on
 * middle C) come from the accepted reference — lesson 10 itself only names
 * the treble and bass clefs.
 *
 * The pool is 11 `staff` rounds + 11 `text` rounds = 22, so any draw of 12
 * must include at least one of each kind (11 < 12 ≤ 22): the mix is
 * structural, not luck.
 */
const choices = (options: string[], correctIndex: number): AnswerSpec => ({
  kind: "choices",
  options,
  correctIndex,
});

/** Rounds drawn per visit; the pool is larger so replays vary. */
const ROUND_COUNT = 12;

export const lesson10Pool: readonly Round[] = [
  // --- staff prompts: read a pictured note ---------------------------------
  {
    id: "l10-staff-g-line",
    prompt: { kind: "staff", clef: "treble", notes: ["G4"] },
    answer: choices(["E4", "F4", "G4", "A4"], 2),
    rule: "The treble clef wraps around the G line — the second line from the bottom — so a note on that line is G.",
  },
  {
    id: "l10-staff-b4",
    prompt: { kind: "staff", clef: "treble", notes: ["B4"] },
    answer: choices(["A4", "B4", "C5", "D5"], 1),
    rule: "Treble line notes read E G B D F upward, and B sits on the middle line.",
  },
  {
    id: "l10-staff-f5",
    prompt: { kind: "staff", clef: "treble", notes: ["F5"] },
    answer: choices(["D5", "E5", "F5", "G5"], 2),
    rule: "The top line of the treble staff is F, the fifth of the line notes E G B D F.",
  },
  {
    id: "l10-staff-c5",
    prompt: { kind: "staff", clef: "treble", notes: ["C5"] },
    answer: choices(["B4", "C5", "D5", "E5"], 1),
    rule: "The treble spaces are F A C E from the bottom, so the third space is C.",
  },
  {
    id: "l10-staff-a4",
    prompt: { kind: "staff", clef: "treble", notes: ["A4"] },
    answer: choices(["G4", "A4", "B4", "C5"], 1),
    rule: "Reading the treble spaces F A C E from the bottom, the second space is A.",
  },
  {
    id: "l10-staff-c4-ledger",
    prompt: { kind: "staff", clef: "treble", notes: ["C4"] },
    answer: choices(["B3", "C4", "D4", "E4"], 1),
    rule: "Middle C sits on a ledger line below the treble staff, because a ledger line extends the staff when it runs out of room.",
  },
  {
    id: "l10-staff-e5",
    prompt: { kind: "staff", clef: "treble", notes: ["E5"] },
    answer: choices(["C5", "D5", "E5", "F5"], 2),
    rule: "The treble spaces spell F A C E upward, putting E in the fourth space.",
  },
  {
    id: "l10-staff-f3",
    prompt: { kind: "staff", clef: "bass", notes: ["F3"] },
    answer: choices(["D3", "E3", "F3", "G3"], 2),
    rule: "The bass clef is the F clef, so the line between its dots — second from the top — is F.",
  },
  {
    id: "l10-staff-g2",
    prompt: { kind: "staff", clef: "bass", notes: ["G2"] },
    answer: choices(["F2", "G2", "A2", "B2"], 1),
    rule: "Bass line notes are G B D F A from the bottom, so the lowest line is G.",
  },
  {
    id: "l10-staff-d3",
    prompt: { kind: "staff", clef: "bass", notes: ["D3"] },
    answer: choices(["B2", "C3", "D3", "E3"], 2),
    rule: "The five bass lines spell G B D F A upward, putting D on the middle line.",
  },
  {
    id: "l10-staff-a2",
    prompt: { kind: "staff", clef: "bass", notes: ["A2"] },
    answer: choices(["G2", "A2", "B2", "C3"], 1),
    rule: "Bass space notes are A C E G from the bottom, so the first space is A.",
  },

  // --- text prompts: the facts behind the picture --------------------------
  {
    id: "l10-text-staff-shape",
    prompt: { kind: "text", text: "How many lines and spaces does a modern staff have?" },
    answer: choices(
      ["Five lines and four spaces", "Four lines and three spaces", "Six lines and five spaces", "Five lines and five spaces"],
      0,
    ),
    rule: "The modern staff comprises five lines and four spaces.",
  },
  {
    id: "l10-text-g-clef",
    prompt: { kind: "text", text: "The treble clef is also known by which name?" },
    answer: choices(["The G clef", "The F clef", "The C clef", "The D clef"], 0),
    rule: "The treble clef wraps around the G line, so it is also called the G clef.",
  },
  {
    id: "l10-text-g-line",
    prompt: { kind: "text", text: "Which treble staff line does the treble clef curl around?" },
    answer: choices(
      ["The second line from the bottom", "The bottom line", "The middle line", "The top line"],
      0,
    ),
    rule: "The line the treble clef wraps around becomes G — the second line from the bottom.",
  },
  {
    id: "l10-text-bass-dots",
    prompt: { kind: "text", text: "The two dots of the bass clef straddle which line?" },
    answer: choices(
      ["The F line, second from the top", "The G line at the bottom", "The middle line of the staff", "The top line of the staff"],
      0,
    ),
    rule: "The bass clef is the F clef: the line between its two dots is F, the second line from the top.",
  },
  {
    id: "l10-text-ledger",
    prompt: { kind: "text", text: "What is a ledger line?" },
    answer: choices(
      ["A short line that extends the staff above or below", "A line that separates one measure from the next", "A line drawn through every note of a chord", "A line marking the end of a piece"],
      0,
    ),
    rule: "A ledger line is a small line that extends the staff when we run out of room.",
  },
  {
    id: "l10-text-two-clefs",
    prompt: { kind: "text", text: "Which two clefs are normally used?" },
    answer: choices(["Treble and bass", "Alto and tenor", "Treble and tenor", "Bass and alto"], 0),
    rule: "Two clefs are normally used: the treble and bass clefs.",
  },
  {
    id: "l10-text-c-clefs",
    prompt: { kind: "text", text: "Alto and tenor clefs are both what kind of clef?" },
    answer: choices(
      ["C clefs centred on middle C", "G clefs centred on G4", "F clefs centred on F3", "D clefs centred on D4"],
      0,
    ),
    rule: "The alto and tenor clefs are C clefs: both centre middle C, on the third and fourth lines respectively.",
  },
  {
    id: "l10-text-grand-staff",
    prompt: { kind: "text", text: "On the grand staff, which note joins the treble and bass clefs?" },
    answer: choices(["Middle C", "G above middle C", "F below middle C", "A above middle C"], 0),
    rule: "The treble and bass clefs are joined by middle C, the middle line of the eleven-line grand staff.",
  },
  {
    id: "l10-text-f-clef",
    prompt: { kind: "text", text: "Which clef is also called the F clef?" },
    answer: choices(["Bass clef", "Treble clef", "Alto clef", "Soprano clef"], 0),
    rule: "The bass clef is the F clef: its two dots straddle the F line.",
  },
  {
    id: "l10-text-white-keys",
    prompt: { kind: "text", text: "What does each line or space on the staff represent?" },
    answer: choices(["A white key on the piano", "A black key on the piano", "A sharp or a flat", "A drum stroke"], 0),
    rule: "Every line or space on the staff represents a white key on the keyboard.",
  },
  {
    id: "l10-text-treble-bottom",
    prompt: { kind: "text", text: "Which note sits on the bottom line of the treble staff?" },
    answer: choices(["E4", "C4", "G4", "B4"], 0),
    rule: "The treble line notes are E G B D F from the bottom, so the bottom line is E.",
  },
];

export const lesson10: LessonModule = {
  entry: requireLessonEntry(10),
  generateRounds: (rng) => sampleRounds(lesson10Pool, rng, ROUND_COUNT),
};

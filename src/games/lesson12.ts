import type { AnswerSpec, Round } from "../lib/rounds/types";
import { requireLessonEntry } from "./catalog";
import { sampleRounds } from "./rng";
import type { LessonModule } from "./types";

/**
 * Lesson 12 — Measures and Time Signature.
 *
 * Content source: musictheory.net lesson 12 (slide text pulled from the live
 * `lesson12.js`): bar lines divide the staff into measures; time signatures
 * define the amount and type of notes each measure contains; the chart and its
 * labels give 4/4 = four quarter notes, 3/4 = three quarters, 6/8 = six
 * eighths, and 3/2 = three half notes. Reading the two numbers (top counts the
 * beats, bottom names the counted note value) is spelled out on lesson 15
 * ("Duple refers to the two beats per measure"); 2/4 = two quarters is also
 * lesson 15's simple-duple example. The 6/8 "grouped into two beats" reading
 * is lesson 15's compound-duple fact. Two further facts are standard notation
 * rather than musictheory.net slide text — common time (`C` for 4/4) and the
 * double bar line that closes a piece; the site's lesson texts never mention
 * either, and nothing on the site contradicts them.
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

export const lesson12Pool: readonly Round[] = [
  // --- staff prompts: read the engraved measure and name its meter ---------
  {
    id: "l12-staff-four-quarters-signature",
    prompt: { kind: "staff", clef: "treble", notes: ["C5", "D5", "E5", "F5"], duration: "q" },
    answer: choices(["4/4", "3/4", "2/4", "6/8"], 0),
    rule: "In 4/4 the measure holds four quarter notes: the top number counts the beats, the bottom names the note value.",
  },
  {
    id: "l12-staff-three-quarters-signature",
    prompt: { kind: "staff", clef: "treble", notes: ["G4", "A4", "B4", "C5"], duration: "q" },
    answer: choices(["4/4", "3/4", "2/4", "6/8"], 1),
    rule: "3/4 time contains three quarter notes per measure.",
  },
  {
    id: "l12-staff-two-quarters-signature",
    prompt: { kind: "staff", clef: "treble", notes: ["E4", "G4"], duration: "q" },
    answer: choices(["4/4", "3/4", "2/4", "6/8"], 2),
    rule: "2/4 time contains two quarter notes per measure.",
  },
  {
    id: "l12-staff-six-eighths-signature",
    prompt: {
      kind: "staff",
      clef: "treble",
      notes: ["C5", "D5", "E5", "F5", "G5", "A5"],
      duration: "8",
    },
    answer: choices(["4/4", "3/4", "6/8", "3/2"], 2),
    rule: "6/8 time contains six eighth notes.",
  },
  {
    id: "l12-staff-three-halves-signature",
    prompt: { kind: "staff", clef: "treble", notes: ["C5", "D5", "E5"], duration: "h" },
    answer: choices(["4/4", "3/4", "3/2", "6/8"], 2),
    rule: "3/2 time contains three half notes per measure.",
  },
  {
    id: "l12-staff-four-quarters-beats",
    prompt: { kind: "staff", clef: "treble", notes: ["A4", "B4", "C5", "D5"], duration: "q" },
    answer: choices(["2", "3", "4", "6"], 2),
    rule: "Each quarter note gets one beat in 4/4, so four quarters fill the measure's four beats.",
  },
  {
    id: "l12-staff-three-quarters-beats-bass",
    prompt: { kind: "staff", clef: "bass", notes: ["F2", "G2", "A2"], duration: "q" },
    answer: choices(["2", "3", "4", "6"], 1),
    rule: "The top number of 3/4 counts three beats per measure.",
  },
  {
    id: "l12-staff-six-eighths-count",
    prompt: {
      kind: "staff",
      clef: "treble",
      notes: ["D5", "E5", "F5", "G5", "A5", "B5"],
      duration: "8",
    },
    answer: choices(["Three", "Four", "Six", "Eight"], 2),
    rule: "6/8 counts six eighth notes through each measure.",
  },
  {
    id: "l12-staff-whole-measure",
    prompt: { kind: "staff", clef: "treble", notes: ["C5"], duration: "w" },
    answer: choices(["2", "3", "4", "6"], 2),
    rule: "Four quarters make a whole note, so one whole note fills a full 4/4 measure (four beats).",
  },
  {
    id: "l12-staff-two-halves-beats-bass",
    prompt: { kind: "staff", clef: "bass", notes: ["A2", "F2"], duration: "h" },
    answer: choices(["2", "3", "4", "8"], 2),
    rule: "A half note lasts two beats in 4/4, so two of them fill the four beats of the measure.",
  },
  {
    id: "l12-staff-six-eighths-groups",
    prompt: {
      kind: "staff",
      clef: "treble",
      notes: ["G4", "A4", "B4", "C5", "D5", "E5"],
      duration: "8",
    },
    answer: choices(["Two", "Three", "Four", "Six"], 0),
    rule: "In 6/8 the six eighth notes group into two beats, each a dotted quarter note.",
  },

  // --- text prompts: the facts behind the numbers --------------------------
  {
    id: "l12-text-bar-lines",
    prompt: { kind: "text", text: "What divides the staff into measures?" },
    answer: choices(["Bar lines", "Ledger lines", "Clefs", "Key signatures"], 0),
    rule: "Vertical black bars called bar lines divide the staff into measures.",
  },
  {
    id: "l12-text-top-number",
    prompt: { kind: "text", text: "What does the top number of a time signature count?" },
    answer: choices(
      ["The beats in each measure", "The note value that gets counted", "The number of measures", "The tempo"],
      0,
    ),
    rule: "The top number of a time signature counts the beats each measure contains.",
  },
  {
    id: "l12-text-bottom-number",
    prompt: { kind: "text", text: "What does the bottom number of a time signature name?" },
    answer: choices(
      ["The note value the measure is counted in", "The beats per minute", "The number of staves", "The key of the piece"],
      0,
    ),
    rule: "The bottom number names the note value the measure is counted in — 4/4 counts quarter notes, 6/8 counts eighth notes.",
  },
  {
    id: "l12-text-44-quarters",
    prompt: { kind: "text", text: "How many quarter notes does a 4/4 measure contain?" },
    answer: choices(["Two", "Three", "Four", "Six"], 2),
    rule: "4/4 time contains four quarter notes in each measure.",
  },
  {
    id: "l12-text-common-time",
    prompt: { kind: "text", text: "4/4 time is also known as common time. How is it often written?" },
    answer: choices(["With the letter C", "With the letter S", "With a caret ^", "As 8/8"], 0),
    rule: "Common time is 4/4, written with the letter C in place of the numbers.",
  },
  {
    id: "l12-text-34-quarters",
    prompt: { kind: "text", text: "How many quarter notes does a 3/4 measure contain?" },
    answer: choices(["Two", "Three", "Four", "Six"], 1),
    rule: "3/4 time contains three quarter notes — three beats per measure.",
  },
  {
    id: "l12-text-68-eighths",
    prompt: { kind: "text", text: "How many eighth notes does a 6/8 measure contain?" },
    answer: choices(["Two", "Three", "Four", "Six"], 3),
    rule: "6/8 time contains six eighth notes in each measure.",
  },
  {
    id: "l12-text-32-halves",
    prompt: { kind: "text", text: "3/2 time contains three what?" },
    answer: choices(["Whole notes", "Half notes", "Quarter notes", "Eighth notes"], 1),
    rule: "3/2 time contains three half notes — the bottom 2 names the half note.",
  },
  {
    id: "l12-text-double-bar",
    prompt: { kind: "text", text: "What symbol marks the end of a piece of music?" },
    answer: choices(["A double bar line", "A tie", "A slur", "A ledger line"], 0),
    rule: "A double bar line closes the end of a piece of music.",
  },
  {
    id: "l12-text-ts-definition",
    prompt: { kind: "text", text: "What does a time signature define?" },
    answer: choices(
      ["The amount and type of notes each measure contains", "The speed of the music", "The pitch of the melody", "The clef to use"],
      0,
    ),
    rule: "Time signatures define the amount and type of notes that each measure contains.",
  },
  {
    id: "l12-text-44-beat-value",
    prompt: { kind: "text", text: "In 4/4 time, which note value gets one beat?" },
    answer: choices(["The half note", "The quarter note", "The eighth note", "The whole note"], 1),
    rule: "In 4/4 the bottom 4 names the quarter note, and each quarter note gets one beat.",
  },
];

export const lesson12: LessonModule = {
  entry: requireLessonEntry(12),
  generateRounds: (rng) => sampleRounds(lesson12Pool, rng, ROUND_COUNT),
};

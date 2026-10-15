import type { AnswerSpec, Round } from "../lib/rounds/types";
import { requireLessonEntry } from "./catalog";
import { sampleRounds } from "./rng";
import type { LessonModule } from "./types";

/**
 * Lesson 16 — Odd Meter.
 *
 * Content source: musictheory.net lesson 16 (slide text pulled from the live
 * `lesson16.js`): an odd meter is a meter which contains both simple and
 * compound beats. 5/8 holds one simple beat and one compound beat; the order
 * of the beats does not matter. The three-beat odd meters: 7/8 contains two
 * simple beats and one compound beat, with the compound beat free to sit
 * anywhere — even between two simple beats; 8/8 contains two compound beats
 * and one simple beat, and is often confused with 4/4 because both hold eight
 * eighth notes, though 4/4 groups them into four beats of two eighths (simple
 * quadruple) while 8/8 groups them into three odd beats. The four-beat odd
 * meters: 10/8 has two compound beats and two simple beats, 11/8 has three
 * compound beats and one simple beat.
 *
 * Correction to the task's accepted reference, from the live site: the lesson
 * is titled "Odd Meter" — the duple/triple/quadruple counting and the
 * simple-vs-compound division vocabulary ("the four plain names") belong to
 * lesson 15, which this lesson builds on; nothing on the site has a lesson
 * titled "Meter: Duple, Triple, Quadruple". Beat counts are still exercised
 * here through the odd meters themselves (5/8 has two beats, 7/8 and 8/8 have
 * three, 10/8 and 11/8 have four).
 *
 * The pool is 11 `staff` rounds + 11 `text` rounds = 22, so any draw of 12
 * must include at least one of each kind: the mix is structural, not luck.
 * Odd meters mix simple (two eighths) and compound (three eighths) beats in
 * one measure, which a single VexFlow duration cannot express per note, so
 * staff prompts draw the measure as its eighth-note contents (`8`) — the same
 * grouping the site's own lesson visuals use — plus one `qd` round for the
 * compound beat itself.
 */
const choices = (options: string[], correctIndex: number): AnswerSpec => ({
  kind: "choices",
  options,
  correctIndex,
});

/** Rounds drawn per visit; the pool is larger so replays vary. */
const ROUND_COUNT = 12;

export const lesson16Pool: readonly Round[] = [
  // --- staff prompts: read the odd measure on the page ---------------------
  {
    id: "l16-staff-58-odd-meter",
    prompt: {
      kind: "staff",
      clef: "treble",
      notes: ["C5", "D5", "E5", "F5", "G5"],
      duration: "8",
    },
    answer: choices(["An odd meter", "A simple meter", "A compound meter", "A quadruple meter"], 0),
    rule: "5/8 is an odd meter: its measure mixes a simple beat and a compound beat.",
  },
  {
    id: "l16-staff-58-beat-composition",
    prompt: {
      kind: "staff",
      clef: "treble",
      notes: ["D5", "E5", "F5", "G5", "A5"],
      duration: "8",
    },
    answer: choices(
      ["One simple beat and one compound beat", "Two simple beats", "Two compound beats", "Four simple beats"],
      0,
    ),
    rule: "5/8 contains one simple beat and one compound beat, so it has two beats in total.",
  },
  {
    id: "l16-staff-58-beat-order",
    prompt: {
      kind: "staff",
      clef: "treble",
      notes: ["E5", "F5", "G5", "A5", "B5"],
      duration: "8",
    },
    answer: choices(
      ["No — the order of the beats does not matter", "Yes — the simple beat must come first", "Yes — the compound beat must come first", "Yes — the beats must alternate"],
      0,
    ),
    rule: "The order of the beats does not matter — if the compound beat comes first, it is still 5/8 time.",
  },
  {
    id: "l16-staff-78-beat-count",
    prompt: {
      kind: "staff",
      clef: "treble",
      notes: ["C5", "D5", "E5", "F5", "G5", "A5", "B5"],
      duration: "8",
    },
    answer: choices(["Two", "Three", "Four", "Six"], 1),
    rule: "7/8 contains two simple beats and one compound beat — three beats in total.",
  },
  {
    id: "l16-staff-78-beat-composition",
    prompt: {
      kind: "staff",
      clef: "treble",
      notes: ["D5", "E5", "F5", "G5", "A5", "B5", "C6"],
      duration: "8",
    },
    answer: choices(
      ["Two simple beats and one compound beat", "Two compound beats and one simple beat", "Three compound beats", "Three simple beats"],
      0,
    ),
    rule: "7/8 time contains two simple beats and one compound beat — a three-beat odd meter.",
  },
  {
    id: "l16-staff-88-beat-composition",
    prompt: {
      kind: "staff",
      clef: "treble",
      notes: ["C5", "D5", "E5", "F5", "G5", "A5", "B5", "C6"],
      duration: "8",
    },
    answer: choices(
      ["Two compound beats and one simple beat", "Two simple beats and one compound beat", "Three simple beats", "Four simple beats"],
      0,
    ),
    rule: "8/8 time contains two compound beats and one simple beat — three beats in total.",
  },
  {
    id: "l16-staff-88-vs-44",
    prompt: {
      kind: "staff",
      clef: "treble",
      notes: ["E5", "F5", "G5", "A5", "B5", "C6", "D6", "E6"],
      duration: "8",
    },
    answer: choices(
      ["4/4 is four beats of two eighth notes; 8/8 is three beats", "They group identically", "8/8 has four beats and 4/4 has three", "4/4 is an odd meter and 8/8 is not"],
      0,
    ),
    rule: "4/4 groups the measure into four beats of two eighth notes (simple quadruple), while 8/8 groups it into three odd beats.",
  },
  {
    id: "l16-staff-108-beat-count",
    prompt: {
      kind: "staff",
      clef: "bass",
      notes: ["C3", "D3", "E3", "F3", "G3", "A3", "B3", "C4", "D4", "E4"],
      duration: "8",
    },
    answer: choices(["Two", "Three", "Four", "Six"], 2),
    rule: "10/8 contains four beats: two compound beats and two simple beats.",
  },
  {
    id: "l16-staff-108-beat-composition",
    prompt: {
      kind: "staff",
      clef: "bass",
      notes: ["D3", "E3", "F3", "G3", "A3", "B3", "C4", "D4", "E4", "F4"],
      duration: "8",
    },
    answer: choices(
      ["Two compound beats and two simple beats", "Three compound beats and one simple beat", "Two simple beats and one compound beat", "Four simple beats"],
      0,
    ),
    rule: "In 10/8 each compound beat is three eighths and each simple beat is two, filling the measure with four beats.",
  },
  {
    id: "l16-staff-118-beat-composition",
    prompt: {
      kind: "staff",
      clef: "bass",
      notes: ["C3", "D3", "E3", "F3", "G3", "A3", "B3", "C4", "D4", "E4", "F4"],
      duration: "8",
    },
    answer: choices(
      ["Three compound beats and one simple beat", "Two compound beats and two simple beats", "Three simple beats and one compound beat", "Four compound beats"],
      0,
    ),
    rule: "11/8 time has three compound beats and one simple beat — four beats in total.",
  },
  {
    id: "l16-staff-compound-beat",
    prompt: { kind: "staff", clef: "bass", notes: ["A2"], duration: "qd" },
    answer: choices(["A compound beat", "A simple beat", "An odd beat", "A full measure"], 0),
    rule: "A compound beat lasts three eighth notes — in these eighth-based odd meters it is drawn as a dotted quarter.",
  },

  // --- text prompts: the odd meters one by one -----------------------------
  {
    id: "l16-text-odd-meter-definition",
    prompt: { kind: "text", text: "What is an odd meter?" },
    answer: choices(
      ["A meter which contains both simple and compound beats", "A meter with only simple beats", "A meter with only compound beats", "A meter with no beats"],
      0,
    ),
    rule: "An odd meter is a meter which contains both simple and compound beats.",
  },
  {
    id: "l16-text-which-is-odd",
    prompt: { kind: "text", text: "Which of these time signatures is an odd meter?" },
    answer: choices(["5/8", "2/4", "4/4", "6/8"], 0),
    rule: "5/8 is odd because it mixes a simple beat with a compound beat, while 2/4, 4/4, and 6/8 do not.",
  },
  {
    id: "l16-text-88-vs-44-confusion",
    prompt: { kind: "text", text: "Why do people sometimes confuse 8/8 with 4/4?" },
    answer: choices(
      ["Both have eight eighth notes", "Both are odd meters", "Both have six beats", "Both are written with a 6 on top"],
      0,
    ),
    rule: "Sometimes people confuse 8/8 with 4/4, since both have eight eighth notes.",
  },
  {
    id: "l16-text-44-simple-quadruple",
    prompt: { kind: "text", text: "How is 4/4 grouped, according to this lesson?" },
    answer: choices(
      ["Four beats of two eighth notes (simple quadruple)", "Three odd beats", "Two compound beats", "One compound beat and one simple beat"],
      0,
    ),
    rule: "4/4 groups its measure into four beats of two eighth notes, which is simple quadruple.",
  },
  {
    id: "l16-text-78-which-signature",
    prompt: { kind: "text", text: "Which odd meter has two simple beats and one compound beat?" },
    answer: choices(["7/8", "5/8", "8/8", "11/8"], 0),
    rule: "7/8 time contains two simple beats and one compound beat.",
  },
  {
    id: "l16-text-88-which-signature",
    prompt: { kind: "text", text: "Which odd meter has two compound beats and one simple beat?" },
    answer: choices(["8/8", "5/8", "7/8", "10/8"], 0),
    rule: "8/8 time contains two compound beats and one simple beat.",
  },
  {
    id: "l16-text-108-which-signature",
    prompt: { kind: "text", text: "Which odd meter has two compound beats and two simple beats?" },
    answer: choices(["10/8", "5/8", "7/8", "11/8"], 0),
    rule: "10/8 time has two compound beats and two simple beats.",
  },
  {
    id: "l16-text-118-which-signature",
    prompt: { kind: "text", text: "Which odd meter has three compound beats and one simple beat?" },
    answer: choices(["11/8", "7/8", "8/8", "10/8"], 0),
    rule: "11/8 time has three compound beats and one simple beat.",
  },
  {
    id: "l16-text-four-beat-odd-meters",
    prompt: { kind: "text", text: "How many total beats do 10/8 and 11/8 have?" },
    answer: choices(["Four in each", "Three in each", "Two in each", "Five in each"], 0),
    rule: "Our last two odd meters have a total of four beats: 10/8 and 11/8.",
  },
  {
    id: "l16-text-78-compound-position",
    prompt: { kind: "text", text: "Where can the compound beat of a three-beat odd meter like 7/8 be positioned?" },
    answer: choices(
      ["Anywhere — even between two simple beats", "Only at the start of the measure", "Only at the end of the measure", "Only on the first and third beats"],
      0,
    ),
    rule: "The compound beat can even be positioned between two simple beats.",
  },
  {
    id: "l16-text-odd-list",
    prompt: { kind: "text", text: "Which list contains only odd meters?" },
    answer: choices(
      ["5/8, 7/8, and 8/8", "2/4, 3/4, and 4/4", "6/8, 9/8, and 12/8", "4/4, 6/8, and 12/8"],
      0,
    ),
    rule: "Odd meters mix simple and compound beats: 5/8 has two beats, while 7/8 and 8/8 have three.",
  },
];

export const lesson16: LessonModule = {
  entry: requireLessonEntry(16),
  generateRounds: (rng) => sampleRounds(lesson16Pool, rng, ROUND_COUNT),
};

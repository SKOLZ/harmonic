import type { AnswerSpec, Round } from "../lib/rounds/types";
import { requireLessonEntry } from "./catalog";
import { sampleRounds } from "./rng";
import type { LessonModule } from "./types";

/**
 * Lesson 32 — Writing Intervals.
 *
 * Content source: musictheory.net lesson 32 (slide text pulled from the live
 * `lesson32.js`): writing intervals is risky because "one may accidentally
 * write {C} to {F#} (an augmented fourth) instead of {C} to {Gb} (a
 * diminished fifth)" — "Although both intervals sound the same and look
 * identical on the keyboard, one is a fourth and the other is a fifth." The
 * site's fix is a three-step process: "First, write the generic interval on
 * the staff."; "Next, figure out the number of half steps on the keyboard"
 * (a minor third is 3 half steps because a major third is 4; a diminished
 * fifth is 6 because a perfect fifth is 7); "Finally, compare the staff and
 * keyboard results. Add any needed accidentals to the staff." Worked
 * examples: minor third from C is C–Eb; major sixth from F# is F#–D#
 * ("A major sixth is 9 half steps"); diminished fifth from B is B–F, "In
 * this example, no accidental is needed"; and F–B is cited as an augmented
 * fourth because F–Bb is a perfect fourth.
 *
 * Corrections to the task's accepted reference, from the live site: none —
 * building upward from a root with spelling chosen to match the intended
 * quality is exactly what the three steps teach. The prompt contract has no
 * text channel on staff prompts, so the drills split by what each kind can
 * carry: staff rounds show the site's *written results* (the spelled
 * intervals, including the C–F# / C–Gb confusable pair) and ask for the
 * quality-and-number that the spelling encodes; text rounds pose the
 * upward-building questions outright ("What note is a minor third above
 * C?") with spellings pinned by `spellInterval` in the test oracle. Staff
 * answers reuse the theory core's `intervalName` strings. The pool is 11
 * `staff` rounds + 11 `text` rounds = 22: any draw of 12 must include at
 * least one of each kind — the mix is structural, not luck.
 */
const choices = (options: string[], correctIndex: number): AnswerSpec => ({
  kind: "choices",
  options,
  correctIndex,
});

/** Rounds drawn per visit; the pool is larger so replays vary. */
const ROUND_COUNT = 12;

export const lesson32Pool: readonly Round[] = [
  // --- staff prompts: the site's written intervals, named by spelling -----
  {
    id: "l32-staff-c4-eb4-minor-third",
    prompt: { kind: "staff", clef: "treble", notes: ["C4", "Eb4"], duration: "q" },
    answer: choices(["Minor 3rd", "Major 3rd", "Diminished 3rd", "Perfect 4th"], 0),
    rule: "The site's first written example: a minor third from C is C–Eb — the generic third lands on E, and the minor third's 3 half steps (a major third has 4) need a flat.",
  },
  {
    id: "l32-staff-fs4-ds5-major-sixth",
    prompt: { kind: "staff", clef: "treble", notes: ["F#4", "D#5"], duration: "q" },
    answer: choices(["Major 6th", "Minor 6th", "Perfect 5th", "Augmented 6th"], 0),
    rule: "The site's second written example: a major sixth from F# is F#–D# — the generic sixth lands on D, and 9 half steps above F# need a sharp on D, not the enharmonic Eb.",
  },
  {
    id: "l32-staff-b4-f5-diminished-fifth",
    prompt: { kind: "staff", clef: "treble", notes: ["B4", "F5"], duration: "q" },
    answer: choices(["Diminished 5th", "Perfect 5th", "Augmented 4th", "Minor 6th"], 0),
    rule: "The site's third written example: a diminished fifth from B is B–F — a perfect fifth has 7 half steps, a diminished fifth 6, and F natural already sits 6 above B, so no accidental is needed.",
  },
  {
    id: "l32-staff-c4-fs4-augmented-fourth",
    prompt: { kind: "staff", clef: "treble", notes: ["C4", "F#4"], duration: "q" },
    answer: choices(["Augmented 4th", "Diminished 5th", "Perfect 4th", "Minor 5th"], 0),
    rule: "C to F# is an augmented fourth: the generic fourth lands on F, and one half step above the perfect fourth's 5 makes 6 — a fourth because F is four letter names from C.",
  },
  {
    id: "l32-staff-c4-gb4-diminished-fifth",
    prompt: { kind: "staff", clef: "treble", notes: ["C4", "Gb4"], duration: "q" },
    answer: choices(["Diminished 5th", "Augmented 4th", "Perfect 5th", "Minor 5th"], 0),
    rule: "C to Gb is a diminished fifth: the generic fifth lands on G, and one half step below the perfect fifth's 7 makes 6 — it sounds the same as C to F#, but one is a fifth and the other a fourth.",
  },
  {
    id: "l32-staff-g4-b4-major-third",
    prompt: { kind: "staff", clef: "treble", notes: ["G4", "B4"], duration: "q" },
    answer: choices(["Major 3rd", "Minor 3rd", "Perfect 4th", "Diminished 3rd"], 0),
    rule: "Three steps: the generic third above G lands on B, a major third needs 4 half steps, and G to B already has them — no accidental is required.",
  },
  {
    id: "l32-staff-d4-g4-perfect-fourth",
    prompt: { kind: "staff", clef: "treble", notes: ["D4", "G4"], duration: "q" },
    answer: choices(["Perfect 4th", "Augmented 4th", "Major 3rd", "Diminished 5th"], 0),
    rule: "Three steps: the generic fourth above D lands on G, a perfect fourth needs 5 half steps, and D to G already has them — no accidental is required.",
  },
  {
    id: "l32-staff-a4-f5-minor-sixth",
    prompt: { kind: "staff", clef: "treble", notes: ["A4", "F5"], duration: "q" },
    answer: choices(["Minor 6th", "Major 6th", "Perfect 5th", "Diminished 6th"], 0),
    rule: "Three steps: the generic sixth above A lands on F, a minor sixth needs 8 half steps (a major sixth has 9), and F natural already sits 8 above A — so the minor sixth needs no accidental.",
  },
  {
    id: "l32-staff-eb4-d5-major-seventh",
    prompt: { kind: "staff", clef: "treble", notes: ["Eb4", "D5"], duration: "q" },
    answer: choices(["Major 7th", "Minor 7th", "Perfect Octave", "Diminished 7th"], 0),
    rule: "Three steps: the generic seventh above Eb lands on D, a major seventh needs 11 half steps, and D natural already sits 11 above Eb — the flat in Eb is the root's, not the interval's.",
  },
  {
    id: "l32-staff-f4-b4-augmented-fourth",
    prompt: { kind: "staff", clef: "treble", notes: ["F4", "B4"], duration: "q" },
    answer: choices(["Augmented 4th", "Perfect 4th", "Diminished 5th", "Minor 5th"], 0),
    rule: "F to B is an augmented fourth — the site's own example: F to Bb is a perfect fourth, and B natural adds the one extra half step.",
  },
  {
    id: "l32-staff-c4-c5-perfect-octave",
    prompt: { kind: "staff", clef: "treble", notes: ["C4", "C5"], duration: "q" },
    answer: choices(["Perfect Octave", "Major 7th", "Diminished Octave", "Perfect Unison"], 0),
    rule: "Three steps: the generic eighth above C is the C one octave up, a perfect octave needs 12 half steps, and C to C already has them — the octave, like the fourth and fifth, is perfect rather than major.",
  },

  // --- text prompts: the three steps and the upward-building drills -------
  {
    id: "l32-text-first-step",
    prompt: { kind: "text", text: "When writing an interval, what is the first step?" },
    answer: choices(
      [
        "Write the generic interval on the staff",
        "Add every accidental at once",
        "Count the half steps first",
        "Choose a key signature",
      ],
      0,
    ),
    rule: "First, write the generic interval on the staff — the letter distance decides the number before any accidental.",
  },
  {
    id: "l32-text-second-step",
    prompt: { kind: "text", text: "When writing an interval, what is the second step?" },
    answer: choices(
      [
        "Figure out the number of half steps on the keyboard",
        "Write the generic interval on the staff",
        "Invert the interval",
        "Name the key",
      ],
      0,
    ),
    rule: "Next, figure out the number of half steps on the keyboard — a minor third needs 3 because a major third has 4.",
  },
  {
    id: "l32-text-third-step",
    prompt: { kind: "text", text: "When writing an interval, what is the third step?" },
    answer: choices(
      [
        "Compare the staff and keyboard results, adding any needed accidentals",
        "Erase the generic interval and start over",
        "Count the letter names again",
        "Play the interval in every octave",
      ],
      0,
    ),
    rule: "Finally, compare the staff and keyboard results and add any needed accidentals to the staff.",
  },
  {
    id: "l32-text-minor-third-above-c",
    prompt: { kind: "text", text: "What note is a minor third above C?" },
    answer: choices(["Eb", "E", "D#", "Db"], 0),
    rule: "A minor third above C is Eb: the generic third lands on E, and the minor third's 3 half steps flatten it.",
  },
  {
    id: "l32-text-major-sixth-above-fs",
    prompt: { kind: "text", text: "What note is a major sixth above F#?" },
    answer: choices(["D#", "Eb", "D", "E"], 0),
    rule: "A major sixth above F# is D#: the generic sixth lands on D, and 9 half steps above F# sharpen it — not Eb, which would make a fifth, not a sixth.",
  },
  {
    id: "l32-text-diminished-fifth-above-b",
    prompt: { kind: "text", text: "What note is a diminished fifth above B?" },
    answer: choices(["F", "E#", "F#", "E"], 0),
    rule: "A diminished fifth above B is F: the generic fifth lands on F, and F natural is already only 6 half steps above B — no accidental is needed.",
  },
  {
    id: "l32-text-augmented-fourth-above-c",
    prompt: { kind: "text", text: "What note is an augmented fourth above C?" },
    answer: choices(["F#", "Gb", "F", "Ab"], 0),
    rule: "An augmented fourth above C is F#: the generic fourth lands on F, and one half step above the perfect fourth's 5 sharpens it — Gb sounds the same but would be a fifth.",
  },
  {
    id: "l32-text-diminished-fifth-above-c",
    prompt: { kind: "text", text: "What note is a diminished fifth above C?" },
    answer: choices(["Gb", "F#", "G", "Db"], 0),
    rule: "A diminished fifth above C is Gb: the generic fifth lands on G, and one half step below the perfect fifth's 7 flattens it — F# sounds the same but would be a fourth.",
  },
  {
    id: "l32-text-minor-third-half-steps",
    prompt: { kind: "text", text: "How many half steps does a minor third contain?" },
    answer: choices(["Four", "Three", "Two", "Five"], 1),
    rule: "A minor third contains 3 half steps — one less than the major third's 4, as the C–Eb example shows.",
  },
  {
    id: "l32-text-diminished-fifth-half-steps",
    prompt: { kind: "text", text: "How many half steps does a diminished fifth contain?" },
    answer: choices(["Seven", "Five", "Six", "Eight"], 2),
    rule: "A diminished fifth contains 6 half steps — one less than the perfect fifth's 7, as the B–F example shows.",
  },
  {
    id: "l32-text-aug-vs-dim",
    prompt: {
      kind: "text",
      text: "C to F# and C to Gb share a half-step count and sound the same. How do they differ?",
    },
    answer: choices(
      [
        "One is a fourth and the other is a fifth",
        "One is a third and the other is a sixth",
        "They differ only in octave",
        "They are the same interval spelled twice",
      ],
      0,
    ),
    rule: "Although both intervals sound the same and look identical on the keyboard, one is a fourth and the other is a fifth — the staff spelling, not the keyboard, tells them apart.",
  },
];

export const lesson32: LessonModule = {
  entry: requireLessonEntry(32),
  generateRounds: (rng) => sampleRounds(lesson32Pool, rng, ROUND_COUNT),
};

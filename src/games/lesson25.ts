import { buildScale, parseNote, scientificName, type ScaleType } from "../lib/theory";
import type { AnswerSpec, Round } from "../lib/rounds/types";
import { requireLessonEntry } from "./catalog";
import { sampleRounds } from "./rng";
import type { LessonModule } from "./types";

/**
 * Lesson 25 — Key Signature Calculation.
 *
 * Content source: musictheory.net lesson 25 (slide text pulled from the live
 * `lesson25.js`). The site teaches the numeric calculation method, not the
 * leading-tone/fourth-below shortcut: "30 different key signatures exist (15
 * for major scales and 15 for minor scales)", but "using the *key signature
 * calculation method*, one only has to memorize seven." Each signature gets a
 * numeric value — "Sharps are positive; flats are negative" — and the seven
 * memorised values are C = 0, D = 2, E = 4, F = −1, G = 1, A = 3, B = 5.
 * Same-letter keys relate by seven: "If we start at {C} Major and subtract 7,
 * we end up at {Cb} Major"; "add 7, we end up at {C#} Major." Worked
 * conversions: Eb major = E (4) − 7 = −3 (three flats); F# major = F (−1) + 7
 * = 6 (six sharps); parallel minors by subtracting 3 — "To convert a major
 * scale into its parallel minor, simply subtract 3" — so D minor = D (2) − 3
 * = −1 (one flat) and F minor = F (−1) − 3 = −4 (four flats); C# minor needs
 * two conversions, 0 + 7 − 3 = 4 sharps; and G# major = 1 + 7 = 8 is "strictly
 * theoretical … a composer would use the enharmonic equivalent of {Ab} major."
 *
 * Corrections to the task's accepted reference, from the live site: the
 * reference describes working backwards from a signature by "the last sharp
 * is the leading tone … half step above it" / "the last flat is the fourth
 * degree … fourth below it". That method appears nowhere in this lesson —
 * live lesson 25 is the numeric calculation method above, and the site wins.
 * The site's own wording "parallel minor" is used throughout (subtracting 3
 * reaches the same-letter minor, not the relative minor). Value questions
 * derive their staves from `buildScale`, so no scale spelling is hand-typed.
 * Signature-reading rounds that show a key on the staff ask for the
 * memorised starting value, never the key's name, because `StaffPrompt`'s
 * aria-label announces "key of X". Scale content stays on the staff (not the
 * keyboard) so the pool is 11 `staff` rounds + 11 `text` rounds = 22: any
 * draw of 12 must include at least one of each kind — the mix is structural,
 * not luck.
 */
const choices = (options: string[], correctIndex: number): AnswerSpec => ({
  kind: "choices",
  options,
  correctIndex,
});

/** The seven degrees of a scale, spelled for the staff. */
const scaleNotes = (root: string, type: ScaleType): string[] =>
  buildScale(parseNote(root), type).map(scientificName);

/** Rounds drawn per visit; the pool is larger so replays vary. */
const ROUND_COUNT = 12;

export const lesson25Pool: readonly Round[] = [
  // --- staff prompts: read a signature, supply the numeric value -----------
  {
    id: "l25-staff-c-major-value",
    prompt: { kind: "staff", clef: "treble", notes: scaleNotes("C4", "major"), duration: "q" },
    answer: choices(["-1", "0", "1", "2"], 1),
    rule: "The key of C Major has no accidentals; therefore, its numeric value is 0.",
  },
  {
    id: "l25-staff-g-major-value",
    prompt: { kind: "staff", clef: "treble", notes: scaleNotes("G4", "major"), duration: "q" },
    answer: choices(["1", "0", "2", "-1"], 0),
    rule: "G major has one sharp; sharps are positive, so its numeric value is 1.",
  },
  {
    id: "l25-staff-d-major-value",
    prompt: { kind: "staff", clef: "treble", notes: scaleNotes("D4", "major"), duration: "q" },
    answer: choices(["2", "1", "3", "-2"], 0),
    rule: "D major has two sharps; thus, its numeric value is 2.",
  },
  {
    id: "l25-staff-a-major-value",
    prompt: { kind: "staff", clef: "treble", notes: scaleNotes("A4", "major"), duration: "q" },
    answer: choices(["3", "2", "4", "-3"], 0),
    rule: "A major has three sharps — a numeric value of 3.",
  },
  {
    id: "l25-staff-e-major-value",
    prompt: { kind: "staff", clef: "treble", notes: scaleNotes("E4", "major"), duration: "q" },
    answer: choices(["4", "3", "5", "-4"], 0),
    rule: "The key of E Major has four sharps — a numeric value of 4.",
  },
  {
    id: "l25-staff-b-major-value",
    prompt: { kind: "staff", clef: "treble", notes: scaleNotes("B4", "major"), duration: "q" },
    answer: choices(["5", "4", "6", "-5"], 0),
    rule: "The key of B Major has five sharps — giving it a numeric value of 5.",
  },
  {
    id: "l25-staff-f-major-value",
    prompt: { kind: "staff", clef: "treble", notes: scaleNotes("F4", "major"), duration: "q" },
    answer: choices(["-1", "0", "1", "-2"], 0),
    rule: "F major has one flat; flats are assigned negative numbers, so its numeric value is -1.",
  },
  {
    id: "l25-staff-eb-calc",
    prompt: {
      kind: "staff",
      clef: "treble",
      notes: ["G4"],
      keySignature: "Eb",
      duration: "q",
    },
    answer: choices(
      ["C major, value 0", "E major, value 4", "B major, value 5", "Eb major, value -3"],
      1,
    ),
    rule: "To figure out Eb major, start with E major, which has a numeric value of 4, and subtract 7; the result is -3, thus Eb major has 3 flats.",
  },
  {
    id: "l25-staff-fs-calc",
    prompt: {
      kind: "staff",
      clef: "treble",
      notes: ["B4"],
      keySignature: "F#",
      duration: "q",
    },
    answer: choices(
      ["F major, value -1", "F major, value 1", "C major, value 0", "B major, value 5"],
      0,
    ),
    rule: "To calculate F# major, start with F major, which is -1, and add 7; the result is 6, thus F# major has 6 sharps.",
  },
  {
    id: "l25-staff-d-minor-value",
    prompt: {
      kind: "staff",
      clef: "treble",
      notes: scaleNotes("D4", "naturalMinor"),
      duration: "q",
    },
    answer: choices(["-1", "1", "-2", "2"], 0),
    rule: "To convert the parallel major D Major (value 2) into D minor, simply subtract 3; the result is -1, so D minor has one flat.",
  },
  {
    id: "l25-staff-f-minor-value",
    prompt: {
      kind: "staff",
      clef: "treble",
      notes: scaleNotes("F4", "naturalMinor"),
      duration: "q",
    },
    answer: choices(["-4", "-3", "-5", "4"], 0),
    rule: "To convert F major (-1) into its parallel minor F minor, subtract 3; the result is -4, thus F minor has 4 flats.",
  },

  // --- text prompts: the seven values and the conversions ------------------
  {
    id: "l25-text-thirty-signatures",
    prompt: { kind: "text", text: "How many different key signatures exist?" },
    answer: choices(["Seven", "Fifteen", "Thirty", "Thirty-one"], 2),
    rule: "30 different key signatures exist — 15 for major scales and 15 for minor scales.",
  },
  {
    id: "l25-text-memorize-seven",
    prompt: {
      kind: "text",
      text: "How many key signatures must you memorize before using the calculation method?",
    },
    answer: choices(["One", "Seven", "Fifteen", "Thirty"], 1),
    rule: "Using the key signature calculation method, one only has to memorize seven.",
  },
  {
    id: "l25-text-flats-sign",
    prompt: { kind: "text", text: "What numeric sign do flat keys receive?" },
    answer: choices(["Positive", "Negative", "Zero", "Neither"], 1),
    rule: "In the calculation method each key signature is assigned a numeric value based on the number and type of accidentals: sharps are positive; flats are negative.",
  },
  {
    id: "l25-text-seven-values",
    prompt: {
      kind: "text",
      text: "Which list gives the seven memorised values for C, G, D, A, E, B and F major?",
    },
    answer: choices(
      [
        "C 0, G 1, D 2, A 3, E 4, B 5, F -1",
        "C 1, G 2, D 3, A 4, E 5, B 6, F 0",
        "C 0, G -1, D -2, A -3, E -4, B -5, F 1",
        "C 0, G 1, D 2, A 3, E 4, B 5, F 1",
      ],
      0,
    ),
    rule: "These seven values must be memorized before we can proceed: C is 0, G is 1, D is 2, A is 3, E is 4, B is 5 and F is -1.",
  },
  {
    id: "l25-text-cb-calc",
    prompt: { kind: "text", text: "C major has a numeric value of 0. What value does Cb major have?" },
    answer: choices(["-7", "7", "-3", "3"], 0),
    rule: "If we start at C Major and subtract 7, we end up at Cb Major — a numeric value of -7.",
  },
  {
    id: "l25-text-cs-calc",
    prompt: { kind: "text", text: "C major has a numeric value of 0. What value does C# major have?" },
    answer: choices(["-7", "7", "-3", "6"], 1),
    rule: "If we start at C Major and add 7, we end up at C# Major — a numeric value of 7.",
  },
  {
    id: "l25-text-eb-calc",
    prompt: { kind: "text", text: "E major has a numeric value of 4. What is Eb major's value?" },
    answer: choices(["-3", "3", "11", "-4"], 0),
    rule: "To convert to Eb major, subtract 7 from E major's value of 4; the result is -3, thus Eb major has 3 flats.",
  },
  {
    id: "l25-text-fs-calc",
    prompt: { kind: "text", text: "F major has a numeric value of -1. What is F# major's value?" },
    answer: choices(["5", "6", "-8", "7"], 1),
    rule: "To convert to F# major, add 7 to F major's value of -1; the result is 6, thus F# major has 6 sharps.",
  },
  {
    id: "l25-text-parallel-minor",
    prompt: {
      kind: "text",
      text: "To convert a major scale into its parallel minor, what do you do?",
    },
    answer: choices(["Subtract 3", "Add 3", "Subtract 7", "Add 7"], 0),
    rule: "To convert a major scale into its parallel minor, simply subtract 3.",
  },
  {
    id: "l25-text-cs-minor",
    prompt: {
      kind: "text",
      text: "Calculate C# minor: start at C major (0), add 7 to reach C# major, then subtract 3. How many sharps does C# minor have?",
    },
    answer: choices(["Two sharps", "Three sharps", "Four sharps", "Five sharps"], 2),
    rule: "Some key signatures require two conversions: C major is 0, add 7 for C# major, subtract 3 for C# minor — the result is 4, so C# minor has 4 sharps.",
  },
  {
    id: "l25-text-gs-theoretical",
    prompt: {
      kind: "text",
      text: "G# major's numeric value is 8 — eight sharps. Why is this key theoretical?",
    },
    answer: choices(
      [
        "It would need a double sharp; in practice a composer would use the enharmonic equivalent of Ab major",
        "It contains more than seven notes",
        "Minor keys cannot share a letter with major keys",
        "Eight sharps cannot be drawn on a staff",
      ],
      0,
    ),
    rule: "G# major would have 8 sharps — a double sharp and six normal sharps — so this key is strictly theoretical; in practice, a composer would use the enharmonic equivalent of Ab major.",
  },
];

export const lesson25: LessonModule = {
  entry: requireLessonEntry(25),
  generateRounds: (rng) => sampleRounds(lesson25Pool, rng, ROUND_COUNT),
};

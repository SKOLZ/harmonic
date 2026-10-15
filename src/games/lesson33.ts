import type { AnswerSpec, Round } from "../lib/rounds/types";
import { requireLessonEntry } from "./catalog";
import { sampleRounds } from "./rng";
import type { LessonModule } from "./types";

/**
 * Lesson 33 — Interval Inversion.
 *
 * Content source: musictheory.net lesson 33 (slide text pulled from the live
 * `lesson33.js`): "In music, the verb *invert* means to move the lowest note
 * in a group an octave higher." Six worked examples: perfect fifth C–G
 * inverts to perfect fourth G–C; perfect fourth F#–B to perfect fifth B–F#;
 * "Perfect intervals will always invert to other perfect intervals" and
 * "Fourths and fifths will invert to each other"; major third C–E to minor
 * sixth E–C; minor third E–G to major sixth G–E; "Minor intervals and major
 * intervals invert to each other" and "Thirds and sixths invert to each
 * other"; major seventh C–B to minor second B–C and "Seconds and sevenths
 * invert to each other"; "diminished and augmented intervals invert to
 * each other", demonstrated by augmented fourth C–F# inverting to
 * diminished fifth F#–C.
 *
 * Corrections to the task's accepted reference, from the live site: the
 * quality flips and the paired numbers all match, but the slide text never
 * states the arithmetic formula "9 − n" outright — the site teaches through
 * the six examples and the pair relationships, closing with "Use this chart
 * to quickly invert intervals." The formula is consistent with every site
 * example (5↔4, 4↔5, 3↔6, 6↔3, 7↔2, 2↔7 all sum to 9) and is the standard
 * statement of that chart, so the rules may use it. One core nuance the
 * tests pin: `invertInterval` reduces the octave to a compound unison and
 * returns a 15th for it, while the site's 9 − n rule gives the unison that
 * the inverted note pair actually spells — the octave round follows the
 * site, and the test documents both. The other staff answers are
 * re-derived through `invertInterval` in the test oracle, never by hand.
 * The pool is 11 `staff` rounds + 11 `text` rounds = 22: any draw of 12
 * must include at least one of each kind — the mix is structural, not
 * luck.
 */
const choices = (options: string[], correctIndex: number): AnswerSpec => ({
  kind: "choices",
  options,
  correctIndex,
});

/** Rounds drawn per visit; the pool is larger so replays vary. */
const ROUND_COUNT = 12;

export const lesson33Pool: readonly Round[] = [
  // --- staff prompts: the shown interval inverts to what? -----------------
  {
    id: "l33-staff-c4-g4-perfect-fifth",
    prompt: { kind: "staff", clef: "treble", notes: ["C4", "G4"], duration: "q" },
    answer: choices(["Perfect 4th", "Perfect 5th", "Minor 4th", "Augmented 4th"], 0),
    rule: "The site's first example: move the C up an octave and the perfect fifth C–G becomes the perfect fourth G–C — perfect intervals always invert to other perfect intervals.",
  },
  {
    id: "l33-staff-fs4-b4-perfect-fourth",
    prompt: { kind: "staff", clef: "treble", notes: ["F#4", "B4"], duration: "q" },
    answer: choices(["Perfect 5th", "Perfect 4th", "Diminished 5th", "Augmented 4th"], 0),
    rule: "The site's second example: move the F# up an octave and the perfect fourth F#–B becomes the perfect fifth B–F# — fourths and fifths invert to each other.",
  },
  {
    id: "l33-staff-c4-e4-major-third",
    prompt: { kind: "staff", clef: "treble", notes: ["C4", "E4"], duration: "q" },
    answer: choices(["Minor 6th", "Major 6th", "Minor 3rd", "Diminished 6th"], 0),
    rule: "The site's third example: move the C up an octave and the major third C–E becomes the minor sixth E–C — 9 − 3 = 6, and major becomes minor.",
  },
  {
    id: "l33-staff-e4-g4-minor-third",
    prompt: { kind: "staff", clef: "treble", notes: ["E4", "G4"], duration: "q" },
    answer: choices(["Major 6th", "Minor 6th", "Major 3rd", "Perfect 5th"], 0),
    rule: "The site's fourth example: move the E up an octave and the minor third E–G becomes the major sixth G–E — 9 − 3 = 6, and minor becomes major.",
  },
  {
    id: "l33-staff-c4-b4-major-seventh",
    prompt: { kind: "staff", clef: "treble", notes: ["C4", "B4"], duration: "q" },
    answer: choices(["Minor 2nd", "Major 2nd", "Minor 7th", "Diminished 2nd"], 0),
    rule: "The site's fifth example: move the C up an octave and the major seventh C–B becomes the minor second B–C — seconds and sevenths invert to each other.",
  },
  {
    id: "l33-staff-c4-fs4-augmented-fourth",
    prompt: { kind: "staff", clef: "treble", notes: ["C4", "F#4"], duration: "q" },
    answer: choices(["Diminished 5th", "Augmented 4th", "Perfect 5th", "Minor 5th"], 0),
    rule: "The site's sixth example: move the C up an octave and the augmented fourth C–F# becomes the diminished fifth F#–C — diminished and augmented intervals invert to each other.",
  },
  {
    id: "l33-staff-c4-c5-perfect-octave",
    prompt: { kind: "staff", clef: "treble", notes: ["C4", "C5"], duration: "q" },
    answer: choices(["Perfect Unison", "Perfect Octave", "Diminished Unison", "Major 7th"], 0),
    rule: "The octave obeys the same arithmetic: 9 − 8 = 1, so the perfect octave C–C inverts to the perfect unison — perfect stays perfect at both ends.",
  },
  {
    id: "l33-staff-d4-fs4-major-third",
    prompt: { kind: "staff", clef: "treble", notes: ["D4", "F#4"], duration: "q" },
    answer: choices(["Minor 6th", "Major 6th", "Minor 3rd", "Perfect 4th"], 0),
    rule: "Move the D up an octave: the major third D–F# becomes the minor sixth F#–D — 9 − 3 = 6, and major inverts to minor.",
  },
  {
    id: "l33-staff-b4-f5-diminished-fifth",
    prompt: { kind: "staff", clef: "treble", notes: ["B4", "F5"], duration: "q" },
    answer: choices(["Augmented 4th", "Diminished 5th", "Perfect 4th", "Minor 5th"], 0),
    rule: "Move the B up an octave: the diminished fifth B–F becomes the augmented fourth F–B — 9 − 5 = 4, and diminished inverts to augmented.",
  },
  {
    id: "l33-staff-g4-a4-major-second",
    prompt: { kind: "staff", clef: "treble", notes: ["G4", "A4"], duration: "q" },
    answer: choices(["Minor 7th", "Major 7th", "Minor 2nd", "Perfect Octave"], 0),
    rule: "Move the G up an octave: the major second G–A becomes the minor seventh A–G — 9 − 2 = 7, because seconds and sevenths invert to each other.",
  },
  {
    id: "l33-staff-eb4-c5-major-sixth",
    prompt: { kind: "staff", clef: "treble", notes: ["Eb4", "C5"], duration: "q" },
    answer: choices(["Minor 3rd", "Major 3rd", "Minor 6th", "Diminished 3rd"], 0),
    rule: "Move the Eb up an octave: the major sixth Eb–C becomes the minor third C–Eb — 9 − 6 = 3, and thirds and sixths invert to each other.",
  },

  // --- text prompts: the verb, the quality flips, and the number rule ------
  {
    id: "l33-text-what-is-invert",
    prompt: { kind: "text", text: "In music, what does it mean to invert an interval?" },
    answer: choices(
      [
        "Move the lowest note in a group an octave higher",
        "Move the highest note down a half step",
        "Reverse the rhythm of a phrase",
        "Play the interval downward instead",
      ],
      0,
    ),
    rule: "In music, the verb invert means to move the lowest note in a group an octave higher.",
  },
  {
    id: "l33-text-p5-inverts",
    prompt: { kind: "text", text: "What does a perfect fifth invert to?" },
    answer: choices(
      ["A perfect fourth", "A perfect fifth", "A minor fourth", "A major fifth"],
      0,
    ),
    rule: "A perfect fifth inverts to a perfect fourth — C to G becomes G to C — and fourths and fifths invert to each other.",
  },
  {
    id: "l33-text-p4-inverts",
    prompt: { kind: "text", text: "What does a perfect fourth invert to?" },
    answer: choices(
      ["A perfect fifth", "A perfect fourth", "A diminished fifth", "A major fifth"],
      0,
    ),
    rule: "A perfect fourth inverts to a perfect fifth — F# to B becomes B to F#.",
  },
  {
    id: "l33-text-perfect-stays-perfect",
    prompt: {
      kind: "text",
      text: "Can a perfect interval ever invert to a major or minor one?",
    },
    answer: choices(
      [
        "No — perfect intervals always invert to other perfect intervals",
        "Yes — perfect fifths become major fourths",
        "Yes — but only the octave",
        "No — they always become diminished",
      ],
      0,
    ),
    rule: "Perfect intervals will always invert to other perfect intervals.",
  },
  {
    id: "l33-text-m3-inverts",
    prompt: { kind: "text", text: "What does a major third invert to?" },
    answer: choices(
      ["A minor sixth", "A major sixth", "A minor third", "A perfect fifth"],
      0,
    ),
    rule: "A major third inverts to a minor sixth — C to E becomes E to C — and minor and major intervals invert to each other.",
  },
  {
    id: "l33-text-m3-minor-inverts",
    prompt: { kind: "text", text: "What does a minor third invert to?" },
    answer: choices(
      ["A major sixth", "A minor sixth", "A major third", "A diminished sixth"],
      0,
    ),
    rule: "A minor third inverts to a major sixth — E to G becomes G to E — and thirds and sixths invert to each other.",
  },
  {
    id: "l33-text-m7-inverts",
    prompt: { kind: "text", text: "What does a major seventh invert to?" },
    answer: choices(
      ["A minor second", "A major second", "A minor seventh", "A diminished second"],
      0,
    ),
    rule: "A major seventh inverts to a minor second — C to B becomes B to C — because seconds and sevenths invert to each other.",
  },
  {
    id: "l33-text-thirds-invert",
    prompt: { kind: "text", text: "Thirds and sixths invert to each other. What do seconds invert to?" },
    answer: choices(["Sevenths", "Thirds", "Sixths", "Fifths"], 0),
    rule: "Seconds and sevenths invert to each other — the same nine-count relationship as thirds and sixths.",
  },
  {
    id: "l33-text-aug-dim-invert",
    prompt: { kind: "text", text: "What quality do diminished intervals invert to?" },
    answer: choices(
      ["Augmented", "Major", "Perfect", "Minor"],
      0,
    ),
    rule: "Diminished and augmented intervals invert to each other — an augmented fourth C to F# becomes the diminished fifth F# to C.",
  },
  {
    id: "l33-text-number-sum",
    prompt: {
      kind: "text",
      text: "An interval's number and its inversion's number always add up to what?",
    },
    answer: choices(
      ["Nine", "Eight", "Twelve", "Seven"],
      0,
    ),
    rule: "The numbers of an interval and its inversion always sum to nine — a fifth (5) inverts to a fourth (4), a third (3) to a sixth (6), a seventh (7) to a second (2).",
  },
  {
    id: "l33-text-a4-inverts",
    prompt: { kind: "text", text: "What does an augmented fourth invert to?" },
    answer: choices(
      ["A diminished fifth", "An augmented fifth", "A diminished fourth", "A perfect fifth"],
      0,
    ),
    rule: "An augmented fourth inverts to a diminished fifth — C to F# becomes F# to C — carrying the augmented/diminished flip across the 9 − 4 = 5 count.",
  },
];

export const lesson33: LessonModule = {
  entry: requireLessonEntry(33),
  generateRounds: (rng) => sampleRounds(lesson33Pool, rng, ROUND_COUNT),
};

import {
  FLAT_ORDER,
  SHARP_ORDER,
  buildScale,
  keySignatureAccidentals,
  parseNote,
  scientificName,
  type ScaleType,
} from "../lib/theory";
import type { AnswerSpec, Round } from "../lib/rounds/types";
import { requireLessonEntry } from "./catalog";
import { sampleRounds } from "./rng";
import type { LessonModule } from "./types";

/**
 * Lesson 24 — Key Signatures.
 *
 * Content source: musictheory.net lesson 24 (slide text pulled from the live
 * `lesson24.js`): "A *key signature* is a collection of every accidental
 * found in a scale." The site demonstrates through C minor ("which has three
 * flats") and Db major ("which has five flats"), then lays out the two orders:
 * flats run "{Bb} is first, followed by {Eb}, {Ab}, {Db}, and {Gb}" then
 * "{Cb} and finally {Fb}", remembered by "''Battle Ends And Down Goes
 * Charles' Father''"; "Sharps are arranged in the opposite order of flats" —
 * "{F#} comes first, followed by {C#}, {G#}, and {D#}", then "{A#}, {E#},
 * and finally {B#}" — remembered by "''Father Charles Goes Down And Ends
 * Battle''". Worked signature examples: A major ("The {C#}, {F#}, and {G#}
 * move into the key signature") and E major (four sharps: F#, G#, C# and D#
 * as they appear in the scale; the signature itself reads F#, C#, G#, D#).
 *
 * Corrections to the task's accepted reference, from the live site: the two
 * orders and the accumulate-in-order facts match, but the reference's third
 * sentence — "Each major key signature also names its relative minor" —
 * appears nowhere in this lesson's slide text; lesson 24 covers the
 * definition, the two orders with their mnemonics, and the four worked
 * examples, and relative keys belong to earlier lessons. Rounds are built
 * from the site's own examples; the scale staves come from `buildScale` and
 * the signature accidental sets from `keySignatureAccidentals` in the theory
 * core, so no spelling is hand-typed. Signature-reading staff rounds pass the
 * accidentals as written notes rather than through the prompt's
 * `keySignature` field where the question is "which key", because
 * `StaffPrompt`'s aria-label would otherwise announce the answer. Scale
 * content stays on the staff (not the keyboard) so the pool is 11 `staff`
 * rounds + 11 `text` rounds = 22: any draw of 12 must include at least one
 * of each kind — the mix is structural, not luck.
 */
const choices = (options: string[], correctIndex: number): AnswerSpec => ({
  kind: "choices",
  options,
  correctIndex,
});

/** The seven degrees of a scale, spelled for the staff. */
const scaleNotes = (root: string, type: ScaleType): string[] =>
  buildScale(parseNote(root), type).map(scientificName);

/** "F#, C#, G#, D#, A#, E#, B#" — the canonical order, spelled for prose. */
const orderProse = (order: readonly string[], accidental: "#" | "b"): string =>
  order.map((letter) => letter + accidental).join(", ");

const SHARP_ORDER_TEXT = orderProse(SHARP_ORDER, "#");
const FLAT_ORDER_TEXT = orderProse(FLAT_ORDER, "b");

/** "Bb, Eb, Ab" — a key's signature accidentals as the theory core spells them. */
const accidentalsOf = (key: string): string =>
  keySignatureAccidentals(parseNote(key)).map(scientificName).join(", ");

/** Rounds drawn per visit; the pool is larger so replays vary. */
const ROUND_COUNT = 12;

export const lesson24Pool: readonly Round[] = [
  // --- staff prompts: name the key or read the accumulating signature -------
  {
    id: "l24-staff-g-major-scale",
    prompt: { kind: "staff", clef: "treble", notes: scaleNotes("G4", "major"), duration: "q" },
    answer: choices(["F major", "G major", "D major", "G minor"], 1),
    rule: "G major is spelled G A B C D E F#: its single sharp, F#, is the first in the order of sharps.",
  },
  {
    id: "l24-staff-d-major-scale",
    prompt: { kind: "staff", clef: "treble", notes: scaleNotes("D4", "major"), duration: "q" },
    answer: choices(["A major", "D major", "D minor", "E major"], 1),
    rule: `D major has two sharps — F# then C# — accumulated in the order of sharps ${SHARP_ORDER_TEXT}.`,
  },
  {
    id: "l24-staff-f-major-scale",
    prompt: { kind: "staff", clef: "treble", notes: scaleNotes("F4", "major"), duration: "q" },
    answer: choices(["F major", "Bb major", "C major", "F minor"], 0),
    rule: `F major has one flat, Bb — the first in the order of flats ${FLAT_ORDER_TEXT}.`,
  },
  {
    id: "l24-staff-eb-major-scale",
    prompt: { kind: "staff", clef: "treble", notes: scaleNotes("Eb4", "major"), duration: "q" },
    answer: choices(["Eb major", "Ab major", "Bb major", "Eb minor"], 0),
    rule: `Eb major has three flats — ${accidentalsOf("Eb")} — written in the order of flats.`,
  },
  {
    id: "l24-staff-bb-major-scale",
    prompt: { kind: "staff", clef: "treble", notes: scaleNotes("Bb4", "major"), duration: "q" },
    answer: choices(["Bb major", "Eb major", "Bb minor", "F major"], 0),
    rule: `Bb major has two flats, ${accidentalsOf("Bb")}, collected in the order of flats.`,
  },
  {
    // The site's A major slide: the C#, F# and G# move into the key signature.
    id: "l24-staff-a-major-signature",
    prompt: { kind: "staff", clef: "treble", notes: ["F#4", "C#5", "G#5"], duration: "q" },
    answer: choices(["A major", "E major", "D major", "A minor"], 0),
    rule: `A major has three sharps: its key signature collects ${accidentalsOf("A")} in the order of sharps.`,
  },
  {
    id: "l24-staff-e-major-signature",
    prompt: { kind: "staff", clef: "treble", notes: ["F#4", "C#5", "G#5", "D#5"], duration: "q" },
    answer: choices(["E major", "A major", "B major", "E minor"], 0),
    rule: `E major has four sharps: ${accidentalsOf("E")} move into the key signature, in that order.`,
  },
  {
    id: "l24-staff-next-sharp-after-g",
    prompt: {
      kind: "staff",
      clef: "treble",
      notes: ["G4"],
      keySignature: "G",
      duration: "q",
    },
    answer: choices(["C#", "F#", "G#", "D#"], 0),
    rule: `Sharps accumulate in the order ${SHARP_ORDER_TEXT}, so after F# the next sharp to enter the signature is C#.`,
  },
  {
    id: "l24-staff-next-flat-after-eb",
    prompt: {
      kind: "staff",
      clef: "treble",
      notes: ["C4"],
      keySignature: "Eb",
      duration: "q",
    },
    answer: choices(["Bb", "Db", "Eb", "Ab"], 1),
    rule: `Flats accumulate in the order ${FLAT_ORDER_TEXT}, so after Bb, Eb and Ab the next flat is Db.`,
  },
  {
    id: "l24-staff-db-count",
    prompt: {
      kind: "staff",
      clef: "treble",
      notes: ["F4"],
      keySignature: "Db",
      duration: "q",
    },
    answer: choices(["Three", "Six", "Five", "Four"], 2),
    rule: `Db major has five flats — ${accidentalsOf("Db")} — collected in the order of flats.`,
  },
  {
    id: "l24-staff-c-minor-flats",
    prompt: {
      kind: "staff",
      clef: "treble",
      notes: scaleNotes("C4", "naturalMinor"),
      duration: "q",
    },
    answer: choices(["Two", "Three", "One", "Four"], 1),
    rule: `C minor has three flats: its scale carries ${accidentalsOf("Eb")}, and a key signature collects every accidental found in the scale.`,
  },

  // --- text prompts: the definition, the two orders, and their mnemonics ----
  {
    id: "l24-text-definition",
    prompt: { kind: "text", text: "What is a key signature?" },
    answer: choices(
      [
        "A collection of every accidental found in a scale",
        "The distance between two notes",
        "A list of the notes in a chord",
        "A bar line that ends a piece",
      ],
      0,
    ),
    rule: "A key signature is a collection of every accidental found in a scale.",
  },
  {
    id: "l24-text-order-of-sharps",
    prompt: { kind: "text", text: "In what order do sharps appear in a key signature?" },
    answer: choices(
      [
        SHARP_ORDER_TEXT,
        FLAT_ORDER_TEXT,
        "C#, F#, G#, A#, B#, D#, E#",
        "F#, G#, A#, B#, C#, D#, E#",
      ],
      0,
    ),
    rule: `Sharps are arranged in the opposite order of flats: F# comes first, followed by C#, G#, D#, A#, E# and finally B#.`,
  },
  {
    id: "l24-text-order-of-flats",
    prompt: { kind: "text", text: "In what order do flats appear in a key signature?" },
    answer: choices(
      [
        FLAT_ORDER_TEXT,
        SHARP_ORDER_TEXT,
        "Bb, Ab, Gb, Fb, Eb, Db, Cb",
        "Eb, Ab, Bb, Db, Gb, Cb, Fb",
      ],
      0,
    ),
    rule: `The order of flats is ${FLAT_ORDER_TEXT} — the reverse of the order of sharps.`,
  },
  {
    id: "l24-text-opposite-order",
    prompt: {
      kind: "text",
      text: "How are sharps arranged relative to flats in a key signature?",
    },
    answer: choices(
      ["In the opposite order", "In the same order", "Sharps always follow all flats", "They are not arranged"],
      0,
    ),
    rule: "Sharps are arranged in the opposite order of flats.",
  },
  {
    id: "l24-text-flat-mnemonic",
    prompt: { kind: "text", text: "Which saying remembers the order of flats?" },
    answer: choices(
      [
        "Battle Ends And Down Goes Charles' Father",
        "Father Charles Goes Down And Ends Battle",
        "Every Good Boy Does Fine",
        "Great Big Dogs Fight Animals",
      ],
      0,
    ),
    rule: `“Battle Ends And Down Goes Charles' Father” remembers the order of flats: ${FLAT_ORDER_TEXT}.`,
  },
  {
    id: "l24-text-sharp-mnemonic",
    prompt: { kind: "text", text: "Which saying remembers the order of sharps?" },
    answer: choices(
      [
        "Father Charles Goes Down And Ends Battle",
        "Battle Ends And Down Goes Charles' Father",
        "Every Good Boy Does Fine",
        "All Cows Eat Grass",
      ],
      0,
    ),
    rule: `“Father Charles Goes Down And Ends Battle” remembers the order of sharps: ${SHARP_ORDER_TEXT}.`,
  },
  {
    id: "l24-text-a-major-sharps",
    prompt: { kind: "text", text: "How many sharps does A major have?" },
    answer: choices(["One", "Two", "Three", "Four"], 2),
    rule: `A major has three sharps — C#, F# and G# move into the key signature — and the signature reads ${accidentalsOf("A")}.`,
  },
  {
    id: "l24-text-e-major-sharps",
    prompt: { kind: "text", text: "How many sharps does E major have?" },
    answer: choices(["Three", "Four", "Five", "Two"], 1),
    rule: `E major has four sharps: the F#, G#, C# and D# of its scale move into the key signature, which reads ${accidentalsOf("E")}.`,
  },
  {
    id: "l24-text-db-major-flats",
    prompt: { kind: "text", text: "How many flats does Db major have?" },
    answer: choices(["Three", "Four", "Five", "Six"], 2),
    rule: `Db major has five flats: ${accidentalsOf("Db")} accumulate in the order of flats.`,
  },
  {
    id: "l24-text-first-sharp",
    prompt: { kind: "text", text: "Which accidental is the first sharp in the order of sharps?" },
    answer: choices(["C#", "F#", "G#", "Bb"], 1),
    rule: `F# comes first in the order of sharps, followed by C#, G#, D#, A#, E# and B#.`,
  },
  {
    id: "l24-text-fifth-flat",
    prompt: { kind: "text", text: "Which flat is fifth in the order of flats?" },
    answer: choices(["Db", "Gb", "Cb", "Ab"], 1),
    rule: `The order of flats runs ${FLAT_ORDER_TEXT} — the fifth flat is Gb.`,
  },
];

export const lesson24: LessonModule = {
  entry: requireLessonEntry(24),
  generateRounds: (rng) => sampleRounds(lesson24Pool, rng, ROUND_COUNT),
};

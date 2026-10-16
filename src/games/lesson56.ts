import {
  buildTriad,
  chordInversion,
  diatonicTriads,
  midiNumber,
  parseNote,
  romanNumeral,
  scientificName,
  type TriadQuality,
} from "../lib/theory";
import type { AnswerSpec, Round } from "../lib/rounds/types";
import { requireLessonEntry } from "./catalog";
import { sampleStratifiedRounds } from "./rng";
import type { LessonModule } from "./types";

/**
 * Lesson 56 — Circle Progressions.
 *
 * Content source: musictheory.net lesson 56 (slide text pulled from the live
 * `lesson56.js`): "*Root motion* is the movement from one chord's root to
 * another chord's root." The lesson works three examples — C to A is "down a
 * third" (also "up a sixth", "due to interval inversion"), F to G is "up a
 * second or down a seventh", C to G is "down a fourth or up a fifth" — then
 * defines the circle progression: "occurs when root motion is equal to up a
 * fourth or down a fifth", shows both pairs "I→IV and ii→V" (and "iii→vi and
 * IV→vii°") as circle progressions, chains the major scale
 * "I→IV→vii°→iii→vi→ii→V→I" and the minor scale
 * "i→iv→VII→III→VI→ii°→V→i" (with the parentheticals "not vii°" and "not v"),
 * and notes "the root is not the lowest note" of an inverted chord.
 *
 * Motion rounds show the two roots in sequence (melodic; never stacked) and
 * offer the same four readings — each written with both octave-folded halves,
 * exactly as the site voices them — so exactly one option fits any pair whose
 * target letter matches one implied target; the test re-derives that from the
 * signed generic distance. Root-identification rounds stack one chord
 * (`simultaneous: true`); the first-inversion round voices the site's own
 * "I chord in first inversion" example with the core's tones lifted into
 * ascending order, so the root is provably not the bass.
 *
 * The pool is 7 `staff` + 10 `text` = 17, drawn stratified with one staff and
 * one text round guaranteed per 12-round draw.
 */
const choices = (options: string[], correctIndex: number): AnswerSpec => ({
  kind: "choices",
  options,
  correctIndex,
});

/** The four root-motion readings, each with both interval-inversion halves. */
const MOTION_OPTIONS = [
  "Down a third (or up a sixth)",
  "Up a second (or down a seventh)",
  "Up a fourth (or down a fifth)",
  "Down a fourth (or up a fifth)",
] as const;

/**
 * C-major numeral for a root letter, derived once from the core so motion
 * rules state the same numeral the test re-derives.
 */
const C_MAJOR_NUMERALS: ReadonlyMap<string, string> = new Map(
  diatonicTriads(parseNote("C"), "major").map((triad) => [
    triad.notes[0]!.letter,
    romanNumeral(triad.quality, triad.degree),
  ]),
);

function numeralOf(letter: string): string {
  const numeral = C_MAJOR_NUMERALS.get(letter);
  if (numeral === undefined) {
    throw new Error(`lesson56: ${letter} is not a C-major diatonic root`);
  }
  return numeral;
}

/**
 * A playable inversion spelling: rotate the core's root-position triad, then
 * lift any wrapped tone an octave so the stack engraves ascending. Pure
 * rotation would leave the root's octave below the tones it now follows (C4
 * above G4 would draw out of order), which is why the voicing needs the lift.
 */
function inversionVoicing(root: string, quality: TriadQuality, rotations: number): string[] {
  const voiced = chordInversion(buildTriad(parseNote(root), quality), rotations);
  for (let index = 1; index < voiced.length; index += 1) {
    const tone = voiced[index]!;
    const below = voiced[index - 1]!;
    if (midiNumber(tone) <= midiNumber(below)) {
      voiced[index] = { ...tone, octave: (tone.octave ?? 0) + 1 };
    }
  }
  return voiced.map(scientificName);
}

interface MotionEntry {
  pair: readonly [string, string];
  correctIndex: number;
  rule: string;
}

interface RootEntry {
  notes: readonly string[];
  options: readonly string[];
  correctIndex: number;
  rule: string;
}

/** Root-motion rounds: the site's own worked examples, roots in sequence. */
const MOTIONS: Readonly<Record<string, MotionEntry>> = {
  "l56-staff-motion-third": {
    pair: ["C4", "A3"],
    correctIndex: 0,
    rule: `The root motion between ${numeralOf("C")} and ${numeralOf("A")} (C to A) is down a third or up a sixth; root motion is the movement from one chord's root to another chord's root.`,
  },
  "l56-staff-motion-second": {
    pair: ["F4", "G4"],
    correctIndex: 1,
    rule: `The root motion between ${numeralOf("F")} and ${numeralOf("G")} (F to G) is up a second or down a seventh; root motion is the movement from one chord's root to another chord's root.`,
  },
  "l56-staff-motion-down-fourth": {
    pair: ["C4", "G3"],
    correctIndex: 3,
    rule: `The root motion between ${numeralOf("C")} and ${numeralOf("G")} (C to G) is down a fourth or up a fifth; root motion is the movement from one chord's root to another chord's root.`,
  },
  "l56-staff-circle-i-iv": {
    pair: ["C4", "F4"],
    correctIndex: 2,
    rule: `Both I→IV and ii→V are circle progressions; the root motion from ${numeralOf("C")} to ${numeralOf("F")} (C to F) is up a fourth or down a fifth.`,
  },
  "l56-staff-circle-ii-v": {
    pair: ["D4", "G4"],
    correctIndex: 2,
    rule: `Both I→IV and ii→V are circle progressions; the root motion from ${numeralOf("D")} to ${numeralOf("G")} (D to G) is up a fourth or down a fifth.`,
  },
};

/** Root-identification rounds: one stacked chord, root ≠ bass on the first. */
const ROOTS: Readonly<Record<string, RootEntry>> = {
  "l56-staff-root-i": {
    // The site's own example: "a I chord in first inversion" whose root "is
    // not the lowest note" — voiced from the core, lifted into ascending order.
    notes: inversionVoicing("C4", "major", 1),
    options: ["The root is E", "The root is G", "The root is C"],
    correctIndex: 2,
    rule: "Since the chord is inverted, the root is not the lowest note; the root of this C major triad is C.",
  },
  "l56-staff-root-v": {
    // Slide 12: the second chord is "a root position V", so root position it is.
    notes: buildTriad(parseNote("G4"), "major").map(scientificName),
    options: ["The root is D", "The root is G", "The root is B"],
    correctIndex: 1,
    rule: `The chord is in root position, so the lowest note is the root; the root of this G major triad is G. Root motion is the movement from one chord's root to another chord's root.`,
  },
};

const motionRound = (id: string): Round => {
  const entry = MOTIONS[id];
  if (entry === undefined) {
    throw new Error(`lesson56: unknown motion round ${id}`);
  }
  return {
    id,
    prompt: { kind: "staff", clef: "treble", notes: [...entry.pair], duration: "q" },
    answer: choices([...MOTION_OPTIONS], entry.correctIndex),
    rule: entry.rule,
  };
};

const rootRound = (id: string): Round => {
  const entry = ROOTS[id];
  if (entry === undefined) {
    throw new Error(`lesson56: unknown root round ${id}`);
  }
  return {
    id,
    prompt: {
      kind: "staff",
      clef: "treble",
      notes: [...entry.notes],
      duration: "q",
      simultaneous: true,
    },
    answer: choices([...entry.options], entry.correctIndex),
    rule: entry.rule,
  };
};

/** Rounds drawn per visit; the pool is larger so replays vary. */
const ROUND_COUNT = 12;

/** Kinds every draw must contain; `sampleStratifiedRounds` enforces it. */
const REQUIRED_KINDS = ["staff", "text"] as const;

export const lesson56Pool: readonly Round[] = [
  // --- staff prompts: root motion and root identification --------------------
  motionRound("l56-staff-motion-third"),
  motionRound("l56-staff-motion-second"),
  motionRound("l56-staff-motion-down-fourth"),
  motionRound("l56-staff-circle-i-iv"),
  motionRound("l56-staff-circle-ii-v"),
  rootRound("l56-staff-root-i"),
  rootRound("l56-staff-root-v"),

  // --- text prompts: the site's prose conclusions -----------------------------
  {
    id: "l56-text-root-motion",
    prompt: { kind: "text", text: "What is root motion?" },
    answer: choices(
      [
        "The movement from one chord's root to another chord's root",
        "The movement from the bass note to the melody",
        "The distance between two notes played at once",
        "The motion between two adjacent scale steps",
      ],
      0,
    ),
    rule: "Root motion is the movement from one chord's root to another chord's root.",
  },
  {
    id: "l56-text-circle-def",
    prompt: { kind: "text", text: "When does a circle progression occur?" },
    answer: choices(
      [
        "When root motion is up a second or down a seventh",
        "When root motion is up a third or down a sixth",
        "When root motion is up a fourth or down a fifth",
        "When root motion is down a fourth or up a fifth",
      ],
      2,
    ),
    rule: "A circle progression occurs when root motion is equal to up a fourth or down a fifth.",
  },
  {
    id: "l56-text-circle-pair-1",
    prompt: {
      kind: "text",
      text: "Which pair of progressions are both circle progressions?",
    },
    answer: choices(
      ["I → IV and ii → V", "I → vi and IV → V", "I → V and IV → iii", "ii → iii and vi → IV"],
      0,
    ),
    rule: "Both I→IV and ii→V are circle progressions.",
  },
  {
    id: "l56-text-circle-pair-2",
    prompt: {
      kind: "text",
      text: "Which other pair of progressions are circle progressions?",
    },
    answer: choices(
      ["iii → IV and IV → V", "iii → vi and IV → vii°", "ii → I and vi → V", "V → IV and vii° → vi"],
      1,
    ),
    rule: "iii→vi and IV→vii° are also circle progressions.",
  },
  {
    id: "l56-text-major-chain",
    prompt: {
      kind: "text",
      text: "In order, what are the major scale circle progressions starting at I?",
    },
    answer: choices(
      [
        "I → IV → vii° → iii → vi → ii → V → I",
        "I → V → IV → iii → vi → ii → vii° → I",
        "I → ii → iii → IV → V → vi → vii° → I",
        "I → IV → iii → vii° → vi → ii → V → I",
      ],
      0,
    ),
    rule: "The major scale circle progressions are: I→IV→vii°→iii→vi→ii→V→I.",
  },
  {
    id: "l56-text-minor-chain",
    prompt: {
      kind: "text",
      text: "In order, what are the minor scale circle progressions starting at i?",
    },
    answer: choices(
      [
        "i → iv → vii° → III → VI → ii° → v → i",
        "i → V → iv → III → VI → ii → V → i",
        "i → iv → VII → III → VI → ii° → V → i",
        "i → iv → VII → III → VI → iv → V → i",
      ],
      2,
    ),
    rule: "The minor scale circle progressions are: i→iv→VII→III→VI→ii°→V→i.",
  },
  {
    id: "l56-text-minor-iv",
    prompt: {
      kind: "text",
      text: "In the minor scale chain, what does iv progress to (and what is rejected)?",
    },
    answer: choices(["vii° — not VII", "VII — not vii°", "III — not II", "VI — not v"], 1),
    rule: "iv progresses to VII (not vii°).",
  },
  {
    id: "l56-text-minor-iio",
    prompt: {
      kind: "text",
      text: "In the minor scale chain, what does ii° progress to (and what is rejected)?",
    },
    answer: choices(["v — not V", "i — not VII", "V — not v", "iv — not III"], 2),
    rule: "ii° progresses to V (not v).",
  },
  {
    id: "l56-text-inverted-root",
    prompt: { kind: "text", text: "When a chord is inverted, where is its root?" },
    answer: choices(
      ["It is always the lowest note", "It disappears", "It is always the highest note", "It is not the lowest note"],
      3,
    ),
    rule: "Since the chord is inverted, the root is not the lowest note.",
  },
  {
    id: "l56-text-upsixth",
    prompt: {
      kind: "text",
      text: "The root motion from C to A is down a third; how else can the same root motion be classified?",
    },
    answer: choices(["Up a third", "Down a sixth", "Up a sixth", "Down a second"], 2),
    rule: "Due to interval inversion, the root motion could also be classified as up a sixth.",
  },
];

export const lesson56: LessonModule = {
  entry: requireLessonEntry(56),
  generateRounds: (rng) =>
    sampleStratifiedRounds(lesson56Pool, REQUIRED_KINDS, rng, ROUND_COUNT),
};

import {
  buildTriad,
  diatonicTriads,
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
 * Lesson 55 — Phrases and Cadences.
 *
 * Content source: musictheory.net lesson 55 (slide text pulled from the live
 * `lesson55.js`): "A *cadence* is a two-chord progression that occurs at the
 * end of a phrase." The lesson names four cadences with the site's own chart
 * labels (`labels`: HC, AC, PC, DC): HC = "any chord going to {V}"; AC = "{V}
 * or {vii°} going to {I} (or {i} if minor)"; PAC's "three requirements"
 * (V not vii°, both chords in root position, highest note of I = the tonic);
 * IAC "fails to meet these requirements"; PC = "{IV} (or {iv}) going to {I}";
 * DC = "{V} going to a chord other than {I}" and is "often used in place of
 * an authentic cadence"; "In addition to authentic and half cadences, two
 * other kinds exist."
 *
 * Staff prompts come in the two shapes the Round contract can express. Final-
 * chord rounds stack ONE triad (`simultaneous: true`) and the options carry
 * the frame ("The phrase ends on …"): V is a half-cadence ending and vi a
 * deceptive ending, and the pool never shows I because I alone cannot decide
 * between authentic and plagal — both end on I. Root-pair rounds show the two
 * chord roots in sequence (never stacked; one prompt holds one stack) with
 * the cadence pairs as options. Every prompt reads in C major (no key
 * signature, C-major numerals in the options), and each pair is judged by the
 * site's own rules — see the pattern oracle in the test.
 *
 * The pool is 6 `staff` + 14 `text` = 20, drawn stratified with one staff and
 * one text round guaranteed per 12-round draw.
 */
const choices = (options: string[], correctIndex: number): AnswerSpec => ({
  kind: "choices",
  options,
  correctIndex,
});

/** The two option sets a staff round may carry; both carry the question. */
const SINGLE_OPTIONS = [
  "The phrase ends on V — a half cadence",
  "The phrase ends on I — an authentic cadence",
  "The phrase ends on I — a plagal cadence",
  "The phrase ends on vi — a deceptive cadence",
] as const;

const MOTION_OPTIONS = [
  "V → I (authentic cadence)",
  "IV → I (plagal cadence)",
  "any chord → V (half cadence)",
  "V → a chord other than I (deceptive cadence)",
] as const;

/**
 * C-major numeral for a root letter, derived once from the core so every rule
 * states the same numeral the test re-derives. Throws for a non-diatonic
 * letter — a wiring bug, not a learner-facing condition.
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
    throw new Error(`lesson55: ${letter} is not a C-major diatonic root`);
  }
  return numeral;
}

interface FinalEntry {
  root: string;
  quality: TriadQuality;
  correctIndex: number;
  rule: string;
}

interface MotionEntry {
  pair: readonly [string, string];
  correctIndex: number;
  rule: string;
}

/** Final-chord rounds: one stacked triad; the options carry the frame. */
const FINALS: Readonly<Record<string, FinalEntry>> = {
  "l55-staff-hc-end": {
    root: "G4",
    quality: "major",
    correctIndex: 0,
    rule: `In C major this triad is ${numeralOf("G")}; if a phrase ends with any chord going to ${numeralOf("G")}, a half cadence (HC) occurs.`,
  },
  "l55-staff-dc-end": {
    root: "A4",
    quality: "minor",
    correctIndex: 3,
    rule: `In C major this triad is ${numeralOf("A")}; if a phrase ends with ${numeralOf("G")} going to a chord other than I (or i), a deceptive cadence (DC) occurs.`,
  },
};

/** Root-pair rounds: two chord roots in sequence, one cadence pair as answer. */
const MOTIONS: Readonly<Record<string, MotionEntry>> = {
  "l55-staff-ac": {
    pair: ["G4", "C4"],
    correctIndex: 0,
    rule: `In C major, G is ${numeralOf("G")} and C is ${numeralOf("C")}: an authentic cadence occurs whenever a phrase ends with ${numeralOf("G")} or vii° going to ${numeralOf("C")} (or i if minor).`,
  },
  "l55-staff-pc": {
    pair: ["F4", "C4"],
    correctIndex: 1,
    rule: `In C major, F is ${numeralOf("F")} and C is ${numeralOf("C")}: if a phrase ends with ${numeralOf("F")} (or iv) going to ${numeralOf("C")} (or i), a plagal cadence (PC) occurs.`,
  },
  "l55-staff-hc-any": {
    pair: ["D4", "G4"],
    correctIndex: 2,
    rule: `In C major, D is ${numeralOf("D")} and G is ${numeralOf("G")}: if a phrase ends with any chord going to ${numeralOf("G")}, a half cadence (HC) occurs.`,
  },
  "l55-staff-dc-vi": {
    pair: ["G4", "A4"],
    correctIndex: 3,
    rule: `In C major, G is ${numeralOf("G")} and A is ${numeralOf("A")}: if a phrase ends with ${numeralOf("G")} going to a chord other than I (or i), a deceptive cadence (DC) occurs.`,
  },
};

const finalRound = (id: string): Round => {
  const entry = FINALS[id];
  if (entry === undefined) {
    throw new Error(`lesson55: unknown final-chord round ${id}`);
  }
  const spelling = buildTriad(parseNote(entry.root), entry.quality).map(scientificName);
  return {
    id,
    prompt: { kind: "staff", clef: "treble", notes: spelling, duration: "q", simultaneous: true },
    answer: choices([...SINGLE_OPTIONS], entry.correctIndex),
    rule: entry.rule,
  };
};

const motionRound = (id: string): Round => {
  const entry = MOTIONS[id];
  if (entry === undefined) {
    throw new Error(`lesson55: unknown root-pair round ${id}`);
  }
  return {
    id,
    prompt: { kind: "staff", clef: "treble", notes: [...entry.pair], duration: "q" },
    answer: choices([...MOTION_OPTIONS], entry.correctIndex),
    rule: entry.rule,
  };
};

/** Rounds drawn per visit; the pool is larger so replays vary. */
const ROUND_COUNT = 12;

/** Kinds every draw must contain; `sampleStratifiedRounds` enforces it. */
const REQUIRED_KINDS = ["staff", "text"] as const;

export const lesson55Pool: readonly Round[] = [
  // --- staff prompts: final chords and root pairs -----------------------------
  finalRound("l55-staff-hc-end"),
  finalRound("l55-staff-dc-end"),
  motionRound("l55-staff-ac"),
  motionRound("l55-staff-pc"),
  motionRound("l55-staff-hc-any"),
  motionRound("l55-staff-dc-vi"),

  // --- text prompts: the site's prose conclusions -----------------------------
  {
    id: "l55-text-phrase",
    prompt: { kind: "text", text: "What is a phrase?" },
    answer: choices(
      [
        "A two-chord progression at the end of a song",
        "A series of notes that sound complete even when played apart from the main song",
        "The loudest passage of a movement",
        "A single measure of music",
      ],
      1,
    ),
    rule: "A phrase is a series of notes that sound complete even when played apart from the main song.",
  },
  {
    id: "l55-text-cadence",
    prompt: { kind: "text", text: "What is a cadence?" },
    answer: choices(
      [
        "A two-chord progression that occurs at the end of a phrase",
        "A series of notes that sound complete apart from the song",
        "The opening chords of a piece",
        "A single chord played at the end",
      ],
      0,
    ),
    rule: "A cadence is a two-chord progression that occurs at the end of a phrase.",
  },
  {
    id: "l55-text-hc",
    prompt: {
      kind: "text",
      text: "Which cadence occurs when a phrase ends with any chord going to V?",
    },
    answer: choices(
      ["Authentic cadence (AC)", "Half cadence (HC)", "Plagal cadence (PC)", "Deceptive cadence (DC)"],
      1,
    ),
    rule: "If a phrase ends with any chord going to V, a half cadence (HC) occurs.",
  },
  {
    id: "l55-text-incomplete",
    prompt: { kind: "text", text: "How do most people hear a half cadence?" },
    answer: choices(["Complete and final", "Incomplete", "Rushing forward", "Dissonant and harsh"], 1),
    rule: "Most people will hear a half cadence as sounding incomplete. Hence, composers usually follow them with a phrase ending in an authentic cadence (AC).",
  },
  {
    id: "l55-text-ac",
    prompt: {
      kind: "text",
      text: "Which cadence occurs when a phrase ends with V or vii° going to I?",
    },
    answer: choices(
      ["Authentic cadence (AC)", "Half cadence (HC)", "Plagal cadence (PC)", "Deceptive cadence (DC)"],
      0,
    ),
    rule: "An authentic cadence occurs whenever a phrase ends with V or vii° going to I (or i if minor).",
  },
  {
    id: "l55-text-pac-count",
    prompt: {
      kind: "text",
      text: "How many requirements must a perfect authentic cadence meet?",
    },
    answer: choices(["Two", "Three", "Four", "One"], 1),
    rule: "To be considered a perfect authentic cadence (PAC), the cadence must meet three requirements.",
  },
  {
    id: "l55-text-pac-first",
    prompt: {
      kind: "text",
      text: "What is the first requirement of a perfect authentic cadence?",
    },
    answer: choices(
      [
        "Both chords must be in root position",
        "V must be used rather than vii°",
        "The highest note of I must be the tonic",
        "The phrase must contain four chords",
      ],
      1,
    ),
    rule: "First, V must be used rather than vii°.",
  },
  {
    id: "l55-text-pac-second",
    prompt: { kind: "text", text: "What is the second requirement?" },
    answer: choices(
      [
        "Both chords must be in root position",
        "V must be used rather than vii°",
        "The highest note of I must be the tonic",
        "The cadence must end on V",
      ],
      0,
    ),
    rule: "Second, both chords must be in root position.",
  },
  {
    id: "l55-text-pac-third",
    prompt: { kind: "text", text: "What is the final requirement?" },
    answer: choices(
      [
        "The phrase must be in a major key",
        "Both chords must be in root position",
        "V must be used rather than vii°",
        "The highest note of the I chord must be the tonic of the scale",
      ],
      3,
    ),
    rule: "Finally, the highest note of the I (or i) chord must be the tonic of the scale.",
  },
  {
    id: "l55-text-iac",
    prompt: { kind: "text", text: "What is an imperfect authentic cadence?" },
    answer: choices(
      [
        "An authentic cadence that meets all three requirements",
        "A cadence that ends on V",
        "An authentic cadence that fails to meet the PAC requirements",
        "A cadence from IV to I",
      ],
      2,
    ),
    rule: "An imperfect authentic cadence (IAC) fails to meet these requirements.",
  },
  {
    id: "l55-text-two-kinds",
    prompt: {
      kind: "text",
      text: "In addition to authentic and half cadences, how many other kinds exist?",
    },
    answer: choices(
      ["One — plagal", "Three — plagal, deceptive, and interrupted", "None", "Two — plagal and deceptive"],
      3,
    ),
    rule: "In addition to authentic and half cadences, two other kinds exist.",
  },
  {
    id: "l55-text-pc",
    prompt: {
      kind: "text",
      text: "Which cadence occurs when a phrase ends with IV going to I?",
    },
    answer: choices(
      ["Authentic cadence (AC)", "Plagal cadence (PC)", "Half cadence (HC)", "Deceptive cadence (DC)"],
      1,
    ),
    rule: "If a phrase ends with IV (or iv) going to I (or i), a plagal cadence (PC) occurs.",
  },
  {
    id: "l55-text-dc",
    prompt: {
      kind: "text",
      text: "Which cadence occurs when a phrase ends with V going to a chord other than I?",
    },
    answer: choices(
      ["Authentic cadence (AC)", "Half cadence (HC)", "Plagal cadence (PC)", "Deceptive cadence (DC)"],
      3,
    ),
    rule: "If a phrase ends with V going to a chord other than I (or i), a deceptive cadence (DC) occurs.",
  },
  {
    id: "l55-text-dc-replace",
    prompt: {
      kind: "text",
      text: "What is often used in place of an authentic cadence?",
    },
    answer: choices(
      ["A half cadence", "A deceptive cadence", "A plagal cadence", "No cadence at all"],
      1,
    ),
    rule: "A deceptive cadence is often used in place of an authentic cadence.",
  },
];

export const lesson55: LessonModule = {
  entry: requireLessonEntry(55),
  generateRounds: (rng) =>
    sampleStratifiedRounds(lesson55Pool, REQUIRED_KINDS, rng, ROUND_COUNT),
};

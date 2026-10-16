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
 * Lesson 57 — Common Chord Progressions.
 *
 * Content source: musictheory.net lesson 57 (slide text pulled from the live
 * `lesson57.js`): "In a major key, the goal of any chord progression is the
 * {I} chord." The chart is built from "the strongest ways to get to this
 * chord": "An authentic cadence ({V} -> {I}) or ({vii°} -> {I}) is the
 * strongest way to approach a {I} chord"; then circle progressions — V from
 * ii, vii° from IV, IV from I, ii from vi, vi from iii, iii from vii° — and
 * "since {I} is the main chord of the scale, it can go to any other chord".
 * The terms slide assigns roles: "{V} and {vii°} are *dominants*", "{ii} and
 * {IV} … *predominants*". The worked example ends "{I}->{vi}->{IV}->{V}->{I}";
 * the minor chart's "one main difference" is "the strongest way to approach
 * {III} is not {vii°} … a circle progression from {VII}", and finally "the
 * charts do not have to be followed strictly … a composer is not banned from
 * using it."
 *
 * Staff rounds stack one C-major diatonic triad (`simultaneous: true`) and
 * the fixed four options carry the question: the goal, the two chart roles,
 * and "The submediant" — a scale-degree term the site's chart never assigns,
 * which keeps vi out of the pool. Degrees, spellings, numerals and the role
 * match are all re-derived by the test's pattern oracle.
 *
 * The pool is 5 `staff` + 14 `text` = 19, drawn stratified with one staff and
 * one text round guaranteed per 12-round draw.
 */
const choices = (options: string[], correctIndex: number): AnswerSpec => ({
  kind: "choices",
  options,
  correctIndex,
});

/** The four chart-role answers every staff round offers (site `labels`). */
const ROLE_OPTIONS = [
  "The goal of the progression",
  "A predominant",
  "A dominant",
  "The submediant",
] as const;

/**
 * C-major numeral for a root letter, derived once from the core so every rule
 * names the numeral the test re-derives with `romanNumeral`.
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
    throw new Error(`lesson57: ${letter} is not a C-major diatonic root`);
  }
  return numeral;
}

interface StaffEntry {
  root: string;
  quality: TriadQuality;
  correctIndex: number;
  rule: string;
}

/** The five chart chords: spellings from the core, roles from the site. */
const STAFF: Readonly<Record<string, StaffEntry>> = {
  "l57-staff-i": {
    root: "C4",
    quality: "major",
    correctIndex: 0,
    rule: `In a major key, the goal of any chord progression is the I chord; this triad is ${numeralOf("C")}.`,
  },
  "l57-staff-ii": {
    root: "D4",
    quality: "minor",
    correctIndex: 1,
    rule: `Since ${numeralOf("D")} and ${numeralOf("F")} come before ${numeralOf("G")} and vii°, they are usually labeled as predominants; this triad is ${numeralOf("D")}.`,
  },
  "l57-staff-iv": {
    root: "F4",
    quality: "major",
    correctIndex: 1,
    rule: `Since ii and ${numeralOf("F")} come before ${numeralOf("G")} and vii°, they are usually labeled as predominants; this triad is ${numeralOf("F")}.`,
  },
  "l57-staff-v": {
    root: "G4",
    quality: "major",
    correctIndex: 2,
    rule: `Since the ${numeralOf("G")} chord is built on the dominant, it is a dominant chord; this triad is ${numeralOf("G")}.`,
  },
  "l57-staff-viidim": {
    root: "B4",
    quality: "diminished",
    correctIndex: 2,
    rule: `Since vii° functions like ${numeralOf("G")} (by going to ${numeralOf("C")}), it can also be labeled as a dominant; this triad is vii°.`,
  },
};

const staffRound = (id: string): Round => {
  const entry = STAFF[id];
  if (entry === undefined) {
    throw new Error(`lesson57: unknown staff round ${id}`);
  }
  const spelling = buildTriad(parseNote(entry.root), entry.quality).map(scientificName);
  return {
    id,
    prompt: { kind: "staff", clef: "treble", notes: spelling, duration: "q", simultaneous: true },
    answer: choices([...ROLE_OPTIONS], entry.correctIndex),
    rule: entry.rule,
  };
};

/** Rounds drawn per visit; the pool is larger so replays vary. */
const ROUND_COUNT = 12;

/** Kinds every draw must contain; `sampleStratifiedRounds` enforces it. */
const REQUIRED_KINDS = ["staff", "text"] as const;

export const lesson57Pool: readonly Round[] = [
  // --- staff prompts: the five chart chords, judged by role -------------------
  staffRound("l57-staff-i"),
  staffRound("l57-staff-ii"),
  staffRound("l57-staff-iv"),
  staffRound("l57-staff-v"),
  staffRound("l57-staff-viidim"),

  // --- text prompts: the site's prose conclusions -----------------------------
  {
    id: "l57-text-goal",
    prompt: {
      kind: "text",
      text: "In a major key, what is the goal of any chord progression?",
    },
    answer: choices(["The V chord", "The I chord", "The IV chord", "The vi chord"], 1),
    rule: "In a major key, the goal of any chord progression is the I chord.",
  },
  {
    id: "l57-text-strongest-i",
    prompt: { kind: "text", text: "What is the strongest way to approach the I chord?" },
    answer: choices(
      [
        "A circle progression from IV",
        "A circle progression from ii",
        "An authentic cadence (V → I or vii° → I)",
        "A deceptive cadence",
      ],
      2,
    ),
    rule: "An authentic cadence (V → I) or (vii° → I) is the strongest way to approach the I chord.",
  },
  {
    id: "l57-text-strongest-v",
    prompt: { kind: "text", text: "What is the strongest way to approach V?" },
    answer: choices(
      ["A circle progression from IV", "A circle progression from ii", "A circle progression from vi", "An authentic cadence"],
      1,
    ),
    rule: "The strongest way to approach V is a circle progression from ii.",
  },
  {
    id: "l57-text-strongest-vii",
    prompt: { kind: "text", text: "What is the strongest way to approach vii°?" },
    answer: choices(
      ["A circle progression from IV", "A circle progression from ii", "A circle progression from I", "An authentic cadence"],
      0,
    ),
    rule: "The strongest way to approach vii° is a circle progression from IV.",
  },
  {
    id: "l57-text-strongest-iv",
    prompt: { kind: "text", text: "What is the strongest way to approach IV?" },
    answer: choices(
      ["A circle progression from ii", "A circle progression from I", "A circle progression from vi", "A circle progression from V"],
      1,
    ),
    rule: "The strongest way to approach IV is a circle progression from I; since I is already on the chart, it is not repeated.",
  },
  {
    id: "l57-text-to-ii",
    prompt: { kind: "text", text: "Which circle progression leads to ii?" },
    answer: choices(
      [
        "From vi",
        "From iii",
        "From V",
        "From I",
      ],
      0,
    ),
    rule: "A circle progression from vi leads us to ii.",
  },
  {
    id: "l57-text-to-vi",
    prompt: { kind: "text", text: "Which circle progression leads to vi?" },
    answer: choices(
      [
        "From iii",
        "From vii°",
        "From ii",
        "From IV",
      ],
      0,
    ),
    rule: "A circle progression from iii leads us to vi.",
  },
  {
    id: "l57-text-to-iii",
    prompt: { kind: "text", text: "What is the strongest way to get to iii?" },
    answer: choices(
      ["A circle progression from vi", "A circle progression from vii°", "A circle progression from IV", "An authentic cadence"],
      1,
    ),
    rule: "The strongest way to get to iii is a circle progression from vii°, which is already on the chart.",
  },
  {
    id: "l57-text-i-anywhere",
    prompt: {
      kind: "text",
      text: "Since I is the main chord of the scale, where can it go?",
    },
    answer: choices(["Only to vi", "Only to IV and V", "To any other chord", "Only to ii"], 2),
    rule: "Since I is the main chord of the scale, it can go to any other chord.",
  },
  {
    id: "l57-text-dominants",
    prompt: { kind: "text", text: "Which chords are labeled as dominants?" },
    answer: choices(["ii and IV", "V and vii°", "I and vi", "IV and vii°"], 1),
    rule: "V and vii° are dominants.",
  },
  {
    id: "l57-text-predominants",
    prompt: { kind: "text", text: "Which chords are usually labeled as predominants?" },
    answer: choices(["V and vii°", "ii and IV", "I and vi", "iii and VI"], 1),
    rule: "Since ii and IV come before V and vii°, they are usually labeled as predominants.",
  },
  {
    id: "l57-text-example",
    prompt: {
      kind: "text",
      text: "What is the finished chord progression from the lesson's example?",
    },
    answer: choices(
      ["I → vi → IV → V → I", "I → ii → IV → V → I", "I → vi → IV → vii° → I", "I → IV → vi → V → I"],
      0,
    ),
    rule: "Our finished chord progression is: I→vi→IV→V→I.",
  },
  {
    id: "l57-text-minor-iii",
    prompt: {
      kind: "text",
      text: "In the minor chart, what is the strongest way to approach III?",
    },
    answer: choices(
      [
        "A circle progression from vii° — not VII",
        "An authentic cadence",
        "A circle progression from VII — not vii°",
        "A circle progression from iv",
      ],
      2,
    ),
    rule: "The strongest way to approach III is not vii°. Instead, it is a circle progression from VII.",
  },
  {
    id: "l57-text-not-strict",
    prompt: {
      kind: "text",
      text: "Must the chord progression charts be followed strictly?",
    },
    answer: choices(
      [
        "Yes — only charted progressions are allowed",
        "No — if a progression is not presented, a composer is not banned from using it",
        "Yes, but only in major keys",
        "No — the charts are only suggestions for beginners",
      ],
      1,
    ),
    rule: "It should be noted that the charts do not have to be followed strictly. If a progression is not presented, a composer is not banned from using it.",
  },
];

export const lesson57: LessonModule = {
  entry: requireLessonEntry(57),
  generateRounds: (rng) =>
    sampleStratifiedRounds(lesson57Pool, REQUIRED_KINDS, rng, ROUND_COUNT),
};

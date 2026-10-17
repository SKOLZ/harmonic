import { afterEach, describe, expect, it } from "vitest";
import { render } from "solid-js/web";
import { validateRound } from "../lib/rounds/validate";
import { assertNoAnswerLeak } from "../lib/rounds/noAnswerLeak";
import type { PromptSpec, Round } from "../lib/rounds/types";
import StaffPrompt from "../components/prompts/StaffPrompt";
import { buildTriad, letterIndex, parseNote, scientificName } from "../lib/theory";
import { createRng } from "./rng";
import { lesson55, lesson55Pool } from "./lesson55";

const GENERIC_RULE = /^(correct|incorrect|wrong|that'?s right)/i;

/** Every draw, for many seeds, must carry both structurally required kinds. */
const GUARANTEED_SEEDS = Array.from({ length: 100 }, (_, index) => index + 1);

/**
 * The two option sets a staff round may carry. The site's chart labels
 * (`labels`: HC, AC, PC, DC) pair each cadence with the chords that end it, so
 * the options carry the question a staff prompt cannot.
 */
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

/** The two single-chord (final-chord) staff rounds and their judged answers. */
const SINGLE_ROUNDS: Readonly<
  Record<string, { root: string; quality: "major" | "minor"; answer: string }>
> = {
  "l55-staff-hc-end": { root: "G4", quality: "major", answer: SINGLE_OPTIONS[0] },
  "l55-staff-dc-end": { root: "A4", quality: "minor", answer: SINGLE_OPTIONS[3] },
};

/** The four two-root staff rounds; pairs are (first chord root, second root). */
const MOTION_ROUNDS: Readonly<
  Record<string, { pair: readonly [string, string]; answer: string }>
> = {
  "l55-staff-ac": { pair: ["G4", "C4"], answer: MOTION_OPTIONS[0] },
  "l55-staff-pc": { pair: ["F4", "C4"], answer: MOTION_OPTIONS[1] },
  "l55-staff-hc-any": { pair: ["D4", "G4"], answer: MOTION_OPTIONS[2] },
  "l55-staff-dc-vi": { pair: ["G4", "A4"], answer: MOTION_OPTIONS[3] },
};

/** The fourteen text answers, each the site's own sentence (US slide text). */
const SITE_TEXT: Readonly<Record<string, string>> = {
  "l55-text-phrase": "A series of notes that sound complete even when played apart from the main song",
  "l55-text-cadence": "A two-chord progression that occurs at the end of a phrase",
  "l55-text-hc": "Half cadence (HC)",
  "l55-text-incomplete": "Incomplete",
  "l55-text-ac": "Authentic cadence (AC)",
  "l55-text-pac-count": "Three",
  "l55-text-pac-first": "V must be used rather than vii°",
  "l55-text-pac-second": "Both chords must be in root position",
  "l55-text-pac-third": "The highest note of the I chord must be the tonic of the scale",
  "l55-text-iac": "An authentic cadence that fails to meet the PAC requirements",
  "l55-text-two-kinds": "Two — plagal and deceptive",
  "l55-text-pc": "Plagal cadence (PC)",
  "l55-text-dc": "Deceptive cadence (DC)",
  "l55-text-dc-replace": "A deceptive cadence",
};

/** Degree of a root letter within C major (letters C–B occupy degrees 1–7). */
function degreeOf(letter: string): number {
  return (((letterIndex(letter as never) - letterIndex("C")) % 7) + 7) % 7 + 1;
}

/**
 * Site rules read from a final chord alone (the chart's endings). Two cadences
 * end on I (authentic and plagal), so an I-ending round would match two
 * patterns and fail the uniqueness assertion — by design, such rounds are not
 * part of the pool.
 */
const ENDING_PATTERNS: ReadonlyArray<{ name: string; matches: (ending: number) => boolean }> = [
  { name: "half", matches: (ending) => ending === 5 },
  { name: "authentic", matches: (ending) => ending === 1 },
  { name: "plagal", matches: (ending) => ending === 1 },
  { name: "deceptive", matches: (ending) => ending !== 1 && ending !== 5 },
];

/** Site rules read from both roots: HC any→V; AC V/vii°→I; PC IV→I; DC V→not-I. */
const MOTION_PATTERNS: ReadonlyArray<{
  name: string;
  matches: (from: number, to: number) => boolean;
}> = [
  { name: "authentic", matches: (from, to) => (from === 5 || from === 7) && to === 1 },
  { name: "plagal", matches: (from, to) => from === 4 && to === 1 },
  { name: "half", matches: (_from, to) => to === 5 },
  { name: "deceptive", matches: (from, to) => from === 5 && to !== 1 },
];

const ENDING_OPTION: Readonly<Record<string, string>> = {
  half: SINGLE_OPTIONS[0],
  authentic: SINGLE_OPTIONS[1],
  plagal: SINGLE_OPTIONS[2],
  deceptive: SINGLE_OPTIONS[3],
};

const MOTION_OPTION: Readonly<Record<string, string>> = {
  authentic: MOTION_OPTIONS[0],
  plagal: MOTION_OPTIONS[1],
  half: MOTION_OPTIONS[2],
  deceptive: MOTION_OPTIONS[3],
};

const cleanups: Array<() => void> = [];

afterEach(() => {
  while (cleanups.length > 0) cleanups.pop()?.();
  document.body.replaceChildren();
});

function isStaffRound(
  round: Round,
): round is Round & { prompt: Extract<PromptSpec, { kind: "staff" }> } {
  return round.prompt.kind === "staff";
}

function staffRounds(): Array<{ id: string; prompt: Extract<PromptSpec, { kind: "staff" }> }> {
  return lesson55Pool.filter(isStaffRound).map((round) => ({ id: round.id, prompt: round.prompt }));
}

function textRounds(): Array<{ id: string; prompt: Extract<PromptSpec, { kind: "text" }> }> {
  return lesson55Pool
    .filter((round): round is Round & { prompt: Extract<PromptSpec, { kind: "text" }> } =>
      round.prompt.kind === "text",
    )
    .map((round) => ({ id: round.id, prompt: round.prompt }));
}

function roundById(id: string): Round {
  const found = lesson55Pool.find((round) => round.id === id);
  expect(found, `round ${id} is missing from the pool`).toBeDefined();
  return found!;
}

function answerOf(id: string): string {
  const answer = roundById(id).answer;
  expect(answer.kind).toBe("choices");
  const choices = answer as Extract<Round["answer"], { kind: "choices" }>;
  return choices.options[choices.correctIndex]!;
}

describe("lesson 55 question pool", () => {
  it("holds 20 rounds: 6 staff, 14 text, all ids unique", () => {
    expect(lesson55Pool).toHaveLength(20);
    expect(staffRounds()).toHaveLength(6);
    expect(textRounds()).toHaveLength(14);
    const ids = lesson55Pool.map((round) => round.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(lesson55.entry.id).toBe(55);
  });

  it("validates every pool round", () => {
    for (const round of lesson55Pool) {
      expect(() => validateRound(round)).not.toThrow();
    }
  });

  it("draws at least 12 rounds and every drawn round passes validateRound", () => {
    const rounds = lesson55.generateRounds(createRng(1234));
    expect(rounds.length).toBeGreaterThanOrEqual(12);
    for (const round of rounds) {
      expect(() => validateRound(round)).not.toThrow();
    }
    const ids = rounds.map((round) => round.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("produces identical rounds for the same seed", () => {
    expect(lesson55.generateRounds(createRng(42))).toEqual(
      lesson55.generateRounds(createRng(42)),
    );
  });

  it("produces different rounds for two different seeds", () => {
    const first = lesson55.generateRounds(createRng(1));
    const second = lesson55.generateRounds(createRng(2));
    expect(JSON.stringify(second)).not.toBe(JSON.stringify(first));
  });

  it("draws at least one staff and one text round for every seed tried", () => {
    for (const seed of GUARANTEED_SEEDS) {
      const kinds = new Set(lesson55.generateRounds(createRng(seed)).map((r) => r.prompt.kind));
      expect(kinds.has("staff"), `seed ${seed} drew no staff round`).toBe(true);
      expect(kinds.has("text"), `seed ${seed} drew no text round`).toBe(true);
    }
  });

  it("spells each final chord as the core builds it and judges it by the chart's endings", () => {
    for (const [id, expected] of Object.entries(SINGLE_ROUNDS)) {
      const round = roundById(id);
      expect(round.prompt.kind, id).toBe("staff");
      const prompt = round.prompt as Extract<PromptSpec, { kind: "staff" }>;
      expect(prompt.simultaneous, `${id} final chords stack as one chord`).toBe(true);
      expect(prompt.notes, `${id} spelling`).toEqual(
        buildTriad(parseNote(expected.root), expected.quality).map(scientificName),
      );
      // The chart's cadence is read from the final chord's C-major degree.
      const ending = degreeOf(parseNote(expected.root).letter);
      const fitting = ENDING_PATTERNS.filter((pattern) => pattern.matches(ending));
      expect(fitting, `${id} ending degree ${ending} must match one chart ending`).toHaveLength(1);
      const answer = round.answer as Extract<Round["answer"], { kind: "choices" }>;
      expect([...answer.options], `${id} options`).toEqual([...SINGLE_OPTIONS]);
      expect(answer.options[answer.correctIndex], `${id} answer`).toBe(
        ENDING_OPTION[fitting[0]!.name],
      );
      expect(answer.options[answer.correctIndex], `${id} table answer`).toBe(expected.answer);
    }
  });

  it("judges each two-root pair against exactly one cadence rule", () => {
    for (const [id, expected] of Object.entries(MOTION_ROUNDS)) {
      const round = roundById(id);
      expect(round.prompt.kind, id).toBe("staff");
      const prompt = round.prompt as Extract<PromptSpec, { kind: "staff" }>;
      // Two chord roots in sequence: melodic, never one stacked chord.
      expect(prompt.simultaneous, `${id} must not be simultaneous`).toBeFalsy();
      expect(prompt.notes, `${id} pair`).toEqual([...expected.pair]);
      const from = degreeOf(parseNote(expected.pair[0]).letter);
      const to = degreeOf(parseNote(expected.pair[1]).letter);
      const fitting = MOTION_PATTERNS.filter((pattern) => pattern.matches(from, to));
      expect(fitting, `${id} (${from}→${to}) must match one cadence rule`).toHaveLength(1);
      const answer = round.answer as Extract<Round["answer"], { kind: "choices" }>;
      expect([...answer.options], `${id} options`).toEqual([...MOTION_OPTIONS]);
      expect(answer.options[answer.correctIndex], `${id} answer`).toBe(
        MOTION_OPTION[fitting[0]!.name],
      );
      expect(answer.options[answer.correctIndex], `${id} table answer`).toBe(expected.answer);
    }
  });

  it("engraves finals as one stacked chord and root pairs as sequential notes", () => {
    for (const { id, prompt } of staffRounds()) {
      const host = document.createElement("div");
      document.body.appendChild(host);
      const dispose = render(() => StaffPrompt({ prompt }), host);
      cleanups.push(() => {
        dispose();
        host.remove();
      });
      expect(host.querySelector("svg"), `staff prompt ${id} did not engrave`).not.toBeNull();
      const staveNotes = [...host.querySelectorAll("g")].filter(
        (group) => group.getAttribute("class") === "vf-stavenote",
      );
      const expected = prompt.simultaneous ? 1 : prompt.notes.length;
      expect(staveNotes, `staff round ${id}`).toHaveLength(expected);
    }
  });

  it("pins the site's prose conclusions in the text rounds", () => {
    for (const [id, expected] of Object.entries(SITE_TEXT)) {
      expect(answerOf(id), id).toBe(expected);
    }
    expect(textRounds()).toHaveLength(Object.keys(SITE_TEXT).length);
  });

  it("states the site's phrase-and-cadence facts in every rule", () => {
    for (const round of lesson55Pool) {
      expect(round.rule, round.id).not.toMatch(GENERIC_RULE);
    }
    const rules = lesson55Pool.map((round) => round.rule).join(" \n ");
    expect(rules).toMatch(/series of notes that sound complete/);
    expect(rules).toMatch(/two-chord progression that occurs at the end of a phrase/);
    expect(rules).toMatch(/any chord going to V/);
    expect(rules).toMatch(/sounding incomplete/);
    expect(rules).toMatch(/V or vii° going to I/);
    expect(rules).toMatch(/three requirements/);
    expect(rules).toMatch(/V must be used rather than vii°/);
    expect(rules).toMatch(/both chords must be in root position/);
    expect(rules).toMatch(/highest note of the I \(or i\) chord must be the tonic/);
    expect(rules).toMatch(/fails to meet these requirements/);
    expect(rules).toMatch(/two other kinds exist/);
    expect(rules).toMatch(/IV \(or iv\) going to I/);
    expect(rules).toMatch(/chord other than I \(or i\)/);
    expect(rules).toMatch(/used in place of an authentic cadence/);
  });
});

describe("lesson 55 companion illustrations (T5e Progressions/Neapolitan pass)", () => {
  // Zero yield: cadences are defined and classified by roman-numeral BEHAVIOR
  // ("any chord going to V", "V or vii° going to I", "IV going to I"), never
  // by concrete named pitches. Three definition rounds ask what a phrase, a
  // cadence, and an imperfect authentic cadence are. Six cadence-class rounds
  // ask which cadence a described roman-numeral motion IS — the subject is the
  // motion class, drawn for no particular key. Four PAC rounds count and list
  // the perfect-authentic requirements in prose, and the vocabulary round asks
  // how many other kinds exist. No round names a pitch to engrave.
  const DEFINITION = ["l55-text-phrase", "l55-text-cadence", "l55-text-iac"];
  const CADENCE_CLASS = [
    "l55-text-hc",
    "l55-text-incomplete",
    "l55-text-ac",
    "l55-text-pc",
    "l55-text-dc",
    "l55-text-dc-replace",
  ];
  const PAC_PROCEDURE = [
    "l55-text-pac-count",
    "l55-text-pac-first",
    "l55-text-pac-second",
    "l55-text-pac-third",
  ];
  const VOCABULARY = ["l55-text-two-kinds"];

  it("accounts for every text round as a classified rejection", () => {
    const textIds = lesson55Pool
      .filter((round) => round.prompt.kind === "text")
      .map((round) => round.id)
      .sort();
    expect(textIds).toHaveLength(14);
    expect(textIds).toEqual(
      [...DEFINITION, ...CADENCE_CLASS, ...PAC_PROCEDURE, ...VOCABULARY].sort(),
    );
  });

  it("keeps every text round text-only: no round names a concrete pitch to draw", () => {
    expect(
      lesson55Pool.filter((round) => round.illustration !== undefined),
    ).toEqual([]);
  });

  it("passes the shared no-leak assertion for every pool round", () => {
    for (const round of lesson55Pool) {
      expect(() => assertNoAnswerLeak(round), round.id).not.toThrow();
    }
  });
});

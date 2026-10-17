import { afterEach, describe, expect, it } from "vitest";
import { render } from "solid-js/web";
import { validateRound } from "../lib/rounds/validate";
import { assertNoAnswerLeak } from "../lib/rounds/noAnswerLeak";
import type { PromptSpec, Round } from "../lib/rounds/types";
import StaffPrompt from "../components/prompts/StaffPrompt";
import {
  buildTriad,
  diatonicTriads,
  letterIndex,
  parseNote,
  romanNumeral,
  scientificName,
  type TriadQuality,
} from "../lib/theory";
import { createRng } from "./rng";
import { lesson57, lesson57Pool } from "./lesson57";

const GENERIC_RULE = /^(correct|incorrect|wrong|that'?s right)/i;

/** Every draw, for many seeds, must carry both structurally required kinds. */
const GUARANTEED_SEEDS = Array.from({ length: 100 }, (_, index) => index + 1);

/**
 * The four chart-role answers every staff round offers. The site's own
 * `labels` are "Predominants" and "Dominants"; "The submediant" is a
 * scale-degree term that is never a role on the site's chart, so it stays a
 * distractor (vi is never shown).
 */
const ROLE_OPTIONS = [
  "The goal of the progression",
  "A predominant",
  "A dominant",
  "The submediant",
] as const;

/**
 * The five chart-role staff rounds: a C-major diatonic triad shown stacked,
 * judged by the role the site assigns its degree. Membership and quality come
 * from the core, never from this table.
 */
const STAFF_ROUNDS: Readonly<
  Record<string, { root: string; quality: TriadQuality; answer: string }>
> = {
  "l57-staff-i": { root: "C4", quality: "major", answer: ROLE_OPTIONS[0] },
  "l57-staff-ii": { root: "D4", quality: "minor", answer: ROLE_OPTIONS[1] },
  "l57-staff-iv": { root: "F4", quality: "major", answer: ROLE_OPTIONS[1] },
  "l57-staff-v": { root: "G4", quality: "major", answer: ROLE_OPTIONS[2] },
  "l57-staff-viidim": { root: "B4", quality: "diminished", answer: ROLE_OPTIONS[2] },
};

/**
 * The site's chart roles by degree: I is the goal; ii and IV are
 * predominants; V and vii° are dominants; vi (the submediant) appears on no
 * chart arrow and is never offered a round.
 */
const ROLE_PATTERNS: ReadonlyArray<{ name: string; matches: (degree: number) => boolean }> = [
  { name: "goal", matches: (degree) => degree === 1 },
  { name: "predominant", matches: (degree) => degree === 2 || degree === 4 },
  { name: "dominant", matches: (degree) => degree === 5 || degree === 7 },
  { name: "submediant", matches: (degree) => degree === 6 },
];

const ROLE_OPTION: Readonly<Record<string, string>> = {
  goal: ROLE_OPTIONS[0],
  predominant: ROLE_OPTIONS[1],
  dominant: ROLE_OPTIONS[2],
  submediant: ROLE_OPTIONS[3],
};

/** The fourteen text answers, each the site's own sentence (US slide text). */
const SITE_TEXT: Readonly<Record<string, string>> = {
  "l57-text-goal": "The I chord",
  "l57-text-strongest-i": "An authentic cadence (V → I or vii° → I)",
  "l57-text-strongest-v": "A circle progression from ii",
  "l57-text-strongest-vii": "A circle progression from IV",
  "l57-text-strongest-iv": "A circle progression from I",
  "l57-text-to-ii": "From vi",
  "l57-text-to-vi": "From iii",
  "l57-text-to-iii": "A circle progression from vii°",
  "l57-text-i-anywhere": "To any other chord",
  "l57-text-dominants": "V and vii°",
  "l57-text-predominants": "ii and IV",
  "l57-text-example": "I → vi → IV → V → I",
  "l57-text-minor-iii": "A circle progression from VII — not vii°",
  "l57-text-not-strict": "No — if a progression is not presented, a composer is not banned from using it",
};

/** Degree of a root letter within C major (letters C–B occupy degrees 1–7). */
function degreeOf(letter: string): number {
  return (((letterIndex(letter as never) - letterIndex("C")) % 7) + 7) % 7 + 1;
}

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
  return lesson57Pool.filter(isStaffRound).map((round) => ({ id: round.id, prompt: round.prompt }));
}

function textRounds(): Array<{ id: string; prompt: Extract<PromptSpec, { kind: "text" }> }> {
  return lesson57Pool
    .filter((round): round is Round & { prompt: Extract<PromptSpec, { kind: "text" }> } =>
      round.prompt.kind === "text",
    )
    .map((round) => ({ id: round.id, prompt: round.prompt }));
}

function roundById(id: string): Round {
  const found = lesson57Pool.find((round) => round.id === id);
  expect(found, `round ${id} is missing from the pool`).toBeDefined();
  return found!;
}

function answerOf(id: string): string {
  const answer = roundById(id).answer;
  expect(answer.kind).toBe("choices");
  const choices = answer as Extract<Round["answer"], { kind: "choices" }>;
  return choices.options[choices.correctIndex]!;
}

describe("lesson 57 question pool", () => {
  it("holds 19 rounds: 5 staff, 14 text, all ids unique", () => {
    expect(lesson57Pool).toHaveLength(19);
    expect(staffRounds()).toHaveLength(5);
    expect(textRounds()).toHaveLength(14);
    const ids = lesson57Pool.map((round) => round.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(lesson57.entry.id).toBe(57);
  });

  it("validates every pool round", () => {
    for (const round of lesson57Pool) {
      expect(() => validateRound(round)).not.toThrow();
    }
  });

  it("draws at least 12 rounds and every drawn round passes validateRound", () => {
    const rounds = lesson57.generateRounds(createRng(1234));
    expect(rounds.length).toBeGreaterThanOrEqual(12);
    for (const round of rounds) {
      expect(() => validateRound(round)).not.toThrow();
    }
    const ids = rounds.map((round) => round.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("produces identical rounds for the same seed", () => {
    expect(lesson57.generateRounds(createRng(42))).toEqual(
      lesson57.generateRounds(createRng(42)),
    );
  });

  it("produces different rounds for two different seeds", () => {
    const first = lesson57.generateRounds(createRng(1));
    const second = lesson57.generateRounds(createRng(2));
    expect(JSON.stringify(second)).not.toBe(JSON.stringify(first));
  });

  it("draws at least one staff and one text round for every seed tried", () => {
    for (const seed of GUARANTEED_SEEDS) {
      const kinds = new Set(lesson57.generateRounds(createRng(seed)).map((r) => r.prompt.kind));
      expect(kinds.has("staff"), `seed ${seed} drew no staff round`).toBe(true);
      expect(kinds.has("text"), `seed ${seed} drew no text round`).toBe(true);
    }
  });

  it("spells each chart chord as the core builds it and assigns exactly one role", () => {
    for (const [id, expected] of Object.entries(STAFF_ROUNDS)) {
      const round = roundById(id);
      expect(round.prompt.kind, id).toBe("staff");
      const prompt = round.prompt as Extract<PromptSpec, { kind: "staff" }>;
      expect(prompt.simultaneous, `${id} chords stack as one chord`).toBe(true);
      expect(prompt.notes, `${id} spelling`).toEqual(
        buildTriad(parseNote(expected.root), expected.quality).map(scientificName),
      );
      const degree = degreeOf(parseNote(expected.root).letter);
      const fitting = ROLE_PATTERNS.filter((pattern) => pattern.matches(degree));
      expect(fitting, `${id} degree ${degree} must match exactly one chart role`).toHaveLength(1);
      const answer = round.answer as Extract<Round["answer"], { kind: "choices" }>;
      expect([...answer.options], `${id} options`).toEqual([...ROLE_OPTIONS]);
      expect(answer.options[answer.correctIndex], `${id} answer`).toBe(ROLE_OPTION[fitting[0]!.name]);
      expect(answer.options[answer.correctIndex], `${id} table answer`).toBe(expected.answer);
      // The rule names the numeral the core computes for this chord.
      const numeral = romanNumeral(expected.quality, degree);
      expect(round.rule, `${id} numeral`).toContain(numeral);
    }
  });

  it("agrees with diatonicTriads on every staff chord's degree", () => {
    const triads = diatonicTriads(parseNote("C"), "major");
    for (const { id, prompt } of staffRounds()) {
      const letters = prompt.notes.map((name) => parseNote(name).letter);
      const matching = triads.filter(
        (triad) => triad.notes.map((note) => note.letter).join("") === letters.join(""),
      );
      expect(matching, `${id} letters must match one C-major triad in order`).toHaveLength(1);
      expect(matching[0]!.degree, `${id} degree`).toBe(degreeOf(letters[0]!));
    }
  });

  it("engraves every staff chord as one stacked chord", () => {
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
      expect(staveNotes, `staff round ${id}`).toHaveLength(1);
    }
  });

  it("pins the site's prose conclusions in the text rounds", () => {
    for (const [id, expected] of Object.entries(SITE_TEXT)) {
      expect(answerOf(id), id).toBe(expected);
    }
    expect(textRounds()).toHaveLength(Object.keys(SITE_TEXT).length);
  });

  it("states the site's common-progression facts in every rule", () => {
    for (const round of lesson57Pool) {
      expect(round.rule, round.id).not.toMatch(GENERIC_RULE);
    }
    const rules = lesson57Pool.map((round) => round.rule).join(" \n ");
    expect(rules).toMatch(/goal of any chord progression is the I chord/);
    expect(rules).toMatch(/strongest way to approach/);
    expect(rules).toMatch(/circle progression from ii/);
    expect(rules).toMatch(/circle progression from IV/);
    expect(rules).toMatch(/circle progression from I/);
    expect(rules).toMatch(/leads us to ii/);
    expect(rules).toMatch(/leads us to vi/);
    expect(rules).toMatch(/get to iii is a circle progression from vii°/);
    expect(rules).toMatch(/go to any other chord/);
    expect(rules).toMatch(/V and vii° are dominants/);
    expect(rules).toMatch(/labeled as predominants/);
    expect(rules).toMatch(/I→vi→IV→V→I/);
    expect(rules).toMatch(/circle progression from VII/);
    expect(rules).toMatch(/do not have to be followed strictly/);
    expect(rules).toMatch(/not banned from using it/);
  });
});

describe("lesson 57 companion illustrations (T5e Progressions/Neapolitan pass)", () => {
  // Zero yield. Twelve rounds are numeral-chart questions: the goal of a
  // progression, the strongest approach to a given roman-numeral chord, which
  // circle progression leads to ii/vi, which chords are dominants or
  // predominants, and the minor chart's approach to III — every subject is a
  // roman-numeral CLASS, never a concrete pitch. The example round is
  // self-revealing: it asks for the finished progression from the lesson's
  // earlier example, so engraving that progression would BE the answer. The
  // final round asks whether the charts are strict rules — pure prose.
  const NUMERAL_CHART = [
    "l57-text-goal",
    "l57-text-strongest-i",
    "l57-text-strongest-v",
    "l57-text-strongest-vii",
    "l57-text-strongest-iv",
    "l57-text-to-ii",
    "l57-text-to-vi",
    "l57-text-to-iii",
    "l57-text-i-anywhere",
    "l57-text-dominants",
    "l57-text-predominants",
    "l57-text-minor-iii",
  ];
  const SELF_REVEALING = ["l57-text-example"];
  const PROSE = ["l57-text-not-strict"];

  it("accounts for every text round as a classified rejection", () => {
    const textIds = lesson57Pool
      .filter((round) => round.prompt.kind === "text")
      .map((round) => round.id)
      .sort();
    expect(textIds).toHaveLength(14);
    expect(textIds).toEqual([...NUMERAL_CHART, ...SELF_REVEALING, ...PROSE].sort());
  });

  it("keeps every text round text-only: no round names a concrete pitch to draw", () => {
    expect(
      lesson57Pool.filter((round) => round.illustration !== undefined),
    ).toEqual([]);
  });

  it("keeps the example round text-only: the engraving would be the answer", () => {
    expect(roundById("l57-text-example").prompt.kind).toBe("text");
    expect(roundById("l57-text-example").illustration).toBeUndefined();
  });

  it("passes the shared no-leak assertion for every pool round", () => {
    for (const round of lesson57Pool) {
      expect(() => assertNoAnswerLeak(round), round.id).not.toThrow();
    }
  });
});

import { afterEach, describe, expect, it } from "vitest";
import { render } from "solid-js/web";
import { validateRound } from "../lib/rounds/validate";
import { assertNoAnswerLeak } from "../lib/rounds/noAnswerLeak";
import type { PromptSpec, Round } from "../lib/rounds/types";
import StaffPrompt from "../components/prompts/StaffPrompt";
import { createRng } from "./rng";
import { lesson23, lesson23Pool } from "./lesson23";

const GENERIC_RULE = /^(correct|incorrect|wrong|that'?s right)/i;
// Every degree name the lesson teaches, word-bounded so "supertonic" does not
// silently satisfy a "tonic" check.
const DEGREE_NAMES = [
  "tonic",
  "supertonic",
  "mediant",
  "subdominant",
  "dominant",
  "submediant",
  "leading tone",
  "subtonic",
];

function staffPrompts(): Extract<PromptSpec, { kind: "staff" }>[] {
  return lesson23Pool
    .map((round) => round.prompt)
    .filter((prompt): prompt is Extract<PromptSpec, { kind: "staff" }> => prompt.kind === "staff");
}

function allRules(): string[] {
  return lesson23Pool.map((round) => round.rule);
}

function roundById(id: string): Round {
  const found = lesson23Pool.find((round) => round.id === id);
  expect(found, `round ${id} is missing from the pool`).toBeDefined();
  return found!;
}

function notesOf(id: string): string[] {
  const prompt = roundById(id).prompt;
  expect(prompt.kind).toBe("staff");
  return (prompt as Extract<PromptSpec, { kind: "staff" }>).notes;
}

/** The option the pool marks correct, so a test never depends on the index. */
function answerOf(id: string): string {
  const answer = roundById(id).answer;
  expect(answer.kind).toBe("choices");
  const choices = answer as Extract<Round["answer"], { kind: "choices" }>;
  return choices.options[choices.correctIndex];
}

const cleanups: Array<() => void> = [];

afterEach(() => {
  while (cleanups.length > 0) cleanups.pop()?.();
  document.body.replaceChildren();
});

describe("lesson 23 question pool", () => {
  it("holds 22 rounds split evenly between staff and text prompts", () => {
    expect(lesson23Pool).toHaveLength(22);
    expect(staffPrompts()).toHaveLength(11);
    expect(lesson23Pool.filter((round) => round.prompt.kind === "text")).toHaveLength(11);
    const ids = lesson23Pool.map((round) => round.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("validates every pool round", () => {
    for (const round of lesson23Pool) {
      expect(() => validateRound(round)).not.toThrow();
    }
  });

  it("draws at least 12 rounds and every drawn round passes validateRound", () => {
    const rounds = lesson23.generateRounds(createRng(1234));
    expect(rounds.length).toBeGreaterThanOrEqual(12);
    for (const round of rounds) {
      expect(() => validateRound(round)).not.toThrow();
    }
    const ids = rounds.map((round) => round.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("produces identical rounds for the same seed", () => {
    const first = lesson23.generateRounds(createRng(42));
    const second = lesson23.generateRounds(createRng(42));
    expect(second).toEqual(first);
  });

  it("produces different rounds for two different seeds", () => {
    const first = lesson23.generateRounds(createRng(1));
    const second = lesson23.generateRounds(createRng(2));
    expect(JSON.stringify(second)).not.toBe(JSON.stringify(first));
  });

  it("draws both prompt kinds in every generated set", () => {
    for (const seed of [1, 42, 20261015]) {
      const kinds = new Set(lesson23.generateRounds(createRng(seed)).map((r) => r.prompt.kind));
      expect(kinds.has("staff")).toBe(true);
      expect(kinds.has("text")).toBe(true);
    }
  });

  it("engraves every staff prompt through the real Staff renderer", () => {
    for (const prompt of staffPrompts()) {
      const host = document.createElement("div");
      document.body.appendChild(host);
      const dispose = render(() => StaffPrompt({ prompt }), host);
      cleanups.push(() => {
        dispose();
        host.remove();
      });
      const svg = host.querySelector("svg");
      expect(svg, `degree prompt ${JSON.stringify(prompt.notes)} did not engrave`).not.toBeNull();
      // The five staff lines are paths; the notes draw on top of them.
      expect(svg!.querySelectorAll("path").length).toBeGreaterThanOrEqual(5);
    }
  });

  it("spells the staff scales exactly as the theory core spells them", () => {
    expect(notesOf("l23-staff-c-major-leading-tone")).toEqual([
      "C4",
      "D4",
      "E4",
      "F4",
      "G4",
      "A4",
      "B4",
    ]);
    expect(notesOf("l23-staff-a-minor-tonic")).toEqual([
      "A4",
      "B4",
      "C5",
      "D5",
      "E5",
      "F5",
      "G5",
    ]);
    expect(notesOf("l23-staff-c-minor-subtonic")).toEqual([
      "C4",
      "D4",
      "Eb4",
      "F4",
      "G4",
      "Ab4",
      "Bb4",
    ]);
    expect(notesOf("l23-staff-f-major-mediant-bass")).toEqual([
      "F2",
      "G2",
      "A2",
      "Bb2",
      "C3",
      "D3",
      "E3",
    ]);
  });

  it("names every drawn degree from the theory core's degree names", () => {
    expect(answerOf("l23-staff-c-major-dominant")).toBe("Dominant");
    expect(answerOf("l23-staff-c-major-subdominant")).toBe("Subdominant");
    expect(answerOf("l23-staff-d-major-mediant")).toBe("Mediant");
    expect(answerOf("l23-staff-d-major-submediant")).toBe("Submediant");
    expect(answerOf("l23-staff-d-major-supertonic")).toBe("Supertonic");
    expect(answerOf("l23-staff-a-minor-tonic")).toBe("Tonic");
    // The seventh flips with the scale type: leading tone in major and in
    // harmonic minor, subtonic only in natural minor.
    expect(answerOf("l23-staff-c-major-leading-tone")).toBe("Leading tone");
    expect(answerOf("l23-staff-c-harmonic-leading-tone")).toBe("Leading tone");
    expect(answerOf("l23-staff-c-minor-subtonic")).toBe("Subtonic");
    expect(answerOf("l23-text-subtonic")).toBe("The subtonic");
    expect(answerOf("l23-staff-g-major-fourth-bass")).toBe("The fourth degree");
    expect(answerOf("l23-staff-f-major-mediant-bass")).toBe("The third degree");
  });

  it("states music-theory facts rather than verdicts", () => {
    for (const rule of allRules()) {
      expect(rule).not.toMatch(GENERIC_RULE);
    }
    const rules = allRules().join(" \n ");
    for (const name of DEGREE_NAMES) {
      expect(rules, `rules never name the ${name}`).toMatch(new RegExp(`\\b${name}\\b`));
    }
    expect(rules).toMatch(/half step below the tonic/);
    expect(rules).toMatch(/whole step below the tonic/);
    expect(rules).toMatch(/caret/);
    expect(rules).toMatch(/Latin for/);
    expect(rules).toMatch(/generic fifth/);
  });
});

describe("lesson 23 companion illustrations (T5c Scales pass)", () => {
  // Zero yield for Scale Degrees, and the reason is uniform: every text
  // round asks about the degree VOCABULARY of scales in general — "Which
  // note of a scale is the tonic?", "What does super mean?" — and not one
  // prompt names a concrete scale or pitch. To draw any of these the writer
  // would have to pick an example scale the question never mentions, which
  // the strict rule bans outright ("do not invent a subject the question
  // never names" — the same gate that turned down lesson 33's inversion
  // rounds in T5b). The staff rounds already carry the concrete-scale
  // versions of these questions. Recorded class by class below, and the
  // pool is swept through the shared no-leak helper.
  const DEGREE_VOCABULARY = [
    "l23-text-what-is-a-scale-degree",
    "l23-text-tonic",
    "l23-text-dominant",
    "l23-text-subdominant",
    "l23-text-super",
    "l23-text-leading-tone",
    "l23-text-subtonic",
    "l23-text-caret",
  ];
  const REASONING = [
    "l23-text-why-subdominant",
    "l23-text-why-mediant",
    "l23-text-why-submediant",
  ];

  it("accounts for every text round in the rejection table", () => {
    const textIds = lesson23Pool
      .filter((round) => round.prompt.kind === "text")
      .map((round) => round.id)
      .sort();
    expect(textIds).toHaveLength(11);
    expect(textIds).toEqual([...DEGREE_VOCABULARY, ...REASONING].sort());
  });

  it("keeps the degree-vocabulary rounds text-only: class subject, no scale named", () => {
    expect(DEGREE_VOCABULARY).toHaveLength(8);
    for (const id of DEGREE_VOCABULARY) {
      expect(roundById(id).prompt.kind, id).toBe("text");
      expect(roundById(id).illustration, id).toBeUndefined();
    }
  });

  it("keeps the three 'why this name' rounds text-only: definitions about any scale", () => {
    expect(REASONING).toHaveLength(3);
    for (const id of REASONING) {
      expect(roundById(id).prompt.kind, id).toBe("text");
      expect(roundById(id).illustration, id).toBeUndefined();
    }
  });

  it("passes the shared no-leak assertion for every pool round", () => {
    for (const round of lesson23Pool) {
      expect(() => assertNoAnswerLeak(round), round.id).not.toThrow();
    }
  });
});

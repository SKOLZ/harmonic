import { afterEach, describe, expect, it } from "vitest";
import { render } from "solid-js/web";
import { validateRound } from "../lib/rounds/validate";
import type { PromptSpec, Round } from "../lib/rounds/types";
import StaffPrompt from "../components/prompts/StaffPrompt";
import { createRng } from "./rng";
import { lesson25, lesson25Pool } from "./lesson25";

const GENERIC_RULE = /^(correct|incorrect|wrong|that'?s right)/i;

function staffPrompts(): Extract<PromptSpec, { kind: "staff" }>[] {
  return lesson25Pool
    .map((round) => round.prompt)
    .filter((prompt): prompt is Extract<PromptSpec, { kind: "staff" }> => prompt.kind === "staff");
}

function allRules(): string[] {
  return lesson25Pool.map((round) => round.rule);
}

function roundById(id: string): Round {
  const found = lesson25Pool.find((round) => round.id === id);
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

describe("lesson 25 question pool", () => {
  it("holds 22 rounds split evenly between staff and text prompts", () => {
    expect(lesson25Pool).toHaveLength(22);
    expect(staffPrompts()).toHaveLength(11);
    expect(lesson25Pool.filter((round) => round.prompt.kind === "text")).toHaveLength(11);
    const ids = lesson25Pool.map((round) => round.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("validates every pool round", () => {
    for (const round of lesson25Pool) {
      expect(() => validateRound(round)).not.toThrow();
    }
  });

  it("draws at least 12 rounds and every drawn round passes validateRound", () => {
    const rounds = lesson25.generateRounds(createRng(1234));
    expect(rounds.length).toBeGreaterThanOrEqual(12);
    for (const round of rounds) {
      expect(() => validateRound(round)).not.toThrow();
    }
    const ids = rounds.map((round) => round.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("produces identical rounds for the same seed", () => {
    const first = lesson25.generateRounds(createRng(42));
    const second = lesson25.generateRounds(createRng(42));
    expect(second).toEqual(first);
  });

  it("produces different rounds for two different seeds", () => {
    const first = lesson25.generateRounds(createRng(1));
    const second = lesson25.generateRounds(createRng(2));
    expect(JSON.stringify(second)).not.toBe(JSON.stringify(first));
  });

  it("draws both prompt kinds in every generated set", () => {
    for (const seed of [1, 42, 20261015]) {
      const kinds = new Set(lesson25.generateRounds(createRng(seed)).map((r) => r.prompt.kind));
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
      expect(svg, `staff prompt ${JSON.stringify(prompt)} did not engrave`).not.toBeNull();
      expect(svg!.querySelectorAll("path").length).toBeGreaterThanOrEqual(5);
    }
  });

  it("spells the staff scales exactly as the theory core spells them", () => {
    expect(notesOf("l25-staff-c-major-value")).toEqual([
      "C4", "D4", "E4", "F4", "G4", "A4", "B4",
    ]);
    expect(notesOf("l25-staff-b-major-value")).toEqual([
      "B4", "C#5", "D#5", "E5", "F#5", "G#5", "A#5",
    ]);
    expect(notesOf("l25-staff-f-major-value")).toEqual([
      "F4", "G4", "A4", "Bb4", "C5", "D5", "E5",
    ]);
    expect(notesOf("l25-staff-d-minor-value")).toEqual([
      "D4", "E4", "F4", "G4", "A4", "Bb4", "C5",
    ]);
    expect(notesOf("l25-staff-f-minor-value")).toEqual([
      "F4", "G4", "Ab4", "Bb4", "C5", "Db5", "Eb5",
    ]);
  });

  it("asks the seven memorised values exactly as the site assigns them", () => {
    expect(answerOf("l25-staff-c-major-value")).toBe("0");
    expect(answerOf("l25-staff-g-major-value")).toBe("1");
    expect(answerOf("l25-staff-d-major-value")).toBe("2");
    expect(answerOf("l25-staff-a-major-value")).toBe("3");
    expect(answerOf("l25-staff-e-major-value")).toBe("4");
    expect(answerOf("l25-staff-b-major-value")).toBe("5");
    expect(answerOf("l25-staff-f-major-value")).toBe("-1");
    expect(answerOf("l25-text-seven-values")).toBe("C 0, G 1, D 2, A 3, E 4, B 5, F -1");
  });

  it("asks the worked conversions from the site's slides", () => {
    expect(answerOf("l25-staff-eb-calc")).toBe("E major, value 4");
    expect(answerOf("l25-staff-fs-calc")).toBe("F major, value -1");
    expect(answerOf("l25-text-cb-calc")).toBe("-7");
    expect(answerOf("l25-text-cs-calc")).toBe("7");
    expect(answerOf("l25-text-eb-calc")).toBe("-3");
    expect(answerOf("l25-text-fs-calc")).toBe("6");
    expect(answerOf("l25-text-parallel-minor")).toBe("Subtract 3");
    expect(answerOf("l25-text-cs-minor")).toBe("Four sharps");
    expect(answerOf("l25-text-gs-theoretical")).toMatch(/double sharp/);
    expect(answerOf("l25-staff-d-minor-value")).toBe("-1");
    expect(answerOf("l25-staff-f-minor-value")).toBe("-4");
  });

  it("states the site's calculation method, not a verdict", () => {
    for (const rule of allRules()) {
      expect(rule).not.toMatch(GENERIC_RULE);
    }
    const rules = allRules().join(" \n ");
    expect(rules).toMatch(/sharps are positive/);
    expect(rules).toMatch(/flats are negative/);
    expect(rules).toMatch(/subtract 7/);
    expect(rules).toMatch(/add 7/);
    expect(rules).toMatch(/subtract 3/);
    expect(rules).toMatch(/parallel minor/);
    expect(rules).toMatch(/seven values must be memorized|memorize seven|seven values/);
    expect(rules).toMatch(/30 different key signatures|30 key signatures/);
    expect(rules).toMatch(/enharmonic equivalent of Ab/);
  });
});

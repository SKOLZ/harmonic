import { afterEach, describe, expect, it } from "vitest";
import { render } from "solid-js/web";
import { validateRound } from "../lib/rounds/validate";
import type { PromptSpec, Round } from "../lib/rounds/types";
import StaffPrompt from "../components/prompts/StaffPrompt";
import { createRng } from "./rng";
import { lesson21, lesson21Pool } from "./lesson21";

const GENERIC_RULE = /^(correct|incorrect|wrong|that'?s right)/i;

function staffPrompts(): Extract<PromptSpec, { kind: "staff" }>[] {
  return lesson21Pool
    .map((round) => round.prompt)
    .filter((prompt): prompt is Extract<PromptSpec, { kind: "staff" }> => prompt.kind === "staff");
}

function allRules(): string[] {
  return lesson21Pool.map((round) => round.rule);
}

function roundById(id: string): Round {
  const found = lesson21Pool.find((round) => round.id === id);
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

describe("lesson 21 question pool", () => {
  it("holds 22 rounds split evenly between staff and text prompts", () => {
    expect(lesson21Pool).toHaveLength(22);
    expect(staffPrompts()).toHaveLength(11);
    expect(lesson21Pool.filter((round) => round.prompt.kind === "text")).toHaveLength(11);
    const ids = lesson21Pool.map((round) => round.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("validates every pool round", () => {
    for (const round of lesson21Pool) {
      expect(() => validateRound(round)).not.toThrow();
    }
  });

  it("draws at least 12 rounds and every drawn round passes validateRound", () => {
    const rounds = lesson21.generateRounds(createRng(1234));
    expect(rounds.length).toBeGreaterThanOrEqual(12);
    for (const round of rounds) {
      expect(() => validateRound(round)).not.toThrow();
    }
    const ids = rounds.map((round) => round.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("produces identical rounds for the same seed", () => {
    const first = lesson21.generateRounds(createRng(42));
    const second = lesson21.generateRounds(createRng(42));
    expect(second).toEqual(first);
  });

  it("produces different rounds for two different seeds", () => {
    const first = lesson21.generateRounds(createRng(1));
    const second = lesson21.generateRounds(createRng(2));
    expect(JSON.stringify(second)).not.toBe(JSON.stringify(first));
  });

  it("draws both prompt kinds in every generated set", () => {
    for (const seed of [1, 42, 20261015]) {
      const kinds = new Set(lesson21.generateRounds(createRng(seed)).map((r) => r.prompt.kind));
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
      expect(svg, `scale prompt ${JSON.stringify(prompt.notes)} did not engrave`).not.toBeNull();
      // The five staff lines are paths; the notes draw on top of them.
      expect(svg!.querySelectorAll("path").length).toBeGreaterThanOrEqual(5);
    }
  });

  it("spells the staff scales exactly as the theory core spells them", () => {
    expect(notesOf("l21-staff-c-major-half-step")).toEqual([
      "C4",
      "D4",
      "E4",
      "F4",
      "G4",
      "A4",
      "B4",
    ]);
    expect(notesOf("l21-staff-eb-major-name")).toEqual([
      "Eb4",
      "F4",
      "G4",
      "Ab4",
      "Bb4",
      "C5",
      "D5",
    ]);
    expect(notesOf("l21-staff-a-major-name")).toEqual([
      "A4",
      "B4",
      "C#5",
      "D5",
      "E5",
      "F#5",
      "G#5",
    ]);
    expect(notesOf("l21-staff-g-major-name-bass")).toEqual([
      "G2",
      "A2",
      "B2",
      "C3",
      "D3",
      "E3",
      "F#3",
    ]);
    expect(notesOf("l21-staff-a-major-degree-bass")).toEqual([
      "A2",
      "B2",
      "C#3",
      "D3",
      "E3",
      "F#3",
      "G#3",
    ]);
  });

  it("asks the half-step questions with exactly one half-step option", () => {
    expect(roundById("l21-staff-c-major-half-step").answer).toEqual({
      kind: "choices",
      options: ["E–F", "C–D", "G–A", "A–B"],
      correctIndex: 0,
    });
    expect(answerOf("l21-staff-d-major-half-step")).toBe("F#–G");
    expect(answerOf("l21-staff-c-major-wrong-note")).toBe("Bb4");
    expect(answerOf("l21-staff-c-major-next")).toBe("B");
    expect(answerOf("l21-staff-eb-major-next")).toBe("Ab4");
    expect(answerOf("l21-staff-f-major-flats")).toBe("One");
    expect(answerOf("l21-staff-a-major-degree-bass")).toBe("The seventh degree");
    expect(answerOf("l21-text-major-formula")).toBe("Whole, whole, half, whole, whole, whole, half");
  });

  it("states music-theory facts rather than verdicts", () => {
    for (const rule of allRules()) {
      expect(rule).not.toMatch(GENERIC_RULE);
    }
    const rules = allRules().join(" \n ");
    expect(rules).toMatch(/W–W–H–W–W–W–H/);
    expect(rules).toMatch(/no accidentals/);
    expect(rules).toMatch(/three flats/);
    expect(rules).toMatch(/two sharps/);
    expect(rules).toMatch(/half step below the tonic/);
    expect(rules).toMatch(/seven distinct notes/);
    expect(rules).toMatch(/start on the first note and follow the formula/);
  });
});

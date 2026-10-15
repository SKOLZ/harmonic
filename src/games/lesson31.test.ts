import { afterEach, describe, expect, it } from "vitest";
import { render } from "solid-js/web";
import { validateRound } from "../lib/rounds/validate";
import type { PromptSpec, Round } from "../lib/rounds/types";
import StaffPrompt from "../components/prompts/StaffPrompt";
import { genericIntervalNumber, halfSteps, intervalName, parseNote } from "../lib/theory";
import { createRng } from "./rng";
import { lesson31, lesson31Pool } from "./lesson31";

const GENERIC_RULE = /^(correct|incorrect|wrong|that'?s right)/i;

function isStaffRound(
  round: Round,
): round is Round & { prompt: Extract<PromptSpec, { kind: "staff" }> } {
  return round.prompt.kind === "staff";
}

function staffRounds(): Array<{ id: string; prompt: Extract<PromptSpec, { kind: "staff" }> }> {
  return lesson31Pool.filter(isStaffRound).map((round) => ({ id: round.id, prompt: round.prompt }));
}

function allRules(): string[] {
  return lesson31Pool.map((round) => round.rule);
}

function roundById(id: string): Round {
  const found = lesson31Pool.find((round) => round.id === id);
  expect(found, `round ${id} is missing from the pool`).toBeDefined();
  return found!;
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

describe("lesson 31 question pool", () => {
  it("holds 22 rounds split evenly between staff and text prompts", () => {
    expect(lesson31Pool).toHaveLength(22);
    expect(staffRounds()).toHaveLength(11);
    expect(lesson31Pool.filter((round) => round.prompt.kind === "text")).toHaveLength(11);
    const ids = lesson31Pool.map((round) => round.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("validates every pool round", () => {
    for (const round of lesson31Pool) {
      expect(() => validateRound(round)).not.toThrow();
    }
  });

  it("draws at least 12 rounds and every drawn round passes validateRound", () => {
    const rounds = lesson31.generateRounds(createRng(1234));
    expect(rounds.length).toBeGreaterThanOrEqual(12);
    for (const round of rounds) {
      expect(() => validateRound(round)).not.toThrow();
    }
    const ids = rounds.map((round) => round.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("produces identical rounds for the same seed", () => {
    const first = lesson31.generateRounds(createRng(42));
    const second = lesson31.generateRounds(createRng(42));
    expect(second).toEqual(first);
  });

  it("produces different rounds for two different seeds", () => {
    const first = lesson31.generateRounds(createRng(1));
    const second = lesson31.generateRounds(createRng(2));
    expect(JSON.stringify(second)).not.toBe(JSON.stringify(first));
  });

  it("draws both prompt kinds in every generated set", () => {
    for (const seed of [1, 42, 20261015]) {
      const kinds = new Set(lesson31.generateRounds(createRng(seed)).map((r) => r.prompt.kind));
      expect(kinds.has("staff")).toBe(true);
      expect(kinds.has("text")).toBe(true);
    }
  });

  it("engraves every staff prompt through the real Staff renderer", () => {
    for (const { id, prompt } of staffRounds()) {
      const host = document.createElement("div");
      document.body.appendChild(host);
      const dispose = render(() => StaffPrompt({ prompt }), host);
      cleanups.push(() => {
        dispose();
        host.remove();
      });
      const svg = host.querySelector("svg");
      expect(svg, `staff prompt ${id} did not engrave`).not.toBeNull();
      expect(svg!.querySelectorAll("path").length).toBeGreaterThanOrEqual(5);
    }
  });

  it("names every staff round exactly as the theory core names it", () => {
    for (const { id, prompt } of staffRounds()) {
      const [low, high] = prompt.notes.map((note) => parseNote(note));
      const name = intervalName(genericIntervalNumber(low!, high!), halfSteps(low!, high!));
      expect(name, `staff round ${id}`).not.toBeNull();
      expect(answerOf(id), `staff round ${id}`).toBe(name);
    }
  });

  it("pins the site's half-step counts and quality-family rules", () => {
    expect(answerOf("l31-text-major-second-half-steps")).toBe("Two");
    expect(answerOf("l31-text-major-third-half-steps")).toBe("Four");
    expect(answerOf("l31-text-perfect-fourth-half-steps")).toBe("Five");
    expect(answerOf("l31-text-perfect-fifth-half-steps")).toBe("Seven");
    expect(answerOf("l31-text-major-sixth-half-steps")).toBe("Nine");
    expect(answerOf("l31-text-major-seventh-half-steps")).toBe("Eleven");
    expect(answerOf("l31-text-perfect-eighth-half-steps")).toBe("Twelve");
    expect(answerOf("l31-text-major-family")).toBe("Seconds, thirds, sixths, and sevenths");
    expect(answerOf("l31-text-perfect-family")).toBe("Firsts, fourths, fifths, and eighths");
  });

  it("states the site's quality facts in every rule", () => {
    for (const rule of allRules()) {
      expect(rule).not.toMatch(GENERIC_RULE);
    }
    const rules = allRules().join(" \n ");
    expect(rules).toMatch(/two half steps/);
    expect(rules).toMatch(/four half steps/);
    expect(rules).toMatch(/five half steps/);
    expect(rules).toMatch(/seven half steps/);
    expect(rules).toMatch(/nine half steps/);
    expect(rules).toMatch(/eleven half steps/);
    expect(rules).toMatch(/twelve half steps/);
    expect(rules).toMatch(/one less half step than a (major|perfect)/);
    expect(rules).toMatch(/one more half step than a perfect/);
    expect(rules).toMatch(/seconds, thirds, sixths, and sevenths/i);
    expect(rules).toMatch(/firsts, fourths, fifths, and eighths/i);
  });
});

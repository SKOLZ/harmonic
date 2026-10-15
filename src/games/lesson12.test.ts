import { describe, expect, it } from "vitest";
import { validateRound } from "../lib/rounds/validate";
import type { PromptSpec } from "../lib/rounds/types";
import { createRng } from "./rng";
import { lesson12, lesson12Pool } from "./lesson12";

const GENERIC_RULE = /^(correct|incorrect|wrong|that'?s right)/i;
const NOTE_DURATIONS = new Set(["w", "h", "q", "8"]);

function staffPrompts(): Extract<PromptSpec, { kind: "staff" }>[] {
  return lesson12Pool
    .map((round) => round.prompt)
    .filter((prompt): prompt is Extract<PromptSpec, { kind: "staff" }> => prompt.kind === "staff");
}

function allRules(): string[] {
  return lesson12Pool.map((round) => round.rule);
}

describe("lesson 12 question pool", () => {
  it("holds 22 rounds split evenly between staff and text prompts", () => {
    expect(lesson12Pool).toHaveLength(22);
    expect(staffPrompts()).toHaveLength(11);
    expect(lesson12Pool.filter((round) => round.prompt.kind === "text")).toHaveLength(11);
  });

  it("validates every pool round", () => {
    for (const round of lesson12Pool) {
      expect(() => validateRound(round)).not.toThrow();
    }
  });

  it("draws at least 12 rounds and every drawn round passes validateRound", () => {
    const rounds = lesson12.generateRounds(createRng(1234));
    expect(rounds.length).toBeGreaterThanOrEqual(12);
    for (const round of rounds) {
      expect(() => validateRound(round)).not.toThrow();
    }
    const ids = rounds.map((round) => round.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("produces identical rounds for the same seed", () => {
    const first = lesson12.generateRounds(createRng(42));
    const second = lesson12.generateRounds(createRng(42));
    expect(second).toEqual(first);
  });

  it("produces different rounds for two different seeds", () => {
    const first = lesson12.generateRounds(createRng(1));
    const second = lesson12.generateRounds(createRng(2));
    expect(JSON.stringify(second)).not.toBe(JSON.stringify(first));
  });

  it("draws both prompt kinds in every generated set", () => {
    for (const seed of [1, 42, 20261015]) {
      const kinds = new Set(lesson12.generateRounds(createRng(seed)).map((r) => r.prompt.kind));
      expect(kinds.has("staff")).toBe(true);
      expect(kinds.has("text")).toBe(true);
    }
  });

  it("puts an undotted note duration on every staff prompt, over both clefs", () => {
    const staff = staffPrompts();
    expect(staff).toHaveLength(11);
    for (const prompt of staff) {
      expect(prompt.duration).toBeDefined();
      expect(NOTE_DURATIONS.has(prompt.duration!)).toBe(true);
    }
    expect(new Set(staff.map((prompt) => prompt.clef))).toEqual(new Set(["treble", "bass"]));
  });

  it("states music-theory facts rather than verdicts", () => {
    for (const rule of allRules()) {
      expect(rule).not.toMatch(GENERIC_RULE);
    }
    const rules = allRules().join(" \n ");
    expect(rules).toMatch(/bar lines/);
    expect(rules).toMatch(/top number/);
    expect(rules).toMatch(/bottom number/);
    expect(rules).toMatch(/four quarter notes/);
    expect(rules).toMatch(/three quarter notes/);
    expect(rules).toMatch(/two quarter notes/);
    expect(rules).toMatch(/six eighth notes/);
    expect(rules).toMatch(/three half notes/);
    expect(rules).toMatch(/common time/i);
    expect(rules).toMatch(/double bar line/);
    expect(rules).toMatch(/time signatures define/i);
    expect(rules).toMatch(/group into two beats/);
  });
});

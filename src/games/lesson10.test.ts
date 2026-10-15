import { describe, expect, it } from "vitest";
import { parseNote } from "../lib/theory";
import { validateRound } from "../lib/rounds/validate";
import type { PromptSpec } from "../lib/rounds/types";
import { createRng } from "./rng";
import { lesson10, lesson10Pool } from "./lesson10";

const GENERIC_RULE = /^(correct|incorrect|wrong|that'?s right)/i;

function staffPrompts(): Extract<PromptSpec, { kind: "staff" }>[] {
  return lesson10Pool
    .map((round) => round.prompt)
    .filter((prompt): prompt is Extract<PromptSpec, { kind: "staff" }> => prompt.kind === "staff");
}

function textRules(): string[] {
  return lesson10Pool
    .filter((round) => round.prompt.kind === "text")
    .map((round) => round.rule);
}

function allRules(): string[] {
  return lesson10Pool.map((round) => round.rule);
}

describe("lesson 10 question pool", () => {
  it("holds 22 rounds split evenly between staff and text prompts", () => {
    expect(lesson10Pool).toHaveLength(22);
    const staff = staffPrompts();
    expect(staff).toHaveLength(11);
    expect(lesson10Pool.filter((round) => round.prompt.kind === "text")).toHaveLength(11);
  });

  it("validates every pool round", () => {
    for (const round of lesson10Pool) {
      expect(() => validateRound(round)).not.toThrow();
    }
  });

  it("draws both prompt kinds in every generated set", () => {
    for (const seed of [1, 42, 20261015]) {
      const kinds = new Set(lesson10.generateRounds(createRng(seed)).map((r) => r.prompt.kind));
      expect(kinds.has("staff")).toBe(true);
      expect(kinds.has("text")).toBe(true);
    }
  });

  it("draws staff prompts on both clefs with engraveable note names", () => {
    const staff = staffPrompts();
    expect(new Set(staff.map((prompt) => prompt.clef))).toEqual(new Set(["treble", "bass"]));
    for (const prompt of staff) {
      expect(prompt.notes.length).toBeGreaterThan(0);
      for (const name of prompt.notes) {
        const note = parseNote(name);
        expect(note.octave).toBeDefined();
      }
    }
  });

  it("states music-theory facts rather than verdicts", () => {
    for (const rule of lesson10Pool.map((round) => round.rule)) {
      expect(rule).not.toMatch(GENERIC_RULE);
    }
    const rules = allRules().join(" \n ");
    expect(rules).toMatch(/five lines and four spaces/);
    expect(rules).toMatch(/G line/);
    expect(rules).toMatch(/F (line|clef)/);
    expect(rules).toMatch(/ledger line/);
    expect(rules).toMatch(/middle C/);
    expect(rules).toMatch(/E G B D F/);
    expect(rules).toMatch(/F A C E/);
    expect(rules).toMatch(/G B D F A/);
    expect(rules).toMatch(/A C E G/);
    expect(rules).toMatch(/white key/);
  });

  it("keeps the ledger-line and grand-staff facts among the text prompts", () => {
    const rules = textRules().join(" \n ");
    expect(rules).toMatch(/ledger line/);
    expect(rules).toMatch(/grand staff|eleven lines|joined by middle C/);
  });
});

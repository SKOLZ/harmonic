import { describe, expect, it } from "vitest";
import { parseNote } from "../lib/theory";
import { validateRound } from "../lib/rounds/validate";
import type { PromptSpec } from "../lib/rounds/types";
import { createRng } from "./rng";
import { lesson20, lesson20Pool } from "./lesson20";

const GENERIC_RULE = /^(correct|incorrect|wrong|that'?s right)/i;

function staffPrompts(): Extract<PromptSpec, { kind: "staff" }>[] {
  return lesson20Pool
    .map((round) => round.prompt)
    .filter((prompt): prompt is Extract<PromptSpec, { kind: "staff" }> => prompt.kind === "staff");
}

function allRules(): string[] {
  return lesson20Pool.map((round) => round.rule);
}

describe("lesson 20 question pool", () => {
  it("holds 22 rounds split evenly between staff and text prompts", () => {
    expect(lesson20Pool).toHaveLength(22);
    expect(staffPrompts()).toHaveLength(11);
    expect(lesson20Pool.filter((round) => round.prompt.kind === "text")).toHaveLength(11);
  });

  it("validates every pool round", () => {
    for (const round of lesson20Pool) {
      expect(() => validateRound(round)).not.toThrow();
    }
  });

  it("draws at least 12 rounds and every drawn round passes validateRound", () => {
    const rounds = lesson20.generateRounds(createRng(1234));
    expect(rounds.length).toBeGreaterThanOrEqual(12);
    for (const round of rounds) {
      expect(() => validateRound(round)).not.toThrow();
    }
    const ids = rounds.map((round) => round.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("produces identical rounds for the same seed", () => {
    const first = lesson20.generateRounds(createRng(42));
    const second = lesson20.generateRounds(createRng(42));
    expect(second).toEqual(first);
  });

  it("produces different rounds for two different seeds", () => {
    const first = lesson20.generateRounds(createRng(1));
    const second = lesson20.generateRounds(createRng(2));
    expect(JSON.stringify(second)).not.toBe(JSON.stringify(first));
  });

  it("draws both prompt kinds in every generated set", () => {
    for (const seed of [1, 42, 20261015]) {
      const kinds = new Set(lesson20.generateRounds(createRng(seed)).map((r) => r.prompt.kind));
      expect(kinds.has("staff")).toBe(true);
      expect(kinds.has("text")).toBe(true);
    }
  });

  it("draws staff prompts on both clefs with engraveable note names", () => {
    const staff = staffPrompts();
    expect(staff).toHaveLength(11);
    expect(new Set(staff.map((prompt) => prompt.clef))).toEqual(new Set(["treble", "bass"]));
    for (const prompt of staff) {
      expect(prompt.notes.length).toBeGreaterThan(0);
      for (const name of prompt.notes) {
        const note = parseNote(name);
        expect(note.octave).toBeDefined();
      }
    }
  });

  it("covers sharps, flats, double sharps and two-note steps on the staff", () => {
    const noteNames = staffPrompts().flatMap((prompt) => prompt.notes);
    expect(noteNames).toContain("C#4");
    expect(noteNames).toContain("Db4");
    expect(noteNames).toContain("C##4");
    expect(noteNames).toContain("Cb5");
    expect(noteNames).toContain("E#4");
    expect(noteNames).toContain("Fb4");
    // Whole/half-step rounds engrave both notes of the pair.
    expect(staffPrompts().some((prompt) => prompt.notes.length === 2)).toBe(true);
  });

  it("states music-theory facts rather than verdicts", () => {
    for (const rule of allRules()) {
      expect(rule).not.toMatch(GENERIC_RULE);
    }
    const rules = allRules().join(" \n ");
    expect(rules).toMatch(/next adjacent key/);
    expect(rules).toMatch(/two half steps/);
    expect(rules).toMatch(/sharp raises/);
    expect(rules).toMatch(/flat lowers/);
    expect(rules).toMatch(/natural cancels/);
    expect(rules).toMatch(/double sharp/);
    expect(rules).toMatch(/double flat/);
    expect(rules).toMatch(/enharmonic/);
    expect(rules).toMatch(/adjacent letter name/);
    expect(rules).toMatch(/chromatic step/);
    expect(rules).toMatch(/E and F and between B and C/);
  });
});

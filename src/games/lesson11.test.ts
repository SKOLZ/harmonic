import { describe, expect, it } from "vitest";
import { validateRound } from "../lib/rounds/validate";
import type { PromptSpec } from "../lib/rounds/types";
import { createRng } from "./rng";
import { lesson11, lesson11Pool } from "./lesson11";

const GENERIC_RULE = /^(correct|incorrect|wrong|that'?s right)/i;
const NOTE_DURATIONS = new Set(["w", "h", "q", "8", "16"]);

function staffPrompts(): Extract<PromptSpec, { kind: "staff" }>[] {
  return lesson11Pool
    .map((round) => round.prompt)
    .filter((prompt): prompt is Extract<PromptSpec, { kind: "staff" }> => prompt.kind === "staff");
}

function allRules(): string[] {
  return lesson11Pool.map((round) => round.rule);
}

describe("lesson 11 question pool", () => {
  it("holds 22 rounds split evenly between staff and text prompts", () => {
    expect(lesson11Pool).toHaveLength(22);
    expect(staffPrompts()).toHaveLength(11);
    expect(lesson11Pool.filter((round) => round.prompt.kind === "text")).toHaveLength(11);
  });

  it("validates every pool round", () => {
    for (const round of lesson11Pool) {
      expect(() => validateRound(round)).not.toThrow();
    }
  });

  it("draws both prompt kinds in every generated set", () => {
    for (const seed of [1, 42, 20261015]) {
      const kinds = new Set(lesson11.generateRounds(createRng(seed)).map((r) => r.prompt.kind));
      expect(kinds.has("staff")).toBe(true);
      expect(kinds.has("text")).toBe(true);
    }
  });

  it("puts a note-value duration code on every staff prompt", () => {
    const staff = staffPrompts();
    expect(staff.length).toBe(11);
    for (const prompt of staff) {
      expect(prompt.duration).toBeDefined();
      expect(NOTE_DURATIONS.has(prompt.duration!)).toBe(true);
    }
    expect(new Set(staff.map((prompt) => prompt.clef))).toEqual(new Set(["treble", "bass"]));
  });

  it("draws at least one duration-bearing staff prompt in every generated set", () => {
    for (const seed of [1, 42, 20261015]) {
      const drawn = lesson11.generateRounds(createRng(seed));
      const withDuration = drawn.filter(
        (round) => round.prompt.kind === "staff" && round.prompt.duration !== undefined,
      );
      expect(withDuration.length).toBeGreaterThan(0);
    }
  });

  it("states music-theory facts rather than verdicts", () => {
    for (const rule of allRules()) {
      expect(rule).not.toMatch(GENERIC_RULE);
    }
    const rules = allRules().join(" \n ");
    expect(rules).toMatch(/four beats/);
    expect(rules).toMatch(/two beats/);
    expect(rules).toMatch(/half a beat/);
    expect(rules).toMatch(/quarter of a beat/);
    expect(rules).toMatch(/two half notes/i);
    expect(rules).toMatch(/four quarter notes/i);
    expect(rules).toMatch(/two quarter notes/i);
    expect(rules).toMatch(/two eighth notes/i);
    expect(rules).toMatch(/four sixteenth notes/i);
    expect(rules).toMatch(/flag/i);
    expect(rules).toMatch(/dot increases duration by one half/);
  });
});

describe("lesson 11 companion illustrations (T5 pilot)", () => {
  it("keeps every round text-only: duration arithmetic is not about pitches", () => {
    // Pilot decision: every text round here asks for a count or a duration
    // fact. None names a concrete pitch as its subject, and engraving any
    // duration would draw the very quantity being asked about (four quarters
    // for "how many quarters fill a whole" is the answer counted off the
    // picture). Staff prompts already carry the notation side.
    for (const round of lesson11Pool) {
      expect(round.illustration).toBeUndefined();
    }
  });
});

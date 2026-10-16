import { afterEach, describe, expect, it } from "vitest";
import { render } from "solid-js/web";
import { validateRound } from "../lib/rounds/validate";
import type { PromptSpec } from "../lib/rounds/types";
import StaffPrompt from "../components/prompts/StaffPrompt";
import { createRng } from "./rng";
import { lesson13, lesson13Pool } from "./lesson13";

const GENERIC_RULE = /^(correct|incorrect|wrong|that'?s right)/i;
const REST_DURATIONS = new Set(["wr", "hr", "qr", "8r", "16r"]);

function staffPrompts(): Extract<PromptSpec, { kind: "staff" }>[] {
  return lesson13Pool
    .map((round) => round.prompt)
    .filter((prompt): prompt is Extract<PromptSpec, { kind: "staff" }> => prompt.kind === "staff");
}

function allRules(): string[] {
  return lesson13Pool.map((round) => round.rule);
}

const cleanups: Array<() => void> = [];

afterEach(() => {
  while (cleanups.length > 0) cleanups.pop()?.();
  document.body.replaceChildren();
});

describe("lesson 13 question pool", () => {
  it("holds 22 rounds split evenly between staff and text prompts", () => {
    expect(lesson13Pool).toHaveLength(22);
    expect(staffPrompts()).toHaveLength(11);
    expect(lesson13Pool.filter((round) => round.prompt.kind === "text")).toHaveLength(11);
  });

  it("validates every pool round", () => {
    for (const round of lesson13Pool) {
      expect(() => validateRound(round)).not.toThrow();
    }
  });

  it("draws at least 12 rounds and every drawn round passes validateRound", () => {
    const rounds = lesson13.generateRounds(createRng(1234));
    expect(rounds.length).toBeGreaterThanOrEqual(12);
    for (const round of rounds) {
      expect(() => validateRound(round)).not.toThrow();
    }
    const ids = rounds.map((round) => round.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("produces identical rounds for the same seed", () => {
    const first = lesson13.generateRounds(createRng(42));
    const second = lesson13.generateRounds(createRng(42));
    expect(second).toEqual(first);
  });

  it("produces different rounds for two different seeds", () => {
    const first = lesson13.generateRounds(createRng(1));
    const second = lesson13.generateRounds(createRng(2));
    expect(JSON.stringify(second)).not.toBe(JSON.stringify(first));
  });

  it("draws both prompt kinds in every generated set", () => {
    for (const seed of [1, 42, 20261015]) {
      const kinds = new Set(lesson13.generateRounds(createRng(seed)).map((r) => r.prompt.kind));
      expect(kinds.has("staff")).toBe(true);
      expect(kinds.has("text")).toBe(true);
    }
  });

  it("puts a rest duration code on every staff prompt, over both clefs", () => {
    const staff = staffPrompts();
    expect(staff).toHaveLength(11);
    for (const prompt of staff) {
      expect(prompt.duration).toBeDefined();
      expect(REST_DURATIONS.has(prompt.duration!)).toBe(true);
      expect(prompt.duration!.endsWith("r")).toBe(true);
    }
    expect(new Set(staff.map((prompt) => prompt.clef))).toEqual(new Set(["treble", "bass"]));
    expect(new Set(staff.map((prompt) => prompt.duration))).toEqual(
      new Set(["wr", "hr", "qr", "8r", "16r"]),
    );
  });

  it("engraves every rest staff prompt through the real Staff renderer", () => {
    for (const prompt of staffPrompts()) {
      const host = document.createElement("div");
      document.body.appendChild(host);
      const dispose = render(() => StaffPrompt({ prompt }), host);
      cleanups.push(() => {
        dispose();
        host.remove();
      });
      const svg = host.querySelector("svg");
      expect(svg, `rest prompt ${JSON.stringify(prompt.duration)} did not engrave`).not.toBeNull();
      // The five staff lines are paths; a rest glyph draws on top of them.
      expect(svg!.querySelectorAll("path").length).toBeGreaterThanOrEqual(5);
    }
  });

  it("states music-theory facts rather than verdicts", () => {
    for (const rule of allRules()) {
      expect(rule).not.toMatch(GENERIC_RULE);
    }
    const rules = allRules().join(" \n ");
    expect(rules).toMatch(/silence/);
    expect(rules).toMatch(/shares a duration/);
    expect(rules).toMatch(/fourth line/);
    expect(rules).toMatch(/middle staff line|third line/);
    expect(rules).toMatch(/one flag/);
    expect(rules).toMatch(/two flags/);
    expect(rules).toMatch(/three or more flags/);
    expect(rules).toMatch(/four beats/);
    expect(rules).toMatch(/two beats/);
    expect(rules).toMatch(/half a beat/);
    expect(rules).toMatch(/quarter of a beat/);
  });
});

describe("lesson 13 companion illustrations (T5 pilot)", () => {
  it("keeps every round text-only: any rest glyph would be the answer", () => {
    // Pilot decision: every text round concerns rest shapes ("box hanging
    // below which line") or rest durations. Engraving any rest draws the
    // glyph whose identity IS the answer, and rests carry no pitches for a
    // question-side illustration to show. The hard no-leak rule rules the
    // whole lesson out.
    for (const round of lesson13Pool) {
      expect(round.illustration).toBeUndefined();
    }
  });
});

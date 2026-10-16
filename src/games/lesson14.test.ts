import { afterEach, describe, expect, it } from "vitest";
import { render } from "solid-js/web";
import { validateRound } from "../lib/rounds/validate";
import type { PromptSpec } from "../lib/rounds/types";
import StaffPrompt from "../components/prompts/StaffPrompt";
import { createRng } from "./rng";
import { lesson14, lesson14Pool } from "./lesson14";

const GENERIC_RULE = /^(correct|incorrect|wrong|that'?s right)/i;
const DOTTED_DURATIONS = new Set(["wd", "hd", "qd", "8d"]);

function staffPrompts(): Extract<PromptSpec, { kind: "staff" }>[] {
  return lesson14Pool
    .map((round) => round.prompt)
    .filter((prompt): prompt is Extract<PromptSpec, { kind: "staff" }> => prompt.kind === "staff");
}

function allRules(): string[] {
  return lesson14Pool.map((round) => round.rule);
}

const cleanups: Array<() => void> = [];

afterEach(() => {
  while (cleanups.length > 0) cleanups.pop()?.();
  document.body.replaceChildren();
});

describe("lesson 14 question pool", () => {
  it("holds 22 rounds split evenly between staff and text prompts", () => {
    expect(lesson14Pool).toHaveLength(22);
    expect(staffPrompts()).toHaveLength(11);
    expect(lesson14Pool.filter((round) => round.prompt.kind === "text")).toHaveLength(11);
  });

  it("validates every pool round", () => {
    for (const round of lesson14Pool) {
      expect(() => validateRound(round)).not.toThrow();
    }
  });

  it("draws at least 12 rounds and every drawn round passes validateRound", () => {
    const rounds = lesson14.generateRounds(createRng(1234));
    expect(rounds.length).toBeGreaterThanOrEqual(12);
    for (const round of rounds) {
      expect(() => validateRound(round)).not.toThrow();
    }
    const ids = rounds.map((round) => round.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("produces identical rounds for the same seed", () => {
    const first = lesson14.generateRounds(createRng(42));
    const second = lesson14.generateRounds(createRng(42));
    expect(second).toEqual(first);
  });

  it("produces different rounds for two different seeds", () => {
    const first = lesson14.generateRounds(createRng(1));
    const second = lesson14.generateRounds(createRng(2));
    expect(JSON.stringify(second)).not.toBe(JSON.stringify(first));
  });

  it("draws both prompt kinds in every generated set", () => {
    for (const seed of [1, 42, 20261015]) {
      const kinds = new Set(lesson14.generateRounds(createRng(seed)).map((r) => r.prompt.kind));
      expect(kinds.has("staff")).toBe(true);
      expect(kinds.has("text")).toBe(true);
    }
  });

  it("puts a dotted duration code on every staff prompt, over both clefs", () => {
    const staff = staffPrompts();
    expect(staff).toHaveLength(11);
    for (const prompt of staff) {
      expect(prompt.duration).toBeDefined();
      expect(DOTTED_DURATIONS.has(prompt.duration!)).toBe(true);
      expect(prompt.duration).toContain("d");
    }
    expect(new Set(staff.map((prompt) => prompt.clef))).toEqual(new Set(["treble", "bass"]));
    expect(new Set(staff.map((prompt) => prompt.duration))).toEqual(
      new Set(["wd", "hd", "qd", "8d"]),
    );
  });

  it("engraves every dotted staff prompt through the real Staff renderer", () => {
    for (const prompt of staffPrompts()) {
      const host = document.createElement("div");
      document.body.appendChild(host);
      const dispose = render(() => StaffPrompt({ prompt }), host);
      cleanups.push(() => {
        dispose();
        host.remove();
      });
      const svg = host.querySelector("svg");
      expect(svg, `dotted prompt ${JSON.stringify(prompt.duration)} did not engrave`).not.toBeNull();
      // The five staff lines are paths; the dotted note and its dot draw on top.
      expect(svg!.querySelectorAll("path").length).toBeGreaterThanOrEqual(5);
    }
  });

  it("states music-theory facts rather than verdicts", () => {
    for (const rule of allRules()) {
      expect(rule).not.toMatch(GENERIC_RULE);
    }
    const rules = allRules().join(" \n ");
    expect(rules).toMatch(/increases duration by one half/);
    expect(rules).toMatch(/three eighth notes/);
    expect(rules).toMatch(/second dot/);
    expect(rules).toMatch(/six beats/);
    expect(rules).toMatch(/four beats/);
    expect(rules).toMatch(/three beats/);
    expect(rules).toMatch(/1\.5 beats/);
    expect(rules).toMatch(/0\.75 beats/);
    expect(rules).toMatch(/same pitch/);
    expect(rules).toMatch(/measure line|bar line/);
    expect(rules).toMatch(/slur/);
  });
});

describe("lesson 14 companion illustrations (T5 pilot)", () => {
  it("keeps every round text-only: durations and ties lie outside the pilot rule", () => {
    // Pilot decision: the text rounds ask for dot arithmetic or tie facts.
    // Durations are not concrete pitches under the pilot rule, ties are not
    // part of the notation-spec shape (no tie field), and engraving a dotted
    // value would draw the subject of a "how many beats" count rather than
    // guide a pitch question. Staff prompts already carry the dotted glyphs.
    for (const round of lesson14Pool) {
      expect(round.illustration).toBeUndefined();
    }
  });
});

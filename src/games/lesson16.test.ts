import { afterEach, describe, expect, it } from "vitest";
import { render } from "solid-js/web";
import { validateRound } from "../lib/rounds/validate";
import type { PromptSpec } from "../lib/rounds/types";
import StaffPrompt from "../components/prompts/StaffPrompt";
import { createRng } from "./rng";
import { lesson16, lesson16Pool } from "./lesson16";

const GENERIC_RULE = /^(correct|incorrect|wrong|that'?s right)/i;
// 8 = an odd-meter measure drawn as its eighth-note contents (5/8, 7/8, 8/8,
// 10/8, 11/8), qd = a single compound beat, which is always a dotted note.
const ODD_METER_DURATIONS = new Set(["8", "qd"]);

function staffPrompts(): Extract<PromptSpec, { kind: "staff" }>[] {
  return lesson16Pool
    .map((round) => round.prompt)
    .filter((prompt): prompt is Extract<PromptSpec, { kind: "staff" }> => prompt.kind === "staff");
}

function allRules(): string[] {
  return lesson16Pool.map((round) => round.rule);
}

const cleanups: Array<() => void> = [];

afterEach(() => {
  while (cleanups.length > 0) cleanups.pop()?.();
  document.body.replaceChildren();
});

describe("lesson 16 question pool", () => {
  it("holds 22 rounds split evenly between staff and text prompts", () => {
    expect(lesson16Pool).toHaveLength(22);
    expect(staffPrompts()).toHaveLength(11);
    expect(lesson16Pool.filter((round) => round.prompt.kind === "text")).toHaveLength(11);
  });

  it("validates every pool round", () => {
    for (const round of lesson16Pool) {
      expect(() => validateRound(round)).not.toThrow();
    }
  });

  it("draws at least 12 rounds and every drawn round passes validateRound", () => {
    const rounds = lesson16.generateRounds(createRng(1234));
    expect(rounds.length).toBeGreaterThanOrEqual(12);
    for (const round of rounds) {
      expect(() => validateRound(round)).not.toThrow();
    }
    const ids = rounds.map((round) => round.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("produces identical rounds for the same seed", () => {
    const first = lesson16.generateRounds(createRng(42));
    const second = lesson16.generateRounds(createRng(42));
    expect(second).toEqual(first);
  });

  it("produces different rounds for two different seeds", () => {
    const first = lesson16.generateRounds(createRng(1));
    const second = lesson16.generateRounds(createRng(2));
    expect(JSON.stringify(second)).not.toBe(JSON.stringify(first));
  });

  it("draws both prompt kinds in every generated set", () => {
    for (const seed of [1, 42, 20261015]) {
      const kinds = new Set(lesson16.generateRounds(createRng(seed)).map((r) => r.prompt.kind));
      expect(kinds.has("staff")).toBe(true);
      expect(kinds.has("text")).toBe(true);
    }
  });

  it("puts an odd-meter duration code on every staff prompt, over both clefs", () => {
    const staff = staffPrompts();
    expect(staff).toHaveLength(11);
    for (const prompt of staff) {
      expect(prompt.duration).toBeDefined();
      expect(ODD_METER_DURATIONS.has(prompt.duration!)).toBe(true);
    }
    expect(new Set(staff.map((prompt) => prompt.clef))).toEqual(new Set(["treble", "bass"]));
    expect(new Set(staff.map((prompt) => prompt.duration))).toEqual(new Set(["8", "qd"]));
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
      expect(
        svg,
        `odd-meter prompt ${prompt.notes.length} x ${JSON.stringify(prompt.duration)} did not engrave`,
      ).not.toBeNull();
      // The five staff lines are paths; the notes draw on top of them.
      expect(svg!.querySelectorAll("path").length).toBeGreaterThanOrEqual(5);
    }
  });

  it("states music-theory facts rather than verdicts", () => {
    for (const rule of allRules()) {
      expect(rule).not.toMatch(GENERIC_RULE);
    }
    const rules = allRules().join(" \n ");
    expect(rules).toMatch(/odd meter/);
    expect(rules).toMatch(/both simple and compound beats/);
    expect(rules).toMatch(/5\/8/);
    expect(rules).toMatch(/7\/8/);
    expect(rules).toMatch(/8\/8/);
    expect(rules).toMatch(/10\/8/);
    expect(rules).toMatch(/11\/8/);
    expect(rules).toMatch(/4\/4/);
    expect(rules).toMatch(/order of the beats does not matter/);
    expect(rules).toMatch(/eight eighth notes/);
    expect(rules).toMatch(/four beats of two eighth notes/);
    expect(rules).toMatch(/between two simple beats/);
    expect(rules).toMatch(/simple quadruple/);
    expect(rules).toMatch(/compound beat/);
    expect(rules).toMatch(/dotted quarter/);
  });
});

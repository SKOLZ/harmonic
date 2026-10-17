import { afterEach, describe, expect, it } from "vitest";
import { render } from "solid-js/web";
import { validateRound } from "../lib/rounds/validate";
import { assertNoAnswerLeak } from "../lib/rounds/noAnswerLeak";
import type { PromptSpec } from "../lib/rounds/types";
import StaffPrompt from "../components/prompts/StaffPrompt";
import { createRng } from "./rng";
import { lesson15, lesson15Pool } from "./lesson15";

const GENERIC_RULE = /^(correct|incorrect|wrong|that'?s right)/i;
// q = simple-meter beats (2/4, 3/4, 4/4), 8 = eighth-filled measures
// (6/8, 9/8), qd = the dotted-quarter beats compound meters are built on.
const METER_DURATIONS = new Set(["q", "8", "qd"]);

function staffPrompts(): Extract<PromptSpec, { kind: "staff" }>[] {
  return lesson15Pool
    .map((round) => round.prompt)
    .filter((prompt): prompt is Extract<PromptSpec, { kind: "staff" }> => prompt.kind === "staff");
}

function allRules(): string[] {
  return lesson15Pool.map((round) => round.rule);
}

const cleanups: Array<() => void> = [];

afterEach(() => {
  while (cleanups.length > 0) cleanups.pop()?.();
  document.body.replaceChildren();
});

describe("lesson 15 question pool", () => {
  it("holds 22 rounds split evenly between staff and text prompts", () => {
    expect(lesson15Pool).toHaveLength(22);
    expect(staffPrompts()).toHaveLength(11);
    expect(lesson15Pool.filter((round) => round.prompt.kind === "text")).toHaveLength(11);
  });

  it("validates every pool round", () => {
    for (const round of lesson15Pool) {
      expect(() => validateRound(round)).not.toThrow();
    }
  });

  it("draws at least 12 rounds and every drawn round passes validateRound", () => {
    const rounds = lesson15.generateRounds(createRng(1234));
    expect(rounds.length).toBeGreaterThanOrEqual(12);
    for (const round of rounds) {
      expect(() => validateRound(round)).not.toThrow();
    }
    const ids = rounds.map((round) => round.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("produces identical rounds for the same seed", () => {
    const first = lesson15.generateRounds(createRng(42));
    const second = lesson15.generateRounds(createRng(42));
    expect(second).toEqual(first);
  });

  it("produces different rounds for two different seeds", () => {
    const first = lesson15.generateRounds(createRng(1));
    const second = lesson15.generateRounds(createRng(2));
    expect(JSON.stringify(second)).not.toBe(JSON.stringify(first));
  });

  it("draws both prompt kinds in every generated set", () => {
    for (const seed of [1, 42, 20261015]) {
      const kinds = new Set(lesson15.generateRounds(createRng(seed)).map((r) => r.prompt.kind));
      expect(kinds.has("staff")).toBe(true);
      expect(kinds.has("text")).toBe(true);
    }
  });

  it("puts a meter-reading duration code on every staff prompt, over both clefs", () => {
    const staff = staffPrompts();
    expect(staff).toHaveLength(11);
    for (const prompt of staff) {
      expect(prompt.duration).toBeDefined();
      expect(METER_DURATIONS.has(prompt.duration!)).toBe(true);
    }
    expect(new Set(staff.map((prompt) => prompt.clef))).toEqual(new Set(["treble", "bass"]));
    expect(new Set(staff.map((prompt) => prompt.duration))).toEqual(
      new Set(["q", "8", "qd"]),
    );
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
      expect(svg, `meter prompt ${JSON.stringify(prompt.duration)} did not engrave`).not.toBeNull();
      // The five staff lines are paths; the notes draw on top of them.
      expect(svg!.querySelectorAll("path").length).toBeGreaterThanOrEqual(5);
    }
  });

  it("states music-theory facts rather than verdicts", () => {
    for (const rule of allRules()) {
      expect(rule).not.toMatch(GENERIC_RULE);
    }
    const rules = allRules().join(" \n ");
    expect(rules).toMatch(/number of beats in a measure/);
    expect(rules).toMatch(/two notes/);
    expect(rules).toMatch(/divided into three/);
    expect(rules).toMatch(/simple duple/);
    expect(rules).toMatch(/simple triple/);
    expect(rules).toMatch(/simple quadruple/);
    expect(rules).toMatch(/compound duple/);
    expect(rules).toMatch(/compound triple/);
    expect(rules).toMatch(/compound quadruple/);
    expect(rules).toMatch(/dotted quarter/);
    expect(rules).toMatch(/2, 3, or 4/);
    expect(rules).toMatch(/belongs to 3\/4/);
    expect(rules).toMatch(/dotted note/);
    expect(rules).toMatch(/four beats/);
  });
});

describe("lesson 15 companion illustrations (T5c Rhythm pass)", () => {
  // Zero yield for Rhythm and Meter's first lesson — and that is the correct
  // outcome of the strict rule, not a gap in the sweep. All eleven text
  // rounds classify time signatures or define meter vocabulary ("2/2 and 2/8
  // are also…", "What does the term simple mean…"), and not one prompt names
  // a pitch: there is no question subject the rule allows the writer to
  // engrave. Inventing a staff here would mean either drawing an example the
  // question never names or drawing a measure whose contents let the learner
  // count the answer off the page — both banned by the T5 decision. Every
  // rejection reason is recorded round by round below, and the whole pool is
  // swept through the shared no-leak helper.
  const DEFINITION = [
    "l15-text-duple-triple-quadruple-meaning",
    "l15-text-simple-meaning",
    "l15-text-compound-dotted-beat",
  ];
  const CLASSIFICATION = [
    "l15-text-22-28-simple-duple",
    "l15-text-44-why-quadruple",
    "l15-text-simple-top-number",
    "l15-text-six-on-top",
    "l15-text-68-not-simple-triple",
    "l15-text-98-compound-triple",
    "l15-text-42-48-simple-quadruple",
  ];
  const COUNT = ["l15-text-compound-division"];

  function reject(id: string): void {
    const round = lesson15Pool.find((candidate) => candidate.id === id);
    expect(round, `round ${id} is missing from the pool`).toBeDefined();
    expect(round!.illustration, id).toBeUndefined();
  }

  it("accounts for every text round in the rejection table", () => {
    const textIds = lesson15Pool
      .filter((round) => round.prompt.kind === "text")
      .map((round) => round.id)
      .sort();
    expect(textIds).toHaveLength(11);
    expect(textIds).toEqual([...DEFINITION, ...CLASSIFICATION, ...COUNT].sort());
  });

  it("keeps the classification rounds text-only: a time signature names no pitch", () => {
    expect(CLASSIFICATION).toHaveLength(7);
    for (const id of CLASSIFICATION) reject(id);
  });

  it("keeps the definitional rounds text-only — the beat's note VALUE is not a pitch", () => {
    // compound-dotted-beat is the one round whose wording could be mistaken
    // for a pitch question ("What kind of note is the beat…"); it asks about
    // note VALUES (dotted quarter, whole, eighth), which no staff can carry
    // without also drawing a measure the learner counts.
    expect(DEFINITION).toHaveLength(3);
    for (const id of DEFINITION) reject(id);
  });

  it("keeps the division-count round text-only: counts stay text-only", () => {
    expect(COUNT).toEqual(["l15-text-compound-division"]);
    for (const id of COUNT) reject(id);
  });

  it("passes the shared no-leak assertion for every pool round", () => {
    for (const round of lesson15Pool) {
      expect(() => assertNoAnswerLeak(round), round.id).not.toThrow();
    }
  });
});

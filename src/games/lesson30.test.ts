import { afterEach, describe, expect, it } from "vitest";
import { render } from "solid-js/web";
import { validateRound } from "../lib/rounds/validate";
import { assertNoAnswerLeak } from "../lib/rounds/noAnswerLeak";
import type { PromptSpec, Round } from "../lib/rounds/types";
import StaffPrompt from "../components/prompts/StaffPrompt";
import { genericIntervalNumber, parseNote } from "../lib/theory";
import { createRng } from "./rng";
import { lesson30, lesson30Pool } from "./lesson30";

const GENERIC_RULE = /^(correct|incorrect|wrong|that'?s right)/i;

const NUMBER_WORDS: Readonly<Record<number, string>> = {
  1: "First",
  2: "Second",
  3: "Third",
  4: "Fourth",
  5: "Fifth",
  6: "Sixth",
  7: "Seventh",
  8: "Eighth",
};

function isStaffRound(
  round: Round,
): round is Round & { prompt: Extract<PromptSpec, { kind: "staff" }> } {
  return round.prompt.kind === "staff";
}

function staffRounds(): Array<{ id: string; prompt: Extract<PromptSpec, { kind: "staff" }> }> {
  return lesson30Pool.filter(isStaffRound).map((round) => ({ id: round.id, prompt: round.prompt }));
}

function allRules(): string[] {
  return lesson30Pool.map((round) => round.rule);
}

function roundById(id: string): Round {
  const found = lesson30Pool.find((round) => round.id === id);
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

describe("lesson 30 question pool", () => {
  it("holds 22 rounds split evenly between staff and text prompts", () => {
    expect(lesson30Pool).toHaveLength(22);
    expect(staffRounds()).toHaveLength(11);
    expect(lesson30Pool.filter((round) => round.prompt.kind === "text")).toHaveLength(11);
    const ids = lesson30Pool.map((round) => round.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("validates every pool round", () => {
    for (const round of lesson30Pool) {
      expect(() => validateRound(round)).not.toThrow();
    }
  });

  it("draws at least 12 rounds and every drawn round passes validateRound", () => {
    const rounds = lesson30.generateRounds(createRng(1234));
    expect(rounds.length).toBeGreaterThanOrEqual(12);
    for (const round of rounds) {
      expect(() => validateRound(round)).not.toThrow();
    }
    const ids = rounds.map((round) => round.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("produces identical rounds for the same seed", () => {
    const first = lesson30.generateRounds(createRng(42));
    const second = lesson30.generateRounds(createRng(42));
    expect(second).toEqual(first);
  });

  it("produces different rounds for two different seeds", () => {
    const first = lesson30.generateRounds(createRng(1));
    const second = lesson30.generateRounds(createRng(2));
    expect(JSON.stringify(second)).not.toBe(JSON.stringify(first));
  });

  it("draws both prompt kinds in every generated set", () => {
    for (const seed of [1, 42, 20261015]) {
      const kinds = new Set(lesson30.generateRounds(createRng(seed)).map((r) => r.prompt.kind));
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

  it("answers every staff round with the theory core's generic interval number", () => {
    for (const { id, prompt } of staffRounds()) {
      const [low, high] = prompt.notes.map((note) => parseNote(note));
      const number = genericIntervalNumber(low!, high!);
      expect(answerOf(id), `staff round ${id}`).toBe(NUMBER_WORDS[number]);
    }
  });

  it("pins the site's worked generic-interval examples", () => {
    expect(answerOf("l30-staff-c4-c4-first")).toBe("First");
    expect(answerOf("l30-staff-c4-cs4-first")).toBe("First");
    expect(answerOf("l30-staff-c4-e4-third")).toBe("Third");
    expect(answerOf("l30-staff-c4-g4-fifth")).toBe("Fifth");
    expect(answerOf("l30-staff-c4-c5-eighth")).toBe("Eighth");
  });

  it("states the site's definitions and facts in every rule", () => {
    for (const rule of allRules()) {
      expect(rule).not.toMatch(GENERIC_RULE);
    }
    const rules = allRules().join(" \n ");
    expect(rules).toMatch(/distance between two notes/);
    expect(rules).toMatch(/measured on the staff/);
    expect(rules).toMatch(/prime/);
    expect(rules).toMatch(/Accidentals are ignored/);
    expect(rules).toMatch(/staff position/);
    expect(rules).toMatch(/line or space/);
    expect(rules).toMatch(/both on a line or both on a space/);
    expect(rules).toMatch(/interval type increases/);
  });
});

describe("lesson 30 companion illustrations (T5b Intervals pass)", () => {
  // The Intervals decision, applied with the no-leak rule. Six text rounds
  // here DO name concrete pitch pairs — the closest candidates in the whole
  // section — and every one of them is rejected for the same reason: the
  // question asks for the RELATIONSHIP between the two pitches (the generic
  // interval number), and engraving the pair draws that relationship on the
  // page, where the learner counts the answer off the picture. That is the
  // pilot's counting-leak class. The pool already carries the staff round
  // for each of these same pairs, so the text form is the point.
  const PITCH_NAMING = [
    "l30-text-c-cs-first",
    "l30-text-seconds-examples",
    "l30-text-fifths-examples",
    "l30-text-sixths-examples",
    "l30-text-sevenths-examples",
    "l30-text-eighths-examples",
  ];

  it("rejects an illustration for every pitch-naming text round (counting leak)", () => {
    expect(PITCH_NAMING).toHaveLength(6);
    for (const id of PITCH_NAMING) {
      expect(roundById(id).prompt.kind, id).toBe("text");
      expect(roundById(id).illustration, id).toBeUndefined();
    }
  });

  it("keeps the five definitional rounds text-only: no pitches named at all", () => {
    const definitional = lesson30Pool
      .filter((round) => round.prompt.kind === "text")
      .map((round) => round.id)
      .filter((id) => !PITCH_NAMING.includes(id));
    expect(definitional).toHaveLength(5);
    for (const id of definitional) {
      expect(roundById(id).illustration, id).toBeUndefined();
    }
  });

  it("passes the shared no-leak assertion for every pool round", () => {
    for (const round of lesson30Pool) {
      expect(() => assertNoAnswerLeak(round), round.id).not.toThrow();
    }
  });
});

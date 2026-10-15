import { afterEach, describe, expect, it } from "vitest";
import { render } from "solid-js/web";
import { validateRound } from "../lib/rounds/validate";
import type { PromptSpec, Round } from "../lib/rounds/types";
import StaffPrompt from "../components/prompts/StaffPrompt";
import {
  genericIntervalNumber,
  halfSteps,
  intervalName,
  invertInterval,
  parseNote,
  specificQuality,
  type Note,
} from "../lib/theory";
import { createRng } from "./rng";
import { lesson33, lesson33Pool } from "./lesson33";

const GENERIC_RULE = /^(correct|incorrect|wrong|that'?s right)/i;

function isStaffRound(
  round: Round,
): round is Round & { prompt: Extract<PromptSpec, { kind: "staff" }> } {
  return round.prompt.kind === "staff";
}

function staffRounds(): Array<{ id: string; prompt: Extract<PromptSpec, { kind: "staff" }> }> {
  return lesson33Pool.filter(isStaffRound).map((round) => ({ id: round.id, prompt: round.prompt }));
}

function allRules(): string[] {
  return lesson33Pool.map((round) => round.rule);
}

function roundById(id: string): Round {
  const found = lesson33Pool.find((round) => round.id === id);
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

/** The inversion of the interval a–b, as the theory core names it. */
function inversionName(a: Note, b: Note): string | null {
  const number = genericIntervalNumber(a, b);
  const quality = specificQuality(number, halfSteps(a, b));
  if (quality === null) return null;
  if (a.octave === undefined || b.octave === undefined) return null;
  // The inverted pair: the original top note, then the original bottom note
  // moved an octave higher — exactly what the lesson's verb does.
  const aUp: Note = { ...a, octave: a.octave + 1 };
  const invertedNumber = genericIntervalNumber(b, aUp);
  if (number === 8) {
    // The core inverts the octave to the unison: moving C up an octave
    // lands on C′, the same pitch as the upper note, so 9 − 8 = 1 and
    // perfect stays perfect — which is also what the inverted note pair
    // spells. Pin both sides of that agreement.
    expect(invertInterval(number, quality)).toEqual({ number: 1, quality });
    expect(invertedNumber).toBe(1);
  } else {
    expect(invertedNumber).toBe(invertInterval(number, quality).number);
  }
  return intervalName(invertedNumber, halfSteps(b, aUp));
}

const cleanups: Array<() => void> = [];

afterEach(() => {
  while (cleanups.length > 0) cleanups.pop()?.();
  document.body.replaceChildren();
});

describe("lesson 33 question pool", () => {
  it("holds 22 rounds split evenly between staff and text prompts", () => {
    expect(lesson33Pool).toHaveLength(22);
    expect(staffRounds()).toHaveLength(11);
    expect(lesson33Pool.filter((round) => round.prompt.kind === "text")).toHaveLength(11);
    const ids = lesson33Pool.map((round) => round.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("validates every pool round", () => {
    for (const round of lesson33Pool) {
      expect(() => validateRound(round)).not.toThrow();
    }
  });

  it("draws at least 12 rounds and every drawn round passes validateRound", () => {
    const rounds = lesson33.generateRounds(createRng(1234));
    expect(rounds.length).toBeGreaterThanOrEqual(12);
    for (const round of rounds) {
      expect(() => validateRound(round)).not.toThrow();
    }
    const ids = rounds.map((round) => round.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("produces identical rounds for the same seed", () => {
    const first = lesson33.generateRounds(createRng(42));
    const second = lesson33.generateRounds(createRng(42));
    expect(second).toEqual(first);
  });

  it("produces different rounds for two different seeds", () => {
    const first = lesson33.generateRounds(createRng(1));
    const second = lesson33.generateRounds(createRng(2));
    expect(JSON.stringify(second)).not.toBe(JSON.stringify(first));
  });

  it("draws both prompt kinds in every generated set", () => {
    for (const seed of [1, 42, 20261015]) {
      const kinds = new Set(lesson33.generateRounds(createRng(seed)).map((r) => r.prompt.kind));
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

  it("answers every staff round with the theory core's inversion of the shown interval", () => {
    for (const { id, prompt } of staffRounds()) {
      const [low, high] = prompt.notes.map((note) => parseNote(note));
      const name = inversionName(low!, high!);
      expect(name, `staff round ${id}`).not.toBeNull();
      expect(answerOf(id), `staff round ${id}`).toBe(name);
    }
  });

  it("pins the site's six worked inversion examples", () => {
    // Site examples: P5 C–G → P4 G–C; P4 F#–B → P5 B–F#; M3 C–E → m6 E–C;
    // m3 E–G → M6 G–E; M7 C–B → m2 B–C; A4 C–F# → d5 F#–C.
    expect(answerOf("l33-staff-c4-g4-perfect-fifth")).toBe("Perfect 4th");
    expect(answerOf("l33-staff-fs4-b4-perfect-fourth")).toBe("Perfect 5th");
    expect(answerOf("l33-staff-c4-e4-major-third")).toBe("Minor 6th");
    expect(answerOf("l33-staff-e4-g4-minor-third")).toBe("Major 6th");
    expect(answerOf("l33-staff-c4-b4-major-seventh")).toBe("Minor 2nd");
    expect(answerOf("l33-staff-c4-fs4-augmented-fourth")).toBe("Diminished 5th");
    // The extension of the site's rule to the octave: 9 − 8 = 1, perfect stays perfect.
    expect(answerOf("l33-staff-c4-c5-perfect-octave")).toBe("Perfect Unison");
  });

  it("states the site's inversion facts in every rule", () => {
    for (const rule of allRules()) {
      expect(rule).not.toMatch(GENERIC_RULE);
    }
    const rules = allRules().join(" \n ");
    expect(rules).toMatch(/octave higher/);
    expect(rules).toMatch(/perfect intervals.*invert to other perfect intervals|perfect.*stays? perfect/);
    expect(rules).toMatch(/major.*minor|minor.*major/);
    expect(rules).toMatch(/augmented.*diminished|diminished.*augmented/);
    expect(rules).toMatch(/9 − [1-8]|[Nn]ine minus/);
  });
});

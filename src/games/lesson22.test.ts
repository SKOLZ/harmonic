import { afterEach, describe, expect, it } from "vitest";
import { render } from "solid-js/web";
import { validateRound } from "../lib/rounds/validate";
import { assertNoAnswerLeak } from "../lib/rounds/noAnswerLeak";
import type { PromptSpec, Round } from "../lib/rounds/types";
import StaffPrompt from "../components/prompts/StaffPrompt";
import { createRng } from "./rng";
import { lesson22, lesson22Pool } from "./lesson22";

const GENERIC_RULE = /^(correct|incorrect|wrong|that'?s right)/i;

function staffPrompts(): Extract<PromptSpec, { kind: "staff" }>[] {
  return lesson22Pool
    .map((round) => round.prompt)
    .filter((prompt): prompt is Extract<PromptSpec, { kind: "staff" }> => prompt.kind === "staff");
}

function allRules(): string[] {
  return lesson22Pool.map((round) => round.rule);
}

function roundById(id: string): Round {
  const found = lesson22Pool.find((round) => round.id === id);
  expect(found, `round ${id} is missing from the pool`).toBeDefined();
  return found!;
}

function notesOf(id: string): string[] {
  const prompt = roundById(id).prompt;
  expect(prompt.kind).toBe("staff");
  return (prompt as Extract<PromptSpec, { kind: "staff" }>).notes;
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

describe("lesson 22 question pool", () => {
  it("holds 22 rounds split evenly between staff and text prompts", () => {
    expect(lesson22Pool).toHaveLength(22);
    expect(staffPrompts()).toHaveLength(11);
    expect(lesson22Pool.filter((round) => round.prompt.kind === "text")).toHaveLength(11);
    const ids = lesson22Pool.map((round) => round.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("validates every pool round", () => {
    for (const round of lesson22Pool) {
      expect(() => validateRound(round)).not.toThrow();
    }
  });

  it("draws at least 12 rounds and every drawn round passes validateRound", () => {
    const rounds = lesson22.generateRounds(createRng(1234));
    expect(rounds.length).toBeGreaterThanOrEqual(12);
    for (const round of rounds) {
      expect(() => validateRound(round)).not.toThrow();
    }
    const ids = rounds.map((round) => round.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("produces identical rounds for the same seed", () => {
    const first = lesson22.generateRounds(createRng(42));
    const second = lesson22.generateRounds(createRng(42));
    expect(second).toEqual(first);
  });

  it("produces different rounds for two different seeds", () => {
    const first = lesson22.generateRounds(createRng(1));
    const second = lesson22.generateRounds(createRng(2));
    expect(JSON.stringify(second)).not.toBe(JSON.stringify(first));
  });

  it("draws both prompt kinds in every generated set", () => {
    for (const seed of [1, 42, 20261015]) {
      const kinds = new Set(lesson22.generateRounds(createRng(seed)).map((r) => r.prompt.kind));
      expect(kinds.has("staff")).toBe(true);
      expect(kinds.has("text")).toBe(true);
    }
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
      expect(svg, `minor-scale prompt ${JSON.stringify(prompt.notes)} did not engrave`).not.toBeNull();
      // The five staff lines are paths; the notes draw on top of them.
      expect(svg!.querySelectorAll("path").length).toBeGreaterThanOrEqual(5);
    }
  });

  it("spells the staff scales exactly as the theory core spells them", () => {
    expect(notesOf("l22-staff-a-natural-minor-name")).toEqual([
      "A4",
      "B4",
      "C5",
      "D5",
      "E5",
      "F5",
      "G5",
    ]);
    expect(notesOf("l22-staff-c-harmonic-name")).toEqual([
      "C4",
      "D4",
      "Eb4",
      "F4",
      "G4",
      "Ab4",
      "B4",
    ]);
    expect(notesOf("l22-staff-c-melodic-name")).toEqual([
      "C4",
      "D4",
      "Eb4",
      "F4",
      "G4",
      "A4",
      "B4",
    ]);
    expect(notesOf("l22-staff-gs-natural-minor-name")).toEqual([
      "G#4",
      "A#4",
      "B4",
      "C#5",
      "D#5",
      "E5",
      "F#5",
    ]);
    expect(notesOf("l22-staff-f-natural-minor-name")).toEqual([
      "F4",
      "G4",
      "Ab4",
      "Bb4",
      "C5",
      "Db5",
      "Eb5",
    ]);
    expect(notesOf("l22-staff-a-natural-half-step-bass")).toEqual([
      "A2",
      "B2",
      "C3",
      "D3",
      "E3",
      "F3",
      "G3",
    ]);
  });

  it("answers the conversion and spelling rounds from the theory core", () => {
    // Which note the harmonic conversion raises.
    expect(answerOf("l22-staff-c-to-harmonic")).toBe("Bb4");
    expect(answerOf("l22-staff-a-to-harmonic")).toBe("G5");
    // Which notes the melodic conversion raises.
    expect(answerOf("l22-staff-a-to-melodic")).toMatch(/^The sixth and seventh/);
    // Half steps of the natural-minor formula (degrees 2–3 and 5–6).
    expect(answerOf("l22-staff-c-natural-half-step")).toBe("D–Eb");
    expect(answerOf("l22-staff-a-natural-half-step-bass")).toBe("B–C");
    // Site-verified spellings, 7 notes each.
    expect(answerOf("l22-text-c-harmonic-spelling")).toBe("C D Eb F G Ab B");
    expect(answerOf("l22-text-c-melodic-spelling")).toBe("C D Eb F G A B");
    expect(answerOf("l22-text-natural-formula")).toBe(
      "Whole, half, whole, whole, half, whole, whole",
    );
  });

  it("states music-theory facts rather than verdicts", () => {
    for (const rule of allRules()) {
      expect(rule).not.toMatch(GENERIC_RULE);
    }
    const rules = allRules().join(" \n ");
    expect(rules).toMatch(/W–H–W–W–H–W–W/);
    expect(rules).toMatch(/raise the seventh note by a half step/);
    expect(rules).toMatch(/sixth and seventh/);
    expect(rules).toMatch(/only when ascending/);
    expect(rules).toMatch(/composers prefer to use the natural minor scale/);
    expect(rules).toMatch(/five sharps/);
    expect(rules).toMatch(/three flats/);
    expect(rules).toMatch(/no notes with accidentals/);
  });
});

describe("lesson 22 companion illustrations (T5c Scales pass)", () => {
  // Zero yield for The Minor Scales — every text round is a count, a
  // definition, a conversion procedure, or a spelling recall, and the strict
  // rule excludes each class. The section's structural reason is worth
  // stating: the interesting pitches here ARE the answers. "How is C
  // harmonic minor spelled?" has no question pitch distinct from its
  // answer — the only faithful engraving of the named subject is the answer
  // spelled out on the staff. Each class is recorded below rather than
  // guessed round by round later, and the pool is swept through the shared
  // no-leak helper.
  const COUNT = [
    "l22-text-three-variations",
    "l22-text-gs-sharps",
    "l22-text-c-flats",
  ];
  const DEFINITION = [
    "l22-text-natural-formula",
    "l22-text-melodic-ascending",
    "l22-text-descending-natural",
  ];
  const PROCEDURE = ["l22-text-to-harmonic", "l22-text-to-melodic"];
  // Self-revealing: engraving the named scale either IS the answer (the two
  // spelling rounds) or displays the very property asked for (A natural
  // minor drawn plain shows the "no accidentals" the question points at —
  // and its prompt names no pitch to begin with).
  const SELF_REVEALING = [
    "l22-text-no-accidentals",
    "l22-text-c-harmonic-spelling",
    "l22-text-c-melodic-spelling",
  ];

  it("accounts for every text round in the rejection table", () => {
    const textIds = lesson22Pool
      .filter((round) => round.prompt.kind === "text")
      .map((round) => round.id)
      .sort();
    expect(textIds).toHaveLength(11);
    expect(textIds).toEqual(
      [...COUNT, ...DEFINITION, ...PROCEDURE, ...SELF_REVEALING].sort(),
    );
  });

  it("keeps the three count rounds text-only: counts stay text-only", () => {
    expect(COUNT).toHaveLength(3);
    for (const id of COUNT) {
      expect(roundById(id).illustration, id).toBeUndefined();
    }
  });

  it("keeps the definition rounds text-only: class subjects, no named pitch", () => {
    expect(DEFINITION).toHaveLength(3);
    for (const id of DEFINITION) {
      expect(roundById(id).illustration, id).toBeUndefined();
    }
  });

  it("keeps the conversion-procedure rounds text-only: methods, not pitches", () => {
    expect(PROCEDURE).toHaveLength(2);
    for (const id of PROCEDURE) {
      expect(roundById(id).illustration, id).toBeUndefined();
    }
  });

  it("keeps the three self-revealing rounds text-only: the picture would be the answer", () => {
    // The two spelling rounds answer with the note list itself, so any
    // engraving of the named scale puts the answer on the page; the
    // no-accidentals round would show its own answer the same way.
    expect(SELF_REVEALING).toHaveLength(3);
    for (const id of SELF_REVEALING) {
      expect(roundById(id).prompt.kind, id).toBe("text");
      expect(roundById(id).illustration, id).toBeUndefined();
    }
  });

  it("passes the shared no-leak assertion for every pool round", () => {
    for (const round of lesson22Pool) {
      expect(() => assertNoAnswerLeak(round), round.id).not.toThrow();
    }
  });
});

import { afterEach, describe, expect, it } from "vitest";
import { render } from "solid-js/web";
import { validateRound } from "../lib/rounds/validate";
import { assertNoAnswerLeak } from "../lib/rounds/noAnswerLeak";
import type { PromptSpec, Round } from "../lib/rounds/types";
import StaffPrompt from "../components/prompts/StaffPrompt";
import { createRng } from "./rng";
import { lesson21, lesson21Pool } from "./lesson21";

const GENERIC_RULE = /^(correct|incorrect|wrong|that'?s right)/i;

function staffPrompts(): Extract<PromptSpec, { kind: "staff" }>[] {
  return lesson21Pool
    .map((round) => round.prompt)
    .filter((prompt): prompt is Extract<PromptSpec, { kind: "staff" }> => prompt.kind === "staff");
}

function allRules(): string[] {
  return lesson21Pool.map((round) => round.rule);
}

function roundById(id: string): Round {
  const found = lesson21Pool.find((round) => round.id === id);
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

describe("lesson 21 question pool", () => {
  it("holds 22 rounds split evenly between staff and text prompts", () => {
    expect(lesson21Pool).toHaveLength(22);
    expect(staffPrompts()).toHaveLength(11);
    expect(lesson21Pool.filter((round) => round.prompt.kind === "text")).toHaveLength(11);
    const ids = lesson21Pool.map((round) => round.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("validates every pool round", () => {
    for (const round of lesson21Pool) {
      expect(() => validateRound(round)).not.toThrow();
    }
  });

  it("draws at least 12 rounds and every drawn round passes validateRound", () => {
    const rounds = lesson21.generateRounds(createRng(1234));
    expect(rounds.length).toBeGreaterThanOrEqual(12);
    for (const round of rounds) {
      expect(() => validateRound(round)).not.toThrow();
    }
    const ids = rounds.map((round) => round.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("produces identical rounds for the same seed", () => {
    const first = lesson21.generateRounds(createRng(42));
    const second = lesson21.generateRounds(createRng(42));
    expect(second).toEqual(first);
  });

  it("produces different rounds for two different seeds", () => {
    const first = lesson21.generateRounds(createRng(1));
    const second = lesson21.generateRounds(createRng(2));
    expect(JSON.stringify(second)).not.toBe(JSON.stringify(first));
  });

  it("draws both prompt kinds in every generated set", () => {
    for (const seed of [1, 42, 20261015]) {
      const kinds = new Set(lesson21.generateRounds(createRng(seed)).map((r) => r.prompt.kind));
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
      expect(svg, `scale prompt ${JSON.stringify(prompt.notes)} did not engrave`).not.toBeNull();
      // The five staff lines are paths; the notes draw on top of them.
      expect(svg!.querySelectorAll("path").length).toBeGreaterThanOrEqual(5);
    }
  });

  it("spells the staff scales exactly as the theory core spells them", () => {
    expect(notesOf("l21-staff-c-major-half-step")).toEqual([
      "C4",
      "D4",
      "E4",
      "F4",
      "G4",
      "A4",
      "B4",
    ]);
    expect(notesOf("l21-staff-eb-major-name")).toEqual([
      "Eb4",
      "F4",
      "G4",
      "Ab4",
      "Bb4",
      "C5",
      "D5",
    ]);
    expect(notesOf("l21-staff-a-major-name")).toEqual([
      "A4",
      "B4",
      "C#5",
      "D5",
      "E5",
      "F#5",
      "G#5",
    ]);
    expect(notesOf("l21-staff-g-major-name-bass")).toEqual([
      "G2",
      "A2",
      "B2",
      "C3",
      "D3",
      "E3",
      "F#3",
    ]);
    expect(notesOf("l21-staff-a-major-degree-bass")).toEqual([
      "A2",
      "B2",
      "C#3",
      "D3",
      "E3",
      "F#3",
      "G#3",
    ]);
  });

  it("asks the half-step questions with exactly one half-step option", () => {
    expect(roundById("l21-staff-c-major-half-step").answer).toEqual({
      kind: "choices",
      options: ["E–F", "C–D", "G–A", "A–B"],
      correctIndex: 0,
    });
    expect(answerOf("l21-staff-d-major-half-step")).toBe("F#–G");
    expect(answerOf("l21-staff-c-major-wrong-note")).toBe("Bb4");
    expect(answerOf("l21-staff-c-major-next")).toBe("B");
    expect(answerOf("l21-staff-eb-major-next")).toBe("Ab4");
    expect(answerOf("l21-staff-f-major-flats")).toBe("One");
    expect(answerOf("l21-staff-a-major-degree-bass")).toBe("The seventh degree");
    expect(answerOf("l21-text-major-formula")).toBe("Whole, whole, half, whole, whole, whole, half");
  });

  it("states music-theory facts rather than verdicts", () => {
    for (const rule of allRules()) {
      expect(rule).not.toMatch(GENERIC_RULE);
    }
    const rules = allRules().join(" \n ");
    expect(rules).toMatch(/W–W–H–W–W–W–H/);
    expect(rules).toMatch(/no accidentals/);
    expect(rules).toMatch(/three flats/);
    expect(rules).toMatch(/two sharps/);
    expect(rules).toMatch(/half step below the tonic/);
    expect(rules).toMatch(/seven distinct notes/);
    expect(rules).toMatch(/start on the first note and follow the formula/);
  });
});

describe("lesson 21 companion illustrations (T5c Scales pass)", () => {
  // The strict no-leak rule applied to The Major Scale's eleven text rounds:
  // exactly two qualify, and both are the lesson's upward-building drills —
  // "Starting from G, which note is the second degree of G major?" shows the
  // G the learner builds from, never the A the learner must find (the T5a/T5b
  // archetype: the question's root on the page, the derived answer off it).
  // The other nine are rejected class by class below, each reason recorded
  // round by round so the decision survives with the code.
  const ILLUSTRATED = [
    "l21-text-f-major-fourth",
    "l21-text-g-major-second",
  ];
  // Counts: the answer is a quantity, so there is no question pitch to draw —
  // and engraving the named scale would let the learner count the answer off
  // the picture (the pilot's counting-leak class).
  const COUNT = [
    "l21-text-half-step-count",
    "l21-text-seven-notes",
    "l21-text-eb-major-flats",
    "l21-text-d-major-sharps",
  ];
  // Class-level subjects and definitions: the question is about the scale
  // species ("every major scale") or the method itself, and names no concrete
  // pitch — engraving an example would invent a subject the question never
  // names, which the user's strict decision explicitly declined to do.
  const CLASS_LEVEL = [
    "l21-text-what-is-a-scale",
    "l21-text-major-formula",
    "l21-text-half-step-degrees",
    "l21-text-build-any-major",
  ];
  // Self-revealing: the only faithful engraving of the named subject displays
  // the answer outright.
  const SELF_REVEALING = ["l21-text-c-major-accidentals"];

  function illustratedRounds(): Round[] {
    return lesson21Pool.filter((round) => round.illustration !== undefined);
  }

  it("accounts for every text round: two illustrated, nine classified rejections", () => {
    const textIds = lesson21Pool
      .filter((round) => round.prompt.kind === "text")
      .map((round) => round.id)
      .sort();
    expect(textIds).toHaveLength(11);
    expect(textIds).toEqual([...ILLUSTRATED, ...COUNT, ...CLASS_LEVEL, ...SELF_REVEALING].sort());
  });

  it("illustrates exactly the two starting-root drills", () => {
    expect(illustratedRounds().map((round) => round.id).sort()).toEqual(ILLUSTRATED);
  });

  it("attaches illustrations only to text-prompt rounds", () => {
    for (const round of illustratedRounds()) {
      expect(round.prompt.kind).toBe("text");
    }
  });

  it("engraves the question's root alone — never the degree the learner must build", () => {
    expect(roundById("l21-text-g-major-second").illustration).toEqual({
      clef: "treble",
      notes: ["G4"],
    });
    expect(roundById("l21-text-f-major-fourth").illustration).toEqual({
      clef: "treble",
      notes: ["F4"],
    });
  });

  it("matches each illustrated root to the root its own prompt names", () => {
    // The illustration must be the question's own starting pitch, pinned to
    // the prompt's wording so the two cannot drift apart: the picture is G
    // because the question says "Starting from G", not because a test
    // decided G looked right.
    const fromG = roundById("l21-text-g-major-second").prompt;
    expect(fromG.kind).toBe("text");
    expect((fromG as Extract<PromptSpec, { kind: "text" }>).text).toContain("Starting from G");
    const fromF = roundById("l21-text-f-major-fourth").prompt;
    expect(fromF.kind).toBe("text");
    expect((fromF as Extract<PromptSpec, { kind: "text" }>).text).toContain("Starting from F");
    // The answers stay off the page: G is not A, F is not Bb.
    expect(answerOf("l21-text-g-major-second")).toBe("A");
    expect(answerOf("l21-text-f-major-fourth")).toBe("Bb");
  });

  it("keeps the four count rounds text-only: a count has no question pitch to draw", () => {
    expect(COUNT).toHaveLength(4);
    for (const id of COUNT) {
      expect(roundById(id).prompt.kind, id).toBe("text");
      expect(roundById(id).illustration, id).toBeUndefined();
    }
  });

  it("keeps the definitional and class-level rounds text-only: no prompt names a pitch", () => {
    // The sharpest call here is l21-text-half-step-degrees: it asks where the
    // half steps of "every major scale" fall. lesson20's pilot illustrated the
    // analogous pair question with a neutral C-major staff — the pilot's one
    // stretch (lesson 33's suite records it as such) — but the strict rule
    // this pass runs under gates on concrete named pitches and bans drawing
    // an example the question never names, so it stays text-only here.
    expect(CLASS_LEVEL).toHaveLength(4);
    for (const id of CLASS_LEVEL) {
      expect(roundById(id).prompt.kind, id).toBe("text");
      expect(roundById(id).illustration, id).toBeUndefined();
    }
  });

  it("keeps the C-major accidentals round text-only: a faithful engraving displays the answer", () => {
    // "Which accidentals does C major need?" answers "None — every note is a
    // natural". The only faithful picture of the named subject is C major
    // itself, and a staff of plain naturals shows exactly the absence the
    // learner is asked to state — the self-revealing class. A bare C would
    // not depict the accidental question at all, so no honest illustration
    // exists for this round.
    expect(SELF_REVEALING).toEqual(["l21-text-c-major-accidentals"]);
    for (const id of SELF_REVEALING) {
      expect(roundById(id).illustration, id).toBeUndefined();
    }
  });

  it("passes the shared no-leak assertion for every pool round", () => {
    for (const round of lesson21Pool) {
      expect(() => assertNoAnswerLeak(round), round.id).not.toThrow();
    }
  });

  it("engraves every illustration through the real Staff renderer", () => {
    // Triangulation: the slot speaks the staff-prompt shape, so each
    // illustration has to survive the actual engraver, not just the type.
    for (const round of illustratedRounds()) {
      const host = document.createElement("div");
      document.body.appendChild(host);
      const dispose = render(
        () => StaffPrompt({ prompt: { kind: "staff", ...round.illustration! } }),
        host,
      );
      cleanups.push(() => {
        dispose();
        host.remove();
      });
      const svg = host.querySelector("svg");
      expect(svg, `illustration ${round.id} did not engrave`).not.toBeNull();
      expect(svg!.querySelectorAll("path").length).toBeGreaterThanOrEqual(5);
    }
  });
});

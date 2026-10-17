import { afterEach, describe, expect, it } from "vitest";
import { render } from "solid-js/web";
import { validateRound } from "../lib/rounds/validate";
import { assertNoAnswerLeak } from "../lib/rounds/noAnswerLeak";
import type { PromptSpec, Round } from "../lib/rounds/types";
import StaffPrompt from "../components/prompts/StaffPrompt";
import { createRng } from "./rng";
import { lesson24, lesson24Pool } from "./lesson24";

const GENERIC_RULE = /^(correct|incorrect|wrong|that'?s right)/i;

function staffPrompts(): Extract<PromptSpec, { kind: "staff" }>[] {
  return lesson24Pool
    .map((round) => round.prompt)
    .filter((prompt): prompt is Extract<PromptSpec, { kind: "staff" }> => prompt.kind === "staff");
}

function allRules(): string[] {
  return lesson24Pool.map((round) => round.rule);
}

function roundById(id: string): Round {
  const found = lesson24Pool.find((round) => round.id === id);
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

describe("lesson 24 question pool", () => {
  it("holds 22 rounds split evenly between staff and text prompts", () => {
    expect(lesson24Pool).toHaveLength(22);
    expect(staffPrompts()).toHaveLength(11);
    expect(lesson24Pool.filter((round) => round.prompt.kind === "text")).toHaveLength(11);
    const ids = lesson24Pool.map((round) => round.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("validates every pool round", () => {
    for (const round of lesson24Pool) {
      expect(() => validateRound(round)).not.toThrow();
    }
  });

  it("draws at least 12 rounds and every drawn round passes validateRound", () => {
    const rounds = lesson24.generateRounds(createRng(1234));
    expect(rounds.length).toBeGreaterThanOrEqual(12);
    for (const round of rounds) {
      expect(() => validateRound(round)).not.toThrow();
    }
    const ids = rounds.map((round) => round.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("produces identical rounds for the same seed", () => {
    const first = lesson24.generateRounds(createRng(42));
    const second = lesson24.generateRounds(createRng(42));
    expect(second).toEqual(first);
  });

  it("produces different rounds for two different seeds", () => {
    const first = lesson24.generateRounds(createRng(1));
    const second = lesson24.generateRounds(createRng(2));
    expect(JSON.stringify(second)).not.toBe(JSON.stringify(first));
  });

  it("draws both prompt kinds in every generated set", () => {
    for (const seed of [1, 42, 20261015]) {
      const kinds = new Set(lesson24.generateRounds(createRng(seed)).map((r) => r.prompt.kind));
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
      expect(svg, `staff prompt ${JSON.stringify(prompt)} did not engrave`).not.toBeNull();
      expect(svg!.querySelectorAll("path").length).toBeGreaterThanOrEqual(5);
    }
  });

  it("spells the staff scales exactly as the theory core spells them", () => {
    expect(notesOf("l24-staff-g-major-scale")).toEqual([
      "G4", "A4", "B4", "C5", "D5", "E5", "F#5",
    ]);
    expect(notesOf("l24-staff-d-major-scale")).toEqual([
      "D4", "E4", "F#4", "G4", "A4", "B4", "C#5",
    ]);
    expect(notesOf("l24-staff-f-major-scale")).toEqual([
      "F4", "G4", "A4", "Bb4", "C5", "D5", "E5",
    ]);
    expect(notesOf("l24-staff-eb-major-scale")).toEqual([
      "Eb4", "F4", "G4", "Ab4", "Bb4", "C5", "D5",
    ]);
    expect(notesOf("l24-staff-bb-major-scale")).toEqual([
      "Bb4", "C5", "D5", "Eb5", "F5", "G5", "A5",
    ]);
    expect(notesOf("l24-staff-c-minor-flats")).toEqual([
      "C4", "D4", "Eb4", "F4", "G4", "Ab4", "Bb4",
    ]);
  });

  it("builds the signature-accidental prompts in canonical order", () => {
    // The site's A major slide moves C#, F# and G# into the signature; the
    // signature itself reads in the order of sharps: F# C# G#.
    expect(notesOf("l24-staff-a-major-signature")).toEqual(["F#4", "C#5", "G#5"]);
    expect(notesOf("l24-staff-e-major-signature")).toEqual(["F#4", "C#5", "G#5", "D#5"]);
    expect(answerOf("l24-staff-a-major-signature")).toBe("A major");
    expect(answerOf("l24-staff-e-major-signature")).toBe("E major");
  });

  it("asks accumulation questions against the site's order of sharps and flats", () => {
    expect(answerOf("l24-staff-next-sharp-after-g")).toBe("C#");
    expect(answerOf("l24-staff-next-flat-after-eb")).toBe("Db");
    expect(answerOf("l24-staff-db-count")).toBe("Five");
    expect(answerOf("l24-staff-c-minor-flats")).toBe("Three");
    expect(answerOf("l24-text-fifth-flat")).toBe("Gb");
    expect(answerOf("l24-text-first-sharp")).toBe("F#");
  });

  it("states the site's definitions, orders and mnemonics", () => {
    for (const rule of allRules()) {
      expect(rule).not.toMatch(GENERIC_RULE);
    }
    const rules = allRules().join(" \n ");
    expect(rules).toMatch(/collection of every accidental found in a scale/);
    expect(rules).toMatch(/opposite order/);
    expect(rules).toMatch(/F#.*C#.*G#.*D#.*A#.*E#.*B#/);
    expect(rules).toMatch(/Bb.*Eb.*Ab.*Db.*Gb.*Cb.*Fb/);
    expect(rules).toMatch(/Father Charles Goes Down And Ends Battle/);
    expect(rules).toMatch(/Battle Ends And Down Goes Charles' Father/);
    // The site's worked examples.
    expect(rules).toMatch(/A major has three sharps/);
    expect(rules).toMatch(/E major has four sharps/);
    expect(rules).toMatch(/Db major has five flats/);
    expect(rules).toMatch(/C minor has three flats/);
  });
});

describe("lesson 24 companion illustrations (T5c Scales pass)", () => {
  // Zero yield for Key Signatures — the tightest section of the seven, and
  // instructive: its two order rounds are the only text rounds in the whole
  // sweep whose SUBJECT is concrete named pitches (F#, C#, G#… / Bb, Eb,
  // Ab…), and they are still rejected, because those pitches are also the
  // ANSWER — engraving the order puts the correct option on the staff for
  // the learner to read back. The first-sharp and fifth-flat rounds fail
  // the same way in miniature: the prompt names no pitch, and the only
  // pitch available to draw (F#, Gb) is the answer itself. The rest are
  // definitions, counts, and mnemonics. Recorded class by class below;
  // every pool round is swept through the shared no-leak helper.
  const DEFINITION = ["l24-text-definition", "l24-text-opposite-order"];
  // The answer IS the pitch list: any engraving of it is the answer.
  const ORDER_LIST = ["l24-text-order-of-sharps", "l24-text-order-of-flats"];
  const MNEMONIC = ["l24-text-flat-mnemonic", "l24-text-sharp-mnemonic"];
  const COUNT = [
    "l24-text-a-major-sharps",
    "l24-text-e-major-sharps",
    "l24-text-db-major-flats",
  ];
  // The prompt names no pitch; the answer is a pitch, so drawing it would
  // engrave the answer — the mirror of the order rounds.
  const ORDER_ELEMENT = ["l24-text-first-sharp", "l24-text-fifth-flat"];

  it("accounts for every text round in the rejection table", () => {
    const textIds = lesson24Pool
      .filter((round) => round.prompt.kind === "text")
      .map((round) => round.id)
      .sort();
    expect(textIds).toHaveLength(11);
    expect(textIds).toEqual(
      [...DEFINITION, ...ORDER_LIST, ...MNEMONIC, ...COUNT, ...ORDER_ELEMENT].sort(),
    );
  });

  it("keeps the definition rounds text-only: definitions, no named pitch", () => {
    expect(DEFINITION).toHaveLength(2);
    for (const id of DEFINITION) {
      expect(roundById(id).illustration, id).toBeUndefined();
    }
  });

  it("keeps both order rounds text-only: the pitches ARE the answer", () => {
    expect(ORDER_LIST).toHaveLength(2);
    for (const id of ORDER_LIST) {
      expect(roundById(id).prompt.kind, id).toBe("text");
      expect(roundById(id).illustration, id).toBeUndefined();
    }
  });

  it("keeps the mnemonic rounds text-only: prose answers, no subject to draw", () => {
    expect(MNEMONIC).toHaveLength(2);
    for (const id of MNEMONIC) {
      expect(roundById(id).illustration, id).toBeUndefined();
    }
  });

  it("keeps the three sharp/flat count rounds text-only: counts stay text-only", () => {
    expect(COUNT).toHaveLength(3);
    for (const id of COUNT) {
      expect(roundById(id).illustration, id).toBeUndefined();
    }
  });

  it("keeps the two order-element rounds text-only: the only drawable pitch is the answer", () => {
    // "Which accidental is the first sharp…?" names no pitch in its prompt;
    // F# is the correct option, so engraving it hands over the answer, and
    // engraving anything else would invent a subject the question never
    // named. Same shape for the fifth flat (Gb).
    expect(ORDER_ELEMENT).toHaveLength(2);
    for (const id of ORDER_ELEMENT) {
      expect(roundById(id).prompt.kind, id).toBe("text");
      expect(roundById(id).illustration, id).toBeUndefined();
    }
  });

  it("passes the shared no-leak assertion for every pool round", () => {
    for (const round of lesson24Pool) {
      expect(() => assertNoAnswerLeak(round), round.id).not.toThrow();
    }
  });
});

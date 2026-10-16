import { afterEach, describe, expect, it } from "vitest";
import { render } from "solid-js/web";
import { validateRound } from "../lib/rounds/validate";
import { assertNoAnswerLeak } from "../lib/rounds/noAnswerLeak";
import type { PromptSpec, Round } from "../lib/rounds/types";
import StaffPrompt from "../components/prompts/StaffPrompt";
import {
  genericIntervalNumber,
  halfSteps,
  intervalName,
  parseNote,
  scientificName,
  spellInterval,
  type IntervalQuality,
} from "../lib/theory";
import { createRng } from "./rng";
import { lesson32, lesson32Pool } from "./lesson32";

const GENERIC_RULE = /^(correct|incorrect|wrong|that'?s right)/i;

function isStaffRound(
  round: Round,
): round is Round & { prompt: Extract<PromptSpec, { kind: "staff" }> } {
  return round.prompt.kind === "staff";
}

function staffRounds(): Array<{ id: string; prompt: Extract<PromptSpec, { kind: "staff" }> }> {
  return lesson32Pool.filter(isStaffRound).map((round) => ({ id: round.id, prompt: round.prompt }));
}

function allRules(): string[] {
  return lesson32Pool.map((round) => round.rule);
}

function roundById(id: string): Round {
  const found = lesson32Pool.find((round) => round.id === id);
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

/**
 * The site's writing drills pinned as root + intended quality + number: the
 * answer must be exactly what the theory core spells for that triple, so no
 * spelling in the pool can drift from the core.
 */
const WRITTEN: ReadonlyArray<{
  id: string;
  root: string;
  number: number;
  quality: IntervalQuality;
}> = [
  { id: "l32-text-minor-third-above-c", root: "C", number: 3, quality: "minor" },
  { id: "l32-text-major-sixth-above-fs", root: "F#", number: 6, quality: "major" },
  { id: "l32-text-diminished-fifth-above-b", root: "B", number: 5, quality: "diminished" },
  { id: "l32-text-augmented-fourth-above-c", root: "C", number: 4, quality: "augmented" },
  { id: "l32-text-diminished-fifth-above-c", root: "C", number: 5, quality: "diminished" },
];

const cleanups: Array<() => void> = [];

afterEach(() => {
  while (cleanups.length > 0) cleanups.pop()?.();
  document.body.replaceChildren();
});

describe("lesson 32 question pool", () => {
  it("holds 22 rounds split evenly between staff and text prompts", () => {
    expect(lesson32Pool).toHaveLength(22);
    expect(staffRounds()).toHaveLength(11);
    expect(lesson32Pool.filter((round) => round.prompt.kind === "text")).toHaveLength(11);
    const ids = lesson32Pool.map((round) => round.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("validates every pool round", () => {
    for (const round of lesson32Pool) {
      expect(() => validateRound(round)).not.toThrow();
    }
  });

  it("draws at least 12 rounds and every drawn round passes validateRound", () => {
    const rounds = lesson32.generateRounds(createRng(1234));
    expect(rounds.length).toBeGreaterThanOrEqual(12);
    for (const round of rounds) {
      expect(() => validateRound(round)).not.toThrow();
    }
    const ids = rounds.map((round) => round.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("produces identical rounds for the same seed", () => {
    const first = lesson32.generateRounds(createRng(42));
    const second = lesson32.generateRounds(createRng(42));
    expect(second).toEqual(first);
  });

  it("produces different rounds for two different seeds", () => {
    const first = lesson32.generateRounds(createRng(1));
    const second = lesson32.generateRounds(createRng(2));
    expect(JSON.stringify(second)).not.toBe(JSON.stringify(first));
  });

  it("draws both prompt kinds in every generated set", () => {
    for (const seed of [1, 42, 20261015]) {
      const kinds = new Set(lesson32.generateRounds(createRng(seed)).map((r) => r.prompt.kind));
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

  it("names every staff interval exactly as the theory core names it", () => {
    for (const { id, prompt } of staffRounds()) {
      const [low, high] = prompt.notes.map((note) => parseNote(note));
      const name = intervalName(genericIntervalNumber(low!, high!), halfSteps(low!, high!));
      expect(name, `staff round ${id}`).not.toBeNull();
      expect(answerOf(id), `staff round ${id}`).toBe(name);
    }
  });

  it("engraves the site's three written examples with the site's spellings", () => {
    // The site's answers: minor third from C is C–Eb, major sixth from F# is
    // F#–D# (on D, not E), diminished fifth from B is B–F with no accidental.
    expect(notesOf("l32-staff-c4-eb4-minor-third")).toEqual(["C4", "Eb4"]);
    expect(notesOf("l32-staff-fs4-ds5-major-sixth")).toEqual(["F#4", "D#5"]);
    expect(notesOf("l32-staff-b4-f5-diminished-fifth")).toEqual(["B4", "F5"]);
    expect(answerOf("l32-staff-c4-eb4-minor-third")).toBe("Minor 3rd");
    expect(answerOf("l32-staff-fs4-ds5-major-sixth")).toBe("Major 6th");
    expect(answerOf("l32-staff-b4-f5-diminished-fifth")).toBe("Diminished 5th");
  });

  it("spells every writing drill exactly as the theory core spells it", () => {
    for (const { id, root, number, quality } of WRITTEN) {
      expect(answerOf(id), `writing drill ${id}`).toBe(
        scientificName(spellInterval(parseNote(root), number, quality)),
      );
    }
  });

  it("pins the site's three-step process and confusable pair", () => {
    expect(answerOf("l32-text-first-step")).toBe("Write the generic interval on the staff");
    expect(answerOf("l32-text-second-step")).toBe(
      "Figure out the number of half steps on the keyboard",
    );
    expect(answerOf("l32-text-third-step")).toBe(
      "Compare the staff and keyboard results, adding any needed accidentals",
    );
    expect(answerOf("l32-text-aug-vs-dim")).toBe("One is a fourth and the other is a fifth");
    expect(answerOf("l32-text-minor-third-half-steps")).toBe("Three");
    expect(answerOf("l32-text-diminished-fifth-half-steps")).toBe("Six");
  });

  it("states the three-step process and the spelling facts in every rule", () => {
    for (const rule of allRules()) {
      expect(rule).not.toMatch(GENERIC_RULE);
    }
    const rules = allRules().join(" \n ");
    expect(rules).toMatch(/generic (interval|third|fourth|fifth|sixth|seventh|eighth)/);
    expect(rules).toMatch(/half steps/);
    expect(rules).toMatch(/accidental/);
    expect(rules).toMatch(/sound the same/);
    expect(rules).toMatch(/fourth and the other is a fifth|fourth, the other a fifth/);
  });
});

describe("lesson 32 companion illustrations (T5b Intervals pass)", () => {
  function illustratedRounds(): Round[] {
    return lesson32Pool.filter((round) => round.illustration !== undefined);
  }

  it("illustrates exactly the five upward-building text rounds", () => {
    // The Intervals decision, applied with the shared no-leak rule: these five
    // are the section's only rounds whose question names a concrete pitch AND
    // whose answer (the built note) is not on the page — the "fifth above C
    // shows C, not C and G" archetype, five times over. Everything else here
    // is procedural, is a half-step count with no pinned pitches, or would
    // leak by being counted off the picture (the confusable pair).
    const ids = illustratedRounds().map((round) => round.id).sort();
    expect(ids).toEqual([
      "l32-text-augmented-fourth-above-c",
      "l32-text-diminished-fifth-above-b",
      "l32-text-diminished-fifth-above-c",
      "l32-text-major-sixth-above-fs",
      "l32-text-minor-third-above-c",
    ]);
  });

  it("attaches illustrations only to text-prompt rounds", () => {
    for (const round of illustratedRounds()) {
      expect(round.prompt.kind).toBe("text");
    }
  });

  it("engraves the question's root alone — never the note the learner must build", () => {
    expect(roundById("l32-text-minor-third-above-c").illustration).toEqual({
      clef: "treble",
      notes: ["C4"],
    });
    expect(roundById("l32-text-major-sixth-above-fs").illustration).toEqual({
      clef: "treble",
      notes: ["F#4"],
    });
    expect(roundById("l32-text-diminished-fifth-above-b").illustration).toEqual({
      clef: "treble",
      notes: ["B4"],
    });
    expect(roundById("l32-text-augmented-fourth-above-c").illustration).toEqual({
      clef: "treble",
      notes: ["C4"],
    });
    expect(roundById("l32-text-diminished-fifth-above-c").illustration).toEqual({
      clef: "treble",
      notes: ["C4"],
    });
  });

  it("matches each illustrated root to the root its own writing drill already pins", () => {
    // The five WRITTEN drills above are the same five rounds, already pinned
    // to a root by the theory oracle. The illustration must be that root, so
    // the two contracts cannot drift apart.
    for (const { id, root } of WRITTEN) {
      const illustration = roundById(id).illustration;
      expect(illustration, `writing drill ${id}`).toBeDefined();
      expect(illustration!.notes, `writing drill ${id}`).toEqual([`${root}4`]);
    }
  });

  it("keeps the confusable-pair round text-only: engraving both pairs would draw the answer", () => {
    // Genuinely the section's ambiguous case: the question names concrete
    // pitches (C, F#, Gb), but every engraving of them puts the fourth and
    // the fifth on the page, and the learner counts the answer off the
    // picture — the pilot's counting-leak class. Text-only.
    expect(roundById("l32-text-aug-vs-dim").illustration).toBeUndefined();
    // The half-step rounds name no pitches at all (their answers are counts).
    expect(roundById("l32-text-minor-third-half-steps").illustration).toBeUndefined();
    expect(roundById("l32-text-diminished-fifth-half-steps").illustration).toBeUndefined();
  });

  it("never engraves the correct answer as an illustration note", () => {
    for (const round of illustratedRounds()) {
      const correct = answerOf(round.id);
      for (const name of round.illustration!.notes) {
        const { letter, accidental } = parseNote(name);
        const spelled = `${letter}${accidental === 0 ? "" : accidental > 0 ? "#".repeat(accidental) : "b".repeat(-accidental)}`;
        expect(spelled, `${round.id} engraves its answer`).not.toBe(correct);
      }
    }
  });

  it("passes the shared no-leak assertion for every pool round", () => {
    // The T5a recommendation, shipped as one utility in src/lib/rounds and
    // swept over the whole pool — illustrated or not — so a future edit that
    // puts an answer on the page fails here instead of shipping.
    for (const round of lesson32Pool) {
      expect(() => assertNoAnswerLeak(round), round.id).not.toThrow();
    }
  });

  it("engraves every illustration through the real Staff renderer", () => {
    // Triangulation: the illustration slot speaks the staff-prompt shape, so
    // each one has to survive the actual engraver, not just the type.
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

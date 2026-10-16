import { afterEach, describe, expect, it } from "vitest";
import { render } from "solid-js/web";
import { validateRound } from "../lib/rounds/validate";
import type { PromptSpec, Round } from "../lib/rounds/types";
import StaffPrompt from "../components/prompts/StaffPrompt";
import {
  identifyInversion,
  parseNote,
  pitchClass,
} from "../lib/theory";
import { createRng } from "./rng";
import { lesson51, lesson51Pool } from "./lesson51";

const GENERIC_RULE = /^(correct|incorrect|wrong|that'?s right)/i;

/** Every draw, for many seeds, must carry both structurally required kinds. */
const GUARANTEED_SEEDS = Array.from({ length: 100 }, (_, index) => index + 1);

/** The three inversion answers a voicing round offers, in slide order. */
const INVERSION_OPTIONS = ["Root position", "First inversion", "Second inversion"] as const;
type Inversion = "rootPosition" | "first" | "second";
const INVERSION_INDEX: Readonly<Record<Inversion, number>> = {
  rootPosition: 0,
  first: 1,
  second: 2,
};

/** The bass letter each inversion puts at the bottom of an F major triad. */
const BASS_LETTER: Readonly<Record<Inversion, string>> = {
  rootPosition: "F",
  first: "A",
  second: "C",
};

/**
 * The site voices an F major triad in root position, first inversion and
 * second inversion. Every voicing below uses only F, A and C, with the
 * inversion's own tone lowest; the exact spacing varies to show that voicing
 * reorders the upper notes while the bass fixes the inversion. Inversions are
 * re-derived from `identifyInversion` in the assertions, never hand-typed.
 */
const SITE_VOICINGS: Record<string, readonly string[]> = {
  // Root position: F is lowest.
  "l51-staff-root-close": ["F4", "A4", "C5"],
  "l51-staff-root-spread": ["F4", "C5", "A5"],
  "l51-staff-root-double": ["F4", "A4", "C5", "F5"],
  "l51-staff-root-wide": ["F4", "C5", "F5", "A5"],
  // First inversion: the third (A) is lowest.
  "l51-staff-first-close": ["A4", "C5", "F5"],
  "l51-staff-first-double": ["A4", "C5", "F5", "A5"],
  "l51-staff-first-low": ["A3", "C4", "F4"],
  // Second inversion: the fifth (C) is lowest.
  "l51-staff-second-close": ["C5", "F5", "A5"],
  "l51-staff-second-low": ["C4", "F4", "A4"],
  "l51-staff-second-double": ["C4", "F4", "A4", "C5"],
};

/** The seven text answers, each the site's own conclusion. */
const SITE_TEXT: Readonly<Record<string, string>> = {
  "l51-text-voicing-def": "Arrange the notes of a chord in numerous ways in order to vary its sound",
  "l51-text-root-lowest": "The root, F",
  "l51-text-first-lowest": "The third",
  "l51-text-second-lowest": "The fifth",
  "l51-text-first-def": "When the third is the lowest note",
  "l51-text-second-def": "The fifth, C",
  "l51-text-root-order": "Any order, as long as F, A and C are used and F is lowest",
};

/** Pitch classes of an F major triad, for asserting a voicing uses only them. */
const F_MAJOR_PITCHES = new Set([5, 9, 0]); // F, A, C

/** Inversion of an F major voicing, re-derived from the theory core. */
function inversionOf(notes: readonly string[]): Inversion {
  const identified = identifyInversion(
    parseNote("F4"),
    notes.map((note) => parseNote(note)),
  );
  if (identified === "third") {
    throw new Error("an F major triad has no third inversion");
  }
  return identified;
}

const cleanups: Array<() => void> = [];

afterEach(() => {
  while (cleanups.length > 0) cleanups.pop()?.();
  document.body.replaceChildren();
});

function isStaffRound(
  round: Round,
): round is Round & { prompt: Extract<PromptSpec, { kind: "staff" }> } {
  return round.prompt.kind === "staff";
}

function staffRounds(): Array<{ id: string; prompt: Extract<PromptSpec, { kind: "staff" }> }> {
  return lesson51Pool.filter(isStaffRound).map((round) => ({ id: round.id, prompt: round.prompt }));
}

function textRounds(): Array<{ id: string; prompt: Extract<PromptSpec, { kind: "text" }> }> {
  return lesson51Pool
    .filter((round): round is Round & { prompt: Extract<PromptSpec, { kind: "text" }> } =>
      round.prompt.kind === "text",
    )
    .map((round) => ({ id: round.id, prompt: round.prompt }));
}

function roundById(id: string): Round {
  const found = lesson51Pool.find((round) => round.id === id);
  expect(found, `round ${id} is missing from the pool`).toBeDefined();
  return found!;
}

function answerOf(id: string): string {
  const answer = roundById(id).answer;
  expect(answer.kind).toBe("choices");
  const choices = answer as Extract<Round["answer"], { kind: "choices" }>;
  return choices.options[choices.correctIndex]!;
}

describe("lesson 51 question pool", () => {
  it("holds 17 rounds: 10 staff, 7 text, all ids unique", () => {
    expect(lesson51Pool).toHaveLength(17);
    expect(staffRounds()).toHaveLength(10);
    expect(textRounds()).toHaveLength(7);
    const ids = lesson51Pool.map((round) => round.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(lesson51.entry.id).toBe(51);
  });

  it("validates every pool round", () => {
    for (const round of lesson51Pool) {
      expect(() => validateRound(round)).not.toThrow();
    }
  });

  it("draws at least 12 rounds and every drawn round passes validateRound", () => {
    const rounds = lesson51.generateRounds(createRng(1234));
    expect(rounds.length).toBeGreaterThanOrEqual(12);
    for (const round of rounds) {
      expect(() => validateRound(round)).not.toThrow();
    }
    const ids = rounds.map((round) => round.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("produces identical rounds for the same seed", () => {
    expect(lesson51.generateRounds(createRng(42))).toEqual(
      lesson51.generateRounds(createRng(42)),
    );
  });

  it("produces different rounds for two different seeds", () => {
    const first = lesson51.generateRounds(createRng(1));
    const second = lesson51.generateRounds(createRng(2));
    expect(JSON.stringify(second)).not.toBe(JSON.stringify(first));
  });

  it("draws at least one staff and one text round for every seed tried", () => {
    for (const seed of GUARANTEED_SEEDS) {
      const kinds = new Set(lesson51.generateRounds(createRng(seed)).map((r) => r.prompt.kind));
      expect(kinds.has("staff"), `seed ${seed} drew no staff round`).toBe(true);
      expect(kinds.has("text"), `seed ${seed} drew no text round`).toBe(true);
    }
  });

  it("engraves every staff prompt as one stacked chord", () => {
    for (const { id, prompt } of staffRounds()) {
      const host = document.createElement("div");
      document.body.appendChild(host);
      const dispose = render(() => StaffPrompt({ prompt }), host);
      cleanups.push(() => {
        dispose();
        host.remove();
      });
      expect(host.querySelector("svg"), `staff prompt ${id} did not engrave`).not.toBeNull();
      const staveNotes = [...host.querySelectorAll("g")].filter(
        (group) => group.getAttribute("class") === "vf-stavenote",
      );
      expect(staveNotes, `staff round ${id}`).toHaveLength(1);
    }
  });

  it("marks every staff prompt simultaneous", () => {
    for (const { id, prompt } of staffRounds()) {
      expect(prompt.simultaneous, `staff round ${id}`).toBe(true);
    }
  });

  it("voices each staff prompt as F major and answers the inversion the core derives", () => {
    for (const { id, prompt } of staffRounds()) {
      const notes = SITE_VOICINGS[id];
      expect(notes, `round ${id} is not one of the site's F major voicings`).toBeDefined();
      expect(prompt.notes, `staff round ${id} notes`).toEqual([...notes]);
      // Every tone is an F major triad member — the site's constraint.
      for (const tone of prompt.notes) {
        expect(F_MAJOR_PITCHES.has(pitchClass(parseNote(tone))), `staff round ${id} tone ${tone}`).toBe(
          true,
        );
      }
      // The inversion is re-derived by the core from the bass.
      const inversion = inversionOf(prompt.notes);
      expect(pitchClass(parseNote(prompt.notes[0]!)), `staff round ${id} bass`).toBe(
        pitchClass(parseNote(BASS_LETTER[inversion])),
      );
      const answer = roundById(id).answer as Extract<Round["answer"], { kind: "choices" }>;
      expect(answer.options, `staff round ${id} options`).toEqual([...INVERSION_OPTIONS]);
      expect(answerOf(id), `staff round ${id} answer`).toBe(INVERSION_OPTIONS[INVERSION_INDEX[inversion]]);
    }
  });

  it("pins the site's voicing definitions in the text rounds", () => {
    for (const [id, expected] of Object.entries(SITE_TEXT)) {
      expect(answerOf(id), id).toBe(expected);
    }
    expect(textRounds()).toHaveLength(Object.keys(SITE_TEXT).length);
  });

  it("states the site's voicing facts in every rule", () => {
    for (const round of lesson51Pool) {
      expect(round.rule, round.id).not.toMatch(GENERIC_RULE);
    }
    const rules = lesson51Pool.map((round) => round.rule).join(" \n ");
    expect(rules).toMatch(/arrange the notes of a chord in numerous ways in order to vary its sound/);
    expect(rules).toMatch(/F is the lowest note/);
    expect(rules).toMatch(/the third is the lowest note/);
    expect(rules).toMatch(/the fifth \(C\) is the lowest note/);
  });

  it("covers root, first and second inversion across the staff voicings", () => {
    const inversions = new Set(Object.values(SITE_VOICINGS).map(inversionOf));
    expect(inversions.has("rootPosition")).toBe(true);
    expect(inversions.has("first")).toBe(true);
    expect(inversions.has("second")).toBe(true);
  });
});

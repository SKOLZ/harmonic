import { afterEach, describe, expect, it } from "vitest";
import { render } from "solid-js/web";
import { validateRound } from "../lib/rounds/validate";
import type { PromptSpec, Round } from "../lib/rounds/types";
import StaffPrompt from "../components/prompts/StaffPrompt";
import {
  buildTriad,
  diatonicTriads,
  identifyInversion,
  inversionFigure,
  midiNumber,
  parseNote,
  pitchClass,
  romanNumeral,
  type TriadQuality,
} from "../lib/theory";
import { createRng } from "./rng";
import { lesson61, lesson61Pool } from "./lesson61";

const GENERIC_RULE = /^(correct|incorrect|wrong|that'?s right)/i;

/** Every draw, for many seeds, must carry both structurally required kinds. */
const GUARANTEED_SEEDS = Array.from({ length: 100 }, (_, index) => index + 1);

const INVERSION_NUM: Readonly<Record<"rootPosition" | "first" | "second" | "third", number>> = {
  rootPosition: 0,
  first: 1,
  second: 2,
  third: 3,
};

/** C-major numerals, derived from the core — never hand-typed. */
const C_MAJOR_NUMERALS: ReadonlyMap<string, string> = new Map(
  diatonicTriads(parseNote("C"), "major").map((triad) => [
    triad.notes[0]!.letter,
    romanNumeral(triad.quality, triad.degree),
  ]),
);

/** The Roman-numeral + figure symbol the core derives for a C-major chord. */
function symbolOf(root: string, notes: readonly string[]): string {
  const rootNote = parseNote(root);
  const inversion = identifyInversion(
    rootNote,
    notes.map((note) => parseNote(note)),
  );
  const numeral = C_MAJOR_NUMERALS.get(rootNote.letter);
  expect(numeral, `${root} is not a C-major diatonic root`).toBeDefined();
  return numeral! + inversionFigure("triad", INVERSION_NUM[inversion]);
}

/**
 * The six second-inversion triads the staff rounds engrave. The site's slide 1
 * frames the lesson as second inversion occurring "in three situations" on top
 * of root position and first inversion used freely, so identifying the 6/4
 * figure is the prerequisite this lesson drills; the three situation names are
 * the site's own slides and live in the text rounds. `expected` is the numeral
 * system's symbol for that voicing and the test proves the core derives it.
 */
const SECOND_INVERSION_ROUNDS: Readonly<
  Record<
    string,
    { root: string; quality: TriadQuality; expected: string; options: readonly string[] }
  >
> = {
  "l61-staff-i-64": { root: "C4", quality: "major", expected: "I6/4", options: ["I6/4", "I6", "I", "V6/4"] },
  "l61-staff-ii-64": { root: "D4", quality: "minor", expected: "ii6/4", options: ["ii", "ii6/4", "ii6", "IV6/4"] },
  "l61-staff-iv-64": { root: "F4", quality: "major", expected: "IV6/4", options: ["IV6", "IV", "I6/4", "IV6/4"] },
  "l61-staff-v-64": { root: "G4", quality: "major", expected: "V6/4", options: ["V6", "V", "V6/4", "vi6/4"] },
  "l61-staff-vi-64": { root: "A4", quality: "minor", expected: "vi6/4", options: ["vi6", "vi", "iii6", "vi6/4"] },
  "l61-staff-viio-64": { root: "B3", quality: "diminished", expected: "vii°6/4", options: ["vii°6", "vii°", "vii°6/4", "V6/4"] },
};

/** The seven text answers, each the site's own conclusion. */
const SITE_TEXT: Readonly<Record<string, string>> = {
  "l61-text-three-situations": "Three",
  "l61-text-passing": "A passing six-four chord",
  "l61-text-pedal": "A pedal six-four chord",
  "l61-text-cadential-def": "A second inversion triad that precedes a V chord in a cadence",
  "l61-text-alternate": "A V with two nonharmonic tones",
  "l61-text-chart": "Between predominants and dominants",
  "l61-text-cadence-stronger": "The cadence will sound stronger due to the cadential six-four's presence",
};

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
  return lesson61Pool.filter(isStaffRound).map((round) => ({ id: round.id, prompt: round.prompt }));
}

function textRounds(): Array<{ id: string; prompt: Extract<PromptSpec, { kind: "text" }> }> {
  return lesson61Pool
    .filter((round): round is Round & { prompt: Extract<PromptSpec, { kind: "text" }> } =>
      round.prompt.kind === "text",
    )
    .map((round) => ({ id: round.id, prompt: round.prompt }));
}

function roundById(id: string): Round {
  const found = lesson61Pool.find((round) => round.id === id);
  expect(found, `round ${id} is missing from the pool`).toBeDefined();
  return found!;
}

function answerOf(id: string): string {
  const answer = roundById(id).answer;
  expect(answer.kind).toBe("choices");
  const choices = answer as Extract<Round["answer"], { kind: "choices" }>;
  return choices.options[choices.correctIndex]!;
}

function engrave(id: string, prompt: PromptSpec): HTMLElement {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const dispose = render(() => StaffPrompt({ prompt }), host);
  cleanups.push(() => {
    dispose();
    host.remove();
  });
  expect(host.querySelector("svg"), `staff prompt ${id} did not engrave`).not.toBeNull();
  return host;
}

describe("lesson 61 question pool", () => {
  it("holds 13 rounds: 6 staff, 7 text, all ids unique", () => {
    expect(lesson61Pool).toHaveLength(13);
    expect(staffRounds()).toHaveLength(6);
    expect(textRounds()).toHaveLength(7);
    const ids = lesson61Pool.map((round) => round.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(lesson61.entry.id).toBe(61);
  });

  it("validates every pool round", () => {
    for (const round of lesson61Pool) {
      expect(() => validateRound(round)).not.toThrow();
    }
  });

  it("draws at least 12 rounds and every drawn round passes validateRound", () => {
    const rounds = lesson61.generateRounds(createRng(1234));
    expect(rounds.length).toBeGreaterThanOrEqual(12);
    for (const round of rounds) {
      expect(() => validateRound(round)).not.toThrow();
    }
    const ids = rounds.map((round) => round.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("produces identical rounds for the same seed", () => {
    expect(lesson61.generateRounds(createRng(42))).toEqual(
      lesson61.generateRounds(createRng(42)),
    );
  });

  it("produces different rounds for two different seeds", () => {
    const first = lesson61.generateRounds(createRng(1));
    const second = lesson61.generateRounds(createRng(2));
    expect(JSON.stringify(second)).not.toBe(JSON.stringify(first));
  });

  it("draws at least one staff and one text round for every seed tried", () => {
    for (const seed of GUARANTEED_SEEDS) {
      const kinds = new Set(lesson61.generateRounds(createRng(seed)).map((r) => r.prompt.kind));
      expect(kinds.has("staff"), `seed ${seed} drew no staff round`).toBe(true);
      expect(kinds.has("text"), `seed ${seed} drew no text round`).toBe(true);
    }
  });

  it("marks every staff prompt simultaneous", () => {
    for (const { id, prompt } of staffRounds()) {
      expect(prompt.simultaneous, `staff round ${id}`).toBe(true);
      expect(prompt.clef, `staff round ${id}`).toBe("treble");
      expect(prompt.keySignature, `staff round ${id}`).toBeUndefined();
    }
  });

  it("engraves every staff chord as one stacked head", () => {
    for (const { id, prompt } of staffRounds()) {
      const host = engrave(id, prompt);
      const staveNotes = [...host.querySelectorAll("g")].filter(
        (group) => group.getAttribute("class") === "vf-stavenote",
      );
      expect(staveNotes, `staff round ${id}`).toHaveLength(1);
    }
  });

  it("derives every second-inversion symbol the core's own way", () => {
    for (const [id, expected] of Object.entries(SECOND_INVERSION_ROUNDS)) {
      const prompt = roundById(id).prompt as Extract<PromptSpec, { kind: "staff" }>;
      const notes = prompt.notes.map((note) => parseNote(note));
      // Bass-first ascending voicing of exactly the triad's pitch classes.
      for (let index = 1; index < notes.length; index += 1) {
        expect(midiNumber(notes[index]!), `staff round ${id} ascending`).toBeGreaterThan(
          midiNumber(notes[index - 1]!),
        );
      }
      const triadSet = new Set(
        buildTriad(parseNote(expected.root), expected.quality).map((note) => pitchClass(note)),
      );
      for (const tone of notes) {
        expect(triadSet.has(pitchClass(tone)), `staff round ${id} tone ${tone}`).toBe(true);
      }
      // The bass is the triad's fifth — that is what makes it second inversion.
      expect(
        identifyInversion(parseNote(expected.root), notes),
        `staff round ${id} inversion`,
      ).toBe("second");
      // Core oracle: the derived symbol equals the expected analysis symbol.
      expect(symbolOf(expected.root, prompt.notes), `staff round ${id} symbol`).toBe(
        expected.expected,
      );
      const answer = roundById(id).answer as Extract<Round["answer"], { kind: "choices" }>;
      expect(answer.options, `staff round ${id} options`).toEqual([...expected.options]);
      expect(answerOf(id), `staff round ${id} answer`).toBe(expected.expected);
      const rule = roundById(id).rule;
      expect(rule, `staff round ${id} rule symbol`).toContain(expected.expected);
      expect(rule, `staff round ${id} rule`).toMatch(/second inversion/);
    }
  });

  it("pins the site's three six-four names and cadence facts in the text rounds", () => {
    for (const [id, expected] of Object.entries(SITE_TEXT)) {
      expect(answerOf(id), id).toBe(expected);
    }
    expect(textRounds()).toHaveLength(Object.keys(SITE_TEXT).length);
  });

  it("states the site's facts in every rule", () => {
    for (const round of lesson61Pool) {
      expect(round.rule, round.id).not.toMatch(GENERIC_RULE);
    }
    const rules = lesson61Pool.map((round) => round.rule).join(" \n ");
    expect(rules).toMatch(/second inversion usually occurs in three situations/);
    expect(rules).toMatch(/smooth out a bass line/);
    expect(rules).toMatch(/is called a passing six-four chord/);
    expect(rules).toMatch(/straighten a bass line/);
    expect(rules).toMatch(/is called a pedal six-four chord/);
    expect(rules).toMatch(/second inversion triad that precedes a V chord in a cadence/);
    expect(rules).toMatch(/a V with two nonharmonic tones/);
    expect(rules).toMatch(/between predominants and dominants/);
    expect(rules).toMatch(/sound stronger due to the cadential six-four/);
  });

  it("describes every staff prompt structurally, never with pitch names", () => {
    for (const { id, prompt } of staffRounds()) {
      const host = engrave(id, prompt);
      const label = host.querySelector(".prompt--staff")!.getAttribute("aria-label") ?? "";
      expect(label, `staff round ${id}`).toContain("Staff notation, treble clef");
      expect(label, `staff round ${id}`).toContain(`${prompt.notes.length} notes`);
      expect(label).not.toMatch(/[A-G][#b]/);
    }
  });
});

import { afterEach, describe, expect, it } from "vitest";
import { render } from "solid-js/web";
import { validateRound } from "../lib/rounds/validate";
import type { PromptSpec, Round } from "../lib/rounds/types";
import StaffPrompt from "../components/prompts/StaffPrompt";
import {
  buildTriad,
  diatonicTriads,
  genericIntervalNumber,
  halfSteps,
  identifyInversion,
  inversionFigure,
  intervalName,
  midiNumber,
  parseNote,
  pitchClass,
  romanNumeral,
  type TriadQuality,
} from "../lib/theory";
import { createRng } from "./rng";
import { lesson60, lesson60Pool } from "./lesson60";

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
 * The six first-inversion triads the staff rounds engrave. The site does not
 * name these chords in its own slides — slide 1 frames the lesson as building
 * on "construct, identify, and analyze first inversion triads", so these
 * rounds practise that prerequisite in C major with the numeral system the
 * site teaches in lessons 43/44. `expected` is that system's symbol; the
 * test proves the core derives exactly it from the voicing.
 */
const FIRST_INVERSION_ROUNDS: Readonly<
  Record<
    string,
    { root: string; quality: TriadQuality; expected: string; options: readonly string[] }
  >
> = {
  "l60-staff-i6": { root: "C4", quality: "major", expected: "I6", options: ["I6", "I", "I6/4", "V6"] },
  "l60-staff-ii6": { root: "D4", quality: "minor", expected: "ii6", options: ["ii", "ii6", "IV6", "ii6/4"] },
  "l60-staff-iv6": { root: "F4", quality: "major", expected: "IV6", options: ["I6", "IV", "IV6", "ii6"] },
  "l60-staff-v6": { root: "G4", quality: "major", expected: "V6", options: ["V", "V6/4", "vi6", "V6"] },
  "l60-staff-vi6": { root: "A4", quality: "minor", expected: "vi6", options: ["vi", "vi6", "V6", "iii6"] },
  "l60-staff-viio6": { root: "B3", quality: "diminished", expected: "vii°6", options: ["vii°6", "vii°", "vii°6/4", "V6"] },
};

/**
 * The three diminished-triad rounds. `expected` is the list of interval
 * names between the BASS and each upper tone, re-derived by the core — the
 * site's own claim, slides 12–14: root position "contains a diminished
 * fifth", second inversion "contains an augmented fourth", and "only the
 * first inversion contains no augmented nor diminished intervals" (true of
 * the intervals above the bass, which is how its four annotation labels —
 * d5, A4, m3, M6 — are distributed across the three figures).
 */
const DIMINISHED_ROUNDS: Readonly<
  Record<
    string,
    {
      notes: readonly string[];
      inversion: "rootPosition" | "first" | "second";
      aboveBass: readonly string[];
      answer: string;
    }
  >
> = {
  "l60-staff-dim-root": {
    notes: ["B3", "D4", "F4"],
    inversion: "rootPosition",
    aboveBass: ["Minor 3rd", "Diminished 5th"],
    answer: "A diminished fifth",
  },
  "l60-staff-dim-first": {
    notes: ["D4", "F4", "B4"],
    inversion: "first",
    aboveBass: ["Minor 3rd", "Major 6th"],
    answer: "None — only a minor third and a major sixth sound above the bass",
  },
  "l60-staff-dim-second": {
    notes: ["F4", "B4", "D5"],
    inversion: "second",
    aboveBass: ["Augmented 4th", "Major 6th"],
    answer: "An augmented fourth",
  },
};

const DIMINISHED_OPTIONS = [
  "A diminished fifth",
  "An augmented fourth",
  "None — only a minor third and a major sixth sound above the bass",
  "A perfect fifth",
] as const;

/** The six text answers, each the site's own conclusion. */
const SITE_TEXT: Readonly<Record<string, string>> = {
  "l60-text-smooth-bass": "To smooth out the bass line",
  "l60-text-repeat-chord": "Place the chord in first inversion",
  "l60-text-early-composers": "They did not like using augmented or diminished intervals",
  "l60-text-prefer-first":
    "Only the first inversion contains no augmented nor diminished intervals above the bass",
  "l60-text-dim-second-rare": "Rarely",
  "l60-text-not-strict":
    "No — sometimes first inversion is used simply because a composer likes its sound",
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
  return lesson60Pool.filter(isStaffRound).map((round) => ({ id: round.id, prompt: round.prompt }));
}

function textRounds(): Array<{ id: string; prompt: Extract<PromptSpec, { kind: "text" }> }> {
  return lesson60Pool
    .filter((round): round is Round & { prompt: Extract<PromptSpec, { kind: "text" }> } =>
      round.prompt.kind === "text",
    )
    .map((round) => ({ id: round.id, prompt: round.prompt }));
}

function roundById(id: string): Round {
  const found = lesson60Pool.find((round) => round.id === id);
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

describe("lesson 60 question pool", () => {
  it("holds 15 rounds: 9 staff, 6 text, all ids unique", () => {
    expect(lesson60Pool).toHaveLength(15);
    expect(staffRounds()).toHaveLength(9);
    expect(textRounds()).toHaveLength(6);
    const ids = lesson60Pool.map((round) => round.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(lesson60.entry.id).toBe(60);
  });

  it("validates every pool round", () => {
    for (const round of lesson60Pool) {
      expect(() => validateRound(round)).not.toThrow();
    }
  });

  it("draws at least 12 rounds and every drawn round passes validateRound", () => {
    const rounds = lesson60.generateRounds(createRng(1234));
    expect(rounds.length).toBeGreaterThanOrEqual(12);
    for (const round of rounds) {
      expect(() => validateRound(round)).not.toThrow();
    }
    const ids = rounds.map((round) => round.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("produces identical rounds for the same seed", () => {
    expect(lesson60.generateRounds(createRng(42))).toEqual(
      lesson60.generateRounds(createRng(42)),
    );
  });

  it("produces different rounds for two different seeds", () => {
    const first = lesson60.generateRounds(createRng(1));
    const second = lesson60.generateRounds(createRng(2));
    expect(JSON.stringify(second)).not.toBe(JSON.stringify(first));
  });

  it("draws at least one staff and one text round for every seed tried", () => {
    for (const seed of GUARANTEED_SEEDS) {
      const kinds = new Set(lesson60.generateRounds(createRng(seed)).map((r) => r.prompt.kind));
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

  it("derives every first-inversion symbol the core's own way", () => {
    for (const [id, expected] of Object.entries(FIRST_INVERSION_ROUNDS)) {
      const prompt = (roundById(id).prompt as Extract<PromptSpec, { kind: "staff" }>);
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
      // The bass is the triad's third — that is what makes it first inversion.
      expect(
        identifyInversion(parseNote(expected.root), notes),
        `staff round ${id} inversion`,
      ).toBe("first");
      // Core oracle: the derived symbol equals the expected analysis symbol.
      expect(symbolOf(expected.root, prompt.notes), `staff round ${id} symbol`).toBe(
        expected.expected,
      );
      const answer = roundById(id).answer as Extract<Round["answer"], { kind: "choices" }>;
      expect(answer.options, `staff round ${id} options`).toEqual([...expected.options]);
      expect(answerOf(id), `staff round ${id} answer`).toBe(expected.expected);
      const rule = roundById(id).rule;
      expect(rule, `staff round ${id} rule symbol`).toContain(expected.expected);
      expect(rule, `staff round ${id} rule`).toMatch(/first inversion/);
    }
  });

  it("measures every diminished round against the core's interval names", () => {
    for (const [id, expected] of Object.entries(DIMINISHED_ROUNDS)) {
      const prompt = (roundById(id).prompt as Extract<PromptSpec, { kind: "staff" }>);
      expect(prompt.notes, `staff round ${id} notes`).toEqual([...expected.notes]);
      const parsed = prompt.notes.map((note) => parseNote(note));
      const bass = parsed[0]!;
      for (let index = 1; index < parsed.length; index += 1) {
        const name = intervalName(
          genericIntervalNumber(bass, parsed[index]!),
          halfSteps(bass, parsed[index]!),
        );
        expect(name, `staff round ${id} interval ${index}`).toBe(expected.aboveBass[index - 1]);
      }
      // Same diminished triad in all three figures.
      const dimSet = new Set(
        buildTriad(parseNote("B3"), "diminished").map((note) => pitchClass(note)),
      );
      for (const tone of prompt.notes) {
        expect(dimSet.has(pitchClass(parseNote(tone))), `staff round ${id} tone ${tone}`).toBe(
          true,
        );
      }
      expect(identifyInversion(parseNote("B3"), parsed), `staff round ${id} inversion`).toBe(
        expected.inversion,
      );
      const answer = roundById(id).answer as Extract<Round["answer"], { kind: "choices" }>;
      expect(answer.options, `staff round ${id} options`).toEqual([...DIMINISHED_OPTIONS]);
      expect(answerOf(id), `staff round ${id} answer`).toBe(expected.answer);
      for (const name of expected.aboveBass) {
        expect(roundById(id).rule, `staff round ${id} rule interval`).toContain(name);
      }
    }
  });

  it("pins the site's prose conclusions in the text rounds", () => {
    for (const [id, expected] of Object.entries(SITE_TEXT)) {
      expect(answerOf(id), id).toBe(expected);
    }
    expect(textRounds()).toHaveLength(Object.keys(SITE_TEXT).length);
  });

  it("states the site's facts in every rule", () => {
    for (const round of lesson60Pool) {
      expect(round.rule, round.id).not.toMatch(GENERIC_RULE);
    }
    const rules = lesson60Pool.map((round) => round.rule).join(" \n ");
    expect(rules).toMatch(/smooth out the bass line/);
    expect(rules).toMatch(/Instead of altering the top voices, the chord is placed in first inversion/);
    expect(rules).toMatch(/Early composers did not like using augmented or diminished intervals/);
    expect(rules).toMatch(/no augmented nor diminished intervals above the bass/);
    expect(rules).toMatch(/second inversion is rarely encountered/);
    expect(rules).toMatch(/not strict rules/);
    expect(rules).toMatch(/contains a diminished fifth/);
    expect(rules).toMatch(/contains an augmented fourth/);
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

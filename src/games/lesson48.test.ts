import { afterEach, describe, expect, it } from "vitest";
import { render } from "solid-js/web";
import { validateRound } from "../lib/rounds/validate";
import type { PromptSpec, Round } from "../lib/rounds/types";
import KeyboardPrompt from "../components/prompts/KeyboardPrompt";
import StaffPrompt from "../components/prompts/StaffPrompt";
import {
  SEVENTH_INTERVALS,
  TRIAD_INTERVALS,
  buildSeventh,
  detectSeventhQuality,
  detectTriadQuality,
  genericIntervalNumber,
  halfSteps,
  parseNote,
  scientificName,
} from "../lib/theory";
import { createRng } from "./rng";
import { lesson48, lesson48Pool } from "./lesson48";

const GENERIC_RULE = /^(correct|incorrect|wrong|that'?s right)/i;

/** Every draw, for many seeds, must carry both structurally required kinds. */
const GUARANTEED_SEEDS = Array.from({ length: 100 }, (_, index) => index + 1);

/**
 * The nine additional seventh chords lesson 48 spells out in its own slide
 * text (`lesson48.js`): three types × roots C, F# and Ab, with the exact
 * spellings the slides print — including the F# augmented chords, written
 * `Cx` on the site (`Cx` is `C##` in ASCII, same translation lesson 40
 * documents for `Fx`), and Cb in the minor-major Ab example.
 */
/** The three additional seventh types — lesson 48's own set from the site. */
type AdditionalSeventh =
  | "minorMajorSeventh"
  | "augmentedMajorSeventh"
  | "augmentedSeventh";

const SITE_SEVENTHS: Record<
  string,
  { root: string; quality: AdditionalSeventh; siteSpelling: string[] }
> = {
  // --- minor-major seventh: minor triad + major seventh ---------------------
  "l48-staff-c-mm": { root: "C4", quality: "minorMajorSeventh", siteSpelling: ["C4", "Eb4", "G4", "B4"] },
  "l48-staff-fs-mm": { root: "F#4", quality: "minorMajorSeventh", siteSpelling: ["F#4", "A4", "C#5", "E#5"] },
  "l48-staff-ab-mm": { root: "Ab4", quality: "minorMajorSeventh", siteSpelling: ["Ab4", "Cb5", "Eb5", "G5"] },
  // --- augmented-major seventh: augmented triad + major seventh -------------
  "l48-staff-c-am": { root: "C4", quality: "augmentedMajorSeventh", siteSpelling: ["C4", "E4", "G#4", "B4"] },
  "l48-staff-fs-am": { root: "F#4", quality: "augmentedMajorSeventh", siteSpelling: ["F#4", "A#4", "C##5", "E#5"] },
  "l48-staff-ab-am": { root: "Ab4", quality: "augmentedMajorSeventh", siteSpelling: ["Ab4", "C5", "E5", "G5"] },
  // --- augmented seventh: augmented triad + minor seventh -------------------
  "l48-staff-c-aug": { root: "C4", quality: "augmentedSeventh", siteSpelling: ["C4", "E4", "G#4", "Bb4"] },
  "l48-staff-fs-aug": { root: "F#4", quality: "augmentedSeventh", siteSpelling: ["F#4", "A#4", "C##5", "E5"] },
  "l48-staff-ab-aug": { root: "Ab4", quality: "augmentedSeventh", siteSpelling: ["Ab4", "C5", "E5", "Gb5"] },
};

/** The site's three C-rooted examples, lit on the keyboard in lesson 48. */
const SITE_C_KEYBOARD: Record<string, { highlight: string[]; quality: AdditionalSeventh }> = {
  "l48-keyboard-c-mm": { highlight: ["C4", "Eb4", "G4", "B4"], quality: "minorMajorSeventh" },
  "l48-keyboard-c-am": { highlight: ["C4", "E4", "G#4", "B4"], quality: "augmentedMajorSeventh" },
  "l48-keyboard-c-aug": { highlight: ["C4", "E4", "G#4", "Bb4"], quality: "augmentedSeventh" },
};

/** The triad each formula slide names before the seventh is added. */
const BASE_TRIAD: Record<AdditionalSeventh, "major" | "minor" | "augmented"> = {
  minorMajorSeventh: "minor",
  augmentedMajorSeventh: "augmented",
  augmentedSeventh: "augmented",
};

/** The site's formula words: triad and seventh as the slides write them. */
const SITE_FORMULA: Record<AdditionalSeventh, { triad: string; seventh: string }> = {
  minorMajorSeventh: { triad: "minor triad", seventh: "major seventh" },
  augmentedMajorSeventh: { triad: "augmented triad", seventh: "major seventh" },
  augmentedSeventh: { triad: "augmented triad", seventh: "minor seventh" },
};

/** The site's three additional type names, in slide order. */
const SITE_TYPES: Record<AdditionalSeventh, string> = {
  minorMajorSeventh: "minor-major",
  augmentedMajorSeventh: "augmented-major",
  augmentedSeventh: "augmented",
};

function isStaffRound(
  round: Round,
): round is Round & { prompt: Extract<PromptSpec, { kind: "staff" }> } {
  return round.prompt.kind === "staff";
}

function isKeyboardRound(
  round: Round,
): round is Round & { prompt: Extract<PromptSpec, { kind: "keyboard" }> } {
  return round.prompt.kind === "keyboard";
}

function staffRounds(): Array<{ id: string; prompt: Extract<PromptSpec, { kind: "staff" }> }> {
  return lesson48Pool.filter(isStaffRound).map((round) => ({ id: round.id, prompt: round.prompt }));
}

function keyboardRounds(): Array<{
  id: string;
  prompt: Extract<PromptSpec, { kind: "keyboard" }>;
}> {
  return lesson48Pool
    .filter(isKeyboardRound)
    .map((round) => ({ id: round.id, prompt: round.prompt }));
}

function textRounds(): Array<{ id: string; prompt: Extract<PromptSpec, { kind: "text" }> }> {
  return lesson48Pool
    .filter((round): round is Round & { prompt: Extract<PromptSpec, { kind: "text" }> } =>
      round.prompt.kind === "text",
    )
    .map((round) => ({ id: round.id, prompt: round.prompt }));
}

function allRules(): string[] {
  return lesson48Pool.map((round) => round.rule);
}

function roundById(id: string): Round {
  const found = lesson48Pool.find((round) => round.id === id);
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

/** "Eb4" → "Eb": the root's name as prose writes it. */
const rootLabel = (root: string): string =>
  scientificName(parseNote(root)).replace(/\d+$/, "");

/** The pool's answer for a chord round: root label + the site's type name. */
const expectedAnswer = (root: string, quality: AdditionalSeventh): string =>
  `${rootLabel(root)} ${SITE_TYPES[quality]} seventh chord`;

/** Every rule that shows a chord must state its own site formula and spelling. */
function expectRuleStatesFormula(id: string, quality: AdditionalSeventh, siteSpelling: string[]): void {
  const rule = roundById(id).rule;
  const { triad, seventh } = SITE_FORMULA[quality];
  expect(rule, `round ${id} triad`).toContain(`a ${triad}`);
  expect(rule, `round ${id} seventh`).toContain(`a ${seventh}`);
  expect(rule, `round ${id} spelling`).toContain(
    siteSpelling.map((tone) => tone.replace(/\d+$/, "")).join("–"),
  );
}

const cleanups: Array<() => void> = [];

afterEach(() => {
  while (cleanups.length > 0) cleanups.pop()?.();
  document.body.replaceChildren();
});

describe("lesson 48 question pool", () => {
  it("holds 24 rounds: 9 staff, 12 text, 3 keyboard, all ids unique", () => {
    expect(lesson48Pool).toHaveLength(24);
    expect(staffRounds()).toHaveLength(9);
    expect(textRounds()).toHaveLength(12);
    expect(keyboardRounds()).toHaveLength(3);
    const ids = lesson48Pool.map((round) => round.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("validates every pool round", () => {
    for (const round of lesson48Pool) {
      expect(() => validateRound(round)).not.toThrow();
    }
  });

  it("draws at least 12 rounds and every drawn round passes validateRound", () => {
    const rounds = lesson48.generateRounds(createRng(1234));
    expect(rounds.length).toBeGreaterThanOrEqual(12);
    for (const round of rounds) {
      expect(() => validateRound(round)).not.toThrow();
    }
    const ids = rounds.map((round) => round.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("produces identical rounds for the same seed", () => {
    const first = lesson48.generateRounds(createRng(42));
    const second = lesson48.generateRounds(createRng(42));
    expect(second).toEqual(first);
  });

  it("produces different rounds for two different seeds", () => {
    const first = lesson48.generateRounds(createRng(1));
    const second = lesson48.generateRounds(createRng(2));
    expect(JSON.stringify(second)).not.toBe(JSON.stringify(first));
  });

  it("draws at least one staff and one text round for every seed tried", () => {
    for (const seed of GUARANTEED_SEEDS) {
      const kinds = new Set(lesson48.generateRounds(createRng(seed)).map((r) => r.prompt.kind));
      expect(kinds.has("staff"), `seed ${seed} drew no staff round`).toBe(true);
      expect(kinds.has("text"), `seed ${seed} drew no text round`).toBe(true);
    }
  });

  it("draws keyboard rounds for some seeds, so they are live in the pool", () => {
    const kinds = new Set(
      GUARANTEED_SEEDS.flatMap((seed) =>
        lesson48.generateRounds(createRng(seed)).map((r) => r.prompt.kind),
      ),
    );
    expect(kinds.has("keyboard")).toBe(true);
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

  it("renders every keyboard prompt with exactly its four chord tones lit", () => {
    for (const { id, prompt } of keyboardRounds()) {
      const host = document.createElement("div");
      document.body.appendChild(host);
      const dispose = render(() => KeyboardPrompt({ prompt }), host);
      cleanups.push(() => {
        dispose();
        host.remove();
      });
      expect(host.querySelector(".prompt--keyboard"), `keyboard prompt ${id}`).not.toBeNull();
      const lit = host.querySelectorAll('button[data-note][data-highlighted="true"]');
      expect(lit.length, `keyboard prompt ${id}`).toBe(4);
      const label = host.querySelector(".prompt--keyboard")!.getAttribute("aria-label") ?? "";
      expect(label).toBe("Piano keyboard, C4 to C6, 4 keys highlighted");
    }
  });

  it("describes every staff prompt structurally, never with pitches", () => {
    for (const { id, prompt } of staffRounds()) {
      const host = document.createElement("div");
      document.body.appendChild(host);
      const dispose = render(() => StaffPrompt({ prompt }), host);
      cleanups.push(() => {
        dispose();
        host.remove();
      });
      const label = host.querySelector(".prompt--staff")!.getAttribute("aria-label") ?? "";
      expect(label, `staff round ${id}`).toBe(`Staff notation, ${prompt.clef} clef, 4 notes`);
      expect(label).not.toMatch(/[A-G][#b]/);
    }
  });

  it("spells every staff round exactly as the site and the theory core spell it", () => {
    for (const { id, prompt } of staffRounds()) {
      const expected = SITE_SEVENTHS[id];
      expect(expected, `round ${id} is not one of the site's nine seventh chords`).toBeDefined();
      // Site oracle: the literal spelling printed on the slide.
      expect(prompt.notes, `staff round ${id} vs site`).toEqual(expected.siteSpelling);
      // Core oracle: buildSeventh must produce the same tones — never hand-typed.
      expect(prompt.notes, `staff round ${id} vs buildSeventh`).toEqual(
        buildSeventh(parseNote(expected.root), expected.quality).map(scientificName),
      );
      const notes = prompt.notes.map((note) => parseNote(note));
      const root = notes[0]!;
      // The site's definition still holds: a triad combined with a seventh.
      expect(genericIntervalNumber(root, notes[3]!), `staff round ${id} seventh`).toBe(7);
      expect(detectTriadQuality(notes.slice(0, 3)), `staff round ${id} triad`).toBe(
        BASE_TRIAD[expected.quality],
      );
      expect(detectSeventhQuality(notes), `staff round ${id} quality`).toBe(expected.quality);
      const [third, fifth, seventh] = SEVENTH_INTERVALS[expected.quality];
      expect(halfSteps(root, notes[1]!), `staff round ${id} third`).toBe(third);
      expect(halfSteps(root, notes[2]!), `staff round ${id} fifth`).toBe(fifth);
      expect(halfSteps(root, notes[3]!), `staff round ${id} seventh steps`).toBe(seventh);
      expect(halfSteps(root, notes[2]!), `staff round ${id} fifth of triad`).toBe(
        TRIAD_INTERVALS[BASE_TRIAD[expected.quality]][1],
      );
      expect(answerOf(id), `staff round ${id}`).toBe(
        expectedAnswer(expected.root, expected.quality),
      );
      expectRuleStatesFormula(id, expected.quality, expected.siteSpelling);
    }
  });

  it("lights the site's three C-rooted examples on the keyboard", () => {
    for (const { id, prompt } of keyboardRounds()) {
      const expected = SITE_C_KEYBOARD[id];
      expect(expected, `keyboard round ${id} is not one of the site's C examples`).toBeDefined();
      expect(prompt.highlight).toEqual(expected.highlight);
      const tones = prompt.highlight.map((note) => parseNote(note));
      expect(detectSeventhQuality(tones), `keyboard round ${id} quality`).toBe(expected.quality);
      expect(genericIntervalNumber(tones[0]!, tones[3]!), `keyboard round ${id} seventh`).toBe(7);
      expect(answerOf(id), `keyboard round ${id}`).toBe(expectedAnswer("C4", expected.quality));
      expectRuleStatesFormula(id, expected.quality, expected.highlight);
    }
  });

  it("pins the site's context, formulas, abbreviations and names in the text rounds", () => {
    expect(answerOf("l48-text-occurrence")).toBe("Popular music and jazz");
    expect(answerOf("l48-text-count")).toBe("Three");
    expect(answerOf("l48-text-mm-formula")).toBe("A minor triad and a major seventh");
    expect(answerOf("l48-text-am-formula")).toBe("An augmented triad and a major seventh");
    expect(answerOf("l48-text-aug-formula")).toBe("An augmented triad and a minor seventh");
    expect(answerOf("l48-text-mm-abbrev")).toBe("A lower-case 'm', capital 'M', and a 7");
    expect(answerOf("l48-text-am-abbrev")).toBe("A plus, capital 'M', and a 7");
    expect(answerOf("l48-text-aug-abbrev")).toBe("A plus and a 7");
    expect(answerOf("l48-text-mm-name")).toBe("A minor-major seventh chord");
    expect(answerOf("l48-text-am-name")).toBe("An augmented-major seventh chord");
    expect(answerOf("l48-text-aug-name")).toBe("An augmented seventh chord");
    expect(answerOf("l48-text-distinction")).toBe(
      "It has a minor seventh instead of a major seventh",
    );
  });

  it("states the site's additional-type facts in every rule", () => {
    for (const rule of allRules()) {
      expect(rule).not.toMatch(GENERIC_RULE);
    }
    const rules = allRules().join(" \n ");
    expect(rules).toMatch(/popular music and jazz/);
    expect(rules).toMatch(/three (of these |additional )?types/);
    expect(rules).toMatch(/combine to form a minor-major seventh chord/);
    expect(rules).toMatch(/combine to form an augmented-major seventh chord/);
    expect(rules).toMatch(/combine to form an augmented seventh chord/);
    expect(rules).toMatch(/lower-case 'm', capital 'M', and a 7/);
    expect(rules).toMatch(/plus, capital 'M', and a 7/);
    expect(rules).toMatch(/plus and a 7/);
    expect(rules).toMatch(/combined with/);
  });
});

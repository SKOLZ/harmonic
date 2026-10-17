import { afterEach, describe, expect, it } from "vitest";
import { render } from "solid-js/web";
import { validateRound } from "../lib/rounds/validate";
import { assertNoAnswerLeak } from "../lib/rounds/noAnswerLeak";
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
import { lesson45, lesson45Pool } from "./lesson45";

const GENERIC_RULE = /^(correct|incorrect|wrong|that'?s right)/i;

/** Every draw, for many seeds, must carry both structurally required kinds. */
const GUARANTEED_SEEDS = Array.from({ length: 100 }, (_, index) => index + 1);

/**
 * The fifteen seventh chords lesson 45 spells out in its own slide text
 * (`lesson45.js`): five types × roots C, F# and Ab, with the exact spellings
 * the slides print — including Bbb as the diminished seventh over C and
 * Ebb/Gbb in the Ab diminished group (Bbb is `Bb` doubled: `Bbb` in ASCII).
 */
/** The five common seventh types — lesson 45's own set from the site's chart. */
type CommonSeventh =
  | "dominantSeventh"
  | "majorSeventh"
  | "minorSeventh"
  | "halfDiminishedSeventh"
  | "fullyDiminishedSeventh";

const SITE_SEVENTHS: Record<
  string,
  { root: string; quality: CommonSeventh; siteSpelling: string[] }
> = {
  // --- dominant seventh: major triad + minor seventh ------------------------
  "l45-staff-c-dom": { root: "C4", quality: "dominantSeventh", siteSpelling: ["C4", "E4", "G4", "Bb4"] },
  "l45-staff-fs-dom": { root: "F#4", quality: "dominantSeventh", siteSpelling: ["F#4", "A#4", "C#5", "E5"] },
  "l45-staff-ab-dom": { root: "Ab4", quality: "dominantSeventh", siteSpelling: ["Ab4", "C5", "Eb5", "Gb5"] },
  // --- major seventh: major triad + major seventh ---------------------------
  "l45-staff-c-maj": { root: "C4", quality: "majorSeventh", siteSpelling: ["C4", "E4", "G4", "B4"] },
  "l45-staff-fs-maj": { root: "F#4", quality: "majorSeventh", siteSpelling: ["F#4", "A#4", "C#5", "E#5"] },
  "l45-staff-ab-maj": { root: "Ab4", quality: "majorSeventh", siteSpelling: ["Ab4", "C5", "Eb5", "G5"] },
  // --- minor seventh: minor triad + minor seventh ---------------------------
  "l45-staff-c-min": { root: "C4", quality: "minorSeventh", siteSpelling: ["C4", "Eb4", "G4", "Bb4"] },
  "l45-staff-fs-min": { root: "F#4", quality: "minorSeventh", siteSpelling: ["F#4", "A4", "C#5", "E5"] },
  "l45-staff-ab-min": { root: "Ab4", quality: "minorSeventh", siteSpelling: ["Ab4", "Cb5", "Eb5", "Gb5"] },
  // --- half-diminished seventh: diminished triad + minor seventh ------------
  "l45-staff-c-hd": { root: "C4", quality: "halfDiminishedSeventh", siteSpelling: ["C4", "Eb4", "Gb4", "Bb4"] },
  "l45-staff-fs-hd": { root: "F#4", quality: "halfDiminishedSeventh", siteSpelling: ["F#4", "A4", "C5", "E5"] },
  "l45-staff-ab-hd": { root: "Ab4", quality: "halfDiminishedSeventh", siteSpelling: ["Ab4", "Cb5", "Ebb5", "Gb5"] },
  // --- diminished seventh: diminished triad + diminished seventh ------------
  "l45-staff-c-dim": { root: "C4", quality: "fullyDiminishedSeventh", siteSpelling: ["C4", "Eb4", "Gb4", "Bbb4"] },
  "l45-staff-fs-dim": { root: "F#4", quality: "fullyDiminishedSeventh", siteSpelling: ["F#4", "A4", "C5", "Eb5"] },
  "l45-staff-ab-dim": { root: "Ab4", quality: "fullyDiminishedSeventh", siteSpelling: ["Ab4", "Cb5", "Ebb5", "Gbb5"] },
};

/** The site's five C-rooted examples, lit on the keyboard in lesson 45. */
const SITE_C_KEYBOARD: Record<string, { highlight: string[]; quality: CommonSeventh }> = {
  "l45-keyboard-c-dom": { highlight: ["C4", "E4", "G4", "Bb4"], quality: "dominantSeventh" },
  "l45-keyboard-c-maj": { highlight: ["C4", "E4", "G4", "B4"], quality: "majorSeventh" },
  "l45-keyboard-c-min": { highlight: ["C4", "Eb4", "G4", "Bb4"], quality: "minorSeventh" },
  "l45-keyboard-c-hd": { highlight: ["C4", "Eb4", "Gb4", "Bb4"], quality: "halfDiminishedSeventh" },
  "l45-keyboard-c-dim": { highlight: ["C4", "Eb4", "Gb4", "Bbb4"], quality: "fullyDiminishedSeventh" },
};

/** The triad each formula slide names before the seventh is added. */
const BASE_TRIAD: Record<CommonSeventh, "major" | "minor" | "diminished"> = {
  dominantSeventh: "major",
  majorSeventh: "major",
  minorSeventh: "minor",
  halfDiminishedSeventh: "diminished",
  fullyDiminishedSeventh: "diminished",
};

/** The site's formula words: triad and seventh as the slides write them. */
const SITE_FORMULA: Record<CommonSeventh, { triad: string; seventh: string }> = {
  dominantSeventh: { triad: "major triad", seventh: "minor seventh" },
  majorSeventh: { triad: "major triad", seventh: "major seventh" },
  minorSeventh: { triad: "minor triad", seventh: "minor seventh" },
  halfDiminishedSeventh: { triad: "diminished triad", seventh: "minor seventh" },
  fullyDiminishedSeventh: { triad: "diminished triad", seventh: "diminished seventh" },
};

/** The site's five type names, in the order its slides introduce them. */
const SITE_TYPES: Record<CommonSeventh, string> = {
  dominantSeventh: "dominant",
  majorSeventh: "major",
  minorSeventh: "minor",
  halfDiminishedSeventh: "half-diminished",
  fullyDiminishedSeventh: "diminished",
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
  return lesson45Pool.filter(isStaffRound).map((round) => ({ id: round.id, prompt: round.prompt }));
}

function keyboardRounds(): Array<{
  id: string;
  prompt: Extract<PromptSpec, { kind: "keyboard" }>;
}> {
  return lesson45Pool
    .filter(isKeyboardRound)
    .map((round) => ({ id: round.id, prompt: round.prompt }));
}

function textRounds(): Array<{ id: string; prompt: Extract<PromptSpec, { kind: "text" }> }> {
  return lesson45Pool
    .filter((round): round is Round & { prompt: Extract<PromptSpec, { kind: "text" }> } =>
      round.prompt.kind === "text",
    )
    .map((round) => ({ id: round.id, prompt: round.prompt }));
}

function allRules(): string[] {
  return lesson45Pool.map((round) => round.rule);
}

function roundById(id: string): Round {
  const found = lesson45Pool.find((round) => round.id === id);
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
const expectedAnswer = (root: string, quality: CommonSeventh): string =>
  `${rootLabel(root)} ${SITE_TYPES[quality]} seventh chord`;

/** Every rule that shows a chord must state its own site formula and spelling. */
function expectRuleStatesFormula(id: string, quality: CommonSeventh, siteSpelling: string[]): void {
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

describe("lesson 45 question pool", () => {
  it("holds 32 rounds: 15 staff, 12 text, 5 keyboard, all ids unique", () => {
    expect(lesson45Pool).toHaveLength(32);
    expect(staffRounds()).toHaveLength(15);
    expect(textRounds()).toHaveLength(12);
    expect(keyboardRounds()).toHaveLength(5);
    const ids = lesson45Pool.map((round) => round.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("validates every pool round", () => {
    for (const round of lesson45Pool) {
      expect(() => validateRound(round)).not.toThrow();
    }
  });

  it("draws at least 12 rounds and every drawn round passes validateRound", () => {
    const rounds = lesson45.generateRounds(createRng(1234));
    expect(rounds.length).toBeGreaterThanOrEqual(12);
    for (const round of rounds) {
      expect(() => validateRound(round)).not.toThrow();
    }
    const ids = rounds.map((round) => round.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("produces identical rounds for the same seed", () => {
    const first = lesson45.generateRounds(createRng(42));
    const second = lesson45.generateRounds(createRng(42));
    expect(second).toEqual(first);
  });

  it("produces different rounds for two different seeds", () => {
    const first = lesson45.generateRounds(createRng(1));
    const second = lesson45.generateRounds(createRng(2));
    expect(JSON.stringify(second)).not.toBe(JSON.stringify(first));
  });

  it("draws at least one staff and one text round for every seed tried", () => {
    for (const seed of GUARANTEED_SEEDS) {
      const kinds = new Set(lesson45.generateRounds(createRng(seed)).map((r) => r.prompt.kind));
      expect(kinds.has("staff"), `seed ${seed} drew no staff round`).toBe(true);
      expect(kinds.has("text"), `seed ${seed} drew no text round`).toBe(true);
    }
  });

  it("draws keyboard rounds for some seeds, so they are live in the pool", () => {
    const kinds = new Set(
      GUARANTEED_SEEDS.flatMap((seed) =>
        lesson45.generateRounds(createRng(seed)).map((r) => r.prompt.kind),
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

  it("marks every staff prompt simultaneous so its tones engrave as one chord", () => {
    for (const { id, prompt } of staffRounds()) {
      expect(prompt.simultaneous, `staff round ${id}`).toBe(true);
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
      expect(expected, `round ${id} is not one of the site's fifteen seventh chords`).toBeDefined();
      // Site oracle: the literal spelling printed on the slide.
      expect(prompt.notes, `staff round ${id} vs site`).toEqual(expected.siteSpelling);
      // Core oracle: buildSeventh must produce the same tones — never hand-typed.
      expect(prompt.notes, `staff round ${id} vs buildSeventh`).toEqual(
        buildSeventh(parseNote(expected.root), expected.quality).map(scientificName),
      );
      const notes = prompt.notes.map((note) => parseNote(note));
      // The site's definition: a triad combined with an interval of a seventh.
      const root = notes[0]!;
      expect(genericIntervalNumber(root, notes[3]!), `staff round ${id} seventh`).toBe(7);
      expect(detectTriadQuality(notes.slice(0, 3)), `staff round ${id} triad`).toBe(
        BASE_TRIAD[expected.quality],
      );
      expect(detectSeventhQuality(notes), `staff round ${id} quality`).toBe(expected.quality);
      const [third, fifth, seventh] = SEVENTH_INTERVALS[expected.quality];
      expect(halfSteps(root, notes[1]!), `staff round ${id} third`).toBe(third);
      expect(halfSteps(root, notes[2]!), `staff round ${id} fifth`).toBe(fifth);
      expect(halfSteps(root, notes[3]!), `staff round ${id} seventh steps`).toBe(seventh);
      // The half-step count the site's base triad uses must match too.
      expect(halfSteps(root, notes[2]!), `staff round ${id} fifth of triad`).toBe(
        TRIAD_INTERVALS[BASE_TRIAD[expected.quality]][1],
      );
      expect(answerOf(id), `staff round ${id}`).toBe(
        expectedAnswer(expected.root, expected.quality),
      );
      expectRuleStatesFormula(id, expected.quality, expected.siteSpelling);
    }
  });

  it("lights the site's five C-rooted examples on the keyboard", () => {
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

  it("pins the site's definitions, formulas and abbreviations in the text rounds", () => {
    expect(answerOf("l45-text-definition")).toBe(
      "The combination of a triad and an interval of a seventh",
    );
    expect(answerOf("l45-text-count")).toBe("Five");
    expect(answerOf("l45-text-dom-formula")).toBe("A major triad and a minor seventh");
    expect(answerOf("l45-text-dom-abbrev")).toBe("A simple 7");
    expect(answerOf("l45-text-maj-formula")).toBe("A major triad and a major seventh");
    expect(answerOf("l45-text-maj-abbrev")).toBe("A capital 'M' and a 7");
    expect(answerOf("l45-text-min-formula")).toBe("A minor triad and a minor seventh");
    expect(answerOf("l45-text-min-abbrev")).toBe("A lower-case 'm' and a 7");
    expect(answerOf("l45-text-hd-formula")).toBe("A diminished triad and a minor seventh");
    expect(answerOf("l45-text-hd-abbrev")).toBe("A slashed circle and a 7");
    expect(answerOf("l45-text-dim-formula")).toBe("A diminished triad and a diminished seventh");
    expect(answerOf("l45-text-dim-abbrev")).toBe("An open circle and a 7");
  });

  it("states the site's seventh-chord facts in every rule", () => {
    for (const rule of allRules()) {
      expect(rule).not.toMatch(GENERIC_RULE);
    }
    const rules = allRules().join(" \n ");
    expect(rules).toMatch(/combination of a triad and an interval of a seventh/);
    expect(rules).toMatch(/Five types of seventh chords are commonly used/);
    expect(rules).toMatch(/combine to form a dominant seventh chord/);
    expect(rules).toMatch(/combine to form a major seventh chord/);
    expect(rules).toMatch(/combine to form a minor seventh chord/);
    expect(rules).toMatch(/combine to form a half-diminished seventh chord/);
    expect(rules).toMatch(/combine to form a diminished seventh chord/);
    expect(rules).toMatch(/abbreviated with a simple 7/);
    expect(rules).toMatch(/abbreviated with a capital 'M' and a 7/);
    expect(rules).toMatch(/abbreviated with a lower-case 'm' and a 7/);
    expect(rules).toMatch(/abbreviated with a slashed circle and a 7/);
    expect(rules).toMatch(/abbreviated with an open circle and a 7/);
    expect(rules).toMatch(/combined with/);
  });
});

describe("lesson 45 companion illustrations (T5d Chords pass)", () => {
  // Zero yield for Seventh Chords: chord-type DEFINITIONS end to end. Every
  // formula round is class-level ("Which pair of parts combines to form a
  // dominant seventh chord?" — every dominant seventh, no pitch named), the
  // abbreviation rounds state the chord-type symbols, and the two definition
  // rounds carry no pitch subject at all. There is no question pitch in any
  // text round, so there is nothing a staff illustration could engrave
  // without inventing a subject (option (b), which the user declined).
  const DEFINITION = ["l45-text-definition", "l45-text-count"];
  const FORMULA = [
    "l45-text-dom-formula",
    "l45-text-maj-formula",
    "l45-text-min-formula",
    "l45-text-hd-formula",
    "l45-text-dim-formula",
  ];
  const ABBREVIATION = [
    "l45-text-dom-abbrev",
    "l45-text-maj-abbrev",
    "l45-text-min-abbrev",
    "l45-text-hd-abbrev",
    "l45-text-dim-abbrev",
  ];

  it("accounts for every text round: all twelve are classified rejections", () => {
    const textIds = lesson45Pool
      .filter((round) => round.prompt.kind === "text")
      .map((round) => round.id)
      .sort();
    expect(textIds).toHaveLength(12);
    expect(textIds).toEqual([...DEFINITION, ...FORMULA, ...ABBREVIATION].sort());
  });

  it("has zero companion illustrations across the whole pool", () => {
    for (const round of lesson45Pool) {
      expect(round.illustration, round.id).toBeUndefined();
    }
  });

  it("keeps the two definition rounds text-only: no pitch subject to draw", () => {
    for (const id of DEFINITION) {
      expect(roundById(id).prompt.kind, id).toBe("text");
      expect(roundById(id).illustration, id).toBeUndefined();
    }
  });

  it("keeps the five formula rounds text-only: chord types, no named pitch", () => {
    expect(FORMULA).toHaveLength(5);
    for (const id of FORMULA) {
      expect(roundById(id).prompt.kind, id).toBe("text");
      expect(roundById(id).illustration, id).toBeUndefined();
    }
  });

  it("keeps the five abbreviation rounds text-only: chord-type symbols", () => {
    expect(ABBREVIATION).toHaveLength(5);
    for (const id of ABBREVIATION) {
      expect(roundById(id).prompt.kind, id).toBe("text");
      expect(roundById(id).illustration, id).toBeUndefined();
    }
  });

  it("passes the shared no-leak assertion for every pool round", () => {
    for (const round of lesson45Pool) {
      expect(() => assertNoAnswerLeak(round), round.id).not.toThrow();
    }
  });
});

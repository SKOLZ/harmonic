import { afterEach, describe, expect, it } from "vitest";
import { render } from "solid-js/web";
import { validateRound } from "../lib/rounds/validate";
import type { PromptSpec, Round } from "../lib/rounds/types";
import KeyboardPrompt from "../components/prompts/KeyboardPrompt";
import StaffPrompt from "../components/prompts/StaffPrompt";
import {
  TRIAD_INTERVALS,
  buildTriad,
  detectTriadQuality,
  halfSteps,
  parseNote,
  scientificName,
  type TriadQuality,
} from "../lib/theory";
import { createRng } from "./rng";
import { lesson40, lesson40Pool } from "./lesson40";

const GENERIC_RULE = /^(correct|incorrect|wrong|that'?s right)/i;

/** Every draw, for many seeds, must carry both structurally required kinds. */
const GUARANTEED_SEEDS = Array.from({ length: 100 }, (_, index) => index + 1);

/**
 * The twelve triads the site spells out in lesson 40's own slide text
 * (`lesson40.js`): roots C, Eb and B across the four triad types, with the
 * exact spellings the slides print — including B augmented as B–D#–Fx (Fx is
 * `F##` in ASCII) and Eb diminished as Eb–Gb–Bbb.
 */
const SITE_TRIADS: Record<
  string,
  { root: string; quality: TriadQuality; siteSpelling: string[] }
> = {
  "l40-staff-c-major": { root: "C4", quality: "major", siteSpelling: ["C4", "E4", "G4"] },
  "l40-staff-eb-major": { root: "Eb4", quality: "major", siteSpelling: ["Eb4", "G4", "Bb4"] },
  "l40-staff-b-major": { root: "B4", quality: "major", siteSpelling: ["B4", "D#5", "F#5"] },
  "l40-staff-c-minor": { root: "C4", quality: "minor", siteSpelling: ["C4", "Eb4", "G4"] },
  "l40-staff-eb-minor": { root: "Eb4", quality: "minor", siteSpelling: ["Eb4", "Gb4", "Bb4"] },
  "l40-staff-b-minor": { root: "B4", quality: "minor", siteSpelling: ["B4", "D5", "F#5"] },
  "l40-staff-c-augmented": { root: "C4", quality: "augmented", siteSpelling: ["C4", "E4", "G#4"] },
  "l40-staff-eb-augmented": { root: "Eb4", quality: "augmented", siteSpelling: ["Eb4", "G4", "B4"] },
  "l40-staff-b-augmented": { root: "B4", quality: "augmented", siteSpelling: ["B4", "D#5", "F##5"] },
  "l40-staff-c-diminished": { root: "C4", quality: "diminished", siteSpelling: ["C4", "Eb4", "Gb4"] },
  "l40-staff-eb-diminished": { root: "Eb4", quality: "diminished", siteSpelling: ["Eb4", "Gb4", "Bbb4"] },
  "l40-staff-b-diminished": { root: "B4", quality: "diminished", siteSpelling: ["B4", "D5", "F5"] },
};

/** The half-step counts each of the four formulas states in the site's slides. */
const SITE_HALF_STEPS: Record<TriadQuality, [number, number]> = {
  major: [4, 7],
  minor: [3, 7],
  augmented: [4, 8],
  diminished: [3, 6],
};

/** The interval words each formula states in the site's slides, paired above. */
const SITE_NAMES: Record<TriadQuality, { third: string; fifth: string }> = {
  major: { third: "major third", fifth: "perfect fifth" },
  minor: { third: "minor third", fifth: "perfect fifth" },
  augmented: { third: "major third", fifth: "augmented fifth" },
  diminished: { third: "minor third", fifth: "diminished fifth" },
};

/** How each site half-step count is written in a rule's prose. */
const STEP_WORD: Record<number, string> = {
  3: "three",
  4: "four",
  6: "six",
  7: "seven",
  8: "eight",
};

/** Every round's own rule must state its own formula, not just some round's. */
function expectRuleStatesFormula(id: string, quality: TriadQuality): void {
  const rule = roundById(id).rule;
  const [thirdSteps, fifthSteps] = SITE_HALF_STEPS[quality];
  expect(rule, `staff/keyboard round ${id} third`).toContain(SITE_NAMES[quality].third);
  expect(rule, `staff/keyboard round ${id} fifth`).toContain(SITE_NAMES[quality].fifth);
  expect(rule, `staff/keyboard round ${id} third steps`).toContain(
    `${STEP_WORD[thirdSteps]} half steps`,
  );
  expect(rule, `staff/keyboard round ${id} fifth steps`).toContain(
    `${STEP_WORD[fifthSteps]} half steps`,
  );
}

/** The four C-rooted keyboard examples the site walks through on the keyboard. */
const SITE_C_KEYBOARD: Record<string, { highlight: string[]; quality: TriadQuality }> = {
  "l40-keyboard-c-major": { highlight: ["C4", "E4", "G4"], quality: "major" },
  "l40-keyboard-c-minor": { highlight: ["C4", "Eb4", "G4"], quality: "minor" },
  "l40-keyboard-c-augmented": { highlight: ["C4", "E4", "G#4"], quality: "augmented" },
  "l40-keyboard-c-diminished": { highlight: ["C4", "Eb4", "Gb4"], quality: "diminished" },
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
  return lesson40Pool.filter(isStaffRound).map((round) => ({ id: round.id, prompt: round.prompt }));
}

function keyboardRounds(): Array<{
  id: string;
  prompt: Extract<PromptSpec, { kind: "keyboard" }>;
}> {
  return lesson40Pool
    .filter(isKeyboardRound)
    .map((round) => ({ id: round.id, prompt: round.prompt }));
}

function allRules(): string[] {
  return lesson40Pool.map((round) => round.rule);
}

function roundById(id: string): Round {
  const found = lesson40Pool.find((round) => round.id === id);
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

const cleanups: Array<() => void> = [];

afterEach(() => {
  while (cleanups.length > 0) cleanups.pop()?.();
  document.body.replaceChildren();
});

describe("lesson 40 question pool", () => {
  it("holds 28 rounds: 12 staff, 12 text, 4 keyboard, all ids unique", () => {
    expect(lesson40Pool).toHaveLength(28);
    expect(staffRounds()).toHaveLength(12);
    expect(lesson40Pool.filter((round) => round.prompt.kind === "text")).toHaveLength(12);
    expect(keyboardRounds()).toHaveLength(4);
    const ids = lesson40Pool.map((round) => round.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("validates every pool round", () => {
    for (const round of lesson40Pool) {
      expect(() => validateRound(round)).not.toThrow();
    }
  });

  it("draws at least 12 rounds and every drawn round passes validateRound", () => {
    const rounds = lesson40.generateRounds(createRng(1234));
    expect(rounds.length).toBeGreaterThanOrEqual(12);
    for (const round of rounds) {
      expect(() => validateRound(round)).not.toThrow();
    }
    const ids = rounds.map((round) => round.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("produces identical rounds for the same seed", () => {
    const first = lesson40.generateRounds(createRng(42));
    const second = lesson40.generateRounds(createRng(42));
    expect(second).toEqual(first);
  });

  it("produces different rounds for two different seeds", () => {
    const first = lesson40.generateRounds(createRng(1));
    const second = lesson40.generateRounds(createRng(2));
    expect(JSON.stringify(second)).not.toBe(JSON.stringify(first));
  });

  it("draws at least one staff and one text round for every seed tried", () => {
    for (const seed of GUARANTEED_SEEDS) {
      const kinds = new Set(lesson40.generateRounds(createRng(seed)).map((r) => r.prompt.kind));
      expect(kinds.has("staff"), `seed ${seed} drew no staff round`).toBe(true);
      expect(kinds.has("text"), `seed ${seed} drew no text round`).toBe(true);
    }
  });

  it("draws keyboard rounds for some seeds, so they are live in the pool", () => {
    const kinds = new Set(
      GUARANTEED_SEEDS.flatMap((seed) =>
        lesson40.generateRounds(createRng(seed)).map((r) => r.prompt.kind),
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

  it("engraves every staff prompt as one stacked chord, not one note per tone", () => {
    for (const { id, prompt } of staffRounds()) {
      const host = document.createElement("div");
      document.body.appendChild(host);
      const dispose = render(() => StaffPrompt({ prompt }), host);
      cleanups.push(() => {
        dispose();
        host.remove();
      });
      // VexFlow 5 wraps each StaveNote in <g class="vf-stavenote">: a triad
      // stacked on one chord head is ONE group, three sequential quarters
      // would be three.
      const staveNotes = [...host.querySelectorAll("g")].filter(
        (group) => group.getAttribute("class") === "vf-stavenote",
      );
      expect(staveNotes, `staff round ${id}`).toHaveLength(1);
    }
  });

  it("renders every keyboard prompt with exactly its three chord tones lit", () => {
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
      expect(lit.length, `keyboard prompt ${id}`).toBe(3);
      const label = host.querySelector(".prompt--keyboard")!.getAttribute("aria-label") ?? "";
      expect(label).toBe("Piano keyboard, C4 to C6, 3 keys highlighted");
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
      expect(label, `staff round ${id}`).toBe(`Staff notation, ${prompt.clef} clef, 3 notes`);
      expect(label).not.toMatch(/[A-G][#b]/);
    }
  });

  it("spells every staff round exactly as the site and the theory core spell it", () => {
    for (const { id, prompt } of staffRounds()) {
      const expected = SITE_TRIADS[id];
      expect(expected, `round ${id} is not one of the site's twelve triads`).toBeDefined();
      // Site oracle: the literal spelling printed on the slide.
      expect(prompt.notes, `staff round ${id} vs site`).toEqual(expected.siteSpelling);
      // Core oracle: buildTriad must produce the same tones — never hand-typed.
      expect(prompt.notes, `staff round ${id} vs buildTriad`).toEqual(
        buildTriad(parseNote(expected.root), expected.quality).map(scientificName),
      );
      // Half-step oracle: the counts the site's slides state for this formula.
      const [root, third, fifth] = prompt.notes.map((note) => parseNote(note));
      expect(halfSteps(root!, third!), `staff round ${id} third`).toBe(
        SITE_HALF_STEPS[expected.quality][0],
      );
      expect(halfSteps(root!, fifth!), `staff round ${id} fifth`).toBe(
        SITE_HALF_STEPS[expected.quality][1],
      );
      // Answer oracle: the quality the core detects is the answer the pool marks.
      expect(detectTriadQuality(prompt.notes.map((note) => parseNote(note)))).toBe(
        expected.quality,
      );
      expect(answerOf(id), `staff round ${id}`).toBe(
        `${scientificName(parseNote(expected.root)).replace(/\d+$/, "")} ${expected.quality} triad`,
      );
      expectRuleStatesFormula(id, expected.quality);
    }
  });

  it("lights the site's four C-rooted examples on the keyboard", () => {
    for (const { id, prompt } of keyboardRounds()) {
      const expected = SITE_C_KEYBOARD[id];
      expect(expected, `keyboard round ${id} is not one of the site's C examples`).toBeDefined();
      expect(prompt.highlight).toEqual(expected.highlight);
      const tones = prompt.highlight.map((note) => parseNote(note));
      expect(detectTriadQuality(tones)).toBe(expected.quality);
      expect(answerOf(id), `keyboard round ${id}`).toBe(
        `C ${expected.quality} triad`,
      );
      expectRuleStatesFormula(id, expected.quality);
    }
  });

  it("pins the site's definitions and formulas in the text rounds", () => {
    expect(answerOf("l40-text-chord-definition")).toBe("Three or more");
    expect(answerOf("l40-text-chord-root")).toBe("The root");
    expect(answerOf("l40-text-triad-tones")).toBe("A root, a third, and a fifth");
    expect(answerOf("l40-text-major-formula")).toBe("A major third and a perfect fifth");
    expect(answerOf("l40-text-minor-formula")).toBe("A minor third and a perfect fifth");
    expect(answerOf("l40-text-augmented-formula")).toBe("A major third and an augmented fifth");
    expect(answerOf("l40-text-diminished-formula")).toBe("A minor third and a diminished fifth");
    expect(answerOf("l40-text-major-half-steps")).toBe("Four and seven");
    expect(answerOf("l40-text-minor-half-steps")).toBe("Three and seven");
    expect(answerOf("l40-text-augmented-half-steps")).toBe("Four and eight");
    expect(answerOf("l40-text-diminished-half-steps")).toBe("Three and six");
    expect(answerOf("l40-text-eb-diminished-spelling")).toBe("Eb–Gb–Bbb");
  });

  it("agrees with the theory core's triad interval table on all four formulas", () => {
    expect(TRIAD_INTERVALS.major).toEqual(SITE_HALF_STEPS.major);
    expect(TRIAD_INTERVALS.minor).toEqual(SITE_HALF_STEPS.minor);
    expect(TRIAD_INTERVALS.augmented).toEqual(SITE_HALF_STEPS.augmented);
    expect(TRIAD_INTERVALS.diminished).toEqual(SITE_HALF_STEPS.diminished);
  });

  it("states the site's chord facts in every rule", () => {
    for (const rule of allRules()) {
      expect(rule).not.toMatch(GENERIC_RULE);
    }
    const rules = allRules().join(" \n ");
    expect(rules).toMatch(/three or more notes/);
    expect(rules).toMatch(/built off of a single note, called the root/);
    expect(rules).toMatch(/root, third, and fifth/);
    expect(rules).toMatch(/a major third and a perfect fifth/);
    expect(rules).toMatch(/a minor third and a perfect fifth/);
    expect(rules).toMatch(/a major third and an augmented fifth/);
    expect(rules).toMatch(/a minor third and a diminished fifth/);
    expect(rules).toMatch(/four half steps/);
    expect(rules).toMatch(/seven half steps/);
    expect(rules).toMatch(/three half steps/);
    expect(rules).toMatch(/six half steps/);
    expect(rules).toMatch(/eight half steps/);
  });
});

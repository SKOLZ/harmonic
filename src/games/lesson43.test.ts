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
  diatonicTriadQualities,
  diatonicTriads,
  genericIntervalNumber,
  halfSteps,
  parseNote,
  scientificName,
  type ScaleType,
  type TriadQuality,
} from "../lib/theory";
import { createRng } from "./rng";
import { lesson43, lesson43Pool } from "./lesson43";

const GENERIC_RULE = /^(correct|incorrect|wrong|that'?s right)/i;

/** Every draw, for many seeds, must carry both structurally required kinds. */
const GUARANTEED_SEEDS = Array.from({ length: 100 }, (_, index) => index + 1);

/** The four triad qualities, in the order lesson 40's slides introduce them. */
const QUALITY_ORDER: readonly TriadQuality[] = ["major", "minor", "augmented", "diminished"];

/** The site's interval words per quality (lesson 43 slides use these exactly). */
const INTERVAL_WORDS: Readonly<Record<TriadQuality, { third: string; fifth: string }>> = {
  major: { third: "major third", fifth: "perfect fifth" },
  minor: { third: "minor third", fifth: "perfect fifth" },
  augmented: { third: "major third", fifth: "augmented fifth" },
  diminished: { third: "minor third", fifth: "diminished fifth" },
};

/** English ordinals for scale degrees, matching the slides' phrasing. */
const ORDINALS: Readonly<Record<number, string>> = {
  1: "first",
  2: "second",
  3: "third",
  4: "fourth",
  5: "fifth",
  6: "sixth",
  7: "seventh",
};

/** Scale labels as the lesson names its four worked scales. */
const SCALE_LABELS: Readonly<Record<ScaleType, string>> = {
  major: "C major",
  naturalMinor: "C natural minor",
  harmonicMinor: "C harmonic minor",
  melodicMinor: "C melodic minor",
};

/**
 * The sixteen triads lesson 43 spells out in its own slide text: all seven of
 * C major, all seven of C natural minor, plus the two spellings harmonic and
 * melodic minor introduce that no earlier scale shares (Eb–G–B and A–C–Eb).
 */
const SITE_STAFF: Record<
  string,
  { root: string; quality: TriadQuality; spelling: string[]; scale: ScaleType; degree: number }
> = {
  // --- C major: seven diatonic triads ---------------------------------------
  "l43-staff-c-major": { root: "C4", quality: "major", spelling: ["C4", "E4", "G4"], scale: "major", degree: 1 },
  "l43-staff-d-minor": { root: "D4", quality: "minor", spelling: ["D4", "F4", "A4"], scale: "major", degree: 2 },
  "l43-staff-e-minor": { root: "E4", quality: "minor", spelling: ["E4", "G4", "B4"], scale: "major", degree: 3 },
  "l43-staff-f-major": { root: "F4", quality: "major", spelling: ["F4", "A4", "C5"], scale: "major", degree: 4 },
  "l43-staff-g-major": { root: "G4", quality: "major", spelling: ["G4", "B4", "D5"], scale: "major", degree: 5 },
  "l43-staff-a-minor": { root: "A4", quality: "minor", spelling: ["A4", "C5", "E5"], scale: "major", degree: 6 },
  "l43-staff-b-dim": { root: "B4", quality: "diminished", spelling: ["B4", "D5", "F5"], scale: "major", degree: 7 },
  // --- C natural minor: seven diatonic triads -------------------------------
  "l43-staff-c-min": { root: "C4", quality: "minor", spelling: ["C4", "Eb4", "G4"], scale: "naturalMinor", degree: 1 },
  "l43-staff-d-dim": { root: "D4", quality: "diminished", spelling: ["D4", "F4", "Ab4"], scale: "naturalMinor", degree: 2 },
  "l43-staff-eb-major": { root: "Eb4", quality: "major", spelling: ["Eb4", "G4", "Bb4"], scale: "naturalMinor", degree: 3 },
  "l43-staff-f-min": { root: "F4", quality: "minor", spelling: ["F4", "Ab4", "C5"], scale: "naturalMinor", degree: 4 },
  "l43-staff-g-min": { root: "G4", quality: "minor", spelling: ["G4", "Bb4", "D5"], scale: "naturalMinor", degree: 5 },
  "l43-staff-ab-major": { root: "Ab4", quality: "major", spelling: ["Ab4", "C5", "Eb5"], scale: "naturalMinor", degree: 6 },
  "l43-staff-bb-major": { root: "Bb4", quality: "major", spelling: ["Bb4", "D5", "F5"], scale: "naturalMinor", degree: 7 },
  // --- reanalysed by raising a tone -----------------------------------------
  "l43-staff-eb-aug": { root: "Eb4", quality: "augmented", spelling: ["Eb4", "G4", "B4"], scale: "harmonicMinor", degree: 3 },
  "l43-staff-a-dim": { root: "A4", quality: "diminished", spelling: ["A4", "C5", "Eb5"], scale: "melodicMinor", degree: 6 },
};

/** The site's four C-rooted tonic/anchor triads, lit on the keyboard. */
const SITE_KEYBOARD: Record<
  string,
  { root: string; quality: TriadQuality; spelling: string[]; scale: ScaleType; degree: number }
> = {
  "l43-keyboard-c-major": { root: "C4", quality: "major", spelling: ["C4", "E4", "G4"], scale: "major", degree: 1 },
  "l43-keyboard-c-min": { root: "C4", quality: "minor", spelling: ["C4", "Eb4", "G4"], scale: "naturalMinor", degree: 1 },
  "l43-keyboard-eb-aug": { root: "Eb4", quality: "augmented", spelling: ["Eb4", "G4", "B4"], scale: "harmonicMinor", degree: 3 },
  "l43-keyboard-b-dim": { root: "B4", quality: "diminished", spelling: ["B4", "D5", "F5"], scale: "major", degree: 7 },
};

/**
 * Lesson 43's chart rows: the quality of each diatonic triad, degrees 1–7, for
 * the four scales the lesson charts. Pulled straight from the slide text that
 * walks every cell of the major and natural minor rows and then reanalyses the
 * cells harmonic and melodic minor change.
 */
const SITE_QUALITY_ROWS: Readonly<Record<ScaleType, readonly TriadQuality[]>> = {
  major: ["major", "minor", "minor", "major", "major", "minor", "diminished"],
  naturalMinor: ["minor", "diminished", "major", "minor", "minor", "major", "major"],
  harmonicMinor: ["minor", "diminished", "augmented", "minor", "major", "major", "diminished"],
  melodicMinor: ["minor", "minor", "augmented", "major", "major", "diminished", "diminished"],
};

/** The sixteen text answers, each the site's own conclusion. */
const SITE_TEXT: Readonly<Record<string, string>> = {
  "l43-text-definition": "Seven special triads formed from a scale's notes",
  "l43-text-count": "Seven",
  "l43-text-process-1": "Construct the scale",
  "l43-text-process-2": "Stack two generic thirds on top of each note",
  "l43-text-process-3": "Analyze the resulting triads",
  "l43-text-major-recap": "The second and third",
  "l43-text-major-vii": "Diminished",
  "l43-text-minor-majors": "The third, sixth and seventh",
  "l43-text-minor-ii": "Diminished",
  "l43-text-harmonic-build": "Raise the seventh tone a half step",
  "l43-text-harmonic-reanalyzed": "The third, fifth and seventh",
  "l43-text-harmonic-iii": "Augmented",
  "l43-text-harmonic-v": "Major",
  "l43-text-melodic-build": "Raise the sixth tone a half step",
  "l43-text-melodic-reanalyzed": "The second, fourth and sixth",
  "l43-text-melodic-vi": "Diminished",
};

/** "Eb4" → "Eb": the root's name as prose writes it. */
const rootLabel = (root: string): string =>
  scientificName(parseNote(root)).replace(/\d+$/, "");

/** "C4" → "C": a tone's name without its octave. */
const toneLabel = (note: string): string => note.replace(/\d+$/, "");

/** The pool's answer for a triad round: root label + quality. */
const expectedAnswer = (root: string, quality: TriadQuality): string =>
  `${rootLabel(root)} ${quality} triad`;

/** English "a"/"an" before the site's interval words ("an augmented fifth"). */
const article = (word: string): string => (/^[aeiou]/i.test(word) ? "an" : "a");

/** The site's per-slide analysis sentence, rebuilt from site words. */
const siteRule = (entry: { root: string; quality: TriadQuality; spelling: string[]; scale: ScaleType; degree: number }): string => {
  const { third, fifth } = INTERVAL_WORDS[entry.quality];
  return (
    `The ${ORDINALS[entry.degree]} triad of the ${SCALE_LABELS[entry.scale]} scale is spelled ` +
    `${entry.spelling.map(toneLabel).join("–")}, ${article(third)} ${third} and ${article(fifth)} ${fifth}. ` +
    `Therefore, the triad is ${entry.quality}.`
  );
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
  return lesson43Pool.filter(isStaffRound).map((round) => ({ id: round.id, prompt: round.prompt }));
}

function keyboardRounds(): Array<{
  id: string;
  prompt: Extract<PromptSpec, { kind: "keyboard" }>;
}> {
  return lesson43Pool
    .filter(isKeyboardRound)
    .map((round) => ({ id: round.id, prompt: round.prompt }));
}

function textRounds(): Array<{ id: string; prompt: Extract<PromptSpec, { kind: "text" }> }> {
  return lesson43Pool
    .filter((round): round is Round & { prompt: Extract<PromptSpec, { kind: "text" }> } =>
      round.prompt.kind === "text",
    )
    .map((round) => ({ id: round.id, prompt: round.prompt }));
}

function allRules(): string[] {
  return lesson43Pool.map((round) => round.rule);
}

function roundById(id: string): Round {
  const found = lesson43Pool.find((round) => round.id === id);
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

describe("lesson 43 question pool", () => {
  it("holds 36 rounds: 16 staff, 16 text, 4 keyboard, all ids unique", () => {
    expect(lesson43Pool).toHaveLength(36);
    expect(staffRounds()).toHaveLength(16);
    expect(textRounds()).toHaveLength(16);
    expect(keyboardRounds()).toHaveLength(4);
    const ids = lesson43Pool.map((round) => round.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(lesson43.entry.id).toBe(43);
  });

  it("validates every pool round", () => {
    for (const round of lesson43Pool) {
      expect(() => validateRound(round)).not.toThrow();
    }
  });

  it("draws at least 12 rounds and every drawn round passes validateRound", () => {
    const rounds = lesson43.generateRounds(createRng(1234));
    expect(rounds.length).toBeGreaterThanOrEqual(12);
    for (const round of rounds) {
      expect(() => validateRound(round)).not.toThrow();
    }
    const ids = rounds.map((round) => round.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("produces identical rounds for the same seed", () => {
    const first = lesson43.generateRounds(createRng(42));
    const second = lesson43.generateRounds(createRng(42));
    expect(second).toEqual(first);
  });

  it("produces different rounds for two different seeds", () => {
    const first = lesson43.generateRounds(createRng(1));
    const second = lesson43.generateRounds(createRng(2));
    expect(JSON.stringify(second)).not.toBe(JSON.stringify(first));
  });

  it("draws at least one staff and one text round for every seed tried", () => {
    for (const seed of GUARANTEED_SEEDS) {
      const kinds = new Set(lesson43.generateRounds(createRng(seed)).map((r) => r.prompt.kind));
      expect(kinds.has("staff"), `seed ${seed} drew no staff round`).toBe(true);
      expect(kinds.has("text"), `seed ${seed} drew no text round`).toBe(true);
    }
  });

  it("draws keyboard rounds for some seeds, so they are live in the pool", () => {
    const kinds = new Set(
      GUARANTEED_SEEDS.flatMap((seed) =>
        lesson43.generateRounds(createRng(seed)).map((r) => r.prompt.kind),
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
      // VexFlow 5 wraps each StaveNote in <g class="vf-stavenote">: a triad
      // stacked on one chord head is ONE group, three sequential quarters
      // would be three.
      const staveNotes = [...host.querySelectorAll("g")].filter(
        (group) => group.getAttribute("class") === "vf-stavenote",
      );
      expect(staveNotes, `staff round ${id}`).toHaveLength(1);
    }
  });

  it("marks every staff prompt simultaneous so its tones engrave as one chord", () => {
    for (const { id, prompt } of staffRounds()) {
      expect(prompt.simultaneous, `staff round ${id}`).toBe(true);
    }
  });

  it("renders every keyboard prompt with exactly its three triad tones lit", () => {
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
      const expected = SITE_STAFF[id];
      expect(expected, `round ${id} is not one of the site's sixteen diatonic triads`).toBeDefined();
      // Site oracle: the literal spelling printed on the slide.
      expect(prompt.notes, `staff round ${id} vs site`).toEqual(expected.spelling);
      // Core oracle: buildTriad must produce the same tones — never hand-typed.
      expect(prompt.notes, `staff round ${id} vs buildTriad`).toEqual(
        buildTriad(parseNote(expected.root), expected.quality).map(scientificName),
      );
      const notes = prompt.notes.map((note) => parseNote(note));
      const root = notes[0]!;
      expect(genericIntervalNumber(root, notes[2]!), `staff round ${id} fifth`).toBe(5);
      expect(detectTriadQuality(notes), `staff round ${id} quality`).toBe(expected.quality);
      const [thirdSteps, fifthSteps] = TRIAD_INTERVALS[expected.quality];
      expect(halfSteps(root, notes[1]!), `staff round ${id} third`).toBe(thirdSteps);
      expect(halfSteps(root, notes[2]!), `staff round ${id} fifth`).toBe(fifthSteps);
      // The scale's own diatonic triad must agree — quality and letter stack.
      // Root is octave-less C: the site works every example in C, and roman.ts
      // only detects qualities correctly without octaves (an octave-ful root
      // makes degree 4+ stacks wrap down, so halfSteps goes absolute).
      const diatonic = diatonicTriads(parseNote("C"), expected.scale)[expected.degree - 1]!;
      expect(diatonic.quality, `staff round ${id} vs diatonicTriads`).toBe(expected.quality);
      expect(diatonic.notes.map(scientificName).map(toneLabel)).toEqual(
        prompt.notes.map(toneLabel),
      );
      // The pool offers exactly the four quality labels on this root, so a
      // distractor is always another triad quality.
      const choices = roundById(id).answer as Extract<Round["answer"], { kind: "choices" }>;
      expect(choices.options, `staff round ${id} options`).toEqual(
        QUALITY_ORDER.map((quality) => `${rootLabel(expected.root)} ${quality} triad`),
      );
      expect(answerOf(id), `staff round ${id}`).toBe(
        expectedAnswer(expected.root, expected.quality),
      );
      expect(roundById(id).rule, `staff round ${id} rule`).toBe(siteRule(expected));
    }
  });

  it("lights the site's four worked C triads on the keyboard", () => {
    for (const { id, prompt } of keyboardRounds()) {
      const expected = SITE_KEYBOARD[id];
      expect(expected, `keyboard round ${id} is not one of the site's four examples`).toBeDefined();
      expect(prompt.highlight).toEqual(expected.spelling);
      const notes = prompt.highlight.map((note) => parseNote(note));
      expect(detectTriadQuality(notes), `keyboard round ${id} quality`).toBe(expected.quality);
      expect(genericIntervalNumber(notes[0]!, notes[2]!), `keyboard round ${id} fifth`).toBe(5);
      const choices = roundById(id).answer as Extract<Round["answer"], { kind: "choices" }>;
      expect(choices.options, `keyboard round ${id} options`).toEqual(
        QUALITY_ORDER.map((quality) => `${rootLabel(expected.root)} ${quality} triad`),
      );
      expect(answerOf(id), `keyboard round ${id}`).toBe(
        expectedAnswer(expected.root, expected.quality),
      );
      expect(roundById(id).rule, `keyboard round ${id} rule`).toBe(siteRule(expected));
    }
  });

  it("matches the site's chart rows for all four scale qualities", () => {
    for (const [scale, row] of Object.entries(SITE_QUALITY_ROWS)) {
      expect(diatonicTriadQualities(scale as ScaleType), `row ${scale}`).toEqual([...row]);
    }
  });

  it("pins the site's definitions, processes and reanalysis facts in the text rounds", () => {
    for (const [id, expected] of Object.entries(SITE_TEXT)) {
      expect(answerOf(id), id).toBe(expected);
    }
    expect(answerOf("l43-text-definition")).toContain(
      "Seven special triads formed from a scale's notes",
    );
    expect(textRounds()).toHaveLength(Object.keys(SITE_TEXT).length);
  });

  it("states the site's diatonic-triad facts in every rule", () => {
    for (const rule of allRules()) {
      expect(rule).not.toMatch(GENERIC_RULE);
    }
    const rules = allRules().join(" \n ");
    expect(rules).toMatch(/seven special triads, called diatonic triads/);
    expect(rules).toMatch(/a three step process must be used/);
    expect(rules).toMatch(/stack two generic thirds on top of each note/);
    expect(rules).toMatch(/analyze the resulting triads/);
    expect(rules).toMatch(/first triad of a major scale will always be major/);
    expect(rules).toMatch(/seventh tone is raised a half step/);
    expect(rules).toMatch(/sixth tone is raised a half step/);
    expect(rules).toMatch(/third, fifth, and seventh chords have been altered/);
    expect(rules).toMatch(/second, fourth, and sixth chords have been altered/);
    expect(rules).toMatch(/Therefore, the triad is (major|minor|augmented|diminished)\./);
  });
});

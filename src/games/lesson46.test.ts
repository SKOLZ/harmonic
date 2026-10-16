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
  diatonicSevenths,
  genericIntervalNumber,
  halfSteps,
  parseNote,
  scientificName,
  type ScaleType,
  type SeventhQuality,
  type TriadQuality,
} from "../lib/theory";
import { createRng } from "./rng";
import { lesson46, lesson46Pool } from "./lesson46";

const GENERIC_RULE = /^(correct|incorrect|wrong|that'?s right)/i;

/** Every draw, for many seeds, must carry both structurally required kinds. */
const GUARANTEED_SEEDS = Array.from({ length: 100 }, (_, index) => index + 1);

/**
 * The seven types lesson 46 names, in the order its slides walk them for
 * the major scale: major, minor (×3), dominant, half-diminished, then the
 * reanalysed minor-major and augmented-major, and finally fully-diminished.
 * The pool offers all seven on every chord round.
 */
const TYPE_ORDER: readonly SeventhQuality[] = [
  "majorSeventh",
  "minorSeventh",
  "dominantSeventh",
  "halfDiminishedSeventh",
  "minorMajorSeventh",
  "augmentedMajorSeventh",
  "fullyDiminishedSeventh",
];

/** The site's type names as the slides write them in prose. */
const TYPE_DISPLAY: Readonly<Record<SeventhQuality, string>> = {
  majorSeventh: "major",
  minorSeventh: "minor",
  dominantSeventh: "dominant",
  halfDiminishedSeventh: "half-diminished",
  minorMajorSeventh: "minor-major",
  augmentedMajorSeventh: "augmented-major",
  fullyDiminishedSeventh: "fully-diminished",
  augmentedSeventh: "augmented",
};

/** The base triad each formula names before the seventh is stacked. */
const BASE_TRIAD: Readonly<Record<SeventhQuality, TriadQuality>> = {
  majorSeventh: "major",
  minorSeventh: "minor",
  dominantSeventh: "major",
  halfDiminishedSeventh: "diminished",
  minorMajorSeventh: "minor",
  augmentedMajorSeventh: "augmented",
  fullyDiminishedSeventh: "diminished",
  augmentedSeventh: "augmented",
};

/** The seventh word each formula uses. */
const SEVENTH_WORD: Readonly<Record<SeventhQuality, string>> = {
  majorSeventh: "major seventh",
  minorSeventh: "minor seventh",
  dominantSeventh: "minor seventh",
  halfDiminishedSeventh: "minor seventh",
  minorMajorSeventh: "major seventh",
  augmentedMajorSeventh: "major seventh",
  fullyDiminishedSeventh: "diminished seventh",
  augmentedSeventh: "minor seventh",
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
 * The nineteen seventh chords lesson 46 spells out in its own slide text:
 * all seven of C major, all seven of C natural minor, plus the five unique
 * reanalysed spellings harmonic and melodic minor introduce — C–Eb–G–B,
 * Eb–G–B–D, B–D–F–Ab, F–A–C–Eb and A–C–Eb–G. (Harmonic minor's fifth and
 * melodic minor's second and seventh repeat chords already listed.)
 */
const SITE_SEVENTHS: Record<
  string,
  { root: string; quality: SeventhQuality; spelling: string[]; scale: ScaleType; degree: number }
> = {
  // --- C major: seven diatonic seventh chords --------------------------------
  "l46-staff-c-maj7": { root: "C4", quality: "majorSeventh", spelling: ["C4", "E4", "G4", "B4"], scale: "major", degree: 1 },
  "l46-staff-d-m7": { root: "D4", quality: "minorSeventh", spelling: ["D4", "F4", "A4", "C5"], scale: "major", degree: 2 },
  "l46-staff-e-m7": { root: "E4", quality: "minorSeventh", spelling: ["E4", "G4", "B4", "D5"], scale: "major", degree: 3 },
  "l46-staff-f-maj7": { root: "F4", quality: "majorSeventh", spelling: ["F4", "A4", "C5", "E5"], scale: "major", degree: 4 },
  "l46-staff-g-dom": { root: "G4", quality: "dominantSeventh", spelling: ["G4", "B4", "D5", "F5"], scale: "major", degree: 5 },
  "l46-staff-a-m7": { root: "A4", quality: "minorSeventh", spelling: ["A4", "C5", "E5", "G5"], scale: "major", degree: 6 },
  "l46-staff-b-hd": { root: "B4", quality: "halfDiminishedSeventh", spelling: ["B4", "D5", "F5", "A5"], scale: "major", degree: 7 },
  // --- C natural minor: seven diatonic seventh chords ------------------------
  "l46-staff-c-m7": { root: "C4", quality: "minorSeventh", spelling: ["C4", "Eb4", "G4", "Bb4"], scale: "naturalMinor", degree: 1 },
  "l46-staff-d-hd": { root: "D4", quality: "halfDiminishedSeventh", spelling: ["D4", "F4", "Ab4", "C5"], scale: "naturalMinor", degree: 2 },
  "l46-staff-eb-maj7": { root: "Eb4", quality: "majorSeventh", spelling: ["Eb4", "G4", "Bb4", "D5"], scale: "naturalMinor", degree: 3 },
  "l46-staff-f-m7": { root: "F4", quality: "minorSeventh", spelling: ["F4", "Ab4", "C5", "Eb5"], scale: "naturalMinor", degree: 4 },
  "l46-staff-g-m7": { root: "G4", quality: "minorSeventh", spelling: ["G4", "Bb4", "D5", "F5"], scale: "naturalMinor", degree: 5 },
  "l46-staff-ab-maj7": { root: "Ab4", quality: "majorSeventh", spelling: ["Ab4", "C5", "Eb5", "G5"], scale: "naturalMinor", degree: 6 },
  "l46-staff-bb-dom": { root: "Bb4", quality: "dominantSeventh", spelling: ["Bb4", "D5", "F5", "Ab5"], scale: "naturalMinor", degree: 7 },
  // --- reanalysed by raising a tone ------------------------------------------
  "l46-staff-c-mma7": { root: "C4", quality: "minorMajorSeventh", spelling: ["C4", "Eb4", "G4", "B4"], scale: "harmonicMinor", degree: 1 },
  "l46-staff-eb-am7": { root: "Eb4", quality: "augmentedMajorSeventh", spelling: ["Eb4", "G4", "B4", "D5"], scale: "harmonicMinor", degree: 3 },
  "l46-staff-b-fdim": { root: "B4", quality: "fullyDiminishedSeventh", spelling: ["B4", "D5", "F5", "Ab5"], scale: "harmonicMinor", degree: 7 },
  "l46-staff-f-dom": { root: "F4", quality: "dominantSeventh", spelling: ["F4", "A4", "C5", "Eb5"], scale: "melodicMinor", degree: 4 },
  "l46-staff-a-hd": { root: "A4", quality: "halfDiminishedSeventh", spelling: ["A4", "C5", "Eb5", "G5"], scale: "melodicMinor", degree: 6 },
};

/** The site's five keyboard examples: the C-rooted anchors and two B chords. */
const SITE_KEYBOARD: Record<
  string,
  { root: string; quality: SeventhQuality; spelling: string[]; scale: ScaleType; degree: number }
> = {
  "l46-keyboard-c-maj7": { root: "C4", quality: "majorSeventh", spelling: ["C4", "E4", "G4", "B4"], scale: "major", degree: 1 },
  "l46-keyboard-c-m7": { root: "C4", quality: "minorSeventh", spelling: ["C4", "Eb4", "G4", "Bb4"], scale: "naturalMinor", degree: 1 },
  "l46-keyboard-g-dom": { root: "G4", quality: "dominantSeventh", spelling: ["G4", "B4", "D5", "F5"], scale: "major", degree: 5 },
  "l46-keyboard-b-hd": { root: "B4", quality: "halfDiminishedSeventh", spelling: ["B4", "D5", "F5", "A5"], scale: "major", degree: 7 },
  "l46-keyboard-b-fdim": { root: "B4", quality: "fullyDiminishedSeventh", spelling: ["B4", "D5", "F5", "Ab5"], scale: "harmonicMinor", degree: 7 },
};

/**
 * The lesson's chart rows: the seventh chord on each degree, for the four
 * scales the lesson charts. Every cell the site prints in slide text is
 * reproduced here; the rest follow from the same stacking rule.
 */
const SITE_SEVENTH_ROWS: Readonly<Record<ScaleType, readonly SeventhQuality[]>> = {
  major: [
    "majorSeventh",
    "minorSeventh",
    "minorSeventh",
    "majorSeventh",
    "dominantSeventh",
    "minorSeventh",
    "halfDiminishedSeventh",
  ],
  naturalMinor: [
    "minorSeventh",
    "halfDiminishedSeventh",
    "majorSeventh",
    "minorSeventh",
    "minorSeventh",
    "majorSeventh",
    "dominantSeventh",
  ],
  harmonicMinor: [
    "minorMajorSeventh",
    "halfDiminishedSeventh",
    "augmentedMajorSeventh",
    "minorSeventh",
    "dominantSeventh",
    "majorSeventh",
    "fullyDiminishedSeventh",
  ],
  melodicMinor: [
    "minorMajorSeventh",
    "minorSeventh",
    "augmentedMajorSeventh",
    "dominantSeventh",
    "dominantSeventh",
    "halfDiminishedSeventh",
    "halfDiminishedSeventh",
  ],
};

/** The seventeen text answers, each the site's own conclusion. */
const SITE_TEXT: Readonly<Record<string, string>> = {
  "l46-text-definition": "Seven",
  "l46-text-process-1": "Construct the scale",
  "l46-text-process-2": "Stack three generic thirds",
  "l46-text-process-3": "Analyze the resulting seventh chords",
  "l46-text-major-14": "Major seventh",
  "l46-text-major-236": "Minor seventh",
  "l46-text-major-5": "Dominant seventh",
  "l46-text-major-7": "Half-diminished seventh",
  "l46-text-recap-first": "A major seventh",
  "l46-text-recap-23": "Minor sevenths",
  "l46-text-nm-i": "Minor seventh",
  "l46-text-harmonic-build": "Raise the seventh tone a half step",
  "l46-text-harmonic-i": "Minor-major seventh",
  "l46-text-harmonic-iii": "Augmented-major seventh",
  "l46-text-harmonic-vii": "Fully-diminished seventh",
  "l46-text-melodic-build": "Raise the sixth tone a half step",
  "l46-text-melodic-iv": "Dominant seventh",
};

/** "Eb4" → "Eb": the root's name as prose writes it. */
const rootLabel = (root: string): string =>
  scientificName(parseNote(root)).replace(/\d+$/, "");

/** "C4" → "C": a tone's name without its octave. */
const toneLabel = (note: string): string => note.replace(/\d+$/, "");

/** English "a"/"an" before a word ("an augmented triad"). */
const article = (word: string): string => (/^[aeiou]/i.test(word) ? "an" : "a");

/** The pool's answer for a chord round: root label + the site's type name. */
const expectedAnswer = (root: string, quality: SeventhQuality): string =>
  `${rootLabel(root)} ${TYPE_DISPLAY[quality]} seventh chord`;

/** The site's own analysis sentence, rebuilt from site words. */
const siteRule = (entry: {
  root: string;
  quality: SeventhQuality;
  spelling: string[];
  scale: ScaleType;
  degree: number;
}): string => {
  const triad = `${BASE_TRIAD[entry.quality]} triad`;
  const seventh = SEVENTH_WORD[entry.quality];
  const display = TYPE_DISPLAY[entry.quality];
  return (
    `The ${ORDINALS[entry.degree]} chord of the ${SCALE_LABELS[entry.scale]} scale is spelled ` +
    `${entry.spelling.map(toneLabel).join("–")}, ${article(triad)} ${triad} and ` +
    `${article(seventh)} ${seventh}. Therefore, it is ${article(display)} ${display} seventh chord.`
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
  return lesson46Pool.filter(isStaffRound).map((round) => ({ id: round.id, prompt: round.prompt }));
}

function keyboardRounds(): Array<{
  id: string;
  prompt: Extract<PromptSpec, { kind: "keyboard" }>;
}> {
  return lesson46Pool
    .filter(isKeyboardRound)
    .map((round) => ({ id: round.id, prompt: round.prompt }));
}

function textRounds(): Array<{ id: string; prompt: Extract<PromptSpec, { kind: "text" }> }> {
  return lesson46Pool
    .filter((round): round is Round & { prompt: Extract<PromptSpec, { kind: "text" }> } =>
      round.prompt.kind === "text",
    )
    .map((round) => ({ id: round.id, prompt: round.prompt }));
}

function allRules(): string[] {
  return lesson46Pool.map((round) => round.rule);
}

function roundById(id: string): Round {
  const found = lesson46Pool.find((round) => round.id === id);
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

/**
 * The site formula contract: every chord round's rule states its own triad
 * and seventh words plus the literal spelling, and the pool offers exactly
 * the seven type names on this root.
 */
function expectChordContract(
  id: string,
  entry: { root: string; quality: SeventhQuality; spelling: string[]; scale: ScaleType; degree: number },
): void {
  const rule = roundById(id).rule;
  const triad = `${BASE_TRIAD[entry.quality]} triad`;
  expect(rule, `round ${id} triad`).toContain(`${article(triad)} ${triad}`);
  expect(rule, `round ${id} seventh`).toContain(
    `${article(SEVENTH_WORD[entry.quality])} ${SEVENTH_WORD[entry.quality]}`,
  );
  expect(rule, `round ${id} spelling`).toContain(entry.spelling.map(toneLabel).join("–"));
  const answer = roundById(id).answer as Extract<Round["answer"], { kind: "choices" }>;
  expect(answer.options, `round ${id} options`).toEqual(
    TYPE_ORDER.map((quality) => `${rootLabel(entry.root)} ${TYPE_DISPLAY[quality]} seventh chord`),
  );
  expect(answerOf(id), `round ${id} answer`).toBe(expectedAnswer(entry.root, entry.quality));
  expect(rule, `round ${id} rule`).toBe(siteRule(entry));
}

const cleanups: Array<() => void> = [];

afterEach(() => {
  while (cleanups.length > 0) cleanups.pop()?.();
  document.body.replaceChildren();
});

describe("lesson 46 question pool", () => {
  it("holds 41 rounds: 19 staff, 17 text, 5 keyboard, all ids unique", () => {
    expect(lesson46Pool).toHaveLength(41);
    expect(staffRounds()).toHaveLength(19);
    expect(textRounds()).toHaveLength(17);
    expect(keyboardRounds()).toHaveLength(5);
    const ids = lesson46Pool.map((round) => round.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(lesson46.entry.id).toBe(46);
  });

  it("validates every pool round", () => {
    for (const round of lesson46Pool) {
      expect(() => validateRound(round)).not.toThrow();
    }
  });

  it("draws at least 12 rounds and every drawn round passes validateRound", () => {
    const rounds = lesson46.generateRounds(createRng(1234));
    expect(rounds.length).toBeGreaterThanOrEqual(12);
    for (const round of rounds) {
      expect(() => validateRound(round)).not.toThrow();
    }
    const ids = rounds.map((round) => round.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("produces identical rounds for the same seed", () => {
    const first = lesson46.generateRounds(createRng(42));
    const second = lesson46.generateRounds(createRng(42));
    expect(second).toEqual(first);
  });

  it("produces different rounds for two different seeds", () => {
    const first = lesson46.generateRounds(createRng(1));
    const second = lesson46.generateRounds(createRng(2));
    expect(JSON.stringify(second)).not.toBe(JSON.stringify(first));
  });

  it("draws at least one staff and one text round for every seed tried", () => {
    for (const seed of GUARANTEED_SEEDS) {
      const kinds = new Set(lesson46.generateRounds(createRng(seed)).map((r) => r.prompt.kind));
      expect(kinds.has("staff"), `seed ${seed} drew no staff round`).toBe(true);
      expect(kinds.has("text"), `seed ${seed} drew no text round`).toBe(true);
    }
  });

  it("draws keyboard rounds for some seeds, so they are live in the pool", () => {
    const kinds = new Set(
      GUARANTEED_SEEDS.flatMap((seed) =>
        lesson46.generateRounds(createRng(seed)).map((r) => r.prompt.kind),
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
      // VexFlow 5 wraps each StaveNote in <g class="vf-stavenote">: a chord
      // stacked on one head is ONE group, sequential quarters would be four.
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

  it("spells every staff round as the site spells it, proven by the core", () => {
    for (const { id, prompt } of staffRounds()) {
      const expected = SITE_SEVENTHS[id];
      expect(expected, `round ${id} is not one of the site's nineteen seventh chords`).toBeDefined();
      // Site oracle: the literal spelling printed on the slide.
      expect(prompt.notes, `staff round ${id} vs site`).toEqual(expected.spelling);
      // Core oracle: buildSeventh must produce the same tones — never hand-typed.
      expect(prompt.notes, `staff round ${id} vs buildSeventh`).toEqual(
        buildSeventh(parseNote(expected.root), expected.quality).map(scientificName),
      );
      const notes = prompt.notes.map((note) => parseNote(note));
      const root = notes[0]!;
      expect(genericIntervalNumber(root, notes[3]!), `staff round ${id} seventh`).toBe(7);
      expect(detectTriadQuality(notes.slice(0, 3)), `staff round ${id} triad`).toBe(
        BASE_TRIAD[expected.quality],
      );
      expect(detectSeventhQuality(notes), `staff round ${id} quality`).toBe(expected.quality);
      const [thirdSteps, fifthSteps, seventhSteps] = SEVENTH_INTERVALS[expected.quality];
      expect(halfSteps(root, notes[1]!), `staff round ${id} third`).toBe(thirdSteps);
      expect(halfSteps(root, notes[2]!), `staff round ${id} fifth`).toBe(fifthSteps);
      expect(halfSteps(root, notes[3]!), `staff round ${id} seventh`).toBe(seventhSteps);
      expect(halfSteps(root, notes[2]!), `staff round ${id} triad fifth`).toBe(
        TRIAD_INTERVALS[BASE_TRIAD[expected.quality]][1],
      );
      // The scale's own diatonic seventh chord must agree — octave-less C
      // because the site works every example in C and roman.ts only detects
      // qualities without octaves.
      const diatonic = diatonicSevenths(parseNote("C"), expected.scale)[expected.degree - 1]!;
      expect(diatonic.quality, `staff round ${id} vs diatonicSevenths`).toBe(expected.quality);
      expect(diatonic.notes.map(scientificName).map(toneLabel)).toEqual(
        prompt.notes.map(toneLabel),
      );
      expectChordContract(id, expected);
    }
  });

  it("lights the site's five keyboard examples on the keyboard", () => {
    for (const { id, prompt } of keyboardRounds()) {
      const expected = SITE_KEYBOARD[id];
      expect(expected, `keyboard round ${id} is not one of the site's five examples`).toBeDefined();
      expect(prompt.highlight).toEqual(expected.spelling);
      const tones = prompt.highlight.map((note) => parseNote(note));
      expect(detectSeventhQuality(tones), `keyboard round ${id} quality`).toBe(expected.quality);
      expect(genericIntervalNumber(tones[0]!, tones[3]!), `keyboard round ${id} seventh`).toBe(7);
      expectChordContract(id, expected);
    }
  });

  it("matches the site's chart rows for all four scales", () => {
    for (const [scale, row] of Object.entries(SITE_SEVENTH_ROWS)) {
      const computed = diatonicSevenths(parseNote("C"), scale as ScaleType).map(
        (chord) => chord.quality,
      );
      expect(computed, `row ${scale}`).toEqual([...row]);
    }
  });

  it("pins the site's definitions, processes and reanalysis facts in the text rounds", () => {
    for (const [id, expected] of Object.entries(SITE_TEXT)) {
      expect(answerOf(id), id).toBe(expected);
    }
    expect(textRounds()).toHaveLength(Object.keys(SITE_TEXT).length);
  });

  it("states the site's diatonic-seventh facts in every rule", () => {
    for (const rule of allRules()) {
      expect(rule).not.toMatch(GENERIC_RULE);
    }
    const rules = allRules().join(" \n ");
    expect(rules).toMatch(/seven diatonic seventh chords/);
    expect(rules).toMatch(/stack three generic thirds on top of each note/);
    expect(rules).toMatch(/analyze the resulting seventh chords/);
    expect(rules).toMatch(/seventh tone is raised a half step/);
    expect(rules).toMatch(/sixth tone is raised a half step/);
    expect(rules).toMatch(/a major triad and a major seventh/);
    expect(rules).toMatch(/a minor triad and a minor seventh/);
    expect(rules).toMatch(/a major triad and a minor seventh/);
    expect(rules).toMatch(/a diminished triad and a minor seventh/);
    expect(rules).toMatch(/a minor triad and a major seventh/);
    expect(rules).toMatch(/an augmented triad and a major seventh/);
    expect(rules).toMatch(/a diminished triad and a diminished seventh/);
    expect(rules).toMatch(
      /Therefore, it is a (major|minor|dominant|half-diminished|minor-major|fully-diminished) seventh chord\./,
    );
    expect(rules).toMatch(/Therefore, it is an augmented-major seventh chord\./);
  });
});

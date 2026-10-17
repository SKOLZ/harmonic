import { afterEach, describe, expect, it } from "vitest";
import { render } from "solid-js/web";
import { validateRound } from "../lib/rounds/validate";
import { assertNoAnswerLeak } from "../lib/rounds/noAnswerLeak";
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
  romanNumeral,
  scientificName,
  type ScaleType,
  type TriadQuality,
} from "../lib/theory";
import { createRng } from "./rng";
import { lesson44, lesson44Pool } from "./lesson44";

const GENERIC_RULE = /^(correct|incorrect|wrong|that'?s right)/i;

/** Every draw, for many seeds, must carry both structurally required kinds. */
const GUARANTEED_SEEDS = Array.from({ length: 100 }, (_, index) => index + 1);

/**
 * The four numeral styles, in lesson 44's slide order: major, minor,
 * augmented, diminished (slides [6]–[9]). The pool offers exactly these
 * four options on every chord round.
 */
const STYLE_BY_QUALITY: Readonly<Record<TriadQuality, string>> = {
  major: "Upper-case",
  minor: "Lower-case",
  augmented: "Upper-case with a small plus sign",
  diminished: "Lower-case with a small circle",
};

const STYLE_ORDER: readonly TriadQuality[] = ["major", "minor", "augmented", "diminished"];

/** The site's four style sentences, verbatim from lesson 44 slides [6]–[9]. */
const STYLE_SENTENCE: Readonly<Record<TriadQuality, string>> = {
  major: "Upper-case numerals represent major triads.",
  minor: "Lower-case numerals represent minor triads.",
  augmented: "Upper-case numerals with a small plus sign represent augmented triads.",
  diminished: "Lower-case numerals with a small circle represent diminished triads.",
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
 * The twelve triads lesson 44 works a numeral for in its own slide text:
 * C major degrees 1, 2 and 7; C natural minor degrees 1, 2, 3, 5, 6 and 7;
 * the harmonic minor augmented third; and the melodic minor diminished
 * sixth and major fourth.
 */
const SITE_STAFF: Record<
  string,
  { root: string; quality: TriadQuality; spelling: string[]; scale: ScaleType; degree: number }
> = {
  "l44-staff-c-major": { root: "C4", quality: "major", spelling: ["C4", "E4", "G4"], scale: "major", degree: 1 },
  "l44-staff-c-minor": { root: "D4", quality: "minor", spelling: ["D4", "F4", "A4"], scale: "major", degree: 2 },
  "l44-staff-c-dim": { root: "B4", quality: "diminished", spelling: ["B4", "D5", "F5"], scale: "major", degree: 7 },
  "l44-staff-nm-i": { root: "C4", quality: "minor", spelling: ["C4", "Eb4", "G4"], scale: "naturalMinor", degree: 1 },
  "l44-staff-nm-ii": { root: "D4", quality: "diminished", spelling: ["D4", "F4", "Ab4"], scale: "naturalMinor", degree: 2 },
  "l44-staff-nm-iii": { root: "Eb4", quality: "major", spelling: ["Eb4", "G4", "Bb4"], scale: "naturalMinor", degree: 3 },
  "l44-staff-nm-v": { root: "G4", quality: "minor", spelling: ["G4", "Bb4", "D5"], scale: "naturalMinor", degree: 5 },
  "l44-staff-nm-vi": { root: "Ab4", quality: "major", spelling: ["Ab4", "C5", "Eb5"], scale: "naturalMinor", degree: 6 },
  "l44-staff-nm-vii": { root: "Bb4", quality: "major", spelling: ["Bb4", "D5", "F5"], scale: "naturalMinor", degree: 7 },
  "l44-staff-hm-iii": { root: "Eb4", quality: "augmented", spelling: ["Eb4", "G4", "B4"], scale: "harmonicMinor", degree: 3 },
  "l44-staff-mm-vi": { root: "A4", quality: "diminished", spelling: ["A4", "C5", "Eb5"], scale: "melodicMinor", degree: 6 },
  "l44-staff-mm-iv": { root: "F4", quality: "major", spelling: ["F4", "A4", "C5"], scale: "melodicMinor", degree: 4 },
};

/** The site's four worked triads, lit on the keyboard. */
const SITE_KEYBOARD: Record<
  string,
  { root: string; quality: TriadQuality; spelling: string[]; scale: ScaleType; degree: number }
> = {
  "l44-keyboard-c-major": { root: "C4", quality: "major", spelling: ["C4", "E4", "G4"], scale: "major", degree: 1 },
  "l44-keyboard-c-min": { root: "C4", quality: "minor", spelling: ["C4", "Eb4", "G4"], scale: "naturalMinor", degree: 1 },
  "l44-keyboard-eb-aug": { root: "Eb4", quality: "augmented", spelling: ["Eb4", "G4", "B4"], scale: "harmonicMinor", degree: 3 },
  "l44-keyboard-d-dim": { root: "D4", quality: "diminished", spelling: ["D4", "F4", "Ab4"], scale: "naturalMinor", degree: 2 },
};

/**
 * The nineteen text answers: the site's identification and style slides,
 * one worked numeral per scale walk-through, and the inversion symbols.
 */
const SITE_TEXT: Readonly<Record<string, string>> = {
  "l44-text-identify": "A Roman numeral",
  "l44-text-first-uses": "The Roman numeral for one",
  "l44-text-styles": "Different styles for each triad type",
  "l44-text-major-style": "Upper-case",
  "l44-text-minor-style": "Lower-case",
  "l44-text-aug-style": "Upper-case with a small plus sign",
  "l44-text-dim-style": "Lower-case with a small circle",
  "l44-text-major-i": "I",
  "l44-text-major-ii": "ii",
  "l44-text-major-vii": "vii°",
  "l44-text-nm-i": "i",
  "l44-text-nm-ii": "ii°",
  "l44-text-hm-iii": "III+",
  "l44-text-hm-v": "V",
  "l44-text-mm-vi": "vi°",
  "l44-text-mm-ii": "ii",
  "l44-text-first-inv-reason": "The root is a generic sixth above the bass note",
  "l44-text-second-inv": "A small 6 and 4",
  "l44-text-first-inv-63": "The 6 alone",
};

/**
 * The numeral rounds pin their site-literal answer against the core's own
 * `romanNumeral`: the chart glyph comes from theory code, never hand-typed.
 */
const NUMERAL_TEXT: Readonly<Record<string, { quality: TriadQuality; degree: number }>> = {
  "l44-text-major-i": { quality: "major", degree: 1 },
  "l44-text-major-ii": { quality: "minor", degree: 2 },
  "l44-text-major-vii": { quality: "diminished", degree: 7 },
  "l44-text-nm-i": { quality: "minor", degree: 1 },
  "l44-text-nm-ii": { quality: "diminished", degree: 2 },
  "l44-text-hm-iii": { quality: "augmented", degree: 3 },
  "l44-text-hm-v": { quality: "major", degree: 5 },
  "l44-text-mm-vi": { quality: "diminished", degree: 6 },
  "l44-text-mm-ii": { quality: "minor", degree: 2 },
};

/** "C4" → "C": a tone's name without its octave. */
const toneLabel = (note: string): string => note.replace(/\d+$/, "");

/**
 * The per-round analysis rule: the site's reanalysis sentence plus its own
 * style sentence and the numeral the core computes for this triad.
 */
const siteRule = (entry: {
  root: string;
  quality: TriadQuality;
  spelling: string[];
  scale: ScaleType;
  degree: number;
}): string =>
  `The ${ORDINALS[entry.degree]} triad of the ${SCALE_LABELS[entry.scale]} scale is ` +
  `${entry.quality}. ${STYLE_SENTENCE[entry.quality]} ` +
  `Its numeral is ${romanNumeral(entry.quality, entry.degree)}.`;

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
  return lesson44Pool.filter(isStaffRound).map((round) => ({ id: round.id, prompt: round.prompt }));
}

function keyboardRounds(): Array<{
  id: string;
  prompt: Extract<PromptSpec, { kind: "keyboard" }>;
}> {
  return lesson44Pool
    .filter(isKeyboardRound)
    .map((round) => ({ id: round.id, prompt: round.prompt }));
}

function textRounds(): Array<{ id: string; prompt: Extract<PromptSpec, { kind: "text" }> }> {
  return lesson44Pool
    .filter((round): round is Round & { prompt: Extract<PromptSpec, { kind: "text" }> } =>
      round.prompt.kind === "text",
    )
    .map((round) => ({ id: round.id, prompt: round.prompt }));
}

function allRules(): string[] {
  return lesson44Pool.map((round) => round.rule);
}

function roundById(id: string): Round {
  const found = lesson44Pool.find((round) => round.id === id);
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

/** Every chord round offers exactly the four style labels, in slide order. */
function expectStyleOptions(id: string, quality: TriadQuality): void {
  const answer = roundById(id).answer as Extract<Round["answer"], { kind: "choices" }>;
  expect(answer.options, `round ${id} options`).toEqual(
    STYLE_ORDER.map((key) => STYLE_BY_QUALITY[key]),
  );
  expect(answerOf(id), `round ${id} answer`).toBe(STYLE_BY_QUALITY[quality]);
}

const cleanups: Array<() => void> = [];

afterEach(() => {
  while (cleanups.length > 0) cleanups.pop()?.();
  document.body.replaceChildren();
});

describe("lesson 44 question pool", () => {
  it("holds 35 rounds: 12 staff, 19 text, 4 keyboard, all ids unique", () => {
    expect(lesson44Pool).toHaveLength(35);
    expect(staffRounds()).toHaveLength(12);
    expect(textRounds()).toHaveLength(19);
    expect(keyboardRounds()).toHaveLength(4);
    const ids = lesson44Pool.map((round) => round.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(lesson44.entry.id).toBe(44);
  });

  it("validates every pool round", () => {
    for (const round of lesson44Pool) {
      expect(() => validateRound(round)).not.toThrow();
    }
  });

  it("draws at least 12 rounds and every drawn round passes validateRound", () => {
    const rounds = lesson44.generateRounds(createRng(1234));
    expect(rounds.length).toBeGreaterThanOrEqual(12);
    for (const round of rounds) {
      expect(() => validateRound(round)).not.toThrow();
    }
    const ids = rounds.map((round) => round.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("produces identical rounds for the same seed", () => {
    const first = lesson44.generateRounds(createRng(42));
    const second = lesson44.generateRounds(createRng(42));
    expect(second).toEqual(first);
  });

  it("produces different rounds for two different seeds", () => {
    const first = lesson44.generateRounds(createRng(1));
    const second = lesson44.generateRounds(createRng(2));
    expect(JSON.stringify(second)).not.toBe(JSON.stringify(first));
  });

  it("draws at least one staff and one text round for every seed tried", () => {
    for (const seed of GUARANTEED_SEEDS) {
      const kinds = new Set(lesson44.generateRounds(createRng(seed)).map((r) => r.prompt.kind));
      expect(kinds.has("staff"), `seed ${seed} drew no staff round`).toBe(true);
      expect(kinds.has("text"), `seed ${seed} drew no text round`).toBe(true);
    }
  });

  it("draws keyboard rounds for some seeds, so they are live in the pool", () => {
    const kinds = new Set(
      GUARANTEED_SEEDS.flatMap((seed) =>
        lesson44.generateRounds(createRng(seed)).map((r) => r.prompt.kind),
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

  it("spells every staff round as the site's triad and answers with its style", () => {
    for (const { id, prompt } of staffRounds()) {
      const expected = SITE_STAFF[id];
      expect(expected, `round ${id} is not one of the site's worked triads`).toBeDefined();
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
      // The scale's own diatonic triad must agree — octave-less C because the
      // site works every example in C and roman.ts only detects qualities
      // without octaves.
      const diatonic = diatonicTriads(parseNote("C"), expected.scale)[expected.degree - 1]!;
      expect(diatonic.quality, `staff round ${id} vs diatonicTriads`).toBe(expected.quality);
      expect(diatonic.notes.map(scientificName).map(toneLabel)).toEqual(
        prompt.notes.map(toneLabel),
      );
      expectStyleOptions(id, expected.quality);
      expect(roundById(id).rule, `staff round ${id} rule`).toBe(siteRule(expected));
    }
  });

  it("lights the site's four worked triads on the keyboard", () => {
    for (const { id, prompt } of keyboardRounds()) {
      const expected = SITE_KEYBOARD[id];
      expect(expected, `keyboard round ${id} is not one of the site's four examples`).toBeDefined();
      expect(prompt.highlight).toEqual(expected.spelling);
      const notes = prompt.highlight.map((note) => parseNote(note));
      expect(detectTriadQuality(notes), `keyboard round ${id} quality`).toBe(expected.quality);
      expect(genericIntervalNumber(notes[0]!, notes[2]!), `keyboard round ${id} fifth`).toBe(5);
      const diatonic = diatonicTriads(parseNote("C"), expected.scale)[expected.degree - 1]!;
      expect(diatonic.quality, `keyboard round ${id} vs diatonicTriads`).toBe(expected.quality);
      expectStyleOptions(id, expected.quality);
      expect(roundById(id).rule, `keyboard round ${id} rule`).toBe(siteRule(expected));
    }
  });

  it("matches the site's chart rows for all four scale qualities", () => {
    const SITE_QUALITY_ROWS: Readonly<Record<ScaleType, readonly TriadQuality[]>> = {
      major: ["major", "minor", "minor", "major", "major", "minor", "diminished"],
      naturalMinor: ["minor", "diminished", "major", "minor", "minor", "major", "major"],
      harmonicMinor: ["minor", "diminished", "augmented", "minor", "major", "major", "diminished"],
      melodicMinor: ["minor", "minor", "augmented", "major", "major", "diminished", "diminished"],
    };
    for (const [scale, row] of Object.entries(SITE_QUALITY_ROWS)) {
      expect(diatonicTriadQualities(scale as ScaleType), `row ${scale}`).toEqual([...row]);
    }
  });

  it("pins the site's style, numeral and inversion answers in the text rounds", () => {
    for (const [id, expected] of Object.entries(SITE_TEXT)) {
      expect(answerOf(id), id).toBe(expected);
    }
    expect(textRounds()).toHaveLength(Object.keys(SITE_TEXT).length);
    // Each numeral answer is also what the core's romanNumeral computes for
    // that triad in that scale degree.
    for (const [id, { quality, degree }] of Object.entries(NUMERAL_TEXT)) {
      expect(answerOf(id), `core numeral for ${id}`).toBe(romanNumeral(quality, degree));
    }
    // Triad numerals never carry digits (a 7 would be a seventh chord).
    for (const id of Object.keys(NUMERAL_TEXT)) {
      const answer = roundById(id).answer as Extract<Round["answer"], { kind: "choices" }>;
      for (const option of answer.options) {
        expect(option, `round ${id} option ${option}`).not.toMatch(/\d/);
      }
    }
  });

  it("states the site's numeral-style facts in every rule", () => {
    for (const rule of allRules()) {
      expect(rule).not.toMatch(GENERIC_RULE);
    }
    const rules = allRules().join(" \n ");
    expect(rules).toMatch(/identified by a Roman numeral/);
    expect(rules).toMatch(/Roman numeral for one/);
    expect(rules).toMatch(/different styles for each triad type/);
    expect(rules).toMatch(/Upper-case numerals represent major triads/);
    expect(rules).toMatch(/Lower-case numerals represent minor triads/);
    expect(rules).toMatch(/Upper-case numerals with a small plus sign represent augmented triads/);
    expect(rules).toMatch(/Lower-case numerals with a small circle represent diminished triads/);
    expect(rules).toMatch(/generic sixth above the bass note/);
    expect(rules).toMatch(/small 6 and 4/);
    expect(rules).toMatch(/6 and a 3 to represent first inversion/);
    expect(rules).toMatch(/use the 6 alone/);
    // Every chord round's rule carries its own numeral, computed by the core.
    for (const { id } of [...staffRounds(), ...keyboardRounds()]) {
      const expected = SITE_STAFF[id] ?? SITE_KEYBOARD[id]!;
      expect(roundById(id).rule, `numeral for ${id}`).toContain(
        `Its numeral is ${romanNumeral(expected.quality, expected.degree)}.`,
      );
    }
  });
});

describe("lesson 44 companion illustrations (T5d Diatonic pass)", () => {
  // Zero yield for Roman Numeral Analysis: Triads. The nine NUMERAL rounds
  // name a scale, but the question's subject is one worked TRIAD ("Which
  // numeral identifies the first triad of the C major scale?" — C–E–G),
  // and the engraving of that very triad displays the quality that
  // determines the numeral — the answer is what you would draw, the pilot's
  // self-revealing class. The four STYLE rounds and the two identification
  // rounds state the numeral SYSTEM itself, which the site policy list
  // keeps permanently text-only; the inversion-figure rounds are that
  // system's vocabulary. Every rejection class is recorded below.
  const DEFINITION = ["l44-text-identify", "l44-text-styles"];
  const FIRST_DEGREE = ["l44-text-first-uses"];
  // Styles: "Which numeral style represents an augmented triad?" is the
  // numeral system itself — class-level, no pitch subject.
  const STYLE = [
    "l44-text-major-style",
    "l44-text-minor-style",
    "l44-text-aug-style",
    "l44-text-dim-style",
  ];
  // Numerals: the prompt names a scale, but the subject is its one worked
  // triad, whose engraving IS the quality-style answer ("identify the
  // quality shown"). Text-only by the parent's strict rule — an
  // illustration here would display the numeral the learner must name.
  const NUMERAL = [
    "l44-text-major-i",
    "l44-text-major-ii",
    "l44-text-major-vii",
    "l44-text-nm-i",
    "l44-text-nm-ii",
    "l44-text-hm-iii",
    "l44-text-hm-v",
    "l44-text-mm-vi",
    "l44-text-mm-ii",
  ];
  // Inversion symbols: figure vocabulary ("the small 6 and 4"), the
  // numeral system's own notation — class-level, no pitch subject.
  const INVERSION_FIGURE = [
    "l44-text-first-inv-reason",
    "l44-text-second-inv",
    "l44-text-first-inv-63",
  ];

  it("accounts for every text round: all nineteen are classified rejections", () => {
    const textIds = lesson44Pool
      .filter((round) => round.prompt.kind === "text")
      .map((round) => round.id)
      .sort();
    expect(textIds).toHaveLength(19);
    expect(textIds).toEqual(
      [...DEFINITION, ...FIRST_DEGREE, ...STYLE, ...NUMERAL, ...INVERSION_FIGURE].sort(),
    );
  });

  it("has zero companion illustrations across the whole pool", () => {
    for (const round of lesson44Pool) {
      expect(round.illustration, round.id).toBeUndefined();
    }
  });

  it("keeps the two identification rounds text-only: the numeral system itself", () => {
    for (const id of DEFINITION) {
      expect(roundById(id).prompt.kind, id).toBe("text");
      expect(roundById(id).illustration, id).toBeUndefined();
    }
  });

  it("keeps the first-uses round text-only: system vocabulary", () => {
    expect(roundById("l44-text-first-uses").prompt.kind).toBe("text");
    expect(roundById("l44-text-first-uses").illustration).toBeUndefined();
  });

  it("keeps the four style rounds text-only: numeral styles, no pitch subject", () => {
    expect(STYLE).toHaveLength(4);
    for (const id of STYLE) {
      expect(roundById(id).prompt.kind, id).toBe("text");
      expect(roundById(id).illustration, id).toBeUndefined();
    }
  });

  it("keeps the nine numeral rounds text-only: the engraving would be the answer", () => {
    expect(NUMERAL).toHaveLength(9);
    for (const id of NUMERAL) {
      expect(roundById(id).prompt.kind, id).toBe("text");
      expect(roundById(id).illustration, id).toBeUndefined();
    }
  });

  it("keeps the three inversion-figure rounds text-only: figure vocabulary", () => {
    expect(INVERSION_FIGURE).toHaveLength(3);
    for (const id of INVERSION_FIGURE) {
      expect(roundById(id).prompt.kind, id).toBe("text");
      expect(roundById(id).illustration, id).toBeUndefined();
    }
  });

  it("passes the shared no-leak assertion for every pool round", () => {
    for (const round of lesson44Pool) {
      expect(() => assertNoAnswerLeak(round), round.id).not.toThrow();
    }
  });
});

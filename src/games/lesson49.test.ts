import { afterEach, describe, expect, it } from "vitest";
import { render } from "solid-js/web";
import { validateRound } from "../lib/rounds/validate";
import { assertNoAnswerLeak } from "../lib/rounds/noAnswerLeak";
import type { PromptSpec, Round } from "../lib/rounds/types";
import KeyboardPrompt from "../components/prompts/KeyboardPrompt";
import StaffPrompt from "../components/prompts/StaffPrompt";
import {
  bassNote,
  buildSeventh,
  identifyInversion,
  inversionFigure,
  parseNote,
  pitchClass,
  romanNumeral,
  scientificName,
  semitoneIndex,
  type Note,
  type SeventhQuality,
  type TriadQuality,
} from "../lib/theory";
import { createRng } from "./rng";
import { lesson49, lesson49Pool } from "./lesson49";

const GENERIC_RULE = /^(correct|incorrect|wrong|that'?s right)/i;

/** Every draw, for many seeds, must carry both structurally required kinds. */
const GUARANTEED_SEEDS = Array.from({ length: 100 }, (_, index) => index + 1);

/** The site's four seventh-chord figures, in inversion order (slides [13]–[16]). */
const FIGURES = ["7", "6/5", "4/3", "2"] as const;

/** The core's inversion keys mapped onto the figure index. */
const INVERSION_INDEX: Record<"rootPosition" | "first" | "second" | "third", number> = {
  rootPosition: 0,
  first: 1,
  second: 2,
  third: 3,
};

/** The chord tone each inversion drops into the bass (site chart language). */
const TONE_WORD = ["root", "third", "fifth", "seventh"] as const;

/** The site's figure sentences, verbatim from lesson 49 slides [13]–[16]. */
const FIGURE_SENTENCE = [
  "The previously-discussed 7 identifies a root position seventh chord.",
  "6 and 5 identify a first inversion seventh.",
  "4 and 3 identify a second inversion seventh.",
  "A lone 2 identifies a third inversion seventh chord.",
] as const;

/** The site's type names, as lesson 46 writes them (shared vocabulary). */
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

/**
 * The twelve staff rounds: three chords × four inversions. The site's
 * inversion slides are images (`lesson49.js` carries frames, no sounds), so
 * the voicings follow the ascending-rotation convention lesson 47's site
 * sounds establish, and the contract below proves every voicing legitimate.
 */
const STAFF_ROUNDS: Record<
  string,
  { root: string; quality: SeventhQuality; inv: number }
> = {
  "l49-staff-c-major7-root": { root: "C4", quality: "majorSeventh", inv: 0 },
  "l49-staff-c-major7-first": { root: "C4", quality: "majorSeventh", inv: 1 },
  "l49-staff-c-major7-second": { root: "C4", quality: "majorSeventh", inv: 2 },
  "l49-staff-c-major7-third": { root: "C4", quality: "majorSeventh", inv: 3 },
  "l49-staff-c-min7-root": { root: "C4", quality: "minorSeventh", inv: 0 },
  "l49-staff-c-min7-first": { root: "C4", quality: "minorSeventh", inv: 1 },
  "l49-staff-c-min7-second": { root: "C4", quality: "minorSeventh", inv: 2 },
  "l49-staff-c-min7-third": { root: "C4", quality: "minorSeventh", inv: 3 },
  "l49-staff-g-dom-root": { root: "G4", quality: "dominantSeventh", inv: 0 },
  "l49-staff-g-dom-first": { root: "G4", quality: "dominantSeventh", inv: 1 },
  "l49-staff-g-dom-second": { root: "G4", quality: "dominantSeventh", inv: 2 },
  "l49-staff-g-dom-third": { root: "G4", quality: "dominantSeventh", inv: 3 },
};

/** The four keyboard rounds: C minor seventh through all four figures. */
const KEYBOARD_ROUNDS: Record<
  string,
  { root: string; quality: SeventhQuality; inv: number }
> = {
  "l49-keyboard-c-min7-root": { root: "C4", quality: "minorSeventh", inv: 0 },
  "l49-keyboard-c-min7-first": { root: "C4", quality: "minorSeventh", inv: 1 },
  "l49-keyboard-c-min7-second": { root: "C4", quality: "minorSeventh", inv: 2 },
  "l49-keyboard-c-min7-third": { root: "C4", quality: "minorSeventh", inv: 3 },
};

/** The nineteen text answers, each the site's own conclusion. */
const SITE_TEXT: Readonly<Record<string, string>> = {
  "l49-text-scales": "The major and harmonic minor scales",
  "l49-text-steps": "Three",
  "l49-text-step-1": "Write the analysis symbols for the corresponding diatonic triads",
  "l49-text-step-2": "Add a small seven",
  "l49-text-step-3": "Add a slash through the circle of each half-diminished seventh chord",
  "l49-text-m-add": "An upper-case 'M'",
  "l49-text-m-skip": "We will not use their system",
  "l49-text-I7": "I7",
  "l49-text-IV7": "IV7",
  "l49-text-viio7": "viiø7",
  "l49-text-i7": "i7",
  "l49-text-iio7": "iiø7",
  "l49-text-III7": "III+7",
  "l49-text-V7": "V7",
  "l49-text-vii7": "vii°7",
  "l49-text-root-fig": "7",
  "l49-text-first-fig": "6 and 5",
  "l49-text-second-fig": "4 and 3",
  "l49-text-third-fig": "2",
};

/**
 * The site's own three-step analysis process: the triad numeral, a small
 * seven, and the half-diminished slash (the site declines the M-variant, so
 * a major seventh is written plain 7 — never maj7 — in its own numerals).
 */
const NUMERAL_TEXT: Readonly<Record<string, { quality: SeventhQuality; degree: number }>> = {
  "l49-text-I7": { quality: "majorSeventh", degree: 1 },
  "l49-text-IV7": { quality: "majorSeventh", degree: 4 },
  "l49-text-viio7": { quality: "halfDiminishedSeventh", degree: 7 },
  "l49-text-i7": { quality: "minorSeventh", degree: 1 },
  "l49-text-iio7": { quality: "halfDiminishedSeventh", degree: 2 },
  "l49-text-III7": { quality: "augmentedMajorSeventh", degree: 3 },
  "l49-text-V7": { quality: "dominantSeventh", degree: 5 },
  "l49-text-vii7": { quality: "fullyDiminishedSeventh", degree: 7 },
};

/** The triad base the site's process starts from, per seventh quality. */
const TRIAD_BASE: Readonly<Record<SeventhQuality, TriadQuality>> = {
  majorSeventh: "major",
  minorSeventh: "minor",
  dominantSeventh: "major",
  halfDiminishedSeventh: "diminished",
  fullyDiminishedSeventh: "diminished",
  minorMajorSeventh: "minor",
  augmentedMajorSeventh: "augmented",
  augmentedSeventh: "augmented",
};

/** Rebuild the site's numeral: triad symbol + small seven, ø replacing °. */
const siteNumeral = (quality: SeventhQuality, degree: number): string => {
  const base = romanNumeral(TRIAD_BASE[quality], degree);
  const slashed = quality === "halfDiminishedSeventh" ? base.replace("°", "ø") : base;
  return `${slashed}7`;
};

/** "Eb4" → "Eb": the root's name as prose writes it. */
const rootLabel = (root: string): string =>
  scientificName(parseNote(root)).replace(/\d+$/, "");

/** "C4" → "C": a tone's name without its octave. */
const toneLabel = (note: string): string => note.replace(/\d+$/, "");

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
  return lesson49Pool.filter(isStaffRound).map((round) => ({ id: round.id, prompt: round.prompt }));
}

function keyboardRounds(): Array<{
  id: string;
  prompt: Extract<PromptSpec, { kind: "keyboard" }>;
}> {
  return lesson49Pool
    .filter(isKeyboardRound)
    .map((round) => ({ id: round.id, prompt: round.prompt }));
}

function textRounds(): Array<{ id: string; prompt: Extract<PromptSpec, { kind: "text" }> }> {
  return lesson49Pool
    .filter((round): round is Round & { prompt: Extract<PromptSpec, { kind: "text" }> } =>
      round.prompt.kind === "text",
    )
    .map((round) => ({ id: round.id, prompt: round.prompt }));
}

function allRules(): string[] {
  return lesson49Pool.map((round) => round.rule);
}

function roundById(id: string): Round {
  const found = lesson49Pool.find((round) => round.id === id);
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

/** The site's per-round rule: its own voicing, its figure, its bass tone. */
function siteRule(
  entry: { root: string; quality: SeventhQuality; inv: number },
  notes: string[],
): string {
  const label = `${rootLabel(entry.root)} ${TYPE_DISPLAY[entry.quality]} seventh chord`;
  return (
    `The ${label} chord is spelled ${notes.map(toneLabel).join("–")}. ` +
    `${FIGURE_SENTENCE[entry.inv]} Its bass is the ${TONE_WORD[entry.inv]}.`
  );
}

/**
 * The inversion contract for every chord round: same tones as the
 * root-position seventh chord, written ascending so notes[0] is the bass,
 * the core's own inversion naming agreeing with the figure the pool answers
 * with, and the rule describing exactly this voicing.
 */
function expectInversionContract(
  id: string,
  noteNames: string[],
  expected: { root: string; quality: SeventhQuality; inv: number },
): void {
  const notes: Note[] = noteNames.map((name) => parseNote(name));
  const spelled = buildSeventh(parseNote(expected.root), expected.quality);

  // Rotation-invariant spelling check against buildSeventh.
  const letters = (list: readonly Note[]): string[] =>
    [...new Set(list.map((note) => `${note.letter}${note.accidental}`))].sort();
  expect(letters(notes), `round ${id} vs buildSeventh tones`).toEqual(letters(spelled));
  const pitchClasses = (list: readonly Note[]): number[] =>
    [...new Set(list.map((note) => pitchClass(note)))].sort();
  expect(pitchClasses(notes), `round ${id} vs buildSeventh pitch classes`).toEqual(
    pitchClasses(spelled),
  );

  // Written ascending, so notes[0] really is the bass.
  for (let index = 1; index < notes.length; index += 1) {
    expect(semitoneIndex(notes[index]!), `round ${id} not ascending at ${index}`).toBeGreaterThan(
      semitoneIndex(notes[index - 1]!),
    );
  }

  // The core names the inversion from root + bass letter, and its figure
  // table gives the figure the round must answer with.
  const coreInversion = identifyInversion(parseNote(expected.root), notes);
  expect(INVERSION_INDEX[coreInversion], `round ${id} core inversion`).toBe(expected.inv);
  expect(inversionFigure("seventh", expected.inv), `round ${id} core figure`).toBe(
    FIGURES[expected.inv],
  );
  expect(bassNote(notes), `round ${id} bass`).toEqual(notes[0]);
  expect(answerOf(id), `round ${id} figure answer`).toBe(FIGURES[expected.inv]);

  // The pool offers exactly the four figures, so distractors are the other
  // inversion figures of seventh chords.
  const answer = roundById(id).answer as Extract<Round["answer"], { kind: "choices" }>;
  expect(answer.options, `round ${id} figure options`).toEqual([...FIGURES]);
  expect(roundById(id).rule, `round ${id} rule`).toBe(siteRule(expected, noteNames));
}

const cleanups: Array<() => void> = [];

afterEach(() => {
  while (cleanups.length > 0) cleanups.pop()?.();
  document.body.replaceChildren();
});

describe("lesson 49 question pool", () => {
  it("holds 35 rounds: 12 staff, 19 text, 4 keyboard, all ids unique", () => {
    expect(lesson49Pool).toHaveLength(35);
    expect(staffRounds()).toHaveLength(12);
    expect(textRounds()).toHaveLength(19);
    expect(keyboardRounds()).toHaveLength(4);
    const ids = lesson49Pool.map((round) => round.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(lesson49.entry.id).toBe(49);
  });

  it("validates every pool round", () => {
    for (const round of lesson49Pool) {
      expect(() => validateRound(round)).not.toThrow();
    }
  });

  it("draws at least 12 rounds and every drawn round passes validateRound", () => {
    const rounds = lesson49.generateRounds(createRng(1234));
    expect(rounds.length).toBeGreaterThanOrEqual(12);
    for (const round of rounds) {
      expect(() => validateRound(round)).not.toThrow();
    }
    const ids = rounds.map((round) => round.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("produces identical rounds for the same seed", () => {
    const first = lesson49.generateRounds(createRng(42));
    const second = lesson49.generateRounds(createRng(42));
    expect(second).toEqual(first);
  });

  it("produces different rounds for two different seeds", () => {
    const first = lesson49.generateRounds(createRng(1));
    const second = lesson49.generateRounds(createRng(2));
    expect(JSON.stringify(second)).not.toBe(JSON.stringify(first));
  });

  it("draws at least one staff and one text round for every seed tried", () => {
    for (const seed of GUARANTEED_SEEDS) {
      const kinds = new Set(lesson49.generateRounds(createRng(seed)).map((r) => r.prompt.kind));
      expect(kinds.has("staff"), `seed ${seed} drew no staff round`).toBe(true);
      expect(kinds.has("text"), `seed ${seed} drew no text round`).toBe(true);
    }
  });

  it("draws keyboard rounds for some seeds, so they are live in the pool", () => {
    const kinds = new Set(
      GUARANTEED_SEEDS.flatMap((seed) =>
        lesson49.generateRounds(createRng(seed)).map((r) => r.prompt.kind),
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

  it("shows every staff round as the right seventh chord with the right figure", () => {
    for (const { id, prompt } of staffRounds()) {
      const expected = STAFF_ROUNDS[id];
      expect(expected, `staff round ${id} has no expectation`).toBeDefined();
      expectInversionContract(id, prompt.notes, expected);
    }
  });

  it("lights every keyboard round as the right seventh chord with the right figure", () => {
    for (const { id, prompt } of keyboardRounds()) {
      const expected = KEYBOARD_ROUNDS[id];
      expect(expected, `keyboard round ${id} has no expectation`).toBeDefined();
      expectInversionContract(id, prompt.highlight, expected);
    }
  });

  it("pins the site's process, numeral and figure answers in the text rounds", () => {
    for (const [id, expected] of Object.entries(SITE_TEXT)) {
      expect(answerOf(id), id).toBe(expected);
    }
    expect(textRounds()).toHaveLength(Object.keys(SITE_TEXT).length);
    // Every numeral answer is what the site's own three-step process yields,
    // rebuilt from the core's triad numeral plus a small seven.
    for (const [id, { quality, degree }] of Object.entries(NUMERAL_TEXT)) {
      expect(answerOf(id), `site numeral for ${id}`).toBe(siteNumeral(quality, degree));
      expect(roundById(id).rule, `numeral rule for ${id}`).toContain(siteNumeral(quality, degree));
    }
    // The site declines the M-variant: no round may offer a maj7 numeral.
    for (const id of Object.keys(NUMERAL_TEXT)) {
      const answer = roundById(id).answer as Extract<Round["answer"], { kind: "choices" }>;
      for (const option of answer.options) {
        expect(option, `round ${id} option ${option}`).not.toMatch(/maj7|Maj7/);
      }
    }
  });

  it("states the site's numeral-analysis facts in every rule", () => {
    for (const rule of allRules()) {
      expect(rule).not.toMatch(GENERIC_RULE);
    }
    const rules = allRules().join(" \n ");
    expect(rules).toMatch(/identifies diatonic seventh chords/);
    expect(rules).toMatch(/major and harmonic minor scales/);
    expect(rules).toMatch(/three step process is used/);
    expect(rules).toMatch(/analysis symbols for the corresponding diatonic triads/);
    expect(rules).toMatch(/add a small seven/);
    expect(rules).toMatch(/slash through the circle of each half-diminished/);
    expect(rules).toMatch(/upper-case 'M'/);
    expect(rules).toMatch(/not use their system/);
    expect(rules).toMatch(/identifies a root position seventh chord/);
    expect(rules).toMatch(/6 and 5 identify a first inversion/);
    expect(rules).toMatch(/4 and 3 identify a second inversion/);
    expect(rules).toMatch(/A lone 2 identifies a third inversion/);
  });
});

describe("lesson 49 companion illustrations (T5d Diatonic pass)", () => {
  // Zero yield for Roman Numeral Analysis: Seventh Chords — the lesson 44
  // shape extended to sevenths. The eight NUMERAL rounds name a scale, but
  // the subject is one worked SEVENTH CHORD whose engraving displays the
  // quality that determines the numeral — the answer is what you would
  // draw. The figure rounds are the inversion-symbol vocabulary, the
  // M-variant rounds are the system's own rules, and the scope/step/count
  // rounds carry no pitch subject. Every rejection class is recorded below.
  const SCOPE = ["l49-text-scales"];
  const COUNT = ["l49-text-steps"];
  const PROCEDURE = ["l49-text-step-1", "l49-text-step-2", "l49-text-step-3"];
  // M-variant system rules: "When are M-variants used?" and "Why are they
  // skipped?" are the analysis system's conventions — class-level prose.
  const SYSTEM = ["l49-text-m-add", "l49-text-m-skip"];
  // Numerals: engraving the named chord (e.g. the first seventh chord of C
  // major) displays the very quality that fixes its numeral — self-revealing.
  const NUMERAL = [
    "l49-text-I7",
    "l49-text-IV7",
    "l49-text-viio7",
    "l49-text-i7",
    "l49-text-iio7",
    "l49-text-III7",
    "l49-text-V7",
    "l49-text-vii7",
  ];
  // Figures: "The symbol 6 and 5 identifies which inversion?" — the figure
  // system's vocabulary, no pitch subject.
  const FIGURE = [
    "l49-text-root-fig",
    "l49-text-first-fig",
    "l49-text-second-fig",
    "l49-text-third-fig",
  ];

  it("accounts for every text round: all nineteen are classified rejections", () => {
    const textIds = lesson49Pool
      .filter((round) => round.prompt.kind === "text")
      .map((round) => round.id)
      .sort();
    expect(textIds).toHaveLength(19);
    expect(textIds).toEqual(
      [...SCOPE, ...COUNT, ...PROCEDURE, ...SYSTEM, ...NUMERAL, ...FIGURE].sort(),
    );
  });

  it("has zero companion illustrations across the whole pool", () => {
    for (const round of lesson49Pool) {
      expect(round.illustration, round.id).toBeUndefined();
    }
  });

  it("keeps the scope and count rounds text-only: no pitch subject", () => {
    for (const id of [...SCOPE, ...COUNT]) {
      expect(roundById(id).prompt.kind, id).toBe("text");
      expect(roundById(id).illustration, id).toBeUndefined();
    }
  });

  it("keeps the three step rounds text-only: the analysis procedure", () => {
    for (const id of PROCEDURE) {
      expect(roundById(id).prompt.kind, id).toBe("text");
      expect(roundById(id).illustration, id).toBeUndefined();
    }
  });

  it("keeps the two M-variant rounds text-only: system conventions", () => {
    for (const id of SYSTEM) {
      expect(roundById(id).prompt.kind, id).toBe("text");
      expect(roundById(id).illustration, id).toBeUndefined();
    }
  });

  it("keeps the eight numeral rounds text-only: the engraving would be the answer", () => {
    expect(NUMERAL).toHaveLength(8);
    for (const id of NUMERAL) {
      expect(roundById(id).prompt.kind, id).toBe("text");
      expect(roundById(id).illustration, id).toBeUndefined();
    }
  });

  it("keeps the four figure rounds text-only: figure vocabulary", () => {
    expect(FIGURE).toHaveLength(4);
    for (const id of FIGURE) {
      expect(roundById(id).prompt.kind, id).toBe("text");
      expect(roundById(id).illustration, id).toBeUndefined();
    }
  });

  it("passes the shared no-leak assertion for every pool round", () => {
    for (const round of lesson49Pool) {
      expect(() => assertNoAnswerLeak(round), round.id).not.toThrow();
    }
  });
});

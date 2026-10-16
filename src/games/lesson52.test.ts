import { afterEach, describe, expect, it } from "vitest";
import { render } from "solid-js/web";
import { validateRound } from "../lib/rounds/validate";
import type { PromptSpec, Round } from "../lib/rounds/types";
import StaffPrompt from "../components/prompts/StaffPrompt";
import {
  buildTriad,
  identifyInversion,
  inversionFigure,
  letterIndex,
  parseNote,
  pitchClass,
  romanNumeral,
  type TriadQuality,
} from "../lib/theory";
import { createRng } from "./rng";
import { lesson52, lesson52Pool } from "./lesson52";

const GENERIC_RULE = /^(correct|incorrect|wrong|that'?s right)/i;

/** Every draw, for many seeds, must carry both structurally required kinds. */
const GUARANTEED_SEEDS = Array.from({ length: 100 }, (_, index) => index + 1);

/**
 * The first four measures of O Canada are analysed in E♭ major. Each chord the
 * site names is one staff round: its voicing (bass first) plus the root and
 * quality the site states. The Roman-numeral symbol is re-derived by the core
 * (`romanNumeral` + `inversionFigure` + `identifyInversion`) and asserted equal
 * to the site's own analysis, so a core-vs-site disagreement fails loudly. The
 * voicing's exact spacing is reconstructed (the engraved score is an image);
 * the analytically decisive facts — pitch classes and which tone is lowest —
 * match the site's slide text exactly.
 */
const SITE_CHORDS: Record<
  string,
  { notes: readonly string[]; root: string; quality: TriadQuality; siteSymbol: string; options: readonly string[] }
> = {
  "l52-staff-i": { notes: ["Eb4", "Bb4", "Eb5", "G5"], root: "Eb4", quality: "major", siteSymbol: "I", options: ["I", "V", "vi", "IV"] },
  "l52-staff-v6": { notes: ["D4", "Bb4", "F5", "Bb5"], root: "Bb4", quality: "major", siteSymbol: "V6", options: ["V6", "V", "vi6", "V6/4"] },
  "l52-staff-vi": { notes: ["C4", "G4", "C5", "Eb5"], root: "C4", quality: "minor", siteSymbol: "vi", options: ["vi", "I", "IV", "V"] },
  "l52-staff-v": { notes: ["Bb4", "D5", "F5", "Bb5"], root: "Bb4", quality: "major", siteSymbol: "V", options: ["V", "V6", "I", "vi"] },
  "l52-staff-iv6": { notes: ["C4", "Ab4", "Eb5", "Ab5"], root: "Ab4", quality: "major", siteSymbol: "IV6", options: ["IV6", "IV", "I6", "ii6"] },
  "l52-staff-i6": { notes: ["G4", "Eb5", "G5", "Bb5"], root: "Eb4", quality: "major", siteSymbol: "I6", options: ["I6", "I", "V6", "iii6"] },
  "l52-staff-iv": { notes: ["Ab4", "C5", "Eb5", "C6"], root: "Ab4", quality: "major", siteSymbol: "IV", options: ["IV", "IV6", "I", "ii"] },
  // Additional voicings of the same analyses (spacing varies, bass and triad do not).
  "l52-staff-i-close": { notes: ["Eb4", "G4", "Bb4", "Eb5"], root: "Eb4", quality: "major", siteSymbol: "I", options: ["I", "V", "vi", "IV"] },
  "l52-staff-v-close": { notes: ["Bb4", "D5", "F5"], root: "Bb4", quality: "major", siteSymbol: "V", options: ["V", "V6", "I", "vi"] },
  "l52-staff-vi-close": { notes: ["C4", "Eb4", "G4", "C5"], root: "C4", quality: "minor", siteSymbol: "vi", options: ["vi", "I", "IV", "V"] },
  "l52-staff-iv-close": { notes: ["Ab4", "C5", "Eb5"], root: "Ab4", quality: "major", siteSymbol: "IV", options: ["IV", "IV6", "I", "ii"] },
  "l52-staff-v6-close": { notes: ["D4", "F4", "Bb4", "D5"], root: "Bb4", quality: "major", siteSymbol: "V6", options: ["V6", "V", "vi6", "V6/4"] },
};

/** The four text answers, each the site's own conclusion. */
const SITE_TEXT: Readonly<Record<string, string>> = {
  "l52-text-first-step": "Determine the key",
  "l52-text-key-sig": "Eb major or C minor",
  "l52-text-key-conclude": "We are most likely in that key, Eb major",
  "l52-text-repeat": "We do not have to repeat the analysis symbol",
};

/** Degree of a root letter within the E♭ major scale (letters E–D are 1–7). */
function degreeOfEbMajor(letter: string): number {
  return (((letterIndex(letter as never) - letterIndex("E")) % 7 + 7) % 7) + 1;
}

/** Numeric inversion index `inversionFigure` expects, keyed by the core's label. */
const INVERSION_NUM: Readonly<Record<"rootPosition" | "first" | "second" | "third", number>> = {
  rootPosition: 0,
  first: 1,
  second: 2,
  third: 3,
};

/** The Roman-numeral + figure symbol the core derives for an E♭-major chord. */
function symbolOf(root: string, quality: TriadQuality, notes: readonly string[]): string {
  const rootNote = parseNote(root);
  const inversion = identifyInversion(rootNote, notes.map((note) => parseNote(note)));
  const figure = inversionFigure("triad", INVERSION_NUM[inversion]);
  return romanNumeral(quality, degreeOfEbMajor(rootNote.letter)) + figure;
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
  return lesson52Pool.filter(isStaffRound).map((round) => ({ id: round.id, prompt: round.prompt }));
}

function textRounds(): Array<{ id: string; prompt: Extract<PromptSpec, { kind: "text" }> }> {
  return lesson52Pool
    .filter((round): round is Round & { prompt: Extract<PromptSpec, { kind: "text" }> } =>
      round.prompt.kind === "text",
    )
    .map((round) => ({ id: round.id, prompt: round.prompt }));
}

function roundById(id: string): Round {
  const found = lesson52Pool.find((round) => round.id === id);
  expect(found, `round ${id} is missing from the pool`).toBeDefined();
  return found!;
}

function answerOf(id: string): string {
  const answer = roundById(id).answer;
  expect(answer.kind).toBe("choices");
  const choices = answer as Extract<Round["answer"], { kind: "choices" }>;
  return choices.options[choices.correctIndex]!;
}

describe("lesson 52 question pool", () => {
  it("holds 16 rounds: 12 staff, 4 text, all ids unique", () => {
    expect(lesson52Pool).toHaveLength(16);
    expect(staffRounds()).toHaveLength(12);
    expect(textRounds()).toHaveLength(4);
    const ids = lesson52Pool.map((round) => round.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(lesson52.entry.id).toBe(52);
  });

  it("validates every pool round", () => {
    for (const round of lesson52Pool) {
      expect(() => validateRound(round)).not.toThrow();
    }
  });

  it("draws at least 12 rounds and every drawn round passes validateRound", () => {
    const rounds = lesson52.generateRounds(createRng(1234));
    expect(rounds.length).toBeGreaterThanOrEqual(12);
    for (const round of rounds) {
      expect(() => validateRound(round)).not.toThrow();
    }
    const ids = rounds.map((round) => round.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("produces identical rounds for the same seed", () => {
    expect(lesson52.generateRounds(createRng(42))).toEqual(
      lesson52.generateRounds(createRng(42)),
    );
  });

  it("produces different rounds for two different seeds", () => {
    const first = lesson52.generateRounds(createRng(1));
    const second = lesson52.generateRounds(createRng(2));
    expect(JSON.stringify(second)).not.toBe(JSON.stringify(first));
  });

  it("draws at least one staff and one text round for every seed tried", () => {
    for (const seed of GUARANTEED_SEEDS) {
      const kinds = new Set(lesson52.generateRounds(createRng(seed)).map((r) => r.prompt.kind));
      expect(kinds.has("staff"), `seed ${seed} drew no staff round`).toBe(true);
      expect(kinds.has("text"), `seed ${seed} drew no text round`).toBe(true);
    }
  });

  it("engraves every staff chord as one stacked head under the E♭ key signature", () => {
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

  it("marks every staff prompt simultaneous with the E♭ key signature", () => {
    for (const { id, prompt } of staffRounds()) {
      expect(prompt.simultaneous, `staff round ${id}`).toBe(true);
      expect(prompt.keySignature, `staff round ${id}`).toBe("Eb");
    }
  });

  it("analyses every staff chord exactly as the site does, proven by the core", () => {
    for (const { id, prompt } of staffRounds()) {
      const expected = SITE_CHORDS[id];
      expect(expected, `round ${id} is not one of the site's O Canada chords`).toBeDefined();
      expect(prompt.notes, `staff round ${id} notes`).toEqual([...expected.notes]);
      // The voicing uses only the triad's pitch classes.
      const triadSet = new Set(
        buildTriad(parseNote(expected.root), expected.quality).map((note) => pitchClass(note)),
      );
      for (const tone of prompt.notes) {
        expect(triadSet.has(pitchClass(parseNote(tone))), `staff round ${id} tone ${tone}`).toBe(true);
      }
      // Core oracle: the derived symbol equals the site's own analysis.
      expect(symbolOf(expected.root, expected.quality, prompt.notes), `staff round ${id} symbol`).toBe(
        expected.siteSymbol,
      );
      const answer = roundById(id).answer as Extract<Round["answer"], { kind: "choices" }>;
      expect(answer.options, `staff round ${id} options`).toEqual([...expected.options]);
      expect(answerOf(id), `staff round ${id} answer`).toBe(expected.siteSymbol);
      // The rule names the derived symbol and the key.
      const rule = roundById(id).rule;
      expect(rule, `staff round ${id} rule symbol`).toContain(expected.siteSymbol);
      expect(rule, `staff round ${id} rule key`).toMatch(/Eb major|E-flat major/);
    }
  });

  it("pins the site's key-determination and shorthand conclusions in the text rounds", () => {
    for (const [id, expected] of Object.entries(SITE_TEXT)) {
      expect(answerOf(id), id).toBe(expected);
    }
    expect(textRounds()).toHaveLength(Object.keys(SITE_TEXT).length);
  });

  it("states the site's analysis facts in every rule", () => {
    for (const round of lesson52Pool) {
      expect(round.rule, round.id).not.toMatch(GENERIC_RULE);
    }
    const rules = lesson52Pool.map((round) => round.rule).join(" \n ");
    expect(rules).toMatch(/first step in analysis is to determine the key/);
    expect(rules).toMatch(/three flats/);
    expect(rules).toMatch(/Eb major or C minor/);
    expect(rules).toMatch(/most likely in that key/);
    expect(rules).toMatch(/do not have to repeat the analysis symbol/);
  });

  it("describes every staff prompt structurally, never with pitch names", () => {
    for (const { id, prompt } of staffRounds()) {
      const host = document.createElement("div");
      document.body.appendChild(host);
      const dispose = render(() => StaffPrompt({ prompt }), host);
      cleanups.push(() => {
        dispose();
        host.remove();
      });
      const label = host.querySelector(".prompt--staff")!.getAttribute("aria-label") ?? "";
      expect(label, `staff round ${id}`).toContain("Staff notation, treble clef, 3 accidentals");
      expect(label).not.toMatch(/[A-G][#b]/);
    }
  });
});

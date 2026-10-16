import { afterEach, describe, expect, it } from "vitest";
import { render } from "solid-js/web";
import { validateRound } from "../lib/rounds/validate";
import type { PromptSpec, Round } from "../lib/rounds/types";
import StaffPrompt from "../components/prompts/StaffPrompt";
import {
  buildTriad,
  diatonicTriads,
  letterIndex,
  midiNumber,
  parseNote,
  scientificName,
  type TriadQuality,
} from "../lib/theory";
import { createRng } from "./rng";
import { lesson56, lesson56Pool } from "./lesson56";

const GENERIC_RULE = /^(correct|incorrect|wrong|that'?s right)/i;

/** Every draw, for many seeds, must carry both structurally required kinds. */
const GUARANTEED_SEEDS = Array.from({ length: 100 }, (_, index) => index + 1);

/**
 * The four root-motion answers, each carrying both octave-folded readings the
 * site teaches through interval inversion ("down a third" / "up a sixth" are
 * one pitch-class motion). Every motion round offers the same four, so exactly
 * one option can be correct for any pair whose target letter is one of the
 * four implied targets.
 */
const MOTION_OPTIONS = [
  "Down a third (or up a sixth)",
  "Up a second (or down a seventh)",
  "Up a fourth (or down a fifth)",
  "Down a fourth (or up a fifth)",
] as const;

/** The generic size of each reading, keyed by its direction. */
const MOTION_READINGS: ReadonlyArray<{ option: string; down?: number; up?: number }> = [
  { option: MOTION_OPTIONS[0], down: 3, up: 6 },
  { option: MOTION_OPTIONS[1], down: 7, up: 2 },
  { option: MOTION_OPTIONS[2], down: 5, up: 4 },
  { option: MOTION_OPTIONS[3], down: 4, up: 5 },
];

/** The five root-motion staff rounds (first root → second root). */
const MOTION_ROUNDS: Readonly<
  Record<string, { pair: readonly [string, string]; answer: string }>
> = {
  "l56-staff-motion-third": { pair: ["C4", "A3"], answer: MOTION_OPTIONS[0] },
  "l56-staff-motion-second": { pair: ["F4", "G4"], answer: MOTION_OPTIONS[1] },
  "l56-staff-motion-down-fourth": { pair: ["C4", "G3"], answer: MOTION_OPTIONS[3] },
  "l56-staff-circle-i-iv": { pair: ["C4", "F4"], answer: MOTION_OPTIONS[2] },
  "l56-staff-circle-ii-v": { pair: ["D4", "G4"], answer: MOTION_OPTIONS[2] },
};

/**
 * The two root-identification staff rounds. `inverted: true` means the chord
 * is shown above its root (the site's own I-in-first-inversion example, "the
 * root is not the lowest note"), so the notes are a voiced inversion rather
 * than the root-position spelling `buildTriad` returns.
 */
const ROOT_ROUNDS: Readonly<
  Record<
    string,
    {
      root: string;
      quality: TriadQuality;
      options: readonly string[];
      answer: string;
      inverted: boolean;
    }
  >
> = {
  "l56-staff-root-i": {
    root: "C4",
    quality: "major",
    options: ["The root is E", "The root is G", "The root is C"],
    answer: "The root is C",
    inverted: true,
  },
  "l56-staff-root-v": {
    root: "G4",
    quality: "major",
    options: ["The root is D", "The root is G", "The root is B"],
    answer: "The root is G",
    inverted: false,
  },
};

/** The ten text answers, each the site's own sentence (US slide text). */
const SITE_TEXT: Readonly<Record<string, string>> = {
  "l56-text-root-motion": "The movement from one chord's root to another chord's root",
  "l56-text-circle-def": "When root motion is up a fourth or down a fifth",
  "l56-text-circle-pair-1": "I → IV and ii → V",
  "l56-text-circle-pair-2": "iii → vi and IV → vii°",
  "l56-text-major-chain": "I → IV → vii° → iii → vi → ii → V → I",
  "l56-text-minor-chain": "i → iv → VII → III → VI → ii° → V → i",
  "l56-text-minor-iv": "VII — not vii°",
  "l56-text-minor-iio": "V — not v",
  "l56-text-inverted-root": "It is not the lowest note",
  "l56-text-upsixth": "Up a sixth",
};

/**
 * Signed generic distance in letter positions (up positive, down negative),
 * octave-aware: C4 → A3 is −2 (down a third), D4 → G4 is +4 (up a fourth).
 */
function signedGeneric(from: string, to: string): number {
  const a = parseNote(from);
  const b = parseNote(to);
  if (a.octave === undefined || b.octave === undefined) {
    throw new Error(`signedGeneric requires octaves: ${from} → ${to}`);
  }
  return (b.octave - a.octave) * 7 + (letterIndex(b.letter) - letterIndex(a.letter));
}

/** True when the reading describes this signed motion (generic size matches). */
function readingMatches(
  reading: { down?: number; up?: number },
  signed: number,
): boolean {
  const size = Math.abs(signed) + 1;
  if (signed < 0) return reading.down === size;
  if (signed > 0) return reading.up === size;
  return false;
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
  return lesson56Pool.filter(isStaffRound).map((round) => ({ id: round.id, prompt: round.prompt }));
}

function textRounds(): Array<{ id: string; prompt: Extract<PromptSpec, { kind: "text" }> }> {
  return lesson56Pool
    .filter((round): round is Round & { prompt: Extract<PromptSpec, { kind: "text" }> } =>
      round.prompt.kind === "text",
    )
    .map((round) => ({ id: round.id, prompt: round.prompt }));
}

function roundById(id: string): Round {
  const found = lesson56Pool.find((round) => round.id === id);
  expect(found, `round ${id} is missing from the pool`).toBeDefined();
  return found!;
}

function answerOf(id: string): string {
  const answer = roundById(id).answer;
  expect(answer.kind).toBe("choices");
  const choices = answer as Extract<Round["answer"], { kind: "choices" }>;
  return choices.options[choices.correctIndex]!;
}

describe("lesson 56 question pool", () => {
  it("holds 17 rounds: 7 staff, 10 text, all ids unique", () => {
    expect(lesson56Pool).toHaveLength(17);
    expect(staffRounds()).toHaveLength(7);
    expect(textRounds()).toHaveLength(10);
    const ids = lesson56Pool.map((round) => round.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(lesson56.entry.id).toBe(56);
  });

  it("validates every pool round", () => {
    for (const round of lesson56Pool) {
      expect(() => validateRound(round)).not.toThrow();
    }
  });

  it("draws at least 12 rounds and every drawn round passes validateRound", () => {
    const rounds = lesson56.generateRounds(createRng(1234));
    expect(rounds.length).toBeGreaterThanOrEqual(12);
    for (const round of rounds) {
      expect(() => validateRound(round)).not.toThrow();
    }
    const ids = rounds.map((round) => round.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("produces identical rounds for the same seed", () => {
    expect(lesson56.generateRounds(createRng(42))).toEqual(
      lesson56.generateRounds(createRng(42)),
    );
  });

  it("produces different rounds for two different seeds", () => {
    const first = lesson56.generateRounds(createRng(1));
    const second = lesson56.generateRounds(createRng(2));
    expect(JSON.stringify(second)).not.toBe(JSON.stringify(first));
  });

  it("draws at least one staff and one text round for every seed tried", () => {
    for (const seed of GUARANTEED_SEEDS) {
      const kinds = new Set(lesson56.generateRounds(createRng(seed)).map((r) => r.prompt.kind));
      expect(kinds.has("staff"), `seed ${seed} drew no staff round`).toBe(true);
      expect(kinds.has("text"), `seed ${seed} drew no text round`).toBe(true);
    }
  });

  it("labels each root-motion pair with exactly one fitting reading", () => {
    for (const [id, expected] of Object.entries(MOTION_ROUNDS)) {
      const round = roundById(id);
      expect(round.prompt.kind, id).toBe("staff");
      const prompt = round.prompt as Extract<PromptSpec, { kind: "staff" }>;
      // Two roots in sequence: melodic, never one stacked chord.
      expect(prompt.simultaneous, `${id} must not be simultaneous`).toBeFalsy();
      expect(prompt.notes, `${id} pair`).toEqual([...expected.pair]);
      const signed = signedGeneric(expected.pair[0], expected.pair[1]);
      const fitting = MOTION_READINGS.filter((reading) => readingMatches(reading, signed));
      expect(fitting, `${id} signed ${signed} must fit exactly one reading`).toHaveLength(1);
      const answer = round.answer as Extract<Round["answer"], { kind: "choices" }>;
      expect([...answer.options], `${id} options`).toEqual([...MOTION_OPTIONS]);
      expect(answer.options[answer.correctIndex], `${id} answer`).toBe(fitting[0]!.option);
      expect(answer.options[answer.correctIndex], `${id} table answer`).toBe(expected.answer);
    }
  });

  it("identifies each chord root through the core, not the bass", () => {
    const triads = diatonicTriads(parseNote("C"), "major");
    for (const [id, expected] of Object.entries(ROOT_ROUNDS)) {
      const round = roundById(id);
      expect(round.prompt.kind, id).toBe("staff");
      const prompt = round.prompt as Extract<PromptSpec, { kind: "staff" }>;
      expect(prompt.simultaneous, `${id} chords stack as one chord`).toBe(true);
      const rootSpelling = buildTriad(parseNote(expected.root), expected.quality).map(scientificName);
      if (expected.inverted) {
        // A voiced inversion: same letters as the core's root-position triad,
        // strictly ascending, with the third (not the root) in the bass.
        expect(prompt.notes, `${id} tones`).toHaveLength(3);
        const shown = prompt.notes.map((name) => parseNote(name));
        const built = rootSpelling.map((name) => parseNote(name));
        expect(
          shown.map((note) => note.letter).sort(),
          `${id} letters vs buildTriad`,
        ).toEqual(built.map((note) => note.letter).sort());
        for (let index = 1; index < shown.length; index += 1) {
          expect(midiNumber(shown[index]!), `${id} ascending at ${index}`).toBeGreaterThan(
            midiNumber(shown[index - 1]!),
          );
        }
        expect(shown[0]!.letter, `${id} bass is the third, not the root`).toBe(built[1]!.letter);
      } else {
        expect(prompt.notes, `${id} spelling`).toEqual(rootSpelling);
      }
      // The root is whichever C-major diatonic triad has exactly these letters.
      const letterSet = [...prompt.notes].map((name) => parseNote(name).letter).sort().join("");
      const matching = triads.filter((triad) =>
        triad.notes
          .map((note) => note.letter)
          .sort()
          .join("") === letterSet,
      );
      expect(matching, `${id} letter set must match one diatonic triad`).toHaveLength(1);
      const derivedRoot = matching[0]!.notes[0]!.letter;
      const answer = round.answer as Extract<Round["answer"], { kind: "choices" }>;
      expect([...answer.options], `${id} options`).toEqual([...expected.options]);
      expect(answer.options[answer.correctIndex], `${id} answer`).toBe(expected.answer);
      expect(answer.options[answer.correctIndex], `${id} derived root`).toBe(
        `The root is ${derivedRoot}`,
      );
      expect(derivedRoot, `${id} table root`).toBe(parseNote(expected.root).letter);
    }
  });

  it("engraves motion pairs as sequential notes and root chords as one stack", () => {
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
      const expected = prompt.simultaneous ? 1 : prompt.notes.length;
      expect(staveNotes, `staff round ${id}`).toHaveLength(expected);
    }
  });

  it("pins the site's prose conclusions in the text rounds", () => {
    for (const [id, expected] of Object.entries(SITE_TEXT)) {
      expect(answerOf(id), id).toBe(expected);
    }
    expect(textRounds()).toHaveLength(Object.keys(SITE_TEXT).length);
  });

  it("states the site's circle-progression facts in every rule", () => {
    for (const round of lesson56Pool) {
      expect(round.rule, round.id).not.toMatch(GENERIC_RULE);
    }
    const rules = lesson56Pool.map((round) => round.rule).join(" \n ");
    expect(rules).toMatch(/movement from one chord's root to another chord's root/);
    expect(rules).toMatch(/up a fourth or down a fifth/);
    expect(rules).toMatch(/Both I→IV and ii→V are circle progressions/);
    expect(rules).toMatch(/iii→vi and IV→vii° are also circle progressions/);
    expect(rules).toMatch(/I→IV→vii°→iii→vi→ii→V→I/);
    expect(rules).toMatch(/i→iv→VII→III→VI→ii°→V→i/);
    expect(rules).toMatch(/iv progresses to VII \(not vii°\)/);
    expect(rules).toMatch(/ii° progresses to V \(not v\)/);
    expect(rules).toMatch(/the root is not the lowest note/);
    expect(rules).toMatch(/classified as up a sixth/);
    expect(rules).toMatch(/down a third|up a second|down a fourth|up a fourth/);
  });
});

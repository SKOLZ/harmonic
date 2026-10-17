import { afterEach, describe, expect, it } from "vitest";
import { render } from "solid-js/web";
import { validateRound } from "../lib/rounds/validate";
import { assertNoAnswerLeak } from "../lib/rounds/noAnswerLeak";
import type { PromptSpec, Round } from "../lib/rounds/types";
import StaffPrompt from "../components/prompts/StaffPrompt";
import {
  buildTriad,
  detectTriadQuality,
  diatonicTriads,
  letterIndex,
  parseNote,
  romanNumeral,
  scientificName,
  type TriadQuality,
} from "../lib/theory";
import { createRng } from "./rng";
import { lesson50, lesson50Pool } from "./lesson50";

const GENERIC_RULE = /^(correct|incorrect|wrong|that'?s right)/i;

/** Every draw, for many seeds, must carry both structurally required kinds. */
const GUARANTEED_SEEDS = Array.from({ length: 100 }, (_, index) => index + 1);

/**
 * The three scale-form answers a staff round offers. The site compares the
 * diatonic triads of natural minor and harmonic minor and tells the learner
 * which form(s) contain each triad.
 */
const SOURCE_OPTIONS = ["Natural minor only", "Harmonic minor only", "Both minor scales"] as const;
type Source = "natural" | "harmonic" | "both";
const SOURCE_INDEX: Readonly<Record<Source, number>> = { natural: 0, harmonic: 1, both: 2 };

/**
 * The ten distinct triads the merged C minor scale yields, each pinned to its
 * root and quality. The site walks natural minor and harmonic minor and notes
 * that three pairs differ (III–III+, v–V, VII–vii°) while the rest are shared.
 * Staff spellings come from `buildTriad`; scale membership is re-derived from
 * `diatonicTriads` in the assertions, never hand-typed.
 */
const SITE_TRIADS: Record<
  string,
  { root: string; quality: TriadQuality; source: Source }
> = {
  // Shared by both scales.
  "l50-staff-i": { root: "C4", quality: "minor", source: "both" },
  "l50-staff-iidim": { root: "D4", quality: "diminished", source: "both" },
  "l50-staff-iv": { root: "F4", quality: "minor", source: "both" },
  "l50-staff-vi": { root: "Ab4", quality: "major", source: "both" },
  // Unique to natural minor.
  "l50-staff-iii": { root: "Eb4", quality: "major", source: "natural" },
  "l50-staff-v": { root: "G4", quality: "minor", source: "natural" },
  "l50-staff-vii": { root: "Bb4", quality: "major", source: "natural" },
  // Unique to harmonic minor.
  "l50-staff-iiiaug": { root: "Eb4", quality: "augmented", source: "harmonic" },
  "l50-staff-vmaj": { root: "G4", quality: "major", source: "harmonic" },
  "l50-staff-viidim": { root: "B4", quality: "diminished", source: "harmonic" },
};

/** The seven text answers, each the site's own conclusion. */
const SITE_TEXT: Readonly<Record<string, string>> = {
  "l50-text-count": "Three",
  "l50-text-merge": "Natural minor and harmonic minor",
  "l50-text-iii-pref": "III+, being an augmented chord, has a peculiar sound",
  "l50-text-v-pref": "V contains a leading tone",
  "l50-text-v-usable": "Yes",
  "l50-text-vii-use": "Both are used equally",
  "l50-text-pairs": "III–III+, v–V, and VII–vii°",
};

/**
 * Scale membership re-derived from the theory core: which of C natural minor
 * and C harmonic minor contain the triad on `letter` of `quality`.
 */
function sourceOf(letter: string, quality: TriadQuality): Source {
  const natural = diatonicTriads(parseNote("C"), "naturalMinor");
  const harmonic = diatonicTriads(parseNote("C"), "harmonicMinor");
  const matches = (list: ReturnType<typeof diatonicTriads>) =>
    list.some((triad) => triad.notes[0]!.letter === letter && triad.quality === quality);
  const inNatural = matches(natural);
  const inHarmonic = matches(harmonic);
  if (inNatural && inHarmonic) return "both";
  if (inNatural) return "natural";
  if (inHarmonic) return "harmonic";
  throw new Error(`no scale contains ${letter} ${quality}`);
}

/** Degree of a root letter within C minor (letters C–B occupy degrees 1–7). */
function degreeOf(letter: string): number {
  return ((letterIndex(letter as never) - letterIndex("C")) % 7) + 1;
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
  return lesson50Pool.filter(isStaffRound).map((round) => ({ id: round.id, prompt: round.prompt }));
}

function textRounds(): Array<{ id: string; prompt: Extract<PromptSpec, { kind: "text" }> }> {
  return lesson50Pool
    .filter((round): round is Round & { prompt: Extract<PromptSpec, { kind: "text" }> } =>
      round.prompt.kind === "text",
    )
    .map((round) => ({ id: round.id, prompt: round.prompt }));
}

function roundById(id: string): Round {
  const found = lesson50Pool.find((round) => round.id === id);
  expect(found, `round ${id} is missing from the pool`).toBeDefined();
  return found!;
}

function answerOf(id: string): string {
  const answer = roundById(id).answer;
  expect(answer.kind).toBe("choices");
  const choices = answer as Extract<Round["answer"], { kind: "choices" }>;
  return choices.options[choices.correctIndex]!;
}

describe("lesson 50 question pool", () => {
  it("holds 17 rounds: 10 staff, 7 text, all ids unique", () => {
    expect(lesson50Pool).toHaveLength(17);
    expect(staffRounds()).toHaveLength(10);
    expect(textRounds()).toHaveLength(7);
    const ids = lesson50Pool.map((round) => round.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(lesson50.entry.id).toBe(50);
  });

  it("validates every pool round", () => {
    for (const round of lesson50Pool) {
      expect(() => validateRound(round)).not.toThrow();
    }
  });

  it("draws at least 12 rounds and every drawn round passes validateRound", () => {
    const rounds = lesson50.generateRounds(createRng(1234));
    expect(rounds.length).toBeGreaterThanOrEqual(12);
    for (const round of rounds) {
      expect(() => validateRound(round)).not.toThrow();
    }
    const ids = rounds.map((round) => round.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("produces identical rounds for the same seed", () => {
    expect(lesson50.generateRounds(createRng(42))).toEqual(
      lesson50.generateRounds(createRng(42)),
    );
  });

  it("produces different rounds for two different seeds", () => {
    const first = lesson50.generateRounds(createRng(1));
    const second = lesson50.generateRounds(createRng(2));
    expect(JSON.stringify(second)).not.toBe(JSON.stringify(first));
  });

  it("draws at least one staff and one text round for every seed tried", () => {
    for (const seed of GUARANTEED_SEEDS) {
      const kinds = new Set(lesson50.generateRounds(createRng(seed)).map((r) => r.prompt.kind));
      expect(kinds.has("staff"), `seed ${seed} drew no staff round`).toBe(true);
      expect(kinds.has("text"), `seed ${seed} drew no text round`).toBe(true);
    }
  });

  it("engraves every staff prompt as one stacked chord", () => {
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

  it("marks every staff prompt simultaneous", () => {
    for (const { id, prompt } of staffRounds()) {
      expect(prompt.simultaneous, `staff round ${id}`).toBe(true);
    }
  });

  it("spells every staff triad as the core builds it, and labels the right scale form", () => {
    for (const { id, prompt } of staffRounds()) {
      const expected = SITE_TRIADS[id];
      expect(expected, `round ${id} is not one of the ten merged-minor triads`).toBeDefined();
      // Core oracle: buildTriad spelling, never hand-typed.
      expect(prompt.notes, `staff round ${id} vs buildTriad`).toEqual(
        buildTriad(parseNote(expected.root), expected.quality).map(scientificName),
      );
      // Quality oracle: detect the stacked tones back to the same quality.
      const tones = prompt.notes.map((note) => parseNote(note));
      expect(detectTriadQuality(tones), `staff round ${id} quality`).toBe(expected.quality);
      // Scale-membership oracle re-derived from diatonicTriads.
      const letter = parseNote(expected.root).letter;
      expect(sourceOf(letter, expected.quality), `staff round ${id} source`).toBe(expected.source);
      // Answer options and correctness.
      const answer = roundById(id).answer as Extract<Round["answer"], { kind: "choices" }>;
      expect(answer.options, `staff round ${id} options`).toEqual([...SOURCE_OPTIONS]);
      expect(answer.correctIndex, `staff round ${id} index`).toBe(SOURCE_INDEX[expected.source]);
      // The rule names the numeral the core computes for this triad.
      const numeral = romanNumeral(expected.quality, degreeOf(letter));
      expect(roundById(id).rule, `staff round ${id} numeral`).toContain(numeral);
    }
  });

  it("pins the site's prose conclusions in the text rounds", () => {
    for (const [id, expected] of Object.entries(SITE_TEXT)) {
      expect(answerOf(id), id).toBe(expected);
    }
    expect(textRounds()).toHaveLength(Object.keys(SITE_TEXT).length);
  });

  it("states the site's composing-with-minor-scales facts in every rule", () => {
    for (const round of lesson50Pool) {
      expect(round.rule, round.id).not.toMatch(GENERIC_RULE);
    }
    const rules = lesson50Pool.map((round) => round.rule).join(" \n ");
    expect(rules).toMatch(/three different minor scales exist/);
    expect(rules).toMatch(/merge two of these scales, natural minor and harmonic minor/);
    expect(rules).toMatch(/III\+?, being an augmented chord, has a peculiar sound/);
    expect(rules).toMatch(/V contains a leading tone \(and therefore is stronger\)/);
    expect(rules).toMatch(/does not mean that v cannot be used/);
    expect(rules).toMatch(/VII and vii° are both used equally/);
    expect(rules).toMatch(/raised seventh degree/);
  });
});

describe("lesson 50 companion illustrations (T5d Diatonic pass)", () => {
  // Zero yield for Composing with Minor Scales. Every text round is the
  // site's composing GUIDANCE in prose: the scale species are named
  // class-wide ("natural minor and harmonic minor" — no root), the
  // III/III+/V/v/VII/vii° conclusions are Roman-numeral guidance with no
  // concrete pitch subject, and the count round is a count. There is no
  // question pitch anywhere, so a staff illustration would have to invent
  // the subject (option (b), which the user declined).
  const COUNT = ["l50-text-count"];
  const CLASS = [
    "l50-text-merge",
    "l50-text-iii-pref",
    "l50-text-v-pref",
    "l50-text-v-usable",
    "l50-text-vii-use",
    "l50-text-pairs",
  ];

  it("accounts for every text round: all seven are classified rejections", () => {
    const textIds = lesson50Pool
      .filter((round) => round.prompt.kind === "text")
      .map((round) => round.id)
      .sort();
    expect(textIds).toHaveLength(7);
    expect(textIds).toEqual([...COUNT, ...CLASS].sort());
  });

  it("has zero companion illustrations across the whole pool", () => {
    for (const round of lesson50Pool) {
      expect(round.illustration, round.id).toBeUndefined();
    }
  });

  it("keeps the count round text-only: a count, no pitch subject", () => {
    expect(roundById("l50-text-count").prompt.kind).toBe("text");
    expect(roundById("l50-text-count").illustration).toBeUndefined();
  });

  it("keeps the six composing-guidance rounds text-only: class-level prose", () => {
    expect(CLASS).toHaveLength(6);
    for (const id of CLASS) {
      expect(roundById(id).prompt.kind, id).toBe("text");
      expect(roundById(id).illustration, id).toBeUndefined();
    }
  });

  it("passes the shared no-leak assertion for every pool round", () => {
    for (const round of lesson50Pool) {
      expect(() => assertNoAnswerLeak(round), round.id).not.toThrow();
    }
  });
});

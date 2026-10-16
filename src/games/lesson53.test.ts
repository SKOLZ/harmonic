import { afterEach, describe, expect, it } from "vitest";
import { render } from "solid-js/web";
import { validateRound } from "../lib/rounds/validate";
import type { PromptSpec, Round } from "../lib/rounds/types";
import StaffPrompt from "../components/prompts/StaffPrompt";
import { letterIndex, parseNote } from "../lib/theory";
import { createRng } from "./rng";
import { lesson53, lesson53Pool } from "./lesson53";

const GENERIC_RULE = /^(correct|incorrect|wrong|that'?s right)/i;

/** Every draw, for many seeds, must carry both structurally required kinds. */
const GUARANTEED_SEEDS = Array.from({ length: 100 }, (_, index) => index + 1);

/**
 * The site's own labels for the eight named US nonharmonic tones (the
 * `labels` map of the live lesson53 payload), each as an answer phrase.
 */
const TYPE_LABELS = {
  pt: "A passing tone (PT)",
  nt: "A neighboring tone (NT)",
  ant: "An anticipation (Ant.)",
  et: "An escape tone (ET)",
  app: "An appoggiatura (App.)",
  sus: "A suspension (Sus.)",
  ret: "A retardation (Ret.)",
  ct: "A changing tone (CT)",
} as const;
type TypeKey = keyof typeof TYPE_LABELS;

const KEY_BY_LABEL: Readonly<Record<string, TypeKey>> = Object.fromEntries(
  Object.entries(TYPE_LABELS).map(([key, label]) => [label, key as TypeKey]),
);

/**
 * The figure every staff round engraves, paired with the type it must be
 * judged to be. The site's figures are animation frames (image data, not note
 * names), so each figure is constructed from the site's own prose definition
 * of the type; the classifier oracle below re-derives that judgement from the
 * definitions instead of trusting this table.
 */
const STAFF_FIGURES: Readonly<
  Record<string, { notes: readonly string[]; answer: TypeKey }>
> = {
  "l53-staff-pt": { notes: ["C5", "D5", "E5"], answer: "pt" },
  "l53-staff-nt": { notes: ["C5", "D5", "C5"], answer: "nt" },
  "l53-staff-ant": { notes: ["C5", "D5", "D5"], answer: "ant" },
  "l53-staff-et": { notes: ["C5", "D5", "B4"], answer: "et" },
  "l53-staff-app": { notes: ["C5", "E5", "D5"], answer: "app" },
  "l53-staff-sus": { notes: ["C5", "C5", "B4"], answer: "sus" },
  "l53-staff-ret": { notes: ["C5", "C5", "D5"], answer: "ret" },
  "l53-staff-ct": { notes: ["C5", "D5", "B4", "C5"], answer: "ct" },
};

/**
 * The sixteen text answers, each the site's own sentence (US slide text).
 */
const SITE_TEXT: Readonly<Record<string, string>> = {
  "l53-text-def": "A note that does not belong in a certain chord",
  "l53-text-step": "An interval of a generic second",
  "l53-text-skip": "An interval of a generic third or more",
  "l53-text-pt": "By step, then continues by step in the same direction",
  "l53-text-apt": "When it occurs with the second chord",
  "l53-text-ant": "A note of the second chord played early",
  "l53-text-ant-accent": "No",
  "l53-text-et": "By step, then skips in the opposite direction",
  "l53-text-app": "By skip, then steps in the opposite direction",
  "l53-text-app-accent": "Yes — they occur with the second chord",
  "l53-text-sus": "It keeps a note the same and then steps downward",
  "l53-text-ret": "It keeps a note the same and then steps upward",
  "l53-text-accent-sus": "Yes — both are accented",
  "l53-text-ct": "Two, in succession",
  "l53-text-ct-alias": "Double neighboring tones or a neighbor group",
  "l53-text-others": "Composers may choose to use others",
};

/**
 * Signed generic distance in letter positions (up positive, down negative),
 * octave-aware: C4 → D4 is +1, C4 → A3 is −2. A step is a generic second
 * (|distance| 1); a skip is a generic third or more (|distance| ≥ 2) — the
 * site's own two prerequisite definitions.
 */
function signedGeneric(from: string, to: string): number {
  const a = parseNote(from);
  const b = parseNote(to);
  if (a.octave === undefined || b.octave === undefined) {
    throw new Error(`signedGeneric requires octaves: ${from} → ${to}`);
  }
  return (b.octave - a.octave) * 7 + (letterIndex(b.letter) - letterIndex(a.letter));
}

const isStep = (a: string, b: string): boolean => Math.abs(signedGeneric(a, b)) === 1;
const isSkip = (a: string, b: string): boolean => Math.abs(signedGeneric(a, b)) >= 2;
const isUp = (a: string, b: string): boolean => signedGeneric(a, b) > 0;

/**
 * Whether `notes` matches the site's prose definition of `type`. Each named
 * type has a fixed arity (three tones, except changing tones which use two
 * nonharmonic tones in succession — four), so a partial window of a longer
 * figure can never impersonate another type.
 */
function matchesType(type: TypeKey, notes: readonly string[]): boolean {
  if (type === "ct") {
    if (notes.length !== 4) return false;
    const [n0, n1, n2, n3] = notes as [string, string, string, string];
    return (
      isStep(n0, n1) &&
      isSkip(n1, n2) &&
      isUp(n0, n1) !== isUp(n1, n2) &&
      isStep(n2, n3) &&
      isUp(n1, n2) !== isUp(n2, n3)
    );
  }
  if (notes.length !== 3) return false;
  const [n0, n1, n2] = notes as [string, string, string];
  switch (type) {
    case "pt":
      return isStep(n0, n1) && isStep(n1, n2) && isUp(n0, n1) === isUp(n1, n2);
    case "nt":
      return isStep(n0, n1) && n2 === n0;
    case "ant":
      return isStep(n0, n1) && n1 === n2;
    case "et":
      return isStep(n0, n1) && isSkip(n1, n2) && isUp(n0, n1) !== isUp(n1, n2);
    case "app":
      return isSkip(n0, n1) && isStep(n1, n2) && isUp(n0, n1) !== isUp(n1, n2);
    case "sus":
      return n0 === n1 && isStep(n1, n2) && !isUp(n1, n2);
    case "ret":
      return n0 === n1 && isStep(n1, n2) && isUp(n1, n2);
    default:
      return false;
  }
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
  return lesson53Pool.filter(isStaffRound).map((round) => ({ id: round.id, prompt: round.prompt }));
}

function textRounds(): Array<{ id: string; prompt: Extract<PromptSpec, { kind: "text" }> }> {
  return lesson53Pool
    .filter((round): round is Round & { prompt: Extract<PromptSpec, { kind: "text" }> } =>
      round.prompt.kind === "text",
    )
    .map((round) => ({ id: round.id, prompt: round.prompt }));
}

function roundById(id: string): Round {
  const found = lesson53Pool.find((round) => round.id === id);
  expect(found, `round ${id} is missing from the pool`).toBeDefined();
  return found!;
}

function answerOf(id: string): string {
  const answer = roundById(id).answer;
  expect(answer.kind).toBe("choices");
  const choices = answer as Extract<Round["answer"], { kind: "choices" }>;
  return choices.options[choices.correctIndex]!;
}

describe("lesson 53 question pool", () => {
  it("holds 24 rounds: 8 staff figures, 16 text, all ids unique", () => {
    expect(lesson53Pool).toHaveLength(24);
    expect(staffRounds()).toHaveLength(8);
    expect(textRounds()).toHaveLength(16);
    const ids = lesson53Pool.map((round) => round.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(lesson53.entry.id).toBe(53);
  });

  it("validates every pool round", () => {
    for (const round of lesson53Pool) {
      expect(() => validateRound(round)).not.toThrow();
    }
  });

  it("draws at least 12 rounds and every drawn round passes validateRound", () => {
    const rounds = lesson53.generateRounds(createRng(1234));
    expect(rounds.length).toBeGreaterThanOrEqual(12);
    for (const round of rounds) {
      expect(() => validateRound(round)).not.toThrow();
    }
    const ids = rounds.map((round) => round.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("produces identical rounds for the same seed", () => {
    expect(lesson53.generateRounds(createRng(42))).toEqual(
      lesson53.generateRounds(createRng(42)),
    );
  });

  it("produces different rounds for two different seeds", () => {
    const first = lesson53.generateRounds(createRng(1));
    const second = lesson53.generateRounds(createRng(2));
    expect(JSON.stringify(second)).not.toBe(JSON.stringify(first));
  });

  it("draws at least one staff and one text round for every seed tried", () => {
    for (const seed of GUARANTEED_SEEDS) {
      const kinds = new Set(lesson53.generateRounds(createRng(seed)).map((r) => r.prompt.kind));
      expect(kinds.has("staff"), `seed ${seed} drew no staff round`).toBe(true);
      expect(kinds.has("text"), `seed ${seed} drew no text round`).toBe(true);
    }
  });

  it("engraves every figure as a sequential melodic line (never one stacked chord)", () => {
    for (const { id, prompt } of staffRounds()) {
      expect(prompt.simultaneous, `staff round ${id} must not be simultaneous`).toBeFalsy();
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
      expect(staveNotes, `staff round ${id}`).toHaveLength(prompt.notes.length);
    }
  });

  it("offers exactly one defensible type per figure, and marks it correct", () => {
    for (const { id, prompt } of staffRounds()) {
      const expected = STAFF_FIGURES[id];
      expect(expected, `round ${id} is not one of the eight site figures`).toBeDefined();
      expect(prompt.notes, `staff round ${id} figure`).toEqual([...expected.notes]);
      const answer = roundById(id).answer as Extract<Round["answer"], { kind: "choices" }>;
      expect(answer.options, `staff round ${id} option count`).toHaveLength(4);
      const fitting = answer.options.filter((label) =>
        matchesType(KEY_BY_LABEL[label]!, prompt.notes),
      );
      expect(fitting, `staff round ${id} must fit exactly one offered type`).toEqual([
        TYPE_LABELS[expected.answer],
      ]);
      expect(answer.options[answer.correctIndex], `staff round ${id} correct option`).toBe(
        TYPE_LABELS[expected.answer],
      );
    }
  });

  it("keeps the changing-tone options clear of its partial-window look-alikes", () => {
    // The 4-tone CT figure contains look-alike 3-tone windows: C5–D5–B4 is a
    // textbook escape tone and D5–B4–C5 is a textbook appoggiatura. The site's
    // arity-based definitions make CT the only whole-figure reading, but ET and
    // App are deliberately not offered on the CT round so no partial reading
    // can compete with the intended answer.
    expect(matchesType("et", ["C5", "D5", "B4"])).toBe(true);
    expect(matchesType("app", ["D5", "B4", "C5"])).toBe(true);
    expect(matchesType("ct", ["C5", "D5", "B4", "C5"])).toBe(true);
    const answer = roundById("l53-staff-ct").answer as Extract<
      Round["answer"],
      { kind: "choices" }
    >;
    expect(answer.options).not.toContain(TYPE_LABELS.et);
    expect(answer.options).not.toContain(TYPE_LABELS.app);
  });

  it("pins the site's prose conclusions in the text rounds", () => {
    for (const [id, expected] of Object.entries(SITE_TEXT)) {
      expect(answerOf(id), id).toBe(expected);
    }
    expect(textRounds()).toHaveLength(Object.keys(SITE_TEXT).length);
  });

  it("states the site's nonharmonic-tone facts in every rule", () => {
    for (const round of lesson53Pool) {
      expect(round.rule, round.id).not.toMatch(GENERIC_RULE);
    }
    const rules = lesson53Pool.map((round) => round.rule).join(" \n ");
    expect(rules).toMatch(/notes that do not belong in a certain chord/);
    expect(rules).toMatch(/generic second/);
    expect(rules).toMatch(/generic third or more/);
    expect(rules).toMatch(/approached by step and then continues by step in the same direction/);
    expect(rules).toMatch(/accented passing tone/);
    expect(rules).toMatch(/note of the second chord played early/);
    expect(rules).toMatch(/Anticipations are not accented/);
    expect(rules).toMatch(/approached by step and then skips in the opposite direction/);
    expect(rules).toMatch(/approached by skip and then steps in the opposite direction/);
    expect(rules).toMatch(/Appoggiaturas are accented/);
    expect(rules).toMatch(/keeps a note the same and then steps downward/);
    expect(rules).toMatch(/keeps a note the same and then steps upward/);
    expect(rules).toMatch(/Both the retardation and suspension are accented/);
    expect(rules).toMatch(/two nonharmonic tones in succession/);
    expect(rules).toMatch(/double neighboring tones or a neighbor group/);
    expect(rules).toMatch(/composers may choose to use others/);
  });
});

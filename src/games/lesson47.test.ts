import { afterEach, describe, expect, it } from "vitest";
import { render } from "solid-js/web";
import { validateRound } from "../lib/rounds/validate";
import type { PromptSpec, Round } from "../lib/rounds/types";
import KeyboardPrompt from "../components/prompts/KeyboardPrompt";
import StaffPrompt from "../components/prompts/StaffPrompt";
import {
  bassNote,
  buildSeventh,
  identifyInversion,
  parseNote,
  pitchClass,
  semitoneIndex,
  type Note,
  type SeventhQuality,
} from "../lib/theory";
import { createRng } from "./rng";
import { lesson47, lesson47Pool } from "./lesson47";

const GENERIC_RULE = /^(correct|incorrect|wrong|that'?s right)/i;

/** Every draw, for many seeds, must carry both structurally required kinds. */
const GUARANTEED_SEEDS = Array.from({ length: 100 }, (_, index) => index + 1);

/** The site's four position labels (lesson 47 slides and chart). */
const POSITION_LABEL = ["Root position", "First inversion", "Second inversion", "Third inversion"];

/** The site's chart labels for the four chord tones a bass can be. */
const TONE_LABEL = ["The root", "The third", "The fifth", "The seventh"];

/** The core's inversion keys mapped onto the site's chart labels. */
const CORE_INVERSION_LABEL: Record<"rootPosition" | "first" | "second" | "third", string> = {
  rootPosition: "Root position",
  first: "First inversion",
  second: "Second inversion",
  third: "Third inversion",
};

/**
 * Every round that shows chord tones: which seventh chord, in which
 * inversion. The site's worked example is C major seventh — its sounds data
 * in `lesson47.js` walks midi 60-64-67-71 (C–E–G–B) → 64-67-71-72 (E–G–B–C)
 * → 67-71-72-76 (G–B–C–E) → 71-72-76-79 (B–C–E–G) → 72-76-79-83 (C–E–G–B
 * an octave up), and those five voicings are pinned literally below; the
 * other chords generalize the same rule to seventh chords from lessons 45/48.
 */
const CHORD_ROUNDS: Record<
  string,
  { root: string; quality: SeventhQuality; inversions: number; siteVoicing?: string[] }
> = {
  // --- the site's worked C major seventh chain ------------------------------
  "l47-staff-c-major7-root": {
    root: "C4",
    quality: "majorSeventh",
    inversions: 0,
    siteVoicing: ["C4", "E4", "G4", "B4"],
  },
  "l47-staff-c-major7-first": {
    root: "C4",
    quality: "majorSeventh",
    inversions: 1,
    siteVoicing: ["E4", "G4", "B4", "C5"],
  },
  "l47-staff-c-major7-second": {
    root: "C4",
    quality: "majorSeventh",
    inversions: 2,
    siteVoicing: ["G4", "B4", "C5", "E5"],
  },
  "l47-staff-c-major7-third": {
    root: "C4",
    quality: "majorSeventh",
    inversions: 3,
    siteVoicing: ["B4", "C5", "E5", "G5"],
  },
  "l47-staff-c-major7-returned": {
    root: "C4",
    quality: "majorSeventh",
    inversions: 4,
    siteVoicing: ["C5", "E5", "G5", "B5"],
  },
  "l47-keyboard-c-major7-root": {
    root: "C4",
    quality: "majorSeventh",
    inversions: 0,
    siteVoicing: ["C4", "E4", "G4", "B4"],
  },
  "l47-keyboard-c-major7-first": {
    root: "C4",
    quality: "majorSeventh",
    inversions: 1,
    siteVoicing: ["E4", "G4", "B4", "C5"],
  },
  "l47-keyboard-c-major7-second": {
    root: "C4",
    quality: "majorSeventh",
    inversions: 2,
    siteVoicing: ["G4", "B4", "C5", "E5"],
  },
  "l47-keyboard-c-major7-third": {
    root: "C4",
    quality: "majorSeventh",
    inversions: 3,
    siteVoicing: ["B4", "C5", "E5", "G5"],
  },
  // --- which chord tone sits in the bass: the dominant seventh chain --------
  "l47-staff-c-dom-root": { root: "C4", quality: "dominantSeventh", inversions: 0 },
  "l47-staff-c-dom-first": { root: "C4", quality: "dominantSeventh", inversions: 1 },
  "l47-staff-c-dom-second": { root: "C4", quality: "dominantSeventh", inversions: 2 },
  "l47-staff-c-dom-third": { root: "C4", quality: "dominantSeventh", inversions: 3 },
  // --- generalized to other seventh chords ----------------------------------
  "l47-staff-fs-dom-first": { root: "F#4", quality: "dominantSeventh", inversions: 1 },
  "l47-staff-ab-major7-second": { root: "Ab4", quality: "majorSeventh", inversions: 2 },
  "l47-staff-c-min7-third": { root: "C4", quality: "minorSeventh", inversions: 3 },
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
  return lesson47Pool.filter(isStaffRound).map((round) => ({ id: round.id, prompt: round.prompt }));
}

function keyboardRounds(): Array<{
  id: string;
  prompt: Extract<PromptSpec, { kind: "keyboard" }>;
}> {
  return lesson47Pool
    .filter(isKeyboardRound)
    .map((round) => ({ id: round.id, prompt: round.prompt }));
}

function textRounds(): Array<{ id: string; prompt: Extract<PromptSpec, { kind: "text" }> }> {
  return lesson47Pool
    .filter((round): round is Round & { prompt: Extract<PromptSpec, { kind: "text" }> } =>
      round.prompt.kind === "text",
    )
    .map((round) => ({ id: round.id, prompt: round.prompt }));
}

function allRules(): string[] {
  return lesson47Pool.map((round) => round.rule);
}

function roundById(id: string): Round {
  const found = lesson47Pool.find((round) => round.id === id);
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
 * The core's inversion oracle checks every chord round: same letters as the
 * root-position seventh chord, same pitch classes, ascending written order,
 * bass identified by which chord tone it is, and the pool's answer matching
 * that identification.
 */
function expectInversionContract(
  id: string,
  noteNames: string[],
  expected: { root: string; quality: SeventhQuality; inversions: number; siteVoicing?: string[] },
): void {
  const notes: Note[] = noteNames.map((name) => parseNote(name));
  if (expected.siteVoicing !== undefined) {
    expect(noteNames, `round ${id} vs site voicing`).toEqual(expected.siteVoicing);
  }

  // Rotation-invariant spelling check against buildSeventh.
  const spelled = buildSeventh(parseNote(expected.root), expected.quality);
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

  // The core names the inversion from root + bass letter; its answer must
  // match the inversion count the round was built with (4 lands back on root
  // position, exactly where the site's worked example ends).
  expect(
    CORE_INVERSION_LABEL[identifyInversion(parseNote(expected.root), notes)],
    `round ${id} core inversion`,
  ).toBe(POSITION_LABEL[expected.inversions % 4]);
  expect(bassNote(notes), `round ${id} bass`).toEqual(notes[0]);

  // Position rounds answer with the inversion name; tone rounds with the bass tone.
  const answer = answerOf(id);
  if (answer.startsWith("The ")) {
    expect(answer, `round ${id} bass-tone answer`).toBe(TONE_LABEL[expected.inversions % 4]);
  } else {
    expect(answer, `round ${id} position answer`).toBe(POSITION_LABEL[expected.inversions % 4]);
  }
}

const cleanups: Array<() => void> = [];

afterEach(() => {
  while (cleanups.length > 0) cleanups.pop()?.();
  document.body.replaceChildren();
});

describe("lesson 47 question pool", () => {
  it("holds 28 rounds: 12 staff, 12 text, 4 keyboard, all ids unique", () => {
    expect(lesson47Pool).toHaveLength(28);
    expect(staffRounds()).toHaveLength(12);
    expect(textRounds()).toHaveLength(12);
    expect(keyboardRounds()).toHaveLength(4);
    const ids = lesson47Pool.map((round) => round.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("validates every pool round", () => {
    for (const round of lesson47Pool) {
      expect(() => validateRound(round)).not.toThrow();
    }
  });

  it("draws at least 12 rounds and every drawn round passes validateRound", () => {
    const rounds = lesson47.generateRounds(createRng(1234));
    expect(rounds.length).toBeGreaterThanOrEqual(12);
    for (const round of rounds) {
      expect(() => validateRound(round)).not.toThrow();
    }
    const ids = rounds.map((round) => round.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("produces identical rounds for the same seed", () => {
    const first = lesson47.generateRounds(createRng(42));
    const second = lesson47.generateRounds(createRng(42));
    expect(second).toEqual(first);
  });

  it("produces different rounds for two different seeds", () => {
    const first = lesson47.generateRounds(createRng(1));
    const second = lesson47.generateRounds(createRng(2));
    expect(JSON.stringify(second)).not.toBe(JSON.stringify(first));
  });

  it("draws at least one staff and one text round for every seed tried", () => {
    for (const seed of GUARANTEED_SEEDS) {
      const kinds = new Set(lesson47.generateRounds(createRng(seed)).map((r) => r.prompt.kind));
      expect(kinds.has("staff"), `seed ${seed} drew no staff round`).toBe(true);
      expect(kinds.has("text"), `seed ${seed} drew no text round`).toBe(true);
    }
  });

  it("draws keyboard rounds for some seeds, so they are live in the pool", () => {
    const kinds = new Set(
      GUARANTEED_SEEDS.flatMap((seed) =>
        lesson47.generateRounds(createRng(seed)).map((r) => r.prompt.kind),
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

  it("shows every staff round as the right seventh chord in the right inversion", () => {
    for (const { id, prompt } of staffRounds()) {
      const expected = CHORD_ROUNDS[id];
      expect(expected, `staff round ${id} has no expectation`).toBeDefined();
      expectInversionContract(id, prompt.notes, expected);
    }
  });

  it("lights every keyboard round as the right seventh chord in the right inversion", () => {
    for (const { id, prompt } of keyboardRounds()) {
      const expected = CHORD_ROUNDS[id];
      expect(expected, `keyboard round ${id} has no expectation`).toBeDefined();
      expectInversionContract(id, prompt.highlight, expected);
    }
  });

  it("pins the site's inversion definitions in the text rounds", () => {
    expect(answerOf("l47-text-invert-method")).toBe(
      "By moving the lowest note up an octave",
    );
    expect(answerOf("l47-text-root-bass")).toBe("The root");
    expect(answerOf("l47-text-first-bass")).toBe("The third");
    expect(answerOf("l47-text-second-bass")).toBe("The fifth");
    expect(answerOf("l47-text-third-bass")).toBe("The seventh");
    expect(answerOf("l47-text-third-name")).toBe("Third inversion");
    expect(answerOf("l47-text-second-name")).toBe("Second inversion");
    expect(answerOf("l47-text-first-name")).toBe("First inversion");
    expect(answerOf("l47-text-count")).toBe(
      "Four: root position, first, second, and third inversion",
    );
    expect(answerOf("l47-text-return")).toBe("It returns to root position");
    expect(answerOf("l47-text-like")).toBe("Like triads");
    expect(answerOf("l47-text-worked")).toBe("C major seventh");
  });

  it("states the site's inversion facts in every rule", () => {
    for (const rule of allRules()) {
      expect(rule).not.toMatch(GENERIC_RULE);
    }
    const rules = allRules().join(" \n ");
    expect(rules).toMatch(/moving the lowest note up an octave/);
    expect(rules).toMatch(/root is the lowest \(bass\) note/);
    expect(rules).toMatch(/third is the lowest note/);
    expect(rules).toMatch(/fifth is the lowest note/);
    expect(rules).toMatch(/seventh is the lowest note/);
    expect(rules).toMatch(/third inversion/);
    expect(rules).toMatch(/returns to root position/);
    expect(rules).toMatch(/Like triads/);
    expect(rules).toMatch(/four (chord )?tones can be the bass/);
  });
});

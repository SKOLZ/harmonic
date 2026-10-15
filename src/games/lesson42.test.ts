import { afterEach, describe, expect, it } from "vitest";
import { render } from "solid-js/web";
import { validateRound } from "../lib/rounds/validate";
import type { PromptSpec, Round } from "../lib/rounds/types";
import KeyboardPrompt from "../components/prompts/KeyboardPrompt";
import StaffPrompt from "../components/prompts/StaffPrompt";
import {
  bassNote,
  buildTriad,
  identifyInversion,
  parseNote,
  semitoneIndex,
  type Note,
  type TriadQuality,
} from "../lib/theory";
import { createRng } from "./rng";
import { lesson42, lesson42Pool } from "./lesson42";

const GENERIC_RULE = /^(correct|incorrect|wrong|that'?s right)/i;

/** Every draw, for many seeds, must carry both structurally required kinds. */
const GUARANTEED_SEEDS = Array.from({ length: 100 }, (_, index) => index + 1);

const INVERSION_LABEL: Record<"rootPosition" | "first" | "second" | "third", string> = {
  rootPosition: "Root position",
  first: "First inversion",
  second: "Second inversion",
  third: "Third inversion",
};

/**
 * Every round that shows chord tones: which triad, in which inversion. The
 * site's worked example is C major — its sounds data in `lesson42.js` walks
 * C–E–G (midi 60-64-67) → E–G–C (64-67-72) → G–C–E (67-72-76) → C–E–G one
 * octave up (72-76-79), and those four voicings are pinned literally below;
 * the other roots generalize the same rule to the triads lesson 40 spelled.
 */
const CHORD_ROUNDS: Record<
  string,
  { root: string; quality: TriadQuality; inversions: number; siteVoicing?: string[] }
> = {
  // --- the site's worked C major chain --------------------------------------
  "l42-staff-c-major-root": {
    root: "C4",
    quality: "major",
    inversions: 0,
    siteVoicing: ["C4", "E4", "G4"],
  },
  "l42-staff-c-major-first": {
    root: "C4",
    quality: "major",
    inversions: 1,
    siteVoicing: ["E4", "G4", "C5"],
  },
  "l42-staff-c-major-second": {
    root: "C4",
    quality: "major",
    inversions: 2,
    siteVoicing: ["G4", "C5", "E5"],
  },
  "l42-staff-c-major-returned": {
    root: "C4",
    quality: "major",
    inversions: 3,
    siteVoicing: ["C5", "E5", "G5"],
  },
  "l42-keyboard-c-major-root": {
    root: "C4",
    quality: "major",
    inversions: 0,
    siteVoicing: ["C4", "E4", "G4"],
  },
  "l42-keyboard-c-major-first": {
    root: "C4",
    quality: "major",
    inversions: 1,
    siteVoicing: ["E4", "G4", "C5"],
  },
  "l42-keyboard-c-major-second": {
    root: "C4",
    quality: "major",
    inversions: 2,
    siteVoicing: ["G4", "C5", "E5"],
  },
  // --- generalized to the triads lesson 40 taught ---------------------------
  "l42-staff-eb-major-second": { root: "Eb4", quality: "major", inversions: 2 },
  "l42-staff-b-minor-first": { root: "B3", quality: "minor", inversions: 1 },
  "l42-staff-eb-major-root": { root: "Eb4", quality: "major", inversions: 0 },
  "l42-staff-c-minor-second": { root: "C4", quality: "minor", inversions: 2 },
  "l42-staff-b-major-first": { root: "B3", quality: "major", inversions: 1 },
  "l42-staff-c-major-first-bass": { root: "C3", quality: "major", inversions: 1 },
  "l42-staff-b-diminished-root": { root: "B4", quality: "diminished", inversions: 0 },
  "l42-staff-c-major-second-bass": { root: "C3", quality: "major", inversions: 2 },
  "l42-keyboard-eb-major-first": { root: "Eb4", quality: "major", inversions: 1 },
};

/** What the site's labels call the bass tone of each inversion. */
const BASS_TONE_LABEL = ["The root", "The third", "The fifth"];

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
  return lesson42Pool.filter(isStaffRound).map((round) => ({ id: round.id, prompt: round.prompt }));
}

function keyboardRounds(): Array<{
  id: string;
  prompt: Extract<PromptSpec, { kind: "keyboard" }>;
}> {
  return lesson42Pool
    .filter(isKeyboardRound)
    .map((round) => ({ id: round.id, prompt: round.prompt }));
}

function allRules(): string[] {
  return lesson42Pool.map((round) => round.rule);
}

function roundById(id: string): Round {
  const found = lesson42Pool.find((round) => round.id === id);
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
 * root-position triad, ascending written order, bass identified by which
 * chord tone it is, and the pool's answer matching that identification.
 */
function expectInversionContract(
  id: string,
  noteNames: string[],
  expected: { root: string; quality: TriadQuality; inversions: number; siteVoicing?: string[] },
): void {
  const notes: Note[] = noteNames.map((name) => parseNote(name));
  if (expected.siteVoicing !== undefined) {
    expect(noteNames, `round ${id} vs site voicing`).toEqual(expected.siteVoicing);
  }

  // Rotation-invariant spelling check against buildTriad.
  const spelled = new Set(
    buildTriad(parseNote(expected.root), expected.quality).map(
      (note) => `${note.letter}${note.accidental}`,
    ),
  );
  const shown = new Set(notes.map((note) => `${note.letter}${note.accidental}`));
  expect([...shown].sort(), `round ${id} vs buildTriad tones`).toEqual(
    [...spelled].sort(),
  );

  // Written ascending, so notes[0] really is the bass.
  for (let index = 1; index < notes.length; index += 1) {
    expect(semitoneIndex(notes[index]!), `round ${id} not ascending at ${index}`).toBeGreaterThan(
      semitoneIndex(notes[index - 1]!),
    );
  }

  // The core names the inversion from root + bass letter; its answer must
  // match the inversion count the round was built with (3 lands back on root
  // position, exactly where the site's worked example ends).
  const expectedPositionLabel =
    expected.inversions % 3 === 0
      ? "Root position"
      : expected.inversions % 3 === 1
        ? "First inversion"
        : "Second inversion";
  expect(INVERSION_LABEL[identifyInversion(parseNote(expected.root), notes)], `round ${id} core inversion`).toBe(
    expectedPositionLabel,
  );
  expect(bassNote(notes), `round ${id} bass`).toEqual(notes[0]);

  // Position rounds answer with the inversion name; tone rounds with the bass tone.
  const answer = answerOf(id);
  if (answer.startsWith("The ")) {
    expect(answer, `round ${id} bass-tone answer`).toBe(BASS_TONE_LABEL[expected.inversions % 3]);
  } else {
    expect(answer, `round ${id} position answer`).toBe(expectedPositionLabel);
  }
}

const cleanups: Array<() => void> = [];

afterEach(() => {
  while (cleanups.length > 0) cleanups.pop()?.();
  document.body.replaceChildren();
});

describe("lesson 42 question pool", () => {
  it("holds 28 rounds: 12 staff, 12 text, 4 keyboard, all ids unique", () => {
    expect(lesson42Pool).toHaveLength(28);
    expect(staffRounds()).toHaveLength(12);
    expect(lesson42Pool.filter((round) => round.prompt.kind === "text")).toHaveLength(12);
    expect(keyboardRounds()).toHaveLength(4);
    const ids = lesson42Pool.map((round) => round.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("validates every pool round", () => {
    for (const round of lesson42Pool) {
      expect(() => validateRound(round)).not.toThrow();
    }
  });

  it("draws at least 12 rounds and every drawn round passes validateRound", () => {
    const rounds = lesson42.generateRounds(createRng(1234));
    expect(rounds.length).toBeGreaterThanOrEqual(12);
    for (const round of rounds) {
      expect(() => validateRound(round)).not.toThrow();
    }
    const ids = rounds.map((round) => round.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("produces identical rounds for the same seed", () => {
    const first = lesson42.generateRounds(createRng(42));
    const second = lesson42.generateRounds(createRng(42));
    expect(second).toEqual(first);
  });

  it("produces different rounds for two different seeds", () => {
    const first = lesson42.generateRounds(createRng(1));
    const second = lesson42.generateRounds(createRng(2));
    expect(JSON.stringify(second)).not.toBe(JSON.stringify(first));
  });

  it("draws at least one staff and one text round for every seed tried", () => {
    for (const seed of GUARANTEED_SEEDS) {
      const kinds = new Set(lesson42.generateRounds(createRng(seed)).map((r) => r.prompt.kind));
      expect(kinds.has("staff"), `seed ${seed} drew no staff round`).toBe(true);
      expect(kinds.has("text"), `seed ${seed} drew no text round`).toBe(true);
    }
  });

  it("draws keyboard rounds for some seeds, so they are live in the pool", () => {
    const kinds = new Set(
      GUARANTEED_SEEDS.flatMap((seed) =>
        lesson42.generateRounds(createRng(seed)).map((r) => r.prompt.kind),
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

  it("shows every staff round as the right triad in the right inversion", () => {
    for (const { id, prompt } of staffRounds()) {
      const expected = CHORD_ROUNDS[id];
      expect(expected, `staff round ${id} has no expectation`).toBeDefined();
      expectInversionContract(id, prompt.notes, expected);
    }
  });

  it("lights every keyboard round as the right triad in the right inversion", () => {
    for (const { id, prompt } of keyboardRounds()) {
      const expected = CHORD_ROUNDS[id];
      expect(expected, `keyboard round ${id} has no expectation`).toBeDefined();
      expectInversionContract(id, prompt.highlight, expected);
    }
  });

  it("pins the site's inversion definitions in the text rounds", () => {
    expect(answerOf("l42-text-invert-definition")).toBe(
      "By moving the lowest note up an octave",
    );
    expect(answerOf("l42-text-name-determiner")).toBe(
      "The lowest note, called the bass note",
    );
    expect(answerOf("l42-text-bass-name")).toBe("The bass note");
    expect(answerOf("l42-text-root-position")).toBe("The root");
    expect(answerOf("l42-text-first-inversion")).toBe("The third");
    expect(answerOf("l42-text-second-inversion")).toBe("The fifth");
    expect(answerOf("l42-text-first-name")).toBe("First inversion");
    expect(answerOf("l42-text-second-name")).toBe("Second inversion");
    expect(answerOf("l42-text-return")).toBe("Root position");
    expect(answerOf("l42-text-inversions-of-a-triad")).toBe(
      "First inversion and second inversion",
    );
    expect(answerOf("l42-text-same-notes")).toBe(
      "The same three notes, with the lowest moved up an octave",
    );
    expect(answerOf("l42-text-worked-example")).toBe("C major");
  });

  it("states the site's inversion facts in every rule", () => {
    for (const rule of allRules()) {
      expect(rule).not.toMatch(GENERIC_RULE);
    }
    const rules = allRules().join(" \n ");
    expect(rules).toMatch(/moving the lowest note up an octave/);
    expect(rules).toMatch(/bass note determines/i);
    expect(rules).toMatch(/lowest note is the root/);
    expect(rules).toMatch(/bass note is( now)? the third/);
    expect(rules).toMatch(/fifth is( now)? (the )?(lowest note)/);
    expect(rules).toMatch(/returns to root position/);
    expect(rules).toMatch(/first inversion/);
    expect(rules).toMatch(/second inversion/);
  });
});

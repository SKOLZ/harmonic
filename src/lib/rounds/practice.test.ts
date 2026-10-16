import { describe, expect, it } from "vitest";
import { keyboardLayout } from "../keyboard/layout";
import {
  PRACTICE_END_NOTE,
  PRACTICE_NOTES,
  PRACTICE_START_NOTE,
  drawPracticeRound,
} from "./practice";
import type { Round } from "./types";
import { validateRound } from "./validate";

/**
 * T4's endless mode draws every question from this pool. The three properties
 * that keep a long run interesting — breadth, one clef per register, and no
 * immediate pitch repeat — are pinned here rather than in the shell, so the
 * shell tests can inject a scripted draw and never depend on a random draw.
 */

/** A deterministic stand-in for Math.random: cycles a fixed value list. */
function sequenceRng(values: number[]): () => number {
  let index = 0;
  return () => {
    const value = values[index % values.length] ?? 0;
    index += 1;
    return value;
  };
}

/** A deterministic stand-in for Math.random: linear congruential, in [0, 1). */
function lcg(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state / 2 ** 32;
  };
}

function pitchOf(round: Round): string {
  if (round.prompt.kind !== "staff") {
    throw new Error(`expected a staff prompt, got kind "${round.prompt.kind}"`);
  }
  return round.prompt.notes[0]!;
}

describe("practice note pool", () => {
  it("is exactly the keyboard the learner answers on, sharps included", () => {
    const keyboard = keyboardLayout({
      startNote: PRACTICE_START_NOTE,
      endNote: PRACTICE_END_NOTE,
    });
    expect(PRACTICE_NOTES.map((note) => note.pitch)).toEqual(
      keyboard.map((key) => key.noteName),
    );
  });

  it("is broader than the app's default two-octave keyboard", () => {
    // The default keyboard is C4–C6 (25 keys). Practising only that range would
    // lock the mode to one clef, so the pool deliberately reaches lower.
    expect(PRACTICE_NOTES.length).toBeGreaterThan(keyboardLayout().length);
    expect(PRACTICE_NOTES.length).toBeGreaterThanOrEqual(30);
  });

  it("covers both clefs: bass below middle C, treble at or above it", () => {
    expect(new Set(PRACTICE_NOTES.map((note) => note.clef))).toEqual(
      new Set(["bass", "treble"]),
    );
    for (const note of PRACTICE_NOTES) {
      const octave = Number(note.pitch.slice(-1));
      expect(note.clef, note.pitch).toBe(octave <= 3 ? "bass" : "treble");
    }
  });

  it("draws one staff note answered by picking that same pitch on the keyboard", () => {
    for (let index = 0; index < PRACTICE_NOTES.length; index += 1) {
      const expected = PRACTICE_NOTES[index]!;
      const round = drawPracticeRound(undefined, () => index / PRACTICE_NOTES.length);
      expect(() => validateRound(round)).not.toThrow();
      expect(round.prompt).toEqual({
        kind: "staff",
        clef: expected.clef,
        notes: [expected.pitch],
      });
      expect(round.answer).toEqual({ kind: "notePick", correctNotes: [expected.pitch] });
      expect(round.rule.trim()).not.toBe("");
    }
  });

  it("never repeats the pitch that is already on screen", () => {
    // The adversarial case: an rng that always returns 0 would re-draw pool[0]
    // every time if the previous pitch were not filtered out first.
    for (const rng of [() => 0, sequenceRng([0.99, 0.5, 0.01])]) {
      let previous: string | undefined;
      for (let i = 0; i < 100; i += 1) {
        const round = drawPracticeRound(previous, rng);
        const pitch = pitchOf(round);
        expect(pitch).not.toBe(previous);
        previous = pitch;
      }
    }
  });

  it("is deterministic for a fixed rng sequence", () => {
    const values = [0.1, 0.7, 0.3, 0.9, 0.5, 0.2];
    const collect = (): string[] => {
      const rng = sequenceRng(values);
      let previous: string | undefined;
      const pitches: string[] = [];
      for (let i = 0; i < 8; i += 1) {
        const round = drawPracticeRound(previous, rng);
        previous = pitchOf(round);
        pitches.push(previous);
      }
      return pitches;
    };
    expect(collect()).toEqual(collect());
  });

  it("stays varied across a long run", () => {
    const rng = lcg(12_345);
    let previous: string | undefined;
    const seen = new Set<string>();
    for (let i = 0; i < 200; i += 1) {
      const round = drawPracticeRound(previous, rng);
      previous = pitchOf(round);
      seen.add(previous);
    }
    expect(seen.size).toBeGreaterThanOrEqual(20);
  });

  it("teaches the note's place on the staff in the rule", () => {
    const draw = (pitch: string): string => {
      const index = PRACTICE_NOTES.findIndex((note) => note.pitch === pitch);
      return drawPracticeRound(undefined, () => index / PRACTICE_NOTES.length).rule;
    };
    // G4 is the treble G line — the second line from the bottom.
    expect(draw("G4")).toMatch(/2nd line/);
    // The treble spaces spell F A C E, so F4 is the first space.
    expect(draw("F4")).toMatch(/1st space/);
    // C4 sits below the treble staff on a ledger line.
    expect(draw("C4")).toMatch(/ledger/);
    // Sharps keep the natural's position and say how the key relates to it.
    expect(draw("F#4")).toMatch(/sharp/i);
  });
});

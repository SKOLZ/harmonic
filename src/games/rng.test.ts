import { describe, expect, it } from "vitest";
import type { Round } from "../lib/rounds/types";
import { createRng, sampleRounds } from "./rng";

function round(id: string): Round {
  return {
    id,
    prompt: { kind: "text", text: `Question ${id}?` },
    answer: { kind: "choices", options: [id, `not ${id}`], correctIndex: 0 },
    rule: `The answer is ${id}, which is a fact about this placeholder round.`,
  };
}

const pool: readonly Round[] = ["a", "b", "c", "d", "e", "f"].map(round);

describe("createRng", () => {
  it("returns values inside [0, 1)", () => {
    const rng = createRng(7);
    for (let i = 0; i < 1000; i += 1) {
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("is reproducible for a given seed (mulberry32, seed 42)", () => {
    const expected = [
      0.6011037519201636, 0.44829055899754167, 0.8524657934904099,
      0.6697340414393693, 0.17481389874592423,
    ];
    const first = createRng(42);
    const second = createRng(42);
    expect([0, 1, 2, 3, 4].map(() => first())).toEqual(expected);
    expect([0, 1, 2, 3, 4].map(() => second())).toEqual(expected);
  });

  it("produces different sequences for different seeds", () => {
    const a = createRng(1);
    const b = createRng(2);
    const sequenceA = [0, 1, 2, 3, 4].map(() => a());
    const sequenceB = [0, 1, 2, 3, 4].map(() => b());
    expect(sequenceA).not.toEqual(sequenceB);
  });

  it("coerces the seed to an unsigned 32-bit integer", () => {
    // Documented behaviour: createRng(-1) is createRng(2 ** 32 - 1), so no
    // seed can escape the generator's unsigned 32-bit state space.
    const negative = createRng(-1);
    const unsigned = createRng(2 ** 32 - 1);
    expect([0, 1, 2].map(() => negative())).toEqual(
      [0, 1, 2].map(() => unsigned()),
    );
    const oversized = createRng(2 ** 32 + 7);
    const wrapped = createRng(7);
    expect([0, 1, 2].map(() => oversized())).toEqual(
      [0, 1, 2].map(() => wrapped()),
    );
  });
});

describe("sampleRounds", () => {
  it("draws exactly the requested count without repeating a round", () => {
    const drawn = sampleRounds(pool, createRng(5), 4);
    expect(drawn).toHaveLength(4);
    const ids = drawn.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => pool.some((item) => item.id === id))).toBe(true);
  });

  it("replays the same draw for the same seed and varies for another seed", () => {
    const sameA = sampleRounds(pool, createRng(9), 4);
    const sameB = sampleRounds(pool, createRng(9), 4);
    const other = sampleRounds(pool, createRng(10), 4);
    expect(sameA).toEqual(sameB);
    expect(other).not.toEqual(sameA);
  });

  it("validates the drawn rounds before returning them", () => {
    const broken: Round = {
      ...round("broken"),
      answer: { kind: "choices", options: ["dup", "dup"], correctIndex: 0 },
    };
    expect(() => sampleRounds([...pool, broken], createRng(3), 4)).toThrow(
      /duplicate option/,
    );
  });

  it("refuses to claim more rounds than the pool holds", () => {
    expect(() => sampleRounds(pool, createRng(3), 7)).toThrow(/pool/i);
  });
});

import { describe, expect, it } from "vitest";
import type { Round } from "./types";
import { drawRun } from "./draw";

function choiceRound(id: string): Round {
  return {
    id,
    prompt: { kind: "text", text: `Question ${id}?` },
    answer: { kind: "choices", options: ["A", "B"], correctIndex: 0 },
    rule: `Rule for ${id}.`,
  };
}

function pool(n: number): Round[] {
  return Array.from({ length: n }, (_, i) => choiceRound(`r${i}`));
}

/** A deterministic rng walking a fixed sequence of values, cycling when exhausted. */
function scriptedRng(...values: number[]): () => number {
  let index = 0;
  return () => {
    const value = values[index % values.length] ?? 0;
    index += 1;
    return value;
  };
}

describe("drawRun", () => {
  it("plays a pool that already fits the run as generated, order included", () => {
    const rounds = pool(4);
    expect(drawRun(rounds, 10)).toEqual(rounds);
  });

  it("returns a copy, never the caller's array", () => {
    const rounds = pool(4);
    const drawn = drawRun(rounds, 10);
    expect(drawn).toEqual(rounds);
    expect(drawn).not.toBe(rounds);
  });

  it("draws exactly `count` rounds from a larger pool", () => {
    expect(drawRun(pool(12), 10, scriptedRng(0.5))).toHaveLength(10);
  });

  it("keeps every drawn round a member of the pool, with no duplicates", () => {
    const rounds = pool(12);
    const drawn = drawRun(rounds, 10, scriptedRng(0.1, 0.9, 0.4, 0.7));
    const ids = drawn.map((round) => round.id);
    expect(new Set(ids).size).toBe(10);
    for (const id of ids) {
      expect(rounds.some((round) => round.id === id)).toBe(true);
    }
  });

  it("drops exactly the rounds left out of the run", () => {
    const rounds = pool(12);
    const drawn = drawRun(rounds, 10, scriptedRng(0));
    const kept = new Set(drawn.map((round) => round.id));
    expect(rounds.filter((round) => !kept.has(round.id))).toHaveLength(2);
  });

  it("shuffles while selecting, so the draw is not the pool prefix in order", () => {
    const rounds = pool(12);
    // rng() = 0 makes Fisher–Yates swap every element with the head of the
    // deck: a maximally shuffled run that cannot equal rounds.slice(0, 10).
    const drawn = drawRun(rounds, 10, scriptedRng(0));
    expect(drawn.map((round) => round.id)).not.toEqual(
      rounds.slice(0, 10).map((round) => round.id),
    );
  });

  it("a different rng draws a different run", () => {
    const rounds = pool(12);
    const first = drawRun(rounds, 10, scriptedRng(0)).map((round) => round.id);
    const second = drawRun(rounds, 10, scriptedRng(0.9, 0.8, 0.7, 0.6, 0.5, 0.4)).map(
      (round) => round.id,
    );
    expect(first).not.toEqual(second);
  });
});

import { describe, expect, it } from "vitest";
import { validateRounds } from "../lib/rounds/validate";
import type { PromptSpec, Round } from "../lib/rounds/types";
import { createRng, sampleRounds, sampleStratifiedRounds } from "./rng";

/**
 * `sampleStratifiedRounds` exists because plain `sampleRounds` only mixes two
 * prompt kinds by pigeonhole while every *other* kind together stays smaller
 * than the draw: 11 staff + 11 text makes every 12-draw contain both, but the
 * moment a keyboard round joins the pool a legal draw of 11 staff + 1 keyboard
 * exists with no text round at all. The pool below is weighted so that
 * failure happens for plain sampling on roughly one seed in five, which makes
 * the difference observable in a test instead of theoretical.
 */

const makeRound = (id: string, kind: PromptSpec["kind"]): Round => ({
  id,
  prompt:
    kind === "staff"
      ? { kind: "staff", clef: "treble", notes: ["C4"], duration: "q" }
      : kind === "keyboard"
        ? { kind: "keyboard", highlight: ["C4"] }
        : { kind: "text", text: `Question for ${id}` },
  answer: { kind: "choices", options: ["Yes", "No"], correctIndex: 0 },
  rule: "A triad stacks a third and a fifth above its root.",
});

/** 12 staff + 2 text + 8 keyboard: plain 12-draws lose the text kind often. */
const weightedPool = (): Round[] => [
  ...Array.from({ length: 12 }, (_, index) => makeRound(`staff-${index}`, "staff")),
  ...Array.from({ length: 2 }, (_, index) => makeRound(`text-${index}`, "text")),
  ...Array.from({ length: 8 }, (_, index) => makeRound(`keyboard-${index}`, "keyboard")),
];

describe("sampleStratifiedRounds", () => {
  it("keeps both required kinds in every draw where a plain draw loses one", () => {
    const pool = weightedPool();
    let plainLostText = 0;
    for (let seed = 1; seed <= 100; seed += 1) {
      const plain = sampleRounds(pool, createRng(seed), 12);
      if (!plain.some((round) => round.prompt.kind === "text")) {
        plainLostText += 1;
      }

      const stratified = sampleStratifiedRounds(pool, ["staff", "text"], createRng(seed), 12);
      const kinds = new Set(stratified.map((round) => round.prompt.kind));
      expect(kinds.has("staff"), `seed ${seed} drew no staff round`).toBe(true);
      expect(kinds.has("text"), `seed ${seed} drew no text round`).toBe(true);
      validateRounds(stratified);
      expect(new Set(stratified.map((round) => round.id)).size).toBe(stratified.length);
    }
    // The counterexample is observed, not just asserted: plain sampling really
    // can hand back a 12-draw without a text round from this pool.
    expect(plainLostText).toBeGreaterThan(0);
  });

  it("draws keyboard rounds too, since the fill comes from the whole pool", () => {
    const kinds = new Set(
      Array.from({ length: 100 }, (_, index) => index + 1).flatMap((seed) =>
        sampleStratifiedRounds(weightedPool(), ["staff", "text"], createRng(seed), 12).map(
          (round) => round.prompt.kind,
        ),
      ),
    );
    expect(kinds.has("keyboard")).toBe(true);
  });

  it("returns exactly count rounds, all valid and distinct", () => {
    for (const seed of [0, 7, 20261015]) {
      const drawn = sampleStratifiedRounds(weightedPool(), ["staff", "text"], createRng(seed), 12);
      expect(drawn).toHaveLength(12);
      validateRounds(drawn);
      expect(new Set(drawn.map((round) => round.id)).size).toBe(12);
    }
  });

  it("produces identical rounds for the same seed", () => {
    const first = sampleStratifiedRounds(weightedPool(), ["staff", "text"], createRng(42), 12);
    const second = sampleStratifiedRounds(weightedPool(), ["staff", "text"], createRng(42), 12);
    expect(second).toEqual(first);
  });

  it("produces different rounds for two different seeds", () => {
    const first = sampleStratifiedRounds(weightedPool(), ["staff", "text"], createRng(1), 12);
    const second = sampleStratifiedRounds(weightedPool(), ["staff", "text"], createRng(2), 12);
    expect(JSON.stringify(second)).not.toBe(JSON.stringify(first));
  });

  it("mixes kinds even when only two kinds exist at all", () => {
    const pool = [
      ...Array.from({ length: 11 }, (_, index) => makeRound(`staff-${index}`, "staff")),
      ...Array.from({ length: 11 }, (_, index) => makeRound(`text-${index}`, "text")),
    ];
    for (const seed of [1, 42, 99]) {
      const drawn = sampleStratifiedRounds(pool, ["staff", "text"], createRng(seed), 12);
      const kinds = new Set(drawn.map((round) => round.prompt.kind));
      expect(kinds.has("staff")).toBe(true);
      expect(kinds.has("text")).toBe(true);
    }
  });

  it("throws when the pool cannot supply a required kind", () => {
    const staffOnly = Array.from({ length: 12 }, (_, index) =>
      makeRound(`staff-${index}`, "staff"),
    );
    expect(() =>
      sampleStratifiedRounds(staffOnly, ["staff", "text"], createRng(1), 12),
    ).toThrow(/no "text" round/);
  });

  it("throws when the draw cannot cover the required kinds or the pool", () => {
    const pool = weightedPool();
    expect(() => sampleStratifiedRounds(pool, ["staff", "text", "audio"], createRng(1), 2)).toThrow(
      /cannot guarantee 3 kinds/,
    );
    expect(() => sampleStratifiedRounds(pool, ["staff"], createRng(1), 999)).toThrow(
      /cannot draw 999 rounds from a pool of 22/,
    );
  });
});

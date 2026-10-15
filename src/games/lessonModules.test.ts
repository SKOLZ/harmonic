import { describe, expect, it } from "vitest";
import { catalog } from "./catalog";
import { getLessonModule, registeredLessonIds } from "./registry";
import { createRng } from "./rng";
import { validateRound } from "../lib/rounds/validate";

/**
 * The generator contract every lesson module must satisfy (Part B):
 * at least 12 rounds per draw, every round valid under `validateRound`,
 * deterministic replay for a fixed seed, and a different draw for a
 * different seed. Iterating the registry keeps future modules covered
 * without editing this file.
 */
describe("lesson generator contract", () => {
  it("registers at least the first two lessons", () => {
    expect(registeredLessonIds()).toEqual(expect.arrayContaining([10, 11]));
  });

  for (const id of registeredLessonIds()) {
    describe(`lesson ${id}`, () => {
      it("carries its catalog entry verbatim", () => {
        const entry = catalog.find((item) => item.id === id);
        expect(entry).toBeDefined();
        expect(getLessonModule(id).entry).toEqual(entry);
      });

      it("draws at least 12 rounds and every round passes validateRound", () => {
        const rounds = getLessonModule(id).generateRounds(createRng(1234));
        expect(rounds.length).toBeGreaterThanOrEqual(12);
        for (const round of rounds) {
          expect(() => validateRound(round)).not.toThrow();
        }
        const ids = rounds.map((round) => round.id);
        expect(new Set(ids).size).toBe(ids.length);
      });

      it("produces identical rounds for the same seed", () => {
        const first = getLessonModule(id).generateRounds(createRng(42));
        const second = getLessonModule(id).generateRounds(createRng(42));
        expect(second).toEqual(first);
      });

      it("produces different rounds for two different seeds", () => {
        const first = getLessonModule(id).generateRounds(createRng(1));
        const second = getLessonModule(id).generateRounds(createRng(2));
        expect(JSON.stringify(second)).not.toBe(JSON.stringify(first));
      });

      it("stays valid for awkward seeds (zero, negative, oversized)", () => {
        for (const seed of [0, -12345, 2 ** 32 + 99]) {
          const rounds = getLessonModule(id).generateRounds(createRng(seed));
          expect(rounds.length).toBeGreaterThanOrEqual(12);
          for (const round of rounds) {
            expect(() => validateRound(round)).not.toThrow();
          }
        }
      });
    });
  }
});

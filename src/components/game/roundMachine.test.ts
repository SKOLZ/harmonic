import { describe, expect, it } from "vitest";
import { UNLOCK_THRESHOLD } from "../../lib/progress/store";
import type { Round } from "../../lib/rounds/types";
import { advance, expectedAnswerLabel, isUnlocked, retry, start, submit } from "./roundMachine";

function choiceRound(id: string, correctIndex = 1): Round {
  return {
    id,
    prompt: { kind: "text", text: `Question ${id}?` },
    answer: { kind: "choices", options: ["C", "D", "E"], correctIndex },
    rule: "D sits a step above C.",
  };
}

function manyRounds(n: number): Round[] {
  return Array.from({ length: n }, (_, i) => choiceRound(`r${i}`));
}

/** Answer correctly on the current round and advance, n times. */
function playCorrect(state: ReturnType<typeof start>, rounds: Round[], n: number) {
  let s = state;
  for (let i = 0; i < n; i += 1) {
    s = submit(s, rounds[s.roundIndex].answer.kind === "choices" ? 1 : -1, rounds[s.roundIndex]);
    s = advance(s, rounds.length);
  }
  return s;
}

describe("roundMachine", () => {
  describe("start", () => {
    it("returns the initial state", () => {
      const state = start(manyRounds(3));
      expect(state).toEqual({
        roundIndex: 0,
        phase: "answering",
        correctCount: 0,
        selected: null,
        wasCorrect: false,
        feedback: null,
      });
    });

    it("throws on an empty round list", () => {
      expect(() => start([])).toThrow(/must not be empty/);
    });
  });

  describe("submit", () => {
    it("a correct answer increments correctCount and reveals positive feedback", () => {
      const rounds = [choiceRound("r1", 2)];
      const state = submit(start(rounds), 2, rounds[0]);
      expect(state.correctCount).toBe(1);
      expect(state.phase).toBe("revealed");
      expect(state.wasCorrect).toBe(true);
      expect(state.selected).toBe(2);
      expect(state.feedback).toEqual({
        expected: "E",
        rule: "D sits a step above C.",
        correct: true,
      });
    });

    it("a wrong answer leaves correctCount unchanged and reveals the expected answer", () => {
      const rounds = [choiceRound("r1", 2)];
      const state = submit(start(rounds), 0, rounds[0]);
      expect(state.correctCount).toBe(0);
      expect(state.phase).toBe("revealed");
      expect(state.wasCorrect).toBe(false);
      expect(state.feedback).toEqual({
        expected: "E",
        rule: "D sits a step above C.",
        correct: false,
      });
    });

    it("feedback always carries expected and rule on both paths", () => {
      const rounds = [choiceRound("r1", 1)];
      for (const selected of [1, 0]) {
        const state = submit(start(rounds), selected, rounds[0]);
        expect(state.feedback?.expected).toBe("D");
        expect(state.feedback?.rule).toBe("D sits a step above C.");
      }
    });

    it("throws when not in the answering phase (no double counting)", () => {
      const rounds = [choiceRound("r1")];
      const revealed = submit(start(rounds), 1, rounds[0]);
      expect(() => submit(revealed, 1, rounds[0])).toThrow(/cannot submit while phase/);
      const advanced = advance(revealed, 1);
      expect(advanced.phase).toBe("complete");
    });
  });

  describe("retry", () => {
    it("keeps the counter and returns to answering after a wrong answer", () => {
      const rounds = [choiceRound("r1", 2), choiceRound("r2")];
      let state = submit(start(rounds), 0, rounds[0]); // wrong
      state = retry(state);
      expect(state.phase).toBe("answering");
      expect(state.correctCount).toBe(0);
      expect(state.feedback).toBeNull();
      expect(state.selected).toBeNull();
      // Retry without limit on the same round: a later correct answer still counts.
      state = submit(state, 2, rounds[0]);
      expect(state.correctCount).toBe(1);
    });

    it("throws after a correct answer (advance instead)", () => {
      const rounds = [choiceRound("r1")];
      const revealed = submit(start(rounds), 1, rounds[0]);
      expect(() => retry(revealed)).toThrow(/retry/);
    });
  });

  describe("advance", () => {
    it("throws after a wrong answer; the round does not advance", () => {
      const rounds = [choiceRound("r1", 2), choiceRound("r2")];
      const wrong = submit(start(rounds), 0, rounds[0]);
      expect(() => advance(wrong, rounds.length)).toThrow(/wrong answer/);
      expect(wrong.roundIndex).toBe(0);
      expect(wrong.correctCount).toBe(0);
    });

    it("throws when not revealed", () => {
      const rounds = [choiceRound("r1")];
      expect(() => advance(start(rounds), rounds.length)).toThrow(/cannot advance while phase/);
    });

    it("moves to the next round after a correct answer, preserving the counter", () => {
      const rounds = [choiceRound("r1"), choiceRound("r2")];
      let state = submit(start(rounds), 1, rounds[0]);
      state = advance(state, rounds.length);
      expect(state.roundIndex).toBe(1);
      expect(state.phase).toBe("answering");
      expect(state.correctCount).toBe(1);
      expect(state.feedback).toBeNull();
      expect(state.wasCorrect).toBe(false);
    });

    it("completes after the last round", () => {
      const rounds = [choiceRound("r1")];
      const revealed = submit(start(rounds), 1, rounds[0]);
      const done = advance(revealed, rounds.length);
      expect(done.phase).toBe("complete");
      expect(done.correctCount).toBe(1);
    });
  });

  describe("isUnlocked", () => {
    it("is false below the threshold and true at exactly the threshold", () => {
      expect(isUnlocked(UNLOCK_THRESHOLD - 1)).toBe(false);
      expect(isUnlocked(UNLOCK_THRESHOLD)).toBe(true);
    });

    it("exactly ten correct answers unlock", () => {
      const rounds = manyRounds(UNLOCK_THRESHOLD);
      const done = playCorrect(start(rounds), rounds, UNLOCK_THRESHOLD);
      expect(done.correctCount).toBe(UNLOCK_THRESHOLD);
      expect(isUnlocked(done.correctCount)).toBe(true);
    });

    it("wrong answers never contribute to unlocking", () => {
      const rounds = manyRounds(2);
      let state = start(rounds);
      for (let i = 0; i < 5; i += 1) {
        state = submit(state, 0, rounds[state.roundIndex]); // always wrong
        state = retry(state);
      }
      expect(state.correctCount).toBe(0);
      expect(isUnlocked(state.correctCount)).toBe(false);
    });
  });

  describe("expectedAnswerLabel", () => {
    it("labels each answer kind for feedback", () => {
      const base = choiceRound("r1");
      expect(expectedAnswerLabel(base)).toBe("D");
      expect(
        expectedAnswerLabel({
          ...base,
          answer: { kind: "textInput", accepted: ["Bb"], expected: "B♭" },
        }),
      ).toBe("B♭");
      expect(
        expectedAnswerLabel({ ...base, answer: { kind: "notePick", correctNotes: ["A", "C#"] } }),
      ).toBe("A + C#");
      expect(
        expectedAnswerLabel({
          ...base,
          answer: { kind: "sequence", correctOrder: ["C", "D", "E"] },
        }),
      ).toBe("C → D → E");
    });
  });
});

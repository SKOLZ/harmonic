import { describe, expect, it } from "vitest";
import { UNLOCK_THRESHOLD } from "../../lib/progress/store";
import type { AnswerSubmission, Round } from "../../lib/rounds/types";
import { validateRound } from "../../lib/rounds/validate";
import {
  advance,
  expectedAnswerLabel,
  isUnlocked,
  start,
  submit,
  timeout,
} from "./roundMachine";

function choiceRound(id: string, correctIndex = 1): Round {
  return {
    id,
    prompt: { kind: "text", text: `Question ${id}?` },
    answer: { kind: "choices", options: ["C", "D", "E"], correctIndex },
    rule: "D sits a step above C.",
  };
}

function textInputRound(): Round {
  return {
    id: "t1",
    prompt: { kind: "text", text: "How is Bb also spelled?" },
    answer: { kind: "textInput", accepted: ["Bb", "B flat"], expected: "B♭" },
    rule: "Bb and B flat name the same pitch.",
  };
}

function notePickRound(): Round {
  return {
    id: "n1",
    prompt: { kind: "text", text: "Select A, C# and E." },
    answer: { kind: "notePick", correctNotes: ["A", "C#", "E"] },
    rule: "The three requested notes are A, C# and E.",
  };
}

function sequenceRound(): Round {
  return {
    id: "s1",
    prompt: { kind: "text", text: "Spell an A major triad upward." },
    answer: { kind: "sequence", correctOrder: ["A", "C#", "E"] },
    rule: "Triads stack in thirds: root, third, fifth.",
  };
}

function manyRounds(n: number): Round[] {
  return Array.from({ length: n }, (_, i) => choiceRound(`r${i}`));
}

/** A choices-round submission; all fixtures below that pass a number use this. */
function pick(selectedIndex: number): AnswerSubmission {
  return { kind: "choices", selectedIndex };
}

/** Answer correctly on the current round and advance, n times. */
function playCorrect(state: ReturnType<typeof start>, rounds: Round[], n: number) {
  let s = state;
  for (let i = 0; i < n; i += 1) {
    // manyRounds is all-choices; index 1 is the correct option.
    s = submit(s, pick(1), rounds[s.roundIndex]);
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
        submission: null,
        wasCorrect: false,
        feedback: null,
        miss: null,
      });
    });

    it("throws on an empty round list", () => {
      expect(() => start([])).toThrow(/must not be empty/);
    });
  });

  describe("submit", () => {
    it("a correct answer increments correctCount and reveals positive feedback", () => {
      const rounds = [choiceRound("r1", 2)];
      const state = submit(start(rounds), pick(2), rounds[0]);
      expect(state.correctCount).toBe(1);
      expect(state.phase).toBe("revealed");
      expect(state.wasCorrect).toBe(true);
      expect(state.miss).toBeNull();
      expect(state.submission).toEqual({ kind: "choices", selectedIndex: 2 });
      expect(state.feedback).toEqual({
        expected: "E",
        rule: "D sits a step above C.",
        correct: true,
      });
    });

    it("a wrong answer fails the run: the streak is wiped and the miss is recorded", () => {
      const rounds = manyRounds(3);
      // Two correct first, so the wipe has something to destroy.
      let state = playCorrect(start(rounds), rounds, 2);
      state = submit(state, pick(0), rounds[state.roundIndex]);
      expect(state.correctCount).toBe(0);
      expect(state.phase).toBe("failed");
      expect(state.miss).toBe("wrong");
      expect(state.wasCorrect).toBe(false);
      expect(state.roundIndex).toBe(2);
      expect(state.feedback).toEqual({
        expected: "D",
        rule: "D sits a step above C.",
        correct: false,
      });
    });

    it("feedback always carries expected and rule on both paths", () => {
      const rounds = [choiceRound("r1", 1)];
      for (const selected of [1, 0]) {
        const state = submit(start(rounds), pick(selected), rounds[0]);
        expect(state.feedback?.expected).toBe("D");
        expect(state.feedback?.rule).toBe("D sits a step above C.");
      }
    });

    it("throws when not in the answering phase (no double counting)", () => {
      const rounds = [choiceRound("r1")];
      const revealed = submit(start(rounds), pick(1), rounds[0]);
      expect(() => submit(revealed, pick(1), rounds[0])).toThrow(/cannot submit while phase/);
      const advanced = advance(revealed, 1);
      expect(advanced.phase).toBe("complete");
    });
  });

  describe("timeout", () => {
    it("an expired clock fails the run exactly like a wrong answer", () => {
      const rounds = manyRounds(3);
      let state = playCorrect(start(rounds), rounds, 2);
      state = timeout(state, rounds[state.roundIndex]);

      expect(state.phase).toBe("failed");
      expect(state.miss).toBe("timeout");
      expect(state.wasCorrect).toBe(false);
      // The streak is wiped by the clock the same way it is wiped by a miss.
      expect(state.correctCount).toBe(0);
      expect(state.submission).toBeNull();
      expect(state.feedback).toEqual({
        expected: "D",
        rule: "D sits a step above C.",
        correct: false,
      });
    });

    it("shares one failure path with a wrong answer (same state, only miss and submission differ)", () => {
      const rounds = [choiceRound("r1", 2)];
      const byWrong = submit(start(rounds), pick(0), rounds[0]);
      const byClock = timeout(start(rounds), rounds[0]);
      const { miss: wrongMiss, submission: wrongSubmission, ...byWrongRest } = byWrong;
      const { miss: clockMiss, submission: clockSubmission, ...byClockRest } = byClock;
      expect(wrongMiss).toBe("wrong");
      expect(clockMiss).toBe("timeout");
      expect(wrongSubmission).toEqual(pick(0));
      expect(clockSubmission).toBeNull();
      expect(byClockRest).toEqual(byWrongRest);
    });

    it("throws when the round is no longer being answered", () => {
      const rounds = [choiceRound("r1")];
      expect(() => timeout(start(rounds), rounds[0])).not.toThrow();
      const failed = timeout(start(rounds), rounds[0]);
      expect(() => timeout(failed, rounds[0])).toThrow(/cannot time out while phase/);
      const revealed = submit(start(rounds), pick(1), rounds[0]);
      expect(() => timeout(revealed, rounds[0])).toThrow(/cannot time out while phase/);
    });

    it("a timed-out run cannot be submitted or advanced out of the failed phase", () => {
      const rounds = [choiceRound("r1"), choiceRound("r2")];
      const failed = timeout(start(rounds), rounds[0]);
      expect(() => submit(failed, pick(1), rounds[0])).toThrow(/cannot submit while phase/);
      expect(() => advance(failed, rounds.length)).toThrow(/cannot advance while phase/);
    });
  });

  describe("advance", () => {
    it("throws after a failed run; the round does not advance", () => {
      const rounds = [choiceRound("r1", 2), choiceRound("r2")];
      const wrong = submit(start(rounds), pick(0), rounds[0]);
      expect(() => advance(wrong, rounds.length)).toThrow(/cannot advance while phase is "failed"/);
      expect(wrong.roundIndex).toBe(0);
      expect(wrong.correctCount).toBe(0);
    });

    it("throws when not revealed", () => {
      const rounds = [choiceRound("r1")];
      expect(() => advance(start(rounds), rounds.length)).toThrow(/cannot advance while phase/);
    });

    it("moves to the next round after a correct answer, preserving the counter", () => {
      const rounds = [choiceRound("r1"), choiceRound("r2")];
      let state = submit(start(rounds), pick(1), rounds[0]);
      state = advance(state, rounds.length);
      expect(state.roundIndex).toBe(1);
      expect(state.phase).toBe("answering");
      expect(state.correctCount).toBe(1);
      expect(state.feedback).toBeNull();
      expect(state.wasCorrect).toBe(false);
    });

    it("completes after the last round", () => {
      const rounds = [choiceRound("r1")];
      const revealed = submit(start(rounds), pick(1), rounds[0]);
      const done = advance(revealed, rounds.length);
      expect(done.phase).toBe("complete");
      expect(done.correctCount).toBe(1);
    });
  });

  describe("restart after a failure", () => {
    it("start clears every trace of the failed run", () => {
      const rounds = manyRounds(3);
      let state = playCorrect(start(rounds), rounds, 2);
      state = submit(state, pick(0), rounds[state.roundIndex]);
      expect(state.phase).toBe("failed");

      const restarted = start(manyRounds(3));
      expect(restarted).toEqual(start(manyRounds(3)));
      expect(restarted.phase).toBe("answering");
      expect(restarted.roundIndex).toBe(0);
      expect(restarted.correctCount).toBe(0);
      expect(restarted.feedback).toBeNull();
      expect(restarted.miss).toBeNull();
      expect(restarted.submission).toBeNull();
    });
  });

  describe("isUnlocked", () => {
    it("is false below the threshold and true at exactly the threshold", () => {
      expect(isUnlocked(UNLOCK_THRESHOLD - 1)).toBe(false);
      expect(isUnlocked(UNLOCK_THRESHOLD)).toBe(true);
    });

    it("exactly ten correct answers in a row unlock", () => {
      const rounds = manyRounds(UNLOCK_THRESHOLD);
      const done = playCorrect(start(rounds), rounds, UNLOCK_THRESHOLD);
      expect(done.correctCount).toBe(UNLOCK_THRESHOLD);
      expect(isUnlocked(done.correctCount)).toBe(true);
    });

    it("a wrong answer breaks the run, so it can never contribute to unlocking", () => {
      const rounds = manyRounds(2);
      let state = start(rounds);
      state = submit(state, pick(1), rounds[state.roundIndex]);
      state = advance(state, rounds.length);
      state = submit(state, pick(0), rounds[state.roundIndex]); // wrong
      expect(state.correctCount).toBe(0);
      expect(isUnlocked(state.correctCount)).toBe(false);
    });

    it("a timeout breaks the run the same way a wrong answer does", () => {
      const rounds = manyRounds(2);
      let state = start(rounds);
      state = submit(state, pick(1), rounds[state.roundIndex]);
      state = advance(state, rounds.length);
      state = timeout(state, rounds[state.roundIndex]);
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

  describe("submit judges answers by value for every kind", () => {
    it("textInput: matches any accepted spelling after trimming and ignoring case", () => {
      const rounds = [textInputRound()];
      const state = submit(start(rounds), { kind: "textInput", text: "  B FLAT " }, rounds[0]);
      expect(state.wasCorrect).toBe(true);
      expect(state.correctCount).toBe(1);
      expect(state.phase).toBe("revealed");
      expect(state.submission).toEqual({ kind: "textInput", text: "  B FLAT " });
      expect(state.feedback).toEqual({
        expected: "B♭",
        rule: "Bb and B flat name the same pitch.",
        correct: true,
      });
    });

    it("textInput: rejects text matching no accepted spelling and fails the run", () => {
      const rounds = [textInputRound()];
      const state = submit(start(rounds), { kind: "textInput", text: "C#" }, rounds[0]);
      expect(state.wasCorrect).toBe(false);
      expect(state.phase).toBe("failed");
      expect(state.miss).toBe("wrong");
      expect(state.correctCount).toBe(0);
      expect(state.feedback?.expected).toBe("B♭");
      expect(state.feedback?.correct).toBe(false);
    });

    it("notePick: submitted note order is irrelevant (unordered set equality)", () => {
      const rounds = [notePickRound()];
      const state = submit(
        start(rounds),
        { kind: "notePick", notes: ["E", "A", "C#"] },
        rounds[0],
      );
      expect(state.wasCorrect).toBe(true);
      expect(state.correctCount).toBe(1);
      expect(state.feedback?.expected).toBe("A + C# + E");
    });

    it("notePick: rejects a different set at the same length, and a subset", () => {
      const rounds = [notePickRound()];
      const wrongSameLength = submit(
        start(rounds),
        { kind: "notePick", notes: ["A", "C#", "F"] },
        rounds[0],
      );
      expect(wrongSameLength.wasCorrect).toBe(false);
      expect(wrongSameLength.phase).toBe("failed");
      expect(wrongSameLength.correctCount).toBe(0);
      const subset = submit(start(rounds), { kind: "notePick", notes: ["A", "C#"] }, rounds[0]);
      expect(subset.wasCorrect).toBe(false);
      expect(subset.correctCount).toBe(0);
    });

    it("sequence: same members in the wrong order are incorrect; the right order is correct", () => {
      const rounds = [sequenceRound()];
      const wrongOrder = submit(
        start(rounds),
        { kind: "sequence", order: ["E", "C#", "A"] },
        rounds[0],
      );
      expect(wrongOrder.wasCorrect).toBe(false);
      expect(wrongOrder.phase).toBe("failed");
      expect(wrongOrder.correctCount).toBe(0);
      expect(wrongOrder.feedback?.expected).toBe("A → C# → E");
      const rightOrder = submit(
        start(rounds),
        { kind: "sequence", order: ["A", "C#", "E"] },
        rounds[0],
      );
      expect(rightOrder.wasCorrect).toBe(true);
      expect(rightOrder.correctCount).toBe(1);
    });

    it("a wrong textInput answer fails the run instead of reopening the question", () => {
      const rounds = [textInputRound()];
      let state = submit(start(rounds), { kind: "textInput", text: "C" }, rounds[0]);
      expect(state.correctCount).toBe(0);
      expect(state.phase).toBe("failed");
      expect(() => advance(state, rounds.length)).toThrow(/cannot advance while phase is "failed"/);

      // Restarting is the only way out of a failed run, and it starts at zero.
      state = start(rounds);
      expect(state.phase).toBe("answering");
      expect(state.correctCount).toBe(0);
      expect(state.submission).toBeNull();
      state = submit(state, { kind: "textInput", text: "bb" }, rounds[0]);
      expect(state.wasCorrect).toBe(true);
      expect(state.correctCount).toBe(1);
    });
  });

  describe("submit rejects a submission whose kind does not match the round", () => {
    it("names both kinds in the error", () => {
      const choices = [choiceRound("r1")];
      expect(() =>
        submit(start(choices), { kind: "sequence", order: ["C"] }, choices[0]),
      ).toThrow(/"sequence".*"choices"/);
      const text = [textInputRound()];
      expect(() =>
        submit(start(text), { kind: "choices", selectedIndex: 0 }, text[0]),
      ).toThrow(/"choices".*"textInput"/);
    });
  });

  describe("expectedAnswerLabel never blanks a validated round", () => {
    it("returns a non-empty label for a validated round of every kind", () => {
      const rounds: Round[] = [choiceRound("r1"), textInputRound(), notePickRound(), sequenceRound()];
      for (const round of rounds) {
        validateRound(round);
        expect(expectedAnswerLabel(round).trim()).not.toBe("");
      }
    });

    it("stays non-empty even for degenerate data that still validates", () => {
      // validateRound does not reject blank option text or blank note members,
      // so feedback must still name something when the data is that bad.
      const blankOption: Round = {
        ...choiceRound("r1"),
        answer: { kind: "choices", options: ["", "D"], correctIndex: 0 },
      };
      validateRound(blankOption);
      expect(expectedAnswerLabel(blankOption).trim()).not.toBe("");

      const blankNotes: Round = {
        ...notePickRound(),
        answer: { kind: "notePick", correctNotes: [""] },
      };
      validateRound(blankNotes);
      expect(expectedAnswerLabel(blankNotes).trim()).not.toBe("");

      const blankOrder: Round = {
        ...sequenceRound(),
        answer: { kind: "sequence", correctOrder: [""] },
      };
      validateRound(blankOrder);
      expect(expectedAnswerLabel(blankOrder).trim()).not.toBe("");
    });
  });
});

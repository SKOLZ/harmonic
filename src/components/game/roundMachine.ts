import { UNLOCK_THRESHOLD } from "../../lib/progress/store";
import type { AnswerSpec, AnswerSubmission, Round } from "../../lib/rounds/types";

export type Phase = "answering" | "revealed" | "failed" | "complete";

/**
 * Why a run ended. A miss is a miss: a wrong answer and an expired clock take
 * the same `fail` path and differ only in this tag (and in whether the learner
 * got a submission in before the end).
 */
export type MissReason = "wrong" | "timeout";

export interface Feedback {
  expected: string;
  rule: string;
  correct: boolean;
}

export interface MachineState {
  roundIndex: number;
  phase: Phase;
  /** The current run's unbroken streak of correct rounds; a miss resets it to 0. */
  correctCount: number;
  /** The learner's submitted answer for the current round, kept verbatim for the UI. */
  submission: AnswerSubmission | null;
  wasCorrect: boolean;
  feedback: Feedback | null;
  /** Set exactly when `phase === "failed"`: the miss ended the run. */
  miss: MissReason | null;
}

/** Canonical display string for the correct answer, used in feedback. Never blank on a validated round. */
export function expectedAnswerLabel(round: Round): string {
  switch (round.answer.kind) {
    case "choices": {
      const label = round.answer.options[round.answer.correctIndex];
      // validateRound keeps correctIndex in range but does not reject blank
      // option text; feedback must still name something, so fall back to position.
      return label?.trim() ? label : `option ${round.answer.correctIndex + 1}`;
    }
    case "textInput":
      // validateRound guarantees a non-empty canonical `expected`.
      return round.answer.expected;
    case "notePick": {
      const label = round.answer.correctNotes.join(" + ");
      // validateRound does not reject blank members; never blank the feedback.
      return label.trim() ? label : "(no notes)";
    }
    case "sequence": {
      const label = round.answer.correctOrder.join(" → ");
      // validateRound does not reject blank members; never blank the feedback.
      return label.trim() ? label : "(empty sequence)";
    }
  }
}

/**
 * Judge a submission against the round's answer spec, by value.
 * `submit` guarantees `submission.kind === answer.kind` before calling, so the
 * kind-equality guards below only exist to narrow both unions for TypeScript.
 */
function isCorrectAnswer(submission: AnswerSubmission, answer: AnswerSpec): boolean {
  switch (submission.kind) {
    case "choices":
      return answer.kind === "choices" && submission.selectedIndex === answer.correctIndex;
    case "textInput": {
      if (answer.kind !== "textInput") return false;
      const text = submission.text.trim().toLowerCase();
      return answer.accepted.some((candidate) => candidate.trim().toLowerCase() === text);
    }
    case "notePick": {
      if (answer.kind !== "notePick") return false;
      // Unordered set equality: same length, same members, order irrelevant.
      const expected = [...answer.correctNotes].sort();
      const actual = [...submission.notes].sort();
      return (
        expected.length === actual.length && expected.every((value, index) => value === actual[index])
      );
    }
    case "sequence": {
      if (answer.kind !== "sequence") return false;
      // Ordered equality: position matters.
      return (
        submission.order.length === answer.correctOrder.length &&
        submission.order.every((value, index) => value === answer.correctOrder[index])
      );
    }
  }
}

/** Initial state for a non-empty round list. Validate rounds separately (validateRounds). */
export function start(rounds: readonly Round[]): MachineState {
  if (rounds.length === 0) {
    throw new Error("start: rounds must not be empty");
  }
  return {
    roundIndex: 0,
    phase: "answering",
    correctCount: 0,
    submission: null,
    wasCorrect: false,
    feedback: null,
    miss: null,
  };
}

/**
 * The one failure path. A wrong answer and a timed-out clock both land here:
 * the run ends, the streak is wiped to zero, and the round's correct answer
 * and rule are revealed so the miss still teaches. Restarting is the only way
 * out (`start` on a fresh draw) — the failed round can never be re-answered.
 */
function fail(
  state: MachineState,
  round: Round,
  reason: MissReason,
  submission: AnswerSubmission | null,
): MachineState {
  return {
    ...state,
    phase: "failed",
    submission,
    wasCorrect: false,
    correctCount: 0,
    miss: reason,
    feedback: {
      expected: expectedAnswerLabel(round),
      rule: round.rule,
      correct: false,
    },
  };
}

/**
 * Submit an answer for the current round. Only legal while `answering` (a
 * revealed round cannot be re-submitted, so a correct round can never be
 * counted twice). The submission's kind must match the round's answer kind;
 * correctness is then judged by value for all four kinds (see isCorrectAnswer).
 * A wrong submission fails the run through the shared `fail` path.
 */
export function submit(
  state: MachineState,
  submission: AnswerSubmission,
  round: Round,
): MachineState {
  if (state.phase !== "answering") {
    throw new Error(`submit: cannot submit while phase is "${state.phase}"`);
  }
  if (submission.kind !== round.answer.kind) {
    throw new Error(
      `submit: submission kind "${submission.kind}" does not match round answer kind "${round.answer.kind}"`,
    );
  }
  if (!isCorrectAnswer(submission, round.answer)) {
    return fail(state, round, "wrong", submission);
  }
  return {
    ...state,
    phase: "revealed",
    submission,
    wasCorrect: true,
    // Product rule: only a correct answer extends the streak; the counter
    // resets on every miss, so guessing can never unlock the chain.
    correctCount: state.correctCount + 1,
    feedback: {
      expected: expectedAnswerLabel(round),
      rule: round.rule,
      correct: true,
    },
  };
}

/**
 * The clock ran out on a round still in `answering`. Same failure path as a
 * wrong answer — a miss is a miss — with no submission to keep.
 */
export function timeout(state: MachineState, round: Round): MachineState {
  if (state.phase !== "answering") {
    throw new Error(`timeout: cannot time out while phase is "${state.phase}"`);
  }
  return fail(state, round, "timeout", null);
}

/**
 * Move to the next round, or `complete` after the last. Legal only after a
 * correct answer in `revealed`; throws otherwise (a miss ends the run, so a
 * failed phase can never advance).
 * `totalRounds` is passed explicitly because the mandated MachineState shape
 * carries no length field.
 */
export function advance(state: MachineState, totalRounds: number): MachineState {
  if (state.phase !== "revealed") {
    throw new Error(`advance: cannot advance while phase is "${state.phase}"`);
  }
  if (!state.wasCorrect) {
    throw new Error("advance: cannot advance after a wrong answer; the run already failed");
  }
  if (state.roundIndex + 1 >= totalRounds) {
    return { ...state, phase: "complete", submission: null };
  }
  return {
    ...state,
    roundIndex: state.roundIndex + 1,
    phase: "answering",
    submission: null,
    wasCorrect: false,
    feedback: null,
  };
}

/** Unlock gate: a lesson is unlocked once the run holds enough correct answers in a row. */
export function isUnlocked(correctCount: number): boolean {
  return correctCount >= UNLOCK_THRESHOLD;
}

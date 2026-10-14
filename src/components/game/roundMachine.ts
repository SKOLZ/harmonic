import { UNLOCK_THRESHOLD } from "../../lib/progress/store";
import type { Round } from "../../lib/rounds/types";

export type Phase = "answering" | "revealed" | "complete";

export interface Feedback {
  expected: string;
  rule: string;
  correct: boolean;
}

export interface MachineState {
  roundIndex: number;
  phase: Phase;
  correctCount: number;
  selected: number | null;
  wasCorrect: boolean;
  feedback: Feedback | null;
}

/** Canonical display string for the correct answer, used in feedback. */
export function expectedAnswerLabel(round: Round): string {
  switch (round.answer.kind) {
    case "choices": {
      const label = round.answer.options[round.answer.correctIndex];
      return label ?? "";
    }
    case "textInput":
      return round.answer.expected;
    case "notePick":
      return round.answer.correctNotes.join(" + ");
    case "sequence":
      return round.answer.correctOrder.join(" → ");
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
    selected: null,
    wasCorrect: false,
    feedback: null,
  };
}

/**
 * Submit an answer for the current round. Only legal while `answering` (a revealed
 * round cannot be re-submitted, so a correct round can never be counted twice).
 *
 * Index-based submission currently judges `choices` rounds. The other answer kinds
 * (textInput / notePick / sequence) have no meaningful index; they will extend this
 * machine in the T5c answer-control task rather than silently judging here.
 */
export function submit(
  state: MachineState,
  selectedIndex: number | null,
  round: Round,
): MachineState {
  if (state.phase !== "answering") {
    throw new Error(`submit: cannot submit while phase is "${state.phase}"`);
  }
  if (round.answer.kind !== "choices") {
    throw new Error(
      `submit: answer kind "${round.answer.kind}" does not submit by index; extend the machine for this kind`,
    );
  }
  const correct = selectedIndex !== null && selectedIndex === round.answer.correctIndex;
  return {
    ...state,
    phase: "revealed",
    selected: selectedIndex,
    wasCorrect: correct,
    // Product rule: only a correct answer advances the counter; wrong answers
    // leave correctCount untouched so guessing can never unlock the chain.
    correctCount: correct ? state.correctCount + 1 : state.correctCount,
    feedback: {
      expected: expectedAnswerLabel(round),
      rule: round.rule,
      correct,
    },
  };
}

/** Return a wrongly-answered round to `answering`. Counter unchanged; unlimited retries. */
export function retry(state: MachineState): MachineState {
  if (state.phase !== "revealed") {
    throw new Error(`retry: cannot retry while phase is "${state.phase}"`);
  }
  if (state.wasCorrect) {
    throw new Error("retry: cannot retry after a correct answer; advance instead");
  }
  return {
    ...state,
    phase: "answering",
    selected: null,
    wasCorrect: false,
    feedback: null,
  };
}

/**
 * Move to the next round, or `complete` after the last. Legal only after a
 * correct answer in `revealed`; throws otherwise (wrong answers retry, not advance).
 * `totalRounds` is passed explicitly because the mandated MachineState shape
 * carries no length field.
 */
export function advance(state: MachineState, totalRounds: number): MachineState {
  if (state.phase !== "revealed") {
    throw new Error(`advance: cannot advance while phase is "${state.phase}"`);
  }
  if (!state.wasCorrect) {
    throw new Error("advance: cannot advance after a wrong answer; retry instead");
  }
  if (state.roundIndex + 1 >= totalRounds) {
    return { ...state, phase: "complete", selected: null };
  }
  return {
    ...state,
    roundIndex: state.roundIndex + 1,
    phase: "answering",
    selected: null,
    wasCorrect: false,
    feedback: null,
  };
}

/** Unlock gate: a lesson is unlocked once enough correct answers have accumulated. */
export function isUnlocked(correctCount: number): boolean {
  return correctCount >= UNLOCK_THRESHOLD;
}

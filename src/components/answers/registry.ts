import type { Component } from "solid-js";
import type { AnswerSpec, AnswerSubmission } from "../../lib/rounds/types";
import ChoicesAnswer from "./ChoicesAnswer";
import NotePickAnswer from "./NotePickAnswer";
import SequenceAnswer from "./SequenceAnswer";
import TextInputAnswer from "./TextInputAnswer";

/**
 * Uniform props every answer control accepts — the single control contract
 * `GameShell` renders against. Each control mirrors this shape with its own
 * exported props interface (same fields), so the registry assignment below is
 * what keeps them in step.
 *
 * - `answer`: the round's full `AnswerSpec`, narrowed by kind inside the control.
 * - `onSubmit`: the only output channel — the control emits an
 *   `AnswerSubmission` whose kind matches `answer.kind`; `GameShell` passes it
 *   straight to the machine's `submit`, which judges by value.
 * - `revealed`: while true the control is locked — no emission, no editing.
 * - `submission`: the machine's stored submission for the current round, or
 *   `null` before answering. Controls reflect it (and keep their in-progress
 *   draft across a retry, which clears it).
 */
export type AnswerComponentProps = {
  answer: AnswerSpec;
  onSubmit: (submission: AnswerSubmission) => void;
  revealed?: boolean;
  submission?: AnswerSubmission | null;
};

export type AnswerComponent = Component<AnswerComponentProps>;

/**
 * kind → control. All four kinds of the AnswerSpec contract are registered;
 * kinds outside it still fail loudly via getAnswerComponent rather than
 * rendering an empty control.
 */
export const answerRegistry: Readonly<Partial<Record<AnswerSpec["kind"], AnswerComponent>>> = {
  choices: ChoicesAnswer,
  textInput: TextInputAnswer,
  notePick: NotePickAnswer,
  sequence: SequenceAnswer,
};

export function getAnswerComponent(kind: AnswerSpec["kind"]): AnswerComponent {
  const component = answerRegistry[kind];
  if (component === undefined) {
    throw new Error(
      `getAnswerComponent: no answer control registered for kind "${kind}"`,
    );
  }
  return component;
}

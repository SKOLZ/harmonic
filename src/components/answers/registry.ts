import type { Component } from "solid-js";
import type { AnswerSpec } from "../../lib/rounds/types";
import ChoicesAnswer from "./ChoicesAnswer";

/** Uniform props every answer control accepts. */
export type AnswerComponentProps = {
  answer: AnswerSpec;
  disabled?: boolean;
  selectedIndex?: number | null;
  onSelect: (index: number) => void;
};

export type AnswerComponent = Component<AnswerComponentProps>;

/**
 * kind → control. Only `choices` is registered here; T5c registers textInput,
 * notePick and sequence. Unregistered kinds fail loudly via getAnswerComponent
 * rather than rendering an empty control.
 */
export const answerRegistry: Readonly<Partial<Record<AnswerSpec["kind"], AnswerComponent>>> = {
  choices: ChoicesAnswer,
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

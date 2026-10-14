import type { Component } from "solid-js";
import type { PromptSpec } from "../../lib/rounds/types";
import TextPrompt from "./TextPrompt";

/** Uniform props every prompt renderer accepts: the full spec, narrowed by kind. */
export type PromptComponent = Component<{ prompt: PromptSpec }>;

/**
 * kind → renderer. Only `text` is registered here; T5c registers staff, audio
 * and keyboard. Unregistered kinds fail loudly via getPromptComponent rather
 * than rendering an empty prompt.
 */
export const promptRegistry: Readonly<Partial<Record<PromptSpec["kind"], PromptComponent>>> = {
  text: TextPrompt,
};

export function getPromptComponent(kind: PromptSpec["kind"]): PromptComponent {
  const component = promptRegistry[kind];
  if (component === undefined) {
    throw new Error(
      `getPromptComponent: no prompt renderer registered for kind "${kind}"`,
    );
  }
  return component;
}

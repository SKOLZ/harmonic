import { lazy } from "solid-js";
import type { Component } from "solid-js";
import type { PromptSpec } from "../../lib/rounds/types";
import AudioPrompt from "./AudioPrompt";
import KeyboardPrompt from "./KeyboardPrompt";
import TextPrompt from "./TextPrompt";

/** Uniform props every prompt renderer accepts: the full spec, narrowed by kind. */
export type PromptComponent = Component<{ prompt: PromptSpec }>;

/**
 * The staff renderer is the only lazy registry entry. StaffPrompt statically
 * imports the Staff component, which statically imports VexFlow — by far the
 * largest dependency — so a static edge from this registry (which the app
 * entry always loads) would pull the whole notation engine into the main
 * chunk. Solid's `lazy` turns that edge into a dynamic `import()`: the chunk
 * holding StaffPrompt, Staff, and VexFlow is fetched only when a staff prompt
 * actually renders, and text/audio/keyboard rounds never download it. The
 * boundary lives here, at the production dispatch site, because StaffPrompt's
 * own consumers (the lesson test suites) mount it synchronously and must keep
 * seeing the engraved SVG on first paint.
 */
const LazyStaffPrompt = lazy(() => import("./StaffPrompt"));

/**
 * kind → renderer. All four kinds of the PromptSpec contract are registered;
 * kinds outside it still fail loudly via getPromptComponent rather than
 * rendering an empty prompt.
 */
export const promptRegistry: Readonly<Partial<Record<PromptSpec["kind"], PromptComponent>>> = {
  text: TextPrompt,
  staff: LazyStaffPrompt,
  audio: AudioPrompt,
  keyboard: KeyboardPrompt,
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

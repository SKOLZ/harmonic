import type { PromptSpec } from "../../lib/rounds/types";
import { parseNote } from "../../lib/theory";
import Staff from "../notation/Staff";

export interface StaffPromptProps {
  prompt: PromptSpec;
}

/**
 * Renders a `kind: "staff"` PromptSpec through the shared Staff component.
 * Note-name strings go through the theory layer's parser instead of a
 * hand-rolled one, so every spelling rule lives in exactly one place; the
 * kind check is defensive so a registry mistake fails loud with the actual
 * kind instead of rendering silently empty.
 */
export default function StaffPrompt(props: StaffPromptProps) {
  const spec = () => {
    const prompt = props.prompt;
    if (prompt.kind !== "staff") {
      throw new Error(
        `StaffPrompt: expected prompt kind "staff", got "${prompt.kind}"`,
      );
    }
    return prompt;
  };

  const notes = () => spec().notes.map((name) => parseNote(name));

  const keySignature = () => {
    const name = spec().keySignature;
    return name === undefined ? undefined : parseNote(name);
  };

  // The engraved SVG is machine-drawn paths, so the wrapper speaks the
  // notation for screen readers instead of leaving them with silent geometry.
  const ariaLabel = () => {
    const { clef, notes: names, keySignature: key } = spec();
    const keyPart = key === undefined ? "" : `, key of ${key}`;
    return `Notation: ${names.join(" ")} (${clef} clef${keyPart})`;
  };

  return (
    <div
      class="prompt--staff"
      role="img"
      aria-label={ariaLabel()}
      data-clef={spec().clef}
    >
      <Staff
        notes={notes()}
        clef={spec().clef}
        keySignature={keySignature()}
        // VexFlow duration code from the spec; undefined keeps Staff's default
        // quarter note, so text-only rhythm rounds engrave exactly as before.
        duration={spec().duration}
      />
    </div>
  );
}

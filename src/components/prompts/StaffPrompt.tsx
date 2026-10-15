import type { PromptSpec } from "../../lib/rounds/types";
import { keySignatureAccidentals, parseNote } from "../../lib/theory";
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
  // The spoken form is structural only: clef, the *count* of key-signature
  // accidentals, and the glyph count — never pitch names, durations, or the
  // key's identity. On "name this note" / "how long does this last" /
  // "which key is this" rounds those are the answer, so announcing them
  // would hand the learner the solution. A trailing `r` in the VexFlow
  // duration code draws a rest instead of a note head, so the unit word
  // follows the glyph kind without revealing which rest (or note length) it is.
  // Accidental clause omitted when the signature carries none (key of C).
  const accidentalPart = () => {
    const name = spec().keySignature;
    if (name === undefined) {
      return "";
    }
    const count = keySignatureAccidentals(parseNote(name)).length;
    if (count === 0) {
      return "";
    }
    const unit = count === 1 ? "accidental" : "accidentals";
    return `, ${count} ${unit}`;
  };

  const ariaLabel = () => {
    const { clef, notes: names, duration } = spec();
    const isRest = duration?.endsWith("r") ?? false;
    const unit = isRest ? "rest" : "note";
    const count = names.length === 1 ? unit : `${unit}s`;
    return `Staff notation, ${clef} clef${accidentalPart()}, ${names.length} ${count}`;
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

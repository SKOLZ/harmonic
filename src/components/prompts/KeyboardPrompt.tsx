import type { PromptSpec } from "../../lib/rounds/types";
import Keyboard from "../keyboard/Keyboard";

export interface KeyboardPromptProps {
  prompt: PromptSpec;
}

/**
 * Renders a `kind: "keyboard"` PromptSpec as a display-only piano visual:
 * `selectable: false` keeps every key out of interaction (no toggling, no
 * click handling), while `highlight` marks the prompted pitches. The kind
 * check is defensive so a registry mistake fails loud with the actual kind
 * instead of rendering silently empty.
 */
export default function KeyboardPrompt(props: KeyboardPromptProps) {
  const spec = () => {
    const prompt = props.prompt;
    if (prompt.kind !== "keyboard") {
      throw new Error(
        `KeyboardPrompt: expected prompt kind "keyboard", got "${prompt.kind}"`,
      );
    }
    return prompt;
  };

  // `octave` shifts the two-octave window the Keyboard draws by default
  // (C4–C6): octave 2 draws C2–C4, so the drawn range follows the prompt.
  const range = () => {
    const { octave } = spec();
    if (octave === undefined) {
      return {};
    }
    return { startNote: `C${octave}`, endNote: `C${octave + 2}` };
  };

  return (
    <div class="prompt--keyboard">
      <Keyboard highlight={spec().highlight} selectable={false} {...range()} />
    </div>
  );
}

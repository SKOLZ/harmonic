import type { PromptSpec } from "../../lib/rounds/types";
import Keyboard from "../keyboard/Keyboard";
import {
  DEFAULT_END_NOTE,
  DEFAULT_START_NOTE,
  keyboardLayout,
  matchesHighlight,
} from "../../lib/keyboard/layout";

export interface KeyboardPromptProps {
  prompt: PromptSpec;
}

/**
 * Renders a `kind: "keyboard"` PromptSpec as a display-only piano visual:
 * `selectable: false` keeps every key out of interaction (no toggling, no
 * click handling), while `highlight` marks the prompted pitches. The kind
 * check is defensive so a registry mistake fails loud with the actual kind
 * instead of rendering silently empty.
 *
 * The wrapper is a `role="img"` leaf: per ARIA its children are presentational,
 * so the inner Keyboard's per-key labels (which append ", highlighted" and
 * would announce the prompted keys verbatim) stay in the DOM for styling and
 * tests but leave the accessibility tree. Screen readers get only the
 * structural description below — range and highlight *count*, never which
 * keys, because identifying them is the question this prompt asks.
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
      return { startNote: DEFAULT_START_NOTE, endNote: DEFAULT_END_NOTE };
    }
    return { startNote: `C${octave}`, endNote: `C${octave + 2}` };
  };

  // Count the keys the Keyboard will actually mark: highlight entries are
  // matched by pitch after normalisation (so `Bb4` and `B flat 4` light the
  // same key) and an entry without an octave matches every octave, so the
  // spec's array length is not necessarily the highlighted-key count.
  const highlightedCount = () => {
    const highlight = spec().highlight;
    return keyboardLayout(range()).filter((key) =>
      matchesHighlight(key.noteName, highlight),
    ).length;
  };

  const ariaLabel = () => {
    const { startNote, endNote } = range();
    const count = highlightedCount();
    const unit = count === 1 ? "key" : "keys";
    return `Piano keyboard, ${startNote} to ${endNote}, ${count} ${unit} highlighted`;
  };

  return (
    <div class="prompt--keyboard" role="img" aria-label={ariaLabel()}>
      <Keyboard
        highlight={spec().highlight}
        selectable={false}
        {...range()}
      />
    </div>
  );
}

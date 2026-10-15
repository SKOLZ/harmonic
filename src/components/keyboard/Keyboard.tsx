import { For, mergeProps } from "solid-js";
import {
  DEFAULT_END_NOTE,
  DEFAULT_START_NOTE,
  keyboardLayout,
  matchesHighlight,
} from "../../lib/keyboard/layout";

export interface KeyboardProps {
  /**
   * Notes to mark as prompted. Matched by pitch after normalisation, so
   * `Bb4`, `B flat 4` and `B♭4` all light the same key; an entry without an
   * octave matches that pitch class in every octave.
   */
  highlight?: string[];
  /**
   * Currently chosen notes (the `notePick` submission in flight). Matched
   * the same way as `highlight`.
   */
  selected?: string[];
  /** When true, clicking a key calls `onToggle` with its canonical name. */
  selectable?: boolean;
  /** Receives the clicked key's canonical note name (e.g. `C#4`). */
  onToggle?: (noteName: string) => void;
  /** Inclusive lower bound; a natural key with an octave (default `C4`). */
  startNote?: string;
  /** Inclusive upper bound; a natural key above `startNote` (default `C6`). */
  endNote?: string;
}

const KEYBOARD_HEIGHT_PX = 140;
const BLACK_KEY_HEIGHT_PCT = "60%";

/**
 * Read-only piano keyboard visual that doubles as the `notePick` control.
 *
 * Keys are real `<button>` elements: each one carries an `aria-label` that
 * speaks its note (`C sharp 4`) and an `aria-pressed` state. Highlighted and
 * selected keys are marked structurally — `data-highlighted` / `data-selected`
 * plus a visible marker glyph — so the states are perceivable and testable
 * without relying on colour. Geometry (left/width/height/stacking) arrives
 * from `keyboardLayout` as inline style data; visual styling belongs to
 * `styles.css`, not here.
 */
export default function Keyboard(props: KeyboardProps) {
  // Defaults first: mergeProps resolves the last source first, so props (second)
  // must win over the defaults (first) when they are defined.
  const resolved = mergeProps(
    {
      highlight: [] as string[],
      selected: [] as string[],
      selectable: false,
      onToggle: undefined as ((noteName: string) => void) | undefined,
      startNote: DEFAULT_START_NOTE,
      endNote: DEFAULT_END_NOTE,
    },
    props,
  );

  const keys = () =>
    keyboardLayout({ startNote: resolved.startNote, endNote: resolved.endNote });

  function handleClick(noteName: string): void {
    if (!resolved.selectable) return;
    resolved.onToggle?.(noteName);
  }

  return (
    <div
      class="keyboard"
      role="group"
      aria-label="Piano keyboard"
      data-selectable={String(resolved.selectable)}
      style={{ position: "relative", height: `${KEYBOARD_HEIGHT_PX}px` }}
    >
      <For each={keys()}>
        {(key) => {
          const highlighted = () => matchesHighlight(key.noteName, resolved.highlight);
          const selected = () => matchesHighlight(key.noteName, resolved.selected);
          return (
            <button
              type="button"
              class={
                key.isBlack
                  ? "keyboard__key keyboard__key--black"
                  : "keyboard__key keyboard__key--white"
              }
              data-note={key.noteName}
              data-black={String(key.isBlack)}
              data-highlighted={String(highlighted())}
              data-selected={String(selected())}
              aria-label={
                highlighted() ? `${key.ariaLabel}, highlighted` : key.ariaLabel
              }
              aria-pressed={selected() ? "true" : "false"}
              // Display-only keys leave the tab order; selectable keys stay
              // reachable and activatable with Enter/Space.
              tabIndex={resolved.selectable ? undefined : -1}
              style={{
                left: `${key.leftPct}%`,
                width: `${key.widthPct}%`,
                top: "0%",
                height: key.isBlack ? BLACK_KEY_HEIGHT_PCT : "100%",
                "z-index": key.isBlack ? "2" : "1",
              }}
              onClick={() => handleClick(key.noteName)}
            >
              {key.isBlack ? null : key.noteName}
              {highlighted() ? (
                <span class="keyboard__marker" data-marker="highlighted" aria-hidden="true">
                  ●
                </span>
              ) : null}
              {selected() ? (
                <span class="keyboard__marker" data-marker="selected" aria-hidden="true">
                  ✓
                </span>
              ) : null}
            </button>
          );
        }}
      </For>
    </div>
  );
}

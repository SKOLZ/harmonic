import { createSignal, For } from "solid-js";
import Keyboard from "../keyboard/Keyboard";
import type { AnswerSpec, AnswerSubmission } from "../../lib/rounds/types";

/** Unified answer-control props — see `ChoicesAnswerProps` for the contract. */
export interface NotePickAnswerProps {
  answer: AnswerSpec;
  onSubmit: (submission: AnswerSubmission) => void;
  revealed?: boolean;
  submission?: AnswerSubmission | null;
  /**
   * Inclusive keyboard bounds, forwarded to `Keyboard`. The endless practice
   * mode answers on C3–C6 so a bass-clef note still has a key to be picked
   * on; omitted keeps the default C4–C6 every other caller sees.
   */
  startNote?: string;
  endNote?: string;
}

/**
 * Note-selection control for `{ kind: "notePick", correctNotes }`.
 *
 * The piano `Keyboard` runs in selectable mode: every key is a real `<button>`
 * that toggles itself in or out of the selection, and Confirm emits
 * `{ kind: "notePick", notes }`. Clear empties the selection. The machine
 * judges the set unordered, so click order never matters.
 *
 * Selection lives in a local draft so it survives a retry (the machine clears
 * its stored submission when the round reopens), while a stored submission
 * wins the display during a reveal. Locking works structurally: `revealed`
 * flips the keyboard to non-selectable (keys leave the tab order and ignore
 * clicks) and disables both action buttons, so nothing can be emitted.
 *
 * The kind check is defensive so a registry mistake fails loud instead of
 * rendering an input for the wrong round.
 */
export default function NotePickAnswer(props: NotePickAnswerProps) {
  if (props.answer.kind !== "notePick") {
    throw new Error(
      `NotePickAnswer: expected answer kind "notePick", got "${props.answer.kind}"`,
    );
  }

  const locked = () => props.revealed === true;
  const [picked, setPicked] = createSignal<string[]>([]);

  /** What the learner sees is what the learner submits. */
  const notes = () => {
    const submission = props.submission;
    return submission?.kind === "notePick" ? submission.notes : picked();
  };

  function toggle(noteName: string): void {
    if (locked()) return;
    setPicked((current) =>
      current.includes(noteName)
        ? current.filter((note) => note !== noteName)
        : [...current, noteName],
    );
  }

  function clear(): void {
    if (locked()) return;
    setPicked([]);
  }

  function confirm(): void {
    if (locked()) return;
    props.onSubmit({ kind: "notePick", notes: notes() });
  }

  return (
    <div class="note-pick">
      <Keyboard
        selectable={!locked()}
        selected={notes()}
        onToggle={toggle}
        startNote={props.startNote}
        endNote={props.endNote}
      />
      <ul class="note-pick__selection" aria-label="Selected notes">
        <For each={notes()}>{(note) => <li>{note}</li>}</For>
      </ul>
      <div class="note-pick__actions">
        <button
          type="button"
          class="note-pick__confirm"
          disabled={locked()}
          onClick={confirm}
        >
          Confirm
        </button>
        <button
          type="button"
          class="note-pick__clear"
          disabled={locked() || notes().length === 0}
          onClick={clear}
        >
          Clear
        </button>
      </div>
    </div>
  );
}

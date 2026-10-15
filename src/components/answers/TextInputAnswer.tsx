import { createSignal, createUniqueId } from "solid-js";
import type { AnswerSpec, AnswerSubmission } from "../../lib/rounds/types";

/** Unified answer-control props — see `ChoicesAnswerProps` for the contract. */
export interface TextInputAnswerProps {
  answer: AnswerSpec;
  onSubmit: (submission: AnswerSubmission) => void;
  revealed?: boolean;
  submission?: AnswerSubmission | null;
}

/**
 * Free-text answer control for `{ kind: "textInput", accepted, expected }`.
 *
 * A real `<input>` inside a real `<form>`: clicking the submit button fires the
 * form's submit event, and Enter on the single-line input submits too (handled
 * on `keydown` with `preventDefault` so a browser cannot submit twice —
 * happy-dom does not emulate implicit Enter submission at all).
 *
 * The typed text lives in a local draft so it survives a retry: the machine
 * clears its stored submission when the round reopens, but the learner should
 * not have to retype a near-miss. While the machine holds a submission (round
 * revealed) that text wins the display and both controls are disabled.
 *
 * The kind check is defensive so a registry mistake fails loud instead of
 * rendering an input for the wrong round.
 */
export default function TextInputAnswer(props: TextInputAnswerProps) {
  if (props.answer.kind !== "textInput") {
    throw new Error(
      `TextInputAnswer: expected answer kind "textInput", got "${props.answer.kind}"`,
    );
  }

  const locked = () => props.revealed === true;
  const [draft, setDraft] = createSignal("");
  const inputId = createUniqueId();

  /** What the learner sees is what the learner submits. */
  const text = () => {
    const submission = props.submission;
    return submission?.kind === "textInput" ? submission.text : draft();
  };

  function submitText(): void {
    if (locked()) return;
    props.onSubmit({ kind: "textInput", text: text() });
  }

  return (
    <form
      class="text-input-answer"
      onSubmit={(event) => {
        event.preventDefault();
        submitText();
      }}
    >
      <label class="text-input-answer__label" for={inputId}>
        Your answer
      </label>
      <input
        id={inputId}
        class="text-input-answer__input"
        type="text"
        autocomplete="off"
        value={text()}
        disabled={locked()}
        onInput={(event) => {
          if (locked()) return;
          setDraft(event.currentTarget.value);
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return;
          // Enter must submit, not just the button. Cancel the default so a
          // real browser does not also fire the form's submit a second time.
          event.preventDefault();
          submitText();
        }}
      />
      <button type="submit" class="text-input-answer__submit" disabled={locked()}>
        Submit
      </button>
    </form>
  );
}

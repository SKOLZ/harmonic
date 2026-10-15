import { For } from "solid-js";
import type { AnswerSpec, AnswerSubmission } from "../../lib/rounds/types";

/**
 * Unified answer-control props, documented here and mirrored by every control
 * in this folder (see `AnswerComponentProps` in `registry.ts`):
 *
 * - `answer` — the round's full `AnswerSpec`, narrowed by kind inside the control.
 * - `onSubmit` — the one way out: the control emits an `AnswerSubmission` whose
 *   kind matches `answer.kind`, and `GameShell` feeds it straight to the
 *   machine's `submit`. Controls submit exactly what they display.
 * - `revealed` — while true the control is locked (no emission, no editing).
 * - `submission` — the machine's stored submission for this round, or null
 *   before the learner has answered; the control reflects it when present.
 */
export interface ChoicesAnswerProps {
  answer: AnswerSpec;
  onSubmit: (submission: AnswerSubmission) => void;
  revealed?: boolean;
  submission?: AnswerSubmission | null;
}

/**
 * Multiple-choice control. Options are native `<button>` elements, so keyboard
 * activation (Enter/Space) and focus work without any wiring, and `disabled`
 * locks them structurally once the round is revealed. The selected option is
 * derived from the stored submission, not from local state, so the control
 * always shows what the machine judged. The kind check is defensive so a
 * registry mistake fails loud instead of rendering empty.
 */
export default function ChoicesAnswer(props: ChoicesAnswerProps) {
  const locked = () => props.revealed === true;

  const selectedIndex = () => {
    const submission = props.submission;
    return submission?.kind === "choices" ? submission.selectedIndex : null;
  };

  const options = () => {
    const answer = props.answer;
    if (answer.kind !== "choices") {
      throw new Error(
        `ChoicesAnswer: expected answer kind "choices", got "${answer.kind}"`,
      );
    }
    return answer.options;
  };

  return (
    <ul class="choices">
      <For each={options()}>
        {(option, index) => (
          <li class="choices__item">
            <button
              type="button"
              class="choices__button"
              disabled={locked()}
              data-selected={String(selectedIndex() === index())}
              onClick={() => {
                if (locked()) return;
                props.onSubmit({ kind: "choices", selectedIndex: index() });
              }}
            >
              {option}
            </button>
          </li>
        )}
      </For>
    </ul>
  );
}

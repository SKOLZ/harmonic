import { For, mergeProps } from "solid-js";
import type { AnswerSpec } from "../../lib/rounds/types";

export interface ChoicesAnswerProps {
  answer: AnswerSpec;
  /** Set once the round is revealed so the control locks. */
  disabled?: boolean;
  /** Currently selected option index, or null before any choice. */
  selectedIndex?: number | null;
  /** Reports the chosen option index. */
  onSelect: (index: number) => void;
}

/**
 * Multiple-choice control. Options are native `<button>` elements, so keyboard
 * activation (Enter/Space) and focus work without any wiring. The kind check is
 * defensive so a registry mistake fails loud instead of rendering empty.
 */
export default function ChoicesAnswer(props: ChoicesAnswerProps) {
  // Defaults first: mergeProps resolves the last source first, so props (second)
  // must win over the defaults (first) when they are defined.
  const resolved = mergeProps(
    { disabled: false, selectedIndex: null as number | null },
    props,
  );

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
              disabled={resolved.disabled}
              data-selected={String(resolved.selectedIndex === index())}
              onClick={() => resolved.onSelect(index())}
            >
              {option}
            </button>
          </li>
        )}
      </For>
    </ul>
  );
}

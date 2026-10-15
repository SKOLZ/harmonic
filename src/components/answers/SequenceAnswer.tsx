import { createSignal, For } from "solid-js";
import type { AnswerSpec, AnswerSubmission } from "../../lib/rounds/types";

/** Unified answer-control props — see `ChoicesAnswerProps` for the contract. */
export interface SequenceAnswerProps {
  answer: AnswerSpec;
  onSubmit: (submission: AnswerSubmission) => void;
  revealed?: boolean;
  submission?: AnswerSubmission | null;
}

/** One tray item: its position in `correctOrder` plus its display label. */
interface PoolItem {
  index: number;
  label: string;
}

/**
 * Fisher–Yates shuffle. The tray must not present items in answer order —
 * `correctOrder` is the only pool data the contract carries, so showing it
 * verbatim would turn every sequence round into "click left to right".
 */
function shuffled(items: readonly PoolItem[]): PoolItem[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Ordering control for `{ kind: "sequence", correctOrder }`.
 *
 * The available items start in a shuffled tray; clicking one moves it into a
 * visible ordered `<ol>`, Undo takes back the last placement and Reset empties
 * the list. Confirm emits `{ kind: "sequence", order }` with the labels in the
 * learner's chosen order (the machine judges order strictly).
 *
 * Placements are tracked as pool indexes rather than labels, so duplicated
 * labels ("C4" twice) stay two independently placeable items. The in-progress
 * order lives in local state so it survives a retry, while a stored submission
 * wins the display during a reveal. Locking is structural: every tray button
 * and every action button carries `disabled` while revealed.
 *
 * The kind check is defensive so a registry mistake fails loud instead of
 * rendering an input for the wrong round.
 */
export default function SequenceAnswer(props: SequenceAnswerProps) {
  if (props.answer.kind !== "sequence") {
    throw new Error(
      `SequenceAnswer: expected answer kind "sequence", got "${props.answer.kind}"`,
    );
  }
  const correctOrder = props.answer.correctOrder;

  const pool = shuffled(correctOrder.map((label, index) => ({ index, label })));
  const [picked, setPicked] = createSignal<number[]>([]);

  /** Map a stored submission's labels back to pool indexes (occurrence-wise). */
  function poolIndexesFor(order: readonly string[]): number[] {
    const used = new Set<number>();
    const indexes: number[] = [];
    for (const label of order) {
      const match = correctOrder.findIndex(
        (candidate, index) => !used.has(index) && candidate === label,
      );
      if (match !== -1) {
        used.add(match);
        indexes.push(match);
      }
    }
    return indexes;
  }

  /** What the learner sees is what the learner submits. */
  const placedIndexes = () => {
    const submission = props.submission;
    return submission?.kind === "sequence"
      ? poolIndexesFor(submission.order)
      : picked();
  };

  const placedSet = () => new Set(placedIndexes());
  const remaining = () => pool.filter((item) => !placedSet().has(item.index));
  const orderedLabels = () => placedIndexes().map((index) => correctOrder[index]);

  const locked = () => props.revealed === true;
  const hasPlacement = () => placedIndexes().length > 0;

  function place(item: PoolItem): void {
    if (locked()) return;
    setPicked((current) =>
      current.includes(item.index) ? current : [...current, item.index],
    );
  }

  function undo(): void {
    if (locked()) return;
    setPicked((current) => current.slice(0, -1));
  }

  function reset(): void {
    if (locked()) return;
    setPicked([]);
  }

  function confirm(): void {
    if (locked()) return;
    props.onSubmit({ kind: "sequence", order: orderedLabels() });
  }

  return (
    <div class="sequence-answer">
      <ul class="sequence-answer__available" aria-label="Available items">
        <For each={remaining()}>
          {(item) => (
            <li>
              <button
                type="button"
                class="sequence-answer__item"
                disabled={locked()}
                onClick={() => place(item)}
              >
                {item.label}
              </button>
            </li>
          )}
        </For>
      </ul>
      <ol class="sequence-answer__order" aria-label="Your answer order">
        <For each={orderedLabels()}>{(label) => <li>{label}</li>}</For>
      </ol>
      <div class="sequence-answer__actions">
        <button
          type="button"
          class="sequence-answer__undo"
          disabled={locked() || !hasPlacement()}
          onClick={undo}
        >
          Undo
        </button>
        <button
          type="button"
          class="sequence-answer__reset"
          disabled={locked() || !hasPlacement()}
          onClick={reset}
        >
          Reset
        </button>
        <button
          type="button"
          class="sequence-answer__confirm"
          disabled={locked()}
          onClick={confirm}
        >
          Confirm
        </button>
      </div>
    </div>
  );
}

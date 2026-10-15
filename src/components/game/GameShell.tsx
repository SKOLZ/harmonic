import { createSignal, mergeProps, Show } from "solid-js";
import { Dynamic } from "solid-js/web";
import { getAnswerComponent } from "../answers/registry";
import { getPromptComponent } from "../prompts/registry";
import { progress, UNLOCK_THRESHOLD } from "../../lib/progress";
import type { AnswerSubmission, Round } from "../../lib/rounds/types";
import {
  advance,
  isUnlocked,
  retry,
  start,
  submit,
  type MachineState,
} from "./roundMachine";

export interface GameShellProps {
  /** Catalog lesson id as a route string; the progress store keys on Number(id). */
  lessonId: string;
  lessonTitle: string;
  rounds: Round[];
  onExit?: () => void;
}

/**
 * The round loop: prompt → answer control → immediate feedback (correct answer
 * + rule) → Retry (wrong) or Next/Finish (correct). Drives the pure
 * roundMachine; persistence happens only through recordCorrect, called exactly
 * where a submit transition reports a correct answer.
 *
 * One submit path for every answer kind: the control is resolved from
 * `answerRegistry` by `round.answer.kind` and emits an `AnswerSubmission`
 * through `handleSubmit`, so the shell never builds a submission itself —
 * the machine judges everything by value.
 */
export default function GameShell(props: GameShellProps) {
  // Defaults first: mergeProps resolves the last source first, so props (second)
  // must win over the defaults (first) when they are defined.
  const resolved = mergeProps(
    { onExit: undefined as (() => void) | undefined },
    props,
  );

  const lessonNumber = () => Number(props.lessonId);

  const [state, setState] = createSignal<MachineState>(start(props.rounds));
  const [completed, setCompleted] = createSignal(
    progress.completedRounds(lessonNumber()),
  );

  /**
   * The single submit path shared by all four answer controls: the control
   * emits an `AnswerSubmission`, `submit` judges it by value (and throws on a
   * kind mismatch), and progress records only what the machine reports as
   * correct — nowhere else.
   */
  function handleSubmit(submission: AnswerSubmission) {
    const current = state();
    if (current.phase !== "answering") return;
    const next = submit(current, submission, props.rounds[current.roundIndex]);
    setState(next);
    if (next.wasCorrect) {
      progress.recordCorrect(lessonNumber());
      setCompleted(progress.completedRounds(lessonNumber()));
    }
  }

  function handleRetry() {
    setState(retry(state()));
  }

  function handleAdvance() {
    setState(advance(state(), props.rounds.length));
  }

  function handleExit() {
    resolved.onExit?.();
  }

  const round = () => props.rounds[state().roundIndex];
  const isLastRound = () => state().roundIndex + 1 >= props.rounds.length;
  /**
   * Keyed identity of the round on screen. The keyed `Show` in the render
   * disposes and remounts the prompt/answer/feedback branch only when this
   * changes (a new round), so every control starts fresh — no draft, no
   * placement, no typed text carried over — while reveals and retries keep
   * the branch mounted and an in-progress draft alive. The round id rides
   * along so a swapped `rounds` array with a stable index still remounts.
   */
  const roundKey = () => `${state().roundIndex}:${round().id}`;

  return (
    <section class="game-shell">
      <header class="game-shell__header">
        <h1 class="game-shell__title">{props.lessonTitle}</h1>
        <p class="game-shell__progress">
          {completed()}/{UNLOCK_THRESHOLD} rounds completed
        </p>
        <Show when={isUnlocked(state().correctCount)}>
          <p class="game-shell__unlocked">Next lesson unlocked!</p>
        </Show>
        <Show when={resolved.onExit}>
          <button type="button" class="game-shell__exit" onClick={handleExit}>
            Exit
          </button>
        </Show>
      </header>

      <Show
        when={state().phase !== "complete"}
        fallback={
          <p class="game-shell__finished">
            Lesson complete: {state().correctCount} correct out of {props.rounds.length}.
          </p>
        }
      >
        <div class="game-shell__round">
          <Show keyed when={roundKey()}>
            {(_roundKey) => (
              <>
                <Dynamic
                  component={getPromptComponent(round().prompt.kind)}
                  prompt={round().prompt}
                />
                {/* Single submit path: registry-resolved control → one onSubmit → machine. */}
                <Dynamic
                  component={getAnswerComponent(round().answer.kind)}
                  answer={round().answer}
                  revealed={state().phase === "revealed"}
                  submission={state().submission}
                  onSubmit={handleSubmit}
                />
                <Show when={state().phase === "revealed" && state().feedback}>
                  {(feedback) => (
                    <section class="game-shell__feedback" data-correct={String(feedback().correct)}>
                      <p class="game-shell__verdict">
                        {feedback().correct ? "Correct!" : "Not quite."}
                      </p>
                      <p class="game-shell__expected">
                        Correct answer: <strong>{feedback().expected}</strong>
                      </p>
                      <p class="game-shell__rule">{feedback().rule}</p>
                      <Show
                        when={!state().wasCorrect}
                        fallback={
                          <button type="button" class="game-shell__next" onClick={handleAdvance}>
                            {isLastRound() ? "Finish" : "Next"}
                          </button>
                        }
                      >
                        <button type="button" class="game-shell__retry" onClick={handleRetry}>
                          Retry
                        </button>
                      </Show>
                    </section>
                  )}
                </Show>
              </>
            )}
          </Show>
        </div>
      </Show>
    </section>
  );
}

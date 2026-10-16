import { createSignal, mergeProps, Show, Suspense } from "solid-js";
import { Dynamic } from "solid-js/web";
import { getAnswerComponent } from "../answers/registry";
import { getPromptComponent } from "../prompts/registry";
import { progress, UNLOCK_THRESHOLD } from "../../lib/progress";
import { drawRun } from "../../lib/rounds/draw";
import type { AnswerSubmission, Round } from "../../lib/rounds/types";
import {
  advance,
  isUnlocked,
  start,
  submit,
  timeout,
  type MachineState,
} from "./roundMachine";
import { createQuestionCountdown } from "./questionCountdown";
import { remainingSeconds } from "./timer";

export interface GameShellProps {
  /** Catalog lesson id as a route string; the progress store keys on Number(id). */
  lessonId: string;
  lessonTitle: string;
  /** The lesson's generated pool (>= UNLOCK_THRESHOLD rounds); the shell draws the run from it. */
  rounds: Round[];
  /**
   * A fresh pool for the next run, produced by the lesson's generator. Called
   * only when a failed run restarts, so answering — correctly or not — never
   * re-generates questions; a miss and its restart are two distinct moments.
   */
  regenerate?: () => Round[];
  onExit?: () => void;
}

/**
 * The round loop: prompt → answer control → immediate feedback (correct answer
 * + rule) → Next/Finish (correct) or Start over (a miss). Drives the pure
 * roundMachine; persistence happens only through recordCorrect on a correct
 * answer and resetStreak on a miss.
 *
 * Streak rule: the run is a draw of UNLOCK_THRESHOLD rounds, one wrong answer
 * or one expired countdown fails the whole run (streak wiped to zero), and the
 * restart draws a fresh randomized set — a learner cannot grind past a lesson.
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

  // Which rounds the learner plays: a draw of UNLOCK_THRESHOLD from the pool.
  const [runRounds, setRunRounds] = createSignal<Round[]>(
    drawRun(props.rounds, UNLOCK_THRESHOLD),
  );
  // Run generation: bumping it remounts the round branch even when a restart
  // re-draws the same pool with the same round ids, so no draft or placement
  // ever survives into the fresh run.
  const [runId, setRunId] = createSignal(0);

  const [state, setState] = createSignal<MachineState>(start(runRounds()));
  const [streak, setStreak] = createSignal(progress.streak(lessonNumber()));

  /**
   * The one failure path in the shell, mirroring the machine's shared `fail`:
   * a wrong answer and an expired clock both land here and wipe the persisted
   * streak, so nothing partial survives a miss. The fresh set is drawn later,
   * when the learner starts over.
   */
  function endRun() {
    progress.resetStreak(lessonNumber());
    setStreak(progress.streak(lessonNumber()));
  }

  /**
   * The single submit path shared by all four answer controls: the control
   * emits an `AnswerSubmission`, `submit` judges it by value (and throws on a
   * kind mismatch), and progress records only what the machine reports as
   * correct — nowhere else.
   */
  function handleSubmit(submission: AnswerSubmission) {
    const current = state();
    if (current.phase !== "answering") return;
    const next = submit(current, submission, runRounds()[current.roundIndex]);
    setState(next);
    if (next.wasCorrect) {
      progress.recordCorrect(lessonNumber());
      setStreak(progress.streak(lessonNumber()));
    } else {
      endRun();
    }
  }

  /** The clock ran out: same failure path as a wrong answer, no submission kept. */
  function handleTimeout() {
    const current = state();
    if (current.phase !== "answering") return;
    setState(timeout(current, runRounds()[current.roundIndex]));
    endRun();
  }

  function handleAdvance() {
    setState(advance(state(), runRounds().length));
  }

  /** Restart after a miss: draw the fresh set, then begin the run at zero. */
  function handleStartOver() {
    const pool = props.regenerate ? props.regenerate() : props.rounds;
    const fresh = drawRun(pool, UNLOCK_THRESHOLD);
    setRunRounds(fresh);
    setRunId((id) => id + 1);
    setState(start(fresh));
  }

  function handleExit() {
    resolved.onExit?.();
  }

  // The countdown is the shared per-question clock: it re-arms on every new
  // run/round/phase, runs only while `answering`, and calls handleTimeout —
  // the same failure path a wrong answer takes — when the deadline passes.
  const remainingMs = createQuestionCountdown(
    () => `${runId()}:${state().roundIndex}:${state().phase}`,
    () => state().phase === "answering",
    handleTimeout,
  );

  const round = () => runRounds()[state().roundIndex];
  const isLastRound = () => state().roundIndex + 1 >= runRounds().length;
  /** Revealed or failed: the control is locked either way — a miss cannot be re-answered. */
  const locked = () => state().phase === "revealed" || state().phase === "failed";
  const feedbackShown = () =>
    (state().phase === "revealed" || state().phase === "failed") && state().feedback !== null;
  /**
   * Keyed identity of the run + round on screen. The keyed `Show` in the render
   * disposes and remounts the prompt/answer/feedback branch only when this
   * changes (a new round, or a new run), so every control starts fresh — no
   * draft, no placement, no typed text carried over — while reveals keep the
   * branch mounted. The round id rides along so a swapped round array with a
   * stable index still remounts.
   */
  const roundKey = () => `${runId()}:${state().roundIndex}:${round().id}`;

  return (
    <section class="game-shell">
      <header class="game-shell__header">
        <h1 class="game-shell__title">{props.lessonTitle}</h1>
        <p class="game-shell__progress">
          {streak()}/{UNLOCK_THRESHOLD} in a row
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
            Lesson complete: {state().correctCount} correct out of {runRounds().length}.
          </p>
        }
      >
        <div class="game-shell__round">
          <Show when={state().phase === "answering"}>
            {/* Visible countdown for the current question. Structural text only:
                the timer never names the answer, so the no-answer-leak aria
                contract is untouched; aria-live is off so ticks are not read
                out every quarter-second. */}
            <p class="game-shell__timer" role="timer" aria-live="off">
              {remainingSeconds(remainingMs())}s
            </p>
          </Show>
          <Show keyed when={roundKey()}>
            {(_roundKey) => (
              <>
                {/* Scoped Suspense: only the prompt waits on the lazy staff
                    chunk. Answer controls and feedback render immediately, so
                    a text/choices round is never delayed by VexFlow loading. */}
                <Suspense fallback={null}>
                  <Dynamic
                    component={getPromptComponent(round().prompt.kind)}
                    prompt={round().prompt}
                  />
                </Suspense>
                {/* Single submit path: registry-resolved control → one onSubmit → machine. */}
                <Dynamic
                  component={getAnswerComponent(round().answer.kind)}
                  answer={round().answer}
                  revealed={locked()}
                  submission={state().submission}
                  onSubmit={handleSubmit}
                />
                <Show when={feedbackShown() && state().feedback}>
                  {(feedback) => (
                    <section class="game-shell__feedback" data-correct={String(feedback().correct)}>
                      <p class="game-shell__verdict">
                        {feedback().correct
                          ? "Correct!"
                          : state().miss === "timeout"
                            ? "Time's up."
                            : "Not quite."}
                      </p>
                      <p class="game-shell__expected">
                        Correct answer: <strong>{feedback().expected}</strong>
                      </p>
                      <p class="game-shell__rule">{feedback().rule}</p>
                      <Show
                        when={state().phase === "failed"}
                        fallback={
                          <button type="button" class="game-shell__next" onClick={handleAdvance}>
                            {isLastRound() ? "Finish" : "Next"}
                          </button>
                        }
                      >
                        <p class="game-shell__missed">
                          That misses the run: progress is back to 0/{UNLOCK_THRESHOLD}.
                        </p>
                        <button type="button" class="game-shell__restart" onClick={handleStartOver}>
                          Start over
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

import { createSignal, mergeProps, Show, Suspense } from "solid-js";
import { Dynamic } from "solid-js/web";
import NotePickAnswer from "../answers/NotePickAnswer";
import { getPromptComponent } from "../prompts/registry";
import {
  drawPracticeRound,
  PRACTICE_END_NOTE,
  PRACTICE_START_NOTE,
} from "../../lib/rounds/practice";
import type { AnswerSubmission, Round } from "../../lib/rounds/types";
import { advance, start, submit, timeout, type MachineState } from "./roundMachine";
import { createQuestionCountdown } from "./questionCountdown";
import { remainingSeconds } from "./timer";

export interface PracticeShellProps {
  /** Heading above the run. */
  title?: string;
  /**
   * Draws the next question. It receives the pitch that is on screen (the
   * round just answered, or the round just missed on when restarting) so a
   * draw can never repeat it immediately; `undefined` is the very first draw
   * of a session. Defaults to {@link drawPracticeRound} with `Math.random`;
   * tests inject a scripted draw so the pitch on screen is never a guess.
   */
  draw?: (previousPitch: string | undefined) => Round;
}

/**
 * One run: its identity, the rounds drawn so far, and the machine's view of
 * them. Held in a single signal because a restart *replaces* the round list
 * while the machine's index still points into the old one — two signals would
 * leave a window where the render can read past the end of a shorter array.
 */
interface Run {
  /** Bumping this remounts the round branch, so no draft survives a restart. */
  id: number;
  rounds: Round[];
  machine: MachineState;
}

/**
 * T4's endless "guess the note" run: one note on a staff, a countdown, and a
 * keyboard to name it — until you miss. The score is the number of questions
 * answered correctly before the miss; there is no completion state, only the
 * miss and a fresh run.
 *
 * It reuses the lesson shell's machinery rather than growing a parallel one:
 * the same `roundMachine` judges every submission (`submit` and `timeout`
 * both land in that module's single `fail`), the same registries render the
 * prompt, the same `createQuestionCountdown` runs the clock, and the answer
 * control is the shared `NotePickAnswer` — widened only by the practice
 * keyboard's range, so a bass-clef note has a key to be picked on.
 *
 * Two invariants this component exists to keep:
 * - **No progress I/O.** Nothing here imports the progress store or the
 *   catalog, so a practice run can never touch a lesson streak, the unlock
 *   chain, or the 39-lesson pool. The mode is outside the chain by
 *   construction, not by remembering to skip the writes.
 * - **No answer leak.** The prompt goes through the staff registry entry,
 *   whose aria label is structural only (clef, glyph count) — the pitch on
 *   the staff is the question, so it is never spoken.
 */
export default function PracticeShell(props: PracticeShellProps) {
  const resolved = mergeProps(
    {
      title: "Guess the Note",
      draw: (previousPitch: string | undefined) =>
        drawPracticeRound(previousPitch, Math.random),
    },
    props,
  );

  /** The pitch a round puts on screen, if it is a staff round. */
  function pitchOf(round: Round | undefined): string | undefined {
    if (round === undefined || round.prompt.kind !== "staff") return undefined;
    return round.prompt.notes[0];
  }

  function drawAfter(round: Round | undefined): Round {
    return resolved.draw(pitchOf(round));
  }

  // The run is a growing list, not a fixed one: every correct answer appends
  // the next question, so `advance` can never reach the machine's `complete`
  // phase and the run is endless by construction.
  const firstRound = drawAfter(undefined);
  const [run, setRun] = createSignal<Run>({
    id: 0,
    rounds: [firstRound],
    machine: start([firstRound]),
  });
  /**
   * Correct answers this run. Kept beside the machine rather than read off
   * `machine.correctCount`, because the machine zeroes its counter on a miss
   * (a lesson streak must reset) and the practice score must survive the
   * miss to be shown on the run-over panel.
   */
  const [score, setScore] = createSignal(0);

  const round = () => run().rounds[run().machine.roundIndex];

  /**
   * The single submit path: the control emits an `AnswerSubmission`, the
   * machine judges it by value, and a wrong one fails the run through the
   * same `fail` an expired clock takes. Nothing writes to lesson progress.
   */
  function handleSubmit(submission: AnswerSubmission) {
    const current = run();
    if (current.machine.phase !== "answering") return;
    const machine = submit(
      current.machine,
      submission,
      current.rounds[current.machine.roundIndex],
    );
    setRun({ ...current, machine });
    if (machine.wasCorrect) {
      setScore((value) => value + 1);
    }
  }

  /** The clock ran out: the machine's shared failure path, no submission kept. */
  function handleTimeout() {
    const current = run();
    if (current.machine.phase !== "answering") return;
    setRun({
      ...current,
      machine: timeout(current.machine, current.rounds[current.machine.roundIndex]),
    });
  }

  /** Reveal → next question: draw the successor first so the run never completes. */
  function handleAdvance() {
    const current = run();
    const rounds =
      current.machine.roundIndex + 1 >= current.rounds.length
        ? [...current.rounds, drawAfter(current.rounds[current.machine.roundIndex])]
        : current.rounds;
    setRun({ ...current, rounds, machine: advance(current.machine, rounds.length) });
  }

  /** A miss ends the run: score to zero, one fresh question, same clock re-armed. */
  function handleRestart() {
    const current = run();
    const rounds = [drawAfter(current.rounds[current.rounds.length - 1])];
    setRun({ id: current.id + 1, rounds, machine: start(rounds) });
    setScore(0);
  }

  const remainingMs = createQuestionCountdown(
    () => `${run().id}:${run().machine.roundIndex}:${run().machine.phase}`,
    () => run().machine.phase === "answering",
    handleTimeout,
  );

  /** Revealed or failed: the control is locked either way — a miss cannot be re-answered. */
  const locked = () =>
    run().machine.phase === "revealed" || run().machine.phase === "failed";
  const feedbackShown = () => {
    const machine = run().machine;
    return (
      (machine.phase === "revealed" || machine.phase === "failed") &&
      machine.feedback !== null
    );
  };
  /**
   * Keyed identity of the round on screen. The run array only ever grows
   * inside a run, so run + index is enough — unlike the lesson shell, no pool
   * is re-drawn under a live index — and the run id covers a restart.
   */
  const roundKey = () => `${run().id}:${run().machine.roundIndex}`;

  return (
    <section class="game-shell practice-shell">
      <header class="game-shell__header">
        <h1 class="game-shell__title">{resolved.title}</h1>
        <p class="practice-shell__score">Score: {score()}</p>
      </header>

      <div class="game-shell__round">
        <Show when={run().machine.phase === "answering"}>
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
                  chunk. The keyboard answer renders immediately, so the
                  notation engine never delays the control. */}
              <Suspense fallback={null}>
                <Dynamic
                  component={getPromptComponent(round().prompt.kind)}
                  prompt={round().prompt}
                />
              </Suspense>
              {/* The practice answer is always a single key picked on the piano.
                  NotePickAnswer's own kind check fails loud if a draw ever
                  hands it something else. The range is the practice keyboard's,
                  not the default two octaves, so bass notes are pickable. */}
              <NotePickAnswer
                answer={round().answer}
                revealed={locked()}
                submission={run().machine.submission}
                onSubmit={handleSubmit}
                startNote={PRACTICE_START_NOTE}
                endNote={PRACTICE_END_NOTE}
              />
              <Show when={feedbackShown() && run().machine.feedback}>
                {(feedback) => (
                  <section class="game-shell__feedback" data-correct={String(feedback().correct)}>
                    <p class="game-shell__verdict">
                      {feedback().correct
                        ? "Correct!"
                        : run().machine.miss === "timeout"
                          ? "Time's up."
                          : "Not quite."}
                    </p>
                    <p class="game-shell__expected">
                      Correct answer: <strong>{feedback().expected}</strong>
                    </p>
                    <p class="game-shell__rule">{feedback().rule}</p>
                    <Show
                      when={run().machine.phase === "failed"}
                      fallback={
                        <button type="button" class="game-shell__next" onClick={handleAdvance}>
                          Next
                        </button>
                      }
                    >
                      <p class="practice-shell__final">Run over — you scored {score()}.</p>
                      <button type="button" class="game-shell__restart" onClick={handleRestart}>
                        Play again
                      </button>
                    </Show>
                  </section>
                )}
              </Show>
            </>
          )}
        </Show>
      </div>
    </section>
  );
}

import { createEffect, createSignal, on, onCleanup } from "solid-js";
import { QUESTION_TIME_MS, TIMER_TICK_MS } from "./timer";

/**
 * The per-question countdown GameShell and the endless practice shell share.
 *
 * Exactly one implementation exists so "the timer" cannot drift between the
 * lesson run and the practice run: both draw their duration from
 * `QUESTION_TIME_MS`, both tick on `TIMER_TICK_MS`, and both call `onExpire`
 * — which, in either shell, is the shared failure path that a wrong answer
 * also takes. The expiry is checked against a wall-clock deadline rather
 * than by counting ticks, so a slow or throttled interval still fails the
 * question on time instead of silently extending it.
 *
 * - `key` re-arms the countdown whenever it changes (run, round, phase).
 * - `running` decides whether the armed countdown actually counts: it is
 *   false on every phase except `answering`, so a reveal or a miss stops the
 *   clock and an expired deadline can never fail a round already judged.
 * - `onExpire` fires once, on the tick that crosses the deadline.
 *
 * Returns the live signal of milliseconds remaining, for the visible readout.
 */
export function createQuestionCountdown(
  key: () => string,
  running: () => boolean,
  onExpire: () => void,
): () => number {
  const [remainingMs, setRemainingMs] = createSignal(QUESTION_TIME_MS);

  let timerHandle: ReturnType<typeof setInterval> | undefined;
  function stopTimer(): void {
    if (timerHandle !== undefined) {
      clearInterval(timerHandle);
      timerHandle = undefined;
    }
  }

  createEffect(
    on(key, () => {
      stopTimer();
      if (!running()) return;
      setRemainingMs(QUESTION_TIME_MS);
      const deadline = Date.now() + QUESTION_TIME_MS;
      timerHandle = setInterval(() => {
        const left = deadline - Date.now();
        if (left <= 0) {
          stopTimer();
          setRemainingMs(0);
          onExpire();
          return;
        }
        setRemainingMs(left);
      }, TIMER_TICK_MS);
    }),
  );
  onCleanup(stopTimer);

  return remainingMs;
}

/**
 * The per-question countdown, configured in exactly one place.
 *
 * 20 seconds per lesson question: these rounds are single-fact recall (name a
 * note, pick a duration, spell a triad) that a ready learner answers in a few
 * seconds, so 20s is several times the comfortable answer time — enough to
 * read the prompt, think, and aim at a staff or keyboard, tight enough that
 * stalling instead of answering fails the run. T4's endless mode reuses this
 * constant rather than inventing its own.
 */
export const QUESTION_TIME_MS = 20_000;

/** How often the visible countdown refreshes; expiry is checked on each tick. */
export const TIMER_TICK_MS = 250;

/** Whole seconds left to show, rounded up so the display starts at the full duration. */
export function remainingSeconds(remainingMs: number): number {
  return Math.max(0, Math.ceil(remainingMs / 1000));
}

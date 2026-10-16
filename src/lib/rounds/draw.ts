import type { Round } from "./types";

/**
 * The run the learner plays: at most `count` rounds taken from a pool that a
 * lesson module already generated and validated (`generateRounds` draws at
 * least 12 from a much larger question pool).
 *
 * The shell — not the lesson — decides which rounds are played and what a miss
 * costs. Selection is a Fisher–Yates shuffle driven by `rng` followed by a
 * slice, so a 12-round pool yields a different ten on every draw. A pool that
 * already fits the run is returned as generated, order included: the module
 * randomized it, and re-shuffling a set the learner is about to play in full
 * would only break the order the tests (and the generator) already pinned.
 *
 * `rng` defaults to `Math.random`; the shell draws fresh rounds from a fresh
 * generator call on every restart, so nothing here needs a seed to be fresh.
 */
export function drawRun(
  pool: readonly Round[],
  count: number,
  rng: () => number = Math.random,
): Round[] {
  if (count >= pool.length) {
    return [...pool];
  }
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const swap = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = swap;
  }
  return shuffled.slice(0, count);
}

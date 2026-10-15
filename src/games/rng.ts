import { validateRounds } from "../lib/rounds/validate";
import type { PromptSpec, Round } from "../lib/rounds/types";

/**
 * Deterministic randomness for round generation.
 *
 * Every lesson module draws its rounds through this helper, so a seed fully
 * determines the output: runtime and tests share one implementation and a test
 * that pins a seed pins the exact round list a learner would see.
 *
 * `createRng` is mulberry32 — a well-known 32-bit generator with a uniform
 * [0, 1) output, tiny state, and a period of 2^32. The seed is any number; it
 * is coerced to an unsigned 32-bit integer (`seed >>> 0`), so `createRng(42)`
 * and `createRng(42.7)` draw the same sequence. Different seeds diverge
 * immediately on the first draw.
 */
export function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Draw `count` distinct rounds from `pool` with a Fisher–Yates shuffle driven
 * by `rng`: same seed → same draw, different seed → different draw. The draw is
 * validated with `validateRounds` before it is returned, so a pool with
 * duplicate choices, an out-of-range `correctIndex`, or a malformed rule fails
 * here — at generation — instead of mid-play.
 */
export function sampleRounds(
  pool: readonly Round[],
  rng: () => number,
  count: number,
): Round[] {
  if (count > pool.length) {
    throw new Error(
      `sampleRounds: cannot draw ${count} rounds from a pool of ${pool.length}`,
    );
  }
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const swap = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = swap;
  }
  const drawn = shuffled.slice(0, count);
  validateRounds(drawn);
  return drawn;
}

/**
 * Draw `count` distinct rounds so the result *always* contains at least one
 * round of each prompt kind in `requiredKinds`, filling the remaining slots
 * from the whole pool.
 *
 * Why this exists next to {@link sampleRounds}: plain sampling only mixes two
 * kinds by pigeonhole while every *other* kind together is smaller than the
 * draw — the established 11-staff + 11-text pools make every 12-draw contain
 * both kinds, but a single keyboard round in the pool opens the legal draw
 * "11 staff + 1 keyboard" with no text round at all, so the guarantee would
 * silently become probabilistic. Stratifying keeps it structural once
 * keyboard rounds join the pool: one round is taken per required kind first,
 * then the rest is drawn from what remains, and a final shuffle removes any
 * fixed ordering without touching membership. Same seed → same draw, like
 * every other generator in this directory.
 */
export function sampleStratifiedRounds(
  pool: readonly Round[],
  requiredKinds: readonly PromptSpec["kind"][],
  rng: () => number,
  count: number,
): Round[] {
  if (count > pool.length) {
    throw new Error(
      `sampleStratifiedRounds: cannot draw ${count} rounds from a pool of ${pool.length}`,
    );
  }
  if (requiredKinds.length > count) {
    throw new Error(
      `sampleStratifiedRounds: cannot guarantee ${requiredKinds.length} kinds in a draw of ${count}`,
    );
  }
  const remaining = [...pool];
  const selected: Round[] = [];
  for (const kind of requiredKinds) {
    const candidates = remaining
      .map((round, index) => (round.prompt.kind === kind ? index : -1))
      .filter((index) => index >= 0);
    if (candidates.length === 0) {
      throw new Error(
        `sampleStratifiedRounds: pool holds no "${kind}" round to guarantee the kind`,
      );
    }
    const pick = candidates[Math.floor(rng() * candidates.length)]!;
    selected.push(remaining[pick]!);
    remaining.splice(pick, 1);
  }
  const assembled = selected.concat(sampleRounds(remaining, rng, count - selected.length));
  return sampleRounds(assembled, rng, count);
}

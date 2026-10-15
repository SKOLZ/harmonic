import type { Round } from "../lib/rounds/types";
import type { LessonEntry } from "./catalog";

/**
 * One lesson game: the catalog metadata it plays under plus the deterministic
 * round generator that supplies its questions.
 *
 * Contract for `generateRounds`:
 *
 * - **Deterministic given `rng`.** The generator may only draw randomness from
 *   the passed function (use `createRng` from `./rng`), so the same seed
 *   replays the same round list and tests can pin what a learner sees.
 * - **At least 12 rounds per call**, drawn from a larger question pool so
 *   different seeds replay different subsets. Use `sampleRounds` from `./rng`,
 *   which shuffles, slices, and validates in one step.
 * - **Every round passes `validateRound`** — distinct `choices` options, an in
 *   range `correctIndex`, a non-empty rule that states the music-theory fact
 *   the question demonstrates (never a bare "correct/incorrect").
 */
export interface LessonModule {
  entry: LessonEntry;
  generateRounds: (rng: () => number) => Round[];
}

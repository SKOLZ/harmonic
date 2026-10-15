import { lesson10 } from "./lesson10";
import { lesson11 } from "./lesson11";
import { lesson12 } from "./lesson12";
import { lesson13 } from "./lesson13";
import { lesson14 } from "./lesson14";
import { lesson20 } from "./lesson20";
import type { LessonModule } from "./types";

/**
 * lesson id → lesson module. The catalog stays the single ordered source of
 * truth for chain order; this registry only says which lessons currently have
 * a playable generator. Lessons still being built (15, 16, …) are absent
 * and fail loudly through `getLessonModule` rather than playing demo data.
 */
const modules: ReadonlyMap<number, LessonModule> = new Map<number, LessonModule>([
  [10, lesson10],
  [11, lesson11],
  [12, lesson12],
  [13, lesson13],
  [14, lesson14],
  [20, lesson20],
]);

/** The lesson ids that currently have a module; drives the contract tests. */
export function registeredLessonIds(): number[] {
  return [...modules.keys()];
}

/**
 * Look up the module for a lesson id. Unknown ids throw with the id and the
 * registered set in the message — a missing module is a wiring bug, not a
 * condition the learner should ever see.
 */
export function getLessonModule(id: number): LessonModule {
  const module = modules.get(id);
  if (module === undefined) {
    throw new Error(
      `getLessonModule: no lesson module registered for id ${id} (registered: ${registeredLessonIds().join(", ") || "none"})`,
    );
  }
  return module;
}

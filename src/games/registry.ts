import { lesson10 } from "./lesson10";
import { lesson11 } from "./lesson11";
import { lesson12 } from "./lesson12";
import { lesson13 } from "./lesson13";
import { lesson14 } from "./lesson14";
import { lesson15 } from "./lesson15";
import { lesson16 } from "./lesson16";
import { lesson20 } from "./lesson20";
import { lesson21 } from "./lesson21";
import { lesson22 } from "./lesson22";
import { lesson23 } from "./lesson23";
import { lesson24 } from "./lesson24";
import { lesson25 } from "./lesson25";
import { lesson30 } from "./lesson30";
import { lesson31 } from "./lesson31";
import { lesson32 } from "./lesson32";
import { lesson33 } from "./lesson33";
import { lesson40 } from "./lesson40";
import { lesson42 } from "./lesson42";
import { lesson43 } from "./lesson43";
import { lesson44 } from "./lesson44";
import { lesson45 } from "./lesson45";
import { lesson46 } from "./lesson46";
import { lesson47 } from "./lesson47";
import { lesson48 } from "./lesson48";
import { lesson49 } from "./lesson49";
import { lesson50 } from "./lesson50";
import { lesson51 } from "./lesson51";
import { lesson52 } from "./lesson52";
import type { LessonModule } from "./types";

/**
 * lesson id → lesson module. The catalog stays the single ordered source of
 * truth for chain order; this registry only says which lessons currently have
 * a playable generator. Lessons still being built (53, …) are absent and
 * fail loudly through `getLessonModule` rather than playing demo data.
 */
const modules: ReadonlyMap<number, LessonModule> = new Map<number, LessonModule>([
  [10, lesson10],
  [11, lesson11],
  [12, lesson12],
  [13, lesson13],
  [14, lesson14],
  [20, lesson20],
  [15, lesson15],
  [16, lesson16],
  [21, lesson21],
  [22, lesson22],
  [23, lesson23],
  [24, lesson24],
  [25, lesson25],
  [30, lesson30],
  [31, lesson31],
  [32, lesson32],
  [33, lesson33],
  [40, lesson40],
  [42, lesson42],
  [43, lesson43],
  [44, lesson44],
  [45, lesson45],
  [46, lesson46],
  [48, lesson48],
  [47, lesson47],
  [49, lesson49],
  [50, lesson50],
  [51, lesson51],
  [52, lesson52],
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

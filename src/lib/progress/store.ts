import type { LessonEntry } from "../../games/catalog";

export const UNLOCK_THRESHOLD = 10;
/**
 * v2 of the storage key: the counter's meaning changed from *cumulative*
 * correct rounds to the *current unbroken streak*. A persisted v1 value is a
 * cumulative count by construction — reading one as a streak would keep the
 * old "grind past a lesson" unlocks alive — so v1 data is abandoned rather
 * than reinterpreted, and every streak now starts at zero.
 */
export const PROGRESS_STORAGE_KEY = "piano-mt-learning-tool/progress/v2";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export type ProgressState = Readonly<Record<string, number>>;

export interface ProgressStore {
  /** The lesson's current unbroken streak of correct rounds. */
  streak(lessonId: number): number;
  /** Extend the streak by one: the round was answered correctly, in a row. */
  recordCorrect(lessonId: number): void;
  /** A miss wipes the lesson's streak: nothing partial survives a failure. */
  resetStreak(lessonId: number): void;
  isUnlocked(index: number, lessons: readonly LessonEntry[]): boolean;
}

function parseState(raw: string | null): ProgressState {
  if (raw === null || raw === "") return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
  const state: Record<string, number> = {};
  for (const [id, count] of Object.entries(parsed)) {
    if (typeof count !== "number" || !Number.isFinite(count) || count < 0) return {};
    state[id] = Math.floor(count);
  }
  return state;
}

export function createProgressStore(storage: StorageLike): ProgressStore {
  function read(): ProgressState {
    try {
      return parseState(storage.getItem(PROGRESS_STORAGE_KEY));
    } catch {
      // Storage access can throw (e.g. blocked or privacy mode); treat as empty.
      return {};
    }
  }

  function write(state: ProgressState): void {
    try {
      storage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Unwritable storage just means progress won't persist; never interrupt play.
    }
  }

  return {
    streak(lessonId) {
      return read()[String(lessonId)] ?? 0;
    },

    recordCorrect(lessonId) {
      const key = String(lessonId);
      const state = { ...read() };
      state[key] = (state[key] ?? 0) + 1;
      write(state);
    },

    resetStreak(lessonId) {
      const key = String(lessonId);
      const state = { ...read() };
      state[key] = 0;
      write(state);
    },

    isUnlocked(index, lessons) {
      if (index === 0) return true;
      if (index < 0 || index >= lessons.length) return false;
      return this.streak(lessons[index - 1].id) >= UNLOCK_THRESHOLD;
    },
  };
}

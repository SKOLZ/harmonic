import type { LessonEntry } from "../../games/catalog";

export const UNLOCK_THRESHOLD = 10;
export const PROGRESS_STORAGE_KEY = "piano-mt-learning-tool/progress/v1";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export type ProgressState = Readonly<Record<string, number>>;

export interface ProgressStore {
  completedRounds(lessonId: number): number;
  recordCorrect(lessonId: number): void;
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
    completedRounds(lessonId) {
      return read()[String(lessonId)] ?? 0;
    },

    recordCorrect(lessonId) {
      const key = String(lessonId);
      const state = { ...read() };
      state[key] = (state[key] ?? 0) + 1;
      write(state);
    },

    isUnlocked(index, lessons) {
      if (index === 0) return true;
      if (index < 0 || index >= lessons.length) return false;
      return this.completedRounds(lessons[index - 1].id) >= UNLOCK_THRESHOLD;
    },
  };
}

import { createProgressStore, type ProgressStore, type StorageLike } from "./store";

export * from "./store";

function browserStorage(): StorageLike {
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage;
  }
  // Non-browser environments get a throwaway in-memory shim.
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}

/** App-wide progress store, bound to localStorage when available. */
export const progress: ProgressStore = createProgressStore(browserStorage());

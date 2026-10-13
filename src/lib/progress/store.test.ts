import { describe, expect, it } from "vitest";
import { catalog } from "../../games/catalog";
import {
  PROGRESS_STORAGE_KEY,
  UNLOCK_THRESHOLD,
  createProgressStore,
  type StorageLike,
} from "./store";

function fakeStorage(seed: Record<string, string> = {}): StorageLike {
  const data = new Map(Object.entries(seed));
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}

describe("progress store", () => {
  it("starts with zero completed rounds when storage is empty", () => {
    const store = createProgressStore(fakeStorage());
    expect(store.completedRounds(10)).toBe(0);
  });

  it("round-trips progress through a new store instance on the same storage", () => {
    const storage = fakeStorage();
    const first = createProgressStore(storage);
    first.recordCorrect(10);
    first.recordCorrect(10);
    first.recordCorrect(11);

    const second = createProgressStore(storage);
    expect(second.completedRounds(10)).toBe(2);
    expect(second.completedRounds(11)).toBe(1);
    expect(second.completedRounds(12)).toBe(0);
  });

  it("falls back to empty state without throwing on corrupt JSON", () => {
    const storage = fakeStorage({ [PROGRESS_STORAGE_KEY]: "{not json" });
    const store = createProgressStore(storage);
    expect(() => store.completedRounds(10)).not.toThrow();
    expect(store.completedRounds(10)).toBe(0);
    expect(() => store.recordCorrect(10)).not.toThrow();
  });

  it("treats non-object JSON as empty state", () => {
    for (const raw of ["null", "[]", '"nope"', "42"]) {
      const store = createProgressStore(fakeStorage({ [PROGRESS_STORAGE_KEY]: raw }));
      expect(store.completedRounds(10)).toBe(0);
    }
  });

  it("discards stored entries that are not non-negative numbers", () => {
    const storage = fakeStorage({ [PROGRESS_STORAGE_KEY]: '{"10":"many"}' });
    const store = createProgressStore(storage);
    expect(store.completedRounds(10)).toBe(0);
  });

  it("recovers from corrupt state on the next recorded round", () => {
    const storage = fakeStorage({ [PROGRESS_STORAGE_KEY]: "{broken" });
    const store = createProgressStore(storage);
    store.recordCorrect(10);
    expect(store.completedRounds(10)).toBe(1);
  });
});

describe("unlock rule", () => {
  it("always unlocks the first lesson", () => {
    const store = createProgressStore(fakeStorage());
    expect(store.isUnlocked(0, catalog)).toBe(true);
  });

  it("keeps later lessons locked with zero progress on the previous lesson", () => {
    const store = createProgressStore(fakeStorage());
    expect(store.isUnlocked(1, catalog)).toBe(false);
  });

  it(`keeps the next lesson locked at ${UNLOCK_THRESHOLD - 1} completed rounds`, () => {
    const store = createProgressStore(fakeStorage());
    for (let i = 0; i < UNLOCK_THRESHOLD - 1; i++) {
      store.recordCorrect(catalog[0].id);
    }
    expect(store.completedRounds(catalog[0].id)).toBe(9);
    expect(store.isUnlocked(1, catalog)).toBe(false);
  });

  it(`unlocks the next lesson at exactly ${UNLOCK_THRESHOLD} completed rounds`, () => {
    const store = createProgressStore(fakeStorage());
    for (let i = 0; i < UNLOCK_THRESHOLD; i++) {
      store.recordCorrect(catalog[0].id);
    }
    expect(store.isUnlocked(1, catalog)).toBe(true);
  });

  it("ignores progress on lessons other than the previous one", () => {
    const store = createProgressStore(fakeStorage());
    for (let i = 0; i < UNLOCK_THRESHOLD; i++) {
      store.recordCorrect(catalog[1].id);
    }
    // catalog[1] is the previous lesson for index 2, so that one unlocks...
    expect(store.isUnlocked(2, catalog)).toBe(true);
    // ...but not for index 3, whose previous lesson is catalog[2].
    expect(store.isUnlocked(3, catalog)).toBe(false);
  });
});

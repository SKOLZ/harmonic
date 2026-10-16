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
  it("starts with a zero streak when storage is empty", () => {
    const store = createProgressStore(fakeStorage());
    expect(store.streak(10)).toBe(0);
  });

  it("round-trips each lesson's streak through a new store instance on the same storage", () => {
    const storage = fakeStorage();
    const first = createProgressStore(storage);
    first.recordCorrect(10);
    first.recordCorrect(10);
    first.recordCorrect(11);

    const second = createProgressStore(storage);
    expect(second.streak(10)).toBe(2);
    expect(second.streak(11)).toBe(1);
    expect(second.streak(12)).toBe(0);
  });

  it("falls back to empty state without throwing on corrupt JSON", () => {
    const storage = fakeStorage({ [PROGRESS_STORAGE_KEY]: "{not json" });
    const store = createProgressStore(storage);
    expect(() => store.streak(10)).not.toThrow();
    expect(store.streak(10)).toBe(0);
    expect(() => store.recordCorrect(10)).not.toThrow();
  });

  it("treats non-object JSON as empty state", () => {
    for (const raw of ["null", "[]", '"nope"', "42"]) {
      const store = createProgressStore(fakeStorage({ [PROGRESS_STORAGE_KEY]: raw }));
      expect(store.streak(10)).toBe(0);
    }
  });

  it("discards stored entries that are not non-negative numbers", () => {
    const storage = fakeStorage({ [PROGRESS_STORAGE_KEY]: '{"10":"many"}' });
    const store = createProgressStore(storage);
    expect(store.streak(10)).toBe(0);
  });

  it("recovers from corrupt state on the next recorded round", () => {
    const storage = fakeStorage({ [PROGRESS_STORAGE_KEY]: "{broken" });
    const store = createProgressStore(storage);
    store.recordCorrect(10);
    expect(store.streak(10)).toBe(1);
  });

  it("resetStreak zeroes a recorded streak and persists the reset", () => {
    const storage = fakeStorage();
    const store = createProgressStore(storage);
    store.recordCorrect(10);
    store.recordCorrect(10);
    store.recordCorrect(10);

    store.resetStreak(10);
    expect(store.streak(10)).toBe(0);

    // The wipe is durable: a fresh instance on the same storage sees zero.
    expect(createProgressStore(storage).streak(10)).toBe(0);
  });

  it("resetStreak leaves other lessons' streaks untouched", () => {
    const store = createProgressStore(fakeStorage());
    store.recordCorrect(10);
    store.recordCorrect(11);
    store.recordCorrect(11);

    store.resetStreak(10);
    expect(store.streak(10)).toBe(0);
    expect(store.streak(11)).toBe(2);
  });

  it("resetStreak on an unseen lesson is a no-op that does not throw", () => {
    const store = createProgressStore(fakeStorage());
    expect(() => store.resetStreak(99)).not.toThrow();
    expect(store.streak(99)).toBe(0);
  });
});

describe("unlock rule", () => {
  it("always unlocks the first lesson", () => {
    const store = createProgressStore(fakeStorage());
    expect(store.isUnlocked(0, catalog)).toBe(true);
  });

  it("keeps later lessons locked with a zero streak on the previous lesson", () => {
    const store = createProgressStore(fakeStorage());
    expect(store.isUnlocked(1, catalog)).toBe(false);
  });

  it(`keeps the next lesson locked at a streak of ${UNLOCK_THRESHOLD - 1}`, () => {
    const store = createProgressStore(fakeStorage());
    for (let i = 0; i < UNLOCK_THRESHOLD - 1; i++) {
      store.recordCorrect(catalog[0].id);
    }
    expect(store.streak(catalog[0].id)).toBe(9);
    expect(store.isUnlocked(1, catalog)).toBe(false);
  });

  it(`unlocks the next lesson at a streak of exactly ${UNLOCK_THRESHOLD}`, () => {
    const store = createProgressStore(fakeStorage());
    for (let i = 0; i < UNLOCK_THRESHOLD; i++) {
      store.recordCorrect(catalog[0].id);
    }
    expect(store.isUnlocked(1, catalog)).toBe(true);
  });

  it("ignores streaks on lessons other than the previous one", () => {
    const store = createProgressStore(fakeStorage());
    for (let i = 0; i < UNLOCK_THRESHOLD; i++) {
      store.recordCorrect(catalog[1].id);
    }
    // catalog[1] is the previous lesson for index 2, so that one unlocks...
    expect(store.isUnlocked(2, catalog)).toBe(true);
    // ...but not for index 3, whose previous lesson is catalog[2].
    expect(store.isUnlocked(3, catalog)).toBe(false);
  });

  it("a reset mid-streak re-locks the next lesson", () => {
    const store = createProgressStore(fakeStorage());
    for (let i = 0; i < UNLOCK_THRESHOLD - 3; i++) {
      store.recordCorrect(catalog[0].id);
    }
    expect(store.isUnlocked(1, catalog)).toBe(false);

    // One miss wipes the partial streak entirely: nothing survives to rebuild on.
    store.resetStreak(catalog[0].id);
    expect(store.streak(catalog[0].id)).toBe(0);
    expect(store.isUnlocked(1, catalog)).toBe(false);

    // Rebuilding has to start from zero: 9 more correct still leaves it locked...
    for (let i = 0; i < UNLOCK_THRESHOLD - 1; i++) {
      store.recordCorrect(catalog[0].id);
    }
    expect(store.isUnlocked(1, catalog)).toBe(false);
    // ...and the tenth in a row unlocks again.
    store.recordCorrect(catalog[0].id);
    expect(store.isUnlocked(1, catalog)).toBe(true);
  });

  it("a reset after unlocking re-locks the next lesson", () => {
    const store = createProgressStore(fakeStorage());
    for (let i = 0; i < UNLOCK_THRESHOLD; i++) {
      store.recordCorrect(catalog[0].id);
    }
    expect(store.isUnlocked(1, catalog)).toBe(true);

    store.resetStreak(catalog[0].id);
    expect(store.isUnlocked(1, catalog)).toBe(false);
  });
});

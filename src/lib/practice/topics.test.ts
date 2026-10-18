import { describe, expect, it } from "vitest";
import { catalog } from "../../games/catalog";
import {
  PROGRESS_STORAGE_KEY,
  UNLOCK_THRESHOLD,
  createProgressStore,
  type ProgressState,
  type StorageLike,
} from "../progress/store";
import {
  isTopicUnlocked,
  isTopicUnlockedWithStore,
  practiceTopics,
  type PracticeTopic,
} from "./topics";

function stateStorage(state: ProgressState): StorageLike {
  const raw = JSON.stringify(state);
  return {
    getItem: (key) => (key === PROGRESS_STORAGE_KEY ? raw : null),
    setItem: () => {},
  };
}

/**
 * Fixture topics: no lesson-gated topic ships yet (T1 ships only the open
 * note-guessing mode), so the gating mechanism is exercised here — an
 * untested unlock rule would rot silently until a real gated topic landed.
 */
function gatedOn(ordinal: number): PracticeTopic {
  return {
    slug: `fixture-lesson-${ordinal}`,
    title: `Fixture topic gated on lesson ${ordinal}`,
    lede: "Test-only fixture; never part of the registry.",
    unlock: { kind: "lesson", ordinal },
  };
}

const lessonOne = catalog[0]; // first catalog entry, ordinal 1
const lessonTwo = catalog[1]; // second catalog entry, ordinal 2

describe("practice topics: the shipped registry", () => {
  it("ships exactly one entry — the endless note-guessing mode — and it is open", () => {
    expect(practiceTopics).toHaveLength(1);
    expect(practiceTopics[0]!.unlock).toEqual({ kind: "open" });
    expect(practiceTopics[0]!.slug).toBe("note-guessing");
  });

  it("unlocks the shipped topic for a brand-new learner with an empty progress state", () => {
    const empty: ProgressState = {};
    for (const topic of practiceTopics) {
      expect(isTopicUnlocked(topic, catalog, empty)).toBe(true);
    }
  });
});

describe("practice topics: lesson-gated unlock", () => {
  it("keeps a gated topic locked while its prerequisite streak is below UNLOCK_THRESHOLD", () => {
    const topic = gatedOn(2);
    const below: ProgressState = { [String(lessonOne.id)]: UNLOCK_THRESHOLD - 1 };
    expect(isTopicUnlocked(topic, catalog, below)).toBe(false);
  });

  it("unlocks the gated topic once its prerequisite streak reaches UNLOCK_THRESHOLD", () => {
    const topic = gatedOn(2);
    const atThreshold: ProgressState = { [String(lessonOne.id)]: UNLOCK_THRESHOLD };
    expect(isTopicUnlocked(topic, catalog, atThreshold)).toBe(true);
  });

  it("follows UNLOCK_THRESHOLD rather than a hardcoded streak number", () => {
    // The boundary is derived from the store's own constant: if gating
    // hardcoded a different number, these two assertions could not both hold.
    const topic = gatedOn(2);
    expect(isTopicUnlocked(topic, catalog, { [String(lessonOne.id)]: 0 })).toBe(false);
    expect(isTopicUnlocked(topic, catalog, { [String(lessonOne.id)]: UNLOCK_THRESHOLD - 1 })).toBe(false);
    expect(isTopicUnlocked(topic, catalog, { [String(lessonOne.id)]: UNLOCK_THRESHOLD })).toBe(true);
    expect(
      isTopicUnlocked(topic, catalog, { [String(lessonOne.id)]: UNLOCK_THRESHOLD + 1 }),
    ).toBe(true);
  });

  it("is not confused by streaks of other lessons", () => {
    const topic = gatedOn(2);
    // Lesson 2's own streak is irrelevant: gating reads the *previous* lesson.
    const otherLesson: ProgressState = { [String(lessonTwo.id)]: UNLOCK_THRESHOLD + 5 };
    expect(isTopicUnlocked(topic, catalog, otherLesson)).toBe(false);
  });

  it("resolves a topic gated on lesson 1 open for an empty progress state", () => {
    // Ordinal 1 is the chain head: always unlocked, so gating on it is open.
    expect(isTopicUnlocked(gatedOn(1), catalog, {})).toBe(true);
    expect(isTopicUnlocked(gatedOn(1), catalog, { [String(lessonOne.id)]: 0 })).toBe(true);
  });

  it("treats an ordinal past the end of the catalog as locked", () => {
    expect(isTopicUnlocked(gatedOn(catalog.length + 1), catalog, {})).toBe(false);
  });

  it("agrees with the store's own isUnlocked for every streak around the threshold", () => {
    // The point of the storage adapter: gating IS the chain's rule. Any
    // divergence between the two would show up as a mismatched verdict here.
    const topic = gatedOn(2);
    const streaks = [0, 1, UNLOCK_THRESHOLD - 1, UNLOCK_THRESHOLD, UNLOCK_THRESHOLD + 3];
    for (const streak of streaks) {
      const state: ProgressState = { [String(lessonOne.id)]: streak };
      const fromStore = createProgressStore(stateStorage(state)).isUnlocked(1, catalog);
      expect(isTopicUnlocked(topic, catalog, state)).toBe(fromStore);
    }
  });

  it("gives the store-shaped entry point the same verdicts as the state-shaped one", () => {
    // The hub reads lock state through the app's live store; tests (and the
    // state seam above) read it as a plain ProgressState. Two entry points,
    // one rule — if they ever disagree, one of them is lying about gating.
    const topic = gatedOn(2);
    const states: ProgressState[] = [
      {},
      { [String(lessonOne.id)]: 0 },
      { [String(lessonOne.id)]: UNLOCK_THRESHOLD - 1 },
      { [String(lessonOne.id)]: UNLOCK_THRESHOLD },
      { [String(lessonOne.id)]: UNLOCK_THRESHOLD + 3 },
      { [String(lessonTwo.id)]: UNLOCK_THRESHOLD + 3 },
    ];
    for (const state of states) {
      const store = createProgressStore(stateStorage(state));
      expect(isTopicUnlockedWithStore(topic, catalog, store), JSON.stringify(state)).toBe(
        isTopicUnlocked(topic, catalog, state),
      );
    }
    // An open topic resolves open through the store path too — the hub must
    // never render a shipped topic as locked for an empty store.
    expect(
      isTopicUnlockedWithStore(practiceTopics[0]!, catalog, createProgressStore(stateStorage({}))),
    ).toBe(true);
  });
});

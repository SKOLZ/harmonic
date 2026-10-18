import type { LessonEntry } from "../../games/catalog";
import {
  PROGRESS_STORAGE_KEY,
  createProgressStore,
  type ProgressState,
  type StorageLike,
} from "../progress/store";

/**
 * Practice topics: the data layer under the `/practice` hub.
 *
 * A topic is metadata plus an unlock condition — nothing here routes, renders,
 * or draws rounds. The registry ships exactly one entry today (the endless
 * note-guessing mode); a future topic is one registry entry plus its round
 * source, with no change to this module's shape.
 */
export interface PracticeTopic {
  /** URL segment for `/practice/:slug`. */
  slug: string;
  /** Row heading in the topic hub. */
  title: string;
  /** One-line description shown under the title. */
  lede: string;
  /** "open" = available from the start; "lesson" = gated on that lesson's unlock. */
  unlock: { kind: "open" } | { kind: "lesson"; ordinal: number };
}

/**
 * A progress state viewed as storage, so gating runs through the *store's own*
 * `isUnlocked` instead of a second copy of the rule. `setItem` is a no-op:
 * unlock evaluation never writes. Read errors are impossible here — the raw
 * value is produced from an in-memory state, not from a browser.
 */
function storageOf(state: ProgressState): StorageLike {
  const raw = JSON.stringify(state);
  return {
    getItem: (key) => (key === PROGRESS_STORAGE_KEY ? raw : null),
    setItem: () => {},
  };
}

/**
 * Is `topic` available to a learner at `progress`?
 *
 * One definition of "unlocked" for the whole app: a `{ kind: "lesson",
 * ordinal }` topic reuses the chain's own predicate —
 * `store.isUnlocked(ordinal - 1, catalog)` — the same call the lesson list
 * makes, so `UNLOCK_THRESHOLD` and streak semantics are shared rather than
 * restated. An `{ kind: "open" }` topic needs no state at all.
 *
 * Ordinals are 1-based (lesson 1 = index 0), matching the `/lesson/:ordinal`
 * URLs; lesson 1 is the chain head and is always unlocked, so gating on it
 * resolves open.
 */
export function isTopicUnlocked(
  topic: PracticeTopic,
  catalog: readonly LessonEntry[],
  progress: ProgressState,
): boolean {
  if (topic.unlock.kind === "open") return true;
  const store = createProgressStore(storageOf(progress));
  return store.isUnlocked(topic.unlock.ordinal - 1, catalog);
}

/**
 * Every practice topic, in hub order. Append-only: adding a topic means adding
 * an entry here plus its round source — the unlock rule and hub contract are
 * unchanged by a new entry.
 */
export const practiceTopics: readonly PracticeTopic[] = [
  {
    slug: "note-guessing",
    title: "Endless practice",
    lede: "Guess the note on the staff against the clock. One miss ends the run.",
    unlock: { kind: "open" },
  },
];

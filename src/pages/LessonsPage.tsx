import { A } from "@solidjs/router";
import { For, Show } from "solid-js";
import { catalog, type LessonEntry } from "../games/catalog";
import { progress, UNLOCK_THRESHOLD } from "../lib/progress";

/**
 * T2's route: the 39-lesson chain list, moved off the landing page unchanged.
 *
 * The grouping, the locked treatment, and the per-lesson streak display are
 * the ones Home carried before the split — same markup shape, same ordinal
 * `/lesson/N` hrefs, same `isUnlocked` call — only the page and the BEM
 * block name moved. Practice is not here: it is a landing door, never a
 * catalog row, so nothing on this page reads or writes practice state.
 */
interface LessonRow {
  entry: LessonEntry;
  index: number;
  unlocked: boolean;
}

function groupBySection(entries: LessonEntry[]): Map<string, LessonRow[]> {
  const groups = new Map<string, LessonRow[]>();
  entries.forEach((entry, index) => {
    const rows = groups.get(entry.section) ?? [];
    rows.push({ entry, index, unlocked: progress.isUnlocked(index, entries) });
    groups.set(entry.section, rows);
  });
  return groups;
}

export default function LessonsPage() {
  const sections = groupBySection(catalog);

  return (
    <main class="lessons">
      <A class="lessons__back" href="/">
        Home
      </A>
      <header class="lessons__header">
        <h1>Lessons</h1>
        <p class="lessons__lede">
          Answer {UNLOCK_THRESHOLD} rounds in a row in a lesson to unlock the next one.
        </p>
      </header>

      <For each={[...sections]}>
        {([sectionName, rows]) => (
          <section class="lessons__section">
            <h2 class="lessons__section-title">{sectionName}</h2>
            <ul class="lessons__list">
              <For each={rows}>
                {({ entry, index, unlocked }) => (
                  <li
                    class="lessons__lesson"
                    classList={{ "lessons__lesson--locked": !unlocked }}
                  >
                    <Show
                      when={unlocked}
                      fallback={
                        <div class="lessons__lesson-body" aria-disabled="true">
                          <span class="lessons__lesson-title">{entry.title}</span>
                          <span class="lessons__lesson-meta">
                            <span class="lessons__lesson-progress">
                              {progress.streak(entry.id)}/{UNLOCK_THRESHOLD}
                            </span>
                            <span class="lessons__lesson-lock">Locked</span>
                          </span>
                        </div>
                      }
                    >
                      <A class="lessons__lesson-body" href={`/lesson/${index + 1}`}>
                        <span class="lessons__lesson-title">{entry.title}</span>
                        <span class="lessons__lesson-progress">
                          {progress.streak(entry.id)}/{UNLOCK_THRESHOLD}
                        </span>
                      </A>
                    </Show>
                  </li>
                )}
              </For>
            </ul>
          </section>
        )}
      </For>
    </main>
  );
}

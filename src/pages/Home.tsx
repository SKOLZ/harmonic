import { A } from "@solidjs/router";
import { For, Show } from "solid-js";
import { catalog, type LessonEntry } from "../games/catalog";
import { progress, UNLOCK_THRESHOLD } from "../lib/progress";

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

export default function Home() {
  const sections = groupBySection(catalog);

  return (
    <main class="home">
      <header class="home__header">
        <h1>Music Theory Practice</h1>
        <p class="home__lede">
          Answer {UNLOCK_THRESHOLD} rounds in a row in a lesson to unlock the next one.
        </p>
      </header>

      {/* Endless practice lives on its own route, outside the 39-lesson chain:
          this block is deliberately not a `.home__section` / `.home__lesson`
          row, so it never enters the catalog counts, the lock state, or the
          unlock chain the sections below drive. */}
      <section class="home__practice">
        <h2 class="home__practice-title">Endless practice</h2>
        <p class="home__practice-lede">
          Guess the note on the staff against the clock. One miss ends the run.
        </p>
        <A class="home__practice-link" href="/practice">
          Start endless practice
        </A>
      </section>

      <For each={[...sections]}>
        {([sectionName, rows]) => (
          <section class="home__section">
            <h2 class="home__section-title">{sectionName}</h2>
            <ul class="home__lessons">
              <For each={rows}>
                {({ entry, index, unlocked }) => (
                  <li
                    class="home__lesson"
                    classList={{ "home__lesson--locked": !unlocked }}
                  >
                    <Show
                      when={unlocked}
                      fallback={
                        <div class="home__lesson-body" aria-disabled="true">
                          <span class="home__lesson-title">{entry.title}</span>
                          <span class="home__lesson-meta">
                            <span class="home__lesson-progress">
                              {progress.streak(entry.id)}/{UNLOCK_THRESHOLD}
                            </span>
                            <span class="home__lesson-lock">Locked</span>
                          </span>
                        </div>
                      }
                    >
                      <A class="home__lesson-body" href={`/lesson/${index + 1}`}>
                        <span class="home__lesson-title">{entry.title}</span>
                        <span class="home__lesson-progress">
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

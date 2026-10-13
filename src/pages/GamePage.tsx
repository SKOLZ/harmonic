import { A, useParams } from "@solidjs/router";
import { Show } from "solid-js";
import { catalog } from "../games/catalog";
import { progress, UNLOCK_THRESHOLD } from "../lib/progress";

export default function GamePage() {
  const params = useParams();
  const lessonIndex = () =>
    catalog.findIndex((entry) => String(entry.id) === params.id);
  const lesson = () => {
    const index = lessonIndex();
    return index >= 0 ? catalog[index] : undefined;
  };
  const unlocked = () => {
    const index = lessonIndex();
    return index >= 0 && progress.isUnlocked(index, catalog);
  };

  return (
    <main class="game-page">
      <A class="game-page__back" href="/">
        All lessons
      </A>
      <Show when={lesson()} fallback={<h1>Lesson not found</h1>}>
        {(entry) => (
          <Show
            when={unlocked()}
            fallback={
              <section class="game-page__locked">
                <h1>Lesson locked</h1>
                <p>
                  Answer {UNLOCK_THRESHOLD} rounds correctly in the previous lesson to
                  unlock this one.
                </p>
              </section>
            }
          >
            <h1>{entry().title}</h1>
            <p>Coming soon.</p>
          </Show>
        )}
      </Show>
    </main>
  );
}

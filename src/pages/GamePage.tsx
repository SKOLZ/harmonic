import { A, useNavigate, useParams } from "@solidjs/router";
import { Show } from "solid-js";
import GameShell from "../components/game/GameShell";
import { catalog } from "../games/catalog";
import { getLessonModule } from "../games/registry";
import { createRng } from "../games/rng";
import { progress, UNLOCK_THRESHOLD } from "../lib/progress";

export default function GamePage() {
  const params = useParams();
  const navigate = useNavigate();
  // The URL surface is ordinal: /lesson/N is catalog[N-1], independent of the
  // musictheory.net source ids the catalog carries as metadata. Anything
  // outside 1..catalog.length (zero, past the end, non-numeric) resolves to
  // -1 and falls through to the not-found branch.
  const lessonIndex = () => {
    const ordinal = Number(params.id);
    return Number.isInteger(ordinal) && ordinal >= 1 && ordinal <= catalog.length
      ? ordinal - 1
      : -1;
  };
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
            // Keyed on the lesson entry: switching lessons remounts this
            // branch, so GameShell's machine restarts with the new rounds
            // instead of carrying a stale round index across lessons.
            keyed
            when={unlocked() ? entry() : undefined}
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
            {(current) => {
              // Generated exactly once per lesson visit: this keyed branch
              // re-runs only when the entry changes, and the stable array
              // reference keeps GameShell from ever re-deriving rounds while
              // the learner plays. A fresh seed gives each visit a new draw
              // from the module's question pool.
              const rounds = getLessonModule(current.id).generateRounds(
                createRng(Date.now() ^ current.id),
              );
              return (
                <GameShell
                  lessonId={String(current.id)}
                  lessonTitle={current.title}
                  rounds={rounds}
                  onExit={() => navigate("/")}
                />
              );
            }}
          </Show>
        )}
      </Show>
    </main>
  );
}

import { A, useNavigate, useParams } from "@solidjs/router";
import { Show } from "solid-js";
import GameShell from "../components/game/GameShell";
import { catalog } from "../games/catalog";
import { progress, UNLOCK_THRESHOLD } from "../lib/progress";
import type { Round } from "../lib/rounds/types";
import { validateRounds } from "../lib/rounds/validate";

/**
 * Demo round set standing in for the real per-lesson round generators (T6+).
 * Text prompts and choices answers only — the other prompt/answer kinds
 * register in T5c. Once lesson modules exist, each lesson passes its own
 * generated rounds here instead of this shared demo set.
 */
const DEMO_ROUNDS: Round[] = [
  {
    id: "demo-staff-lines",
    prompt: {
      kind: "text",
      text: "How many lines does a standard music staff have?",
    },
    answer: { kind: "choices", options: ["Four", "Five", "Six", "Seven"], correctIndex: 1 },
    rule: "A staff is drawn with five lines and four spaces.",
  },
  {
    id: "demo-accidental",
    prompt: {
      kind: "text",
      text: "Which symbol raises a note by one semitone?",
    },
    answer: {
      kind: "choices",
      options: ["Flat", "Sharp", "Natural", "Double sharp"],
      correctIndex: 1,
    },
    rule: "A sharp raises a pitch by one semitone; a flat lowers it.",
  },
  {
    id: "demo-clef",
    prompt: {
      kind: "text",
      text: "Which clef wraps around the G line?",
    },
    answer: {
      kind: "choices",
      options: ["Bass clef", "Alto clef", "Treble clef", "Tenor clef"],
      correctIndex: 2,
    },
    rule: "The treble clef circles the G line, which is why it is also called the G clef.",
  },
];

// Fail fast at module load if the demo data ever drifts from the Round contract.
validateRounds(DEMO_ROUNDS);

export default function GamePage() {
  const params = useParams();
  const navigate = useNavigate();
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
            <GameShell
              lessonId={String(entry().id)}
              lessonTitle={entry().title}
              rounds={DEMO_ROUNDS}
              onExit={() => navigate("/")}
            />
          </Show>
        )}
      </Show>
    </main>
  );
}

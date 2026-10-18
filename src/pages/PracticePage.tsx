import { A, useParams } from "@solidjs/router";
import { Show, type Component } from "solid-js";
import PracticeShell from "../components/game/PracticeShell";
import { practiceTopics } from "../lib/practice/topics";

/**
 * The round source for each topic, keyed by slug: a registry entry and its
 * view ship together. A slug with no view — like a slug with no entry —
 * resolves to the not-found branch rather than a blank run.
 */
const topicViews: Record<string, Component> = {
  "note-guessing": PracticeShell,
};

/**
 * T3's topic route: `/practice/:slug` runs exactly one registry entry.
 *
 * The slug resolves against the registry first — a slug no entry owns is not
 * a topic and falls through to the not-found branch, the way an out-of-range
 * ordinal falls through on `/lesson/:id`. Nothing here reads the catalog or
 * the progress store: *which* topic runs is a registry question and
 * *availability* is the hub's. The run itself is unchanged — same shell,
 * same round source, same aria contract — only the way out moved, to the hub,
 * because practice's list is now `/practice`.
 */
export default function PracticePage() {
  const params = useParams();
  const topic = () => practiceTopics.find((entry) => entry.slug === params.slug);
  const view = () => {
    const found = topic();
    return found ? topicViews[found.slug] : undefined;
  };

  return (
    <main class="practice-page">
      <A class="game-page__back" href="/practice">
        All topics
      </A>
      <Show keyed when={view()} fallback={<h1>Practice topic not found</h1>}>
        {(Topic) => <Topic />}
      </Show>
    </main>
  );
}

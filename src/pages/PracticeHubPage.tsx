import { A } from "@solidjs/router";
import { For, Show } from "solid-js";
import { catalog } from "../games/catalog";
import { progress } from "../lib/progress";
import {
  isTopicUnlockedWithStore,
  practiceTopics,
  type PracticeTopic,
} from "../lib/practice/topics";

/**
 * T3's hub: `/practice` as the sibling of `/lessons` — a back link, a
 * masthead, and one framed row per registry entry, in registry order. It
 * teaches the same visual language for gated content the lesson list does:
 * a locked topic is *shown*, never hidden, and never linked.
 *
 * Lock state is evaluated by the registry's own `isTopicUnlockedWithStore`,
 * so a topic opens under exactly the rule the lesson chain uses and nothing
 * here restates `UNLOCK_THRESHOLD`. The cue itself is text and structure
 * first — a `div` with `aria-disabled` and the word "Locked", never an
 * anchor — with the ochre tag and the dashed edge only reinforcing what the
 * words already say.
 *
 * `topics` is an injection seam for tests: the shipped registry has no
 * lesson-gated entry yet, so the locked path is driven with fixtures rather
 * than left unexercised. The route renders the shipped registry.
 */
interface PracticeHubProps {
  /** Defaults to the shipped registry — the route passes nothing. */
  topics?: readonly PracticeTopic[];
}

export default function PracticeHubPage(props: PracticeHubProps) {
  const topics = () => props.topics ?? practiceTopics;
  const isAvailable = (topic: PracticeTopic) =>
    isTopicUnlockedWithStore(topic, catalog, progress);

  return (
    <main class="practice-hub">
      <A class="practice-hub__back" href="/">
        Home
      </A>
      <header class="practice-hub__header">
        <h1>Practice</h1>
        <p class="practice-hub__lede">
          Drills you can play on their own, between lessons.
        </p>
      </header>

      <ul class="practice-hub__list">
        <For each={topics()}>
          {(topic) => {
            // Read once per row, the way the lesson list computes its lock
            // state: a run never changes availability mid-render, and every
            // visit re-mounts the page against the current store.
            const available = isAvailable(topic);
            return (
              <li
                class="practice-hub__topic"
                classList={{ "practice-hub__topic--locked": !available }}
              >
                <Show
                  when={available}
                  fallback={
                    <div class="practice-hub__topic-body" aria-disabled="true">
                      <span class="practice-hub__topic-head">
                        <span class="practice-hub__topic-title">{topic.title}</span>
                        <span class="practice-hub__topic-lock">Locked</span>
                      </span>
                      <span class="practice-hub__topic-lede">{topic.lede}</span>
                    </div>
                  }
                >
                  <A
                    class="practice-hub__topic-body"
                    href={`/practice/${topic.slug}`}
                  >
                    <span class="practice-hub__topic-head">
                      <span class="practice-hub__topic-title">{topic.title}</span>
                    </span>
                    <span class="practice-hub__topic-lede">{topic.lede}</span>
                  </A>
                </Show>
              </li>
            );
          }}
        </For>
      </ul>
    </main>
  );
}

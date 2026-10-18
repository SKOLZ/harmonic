import { A } from "@solidjs/router";
import PracticeShell from "../components/game/PracticeShell";

/**
 * T4's route: endless "guess the note" practice, outside the 39-lesson chain.
 *
 * There is no catalog lookup, no ordinal resolution, and no progress gate on
 * this page — nothing here reads the lesson list or the unlock state — so the
 * mode can be entered at any time by any learner and cannot influence the
 * chain. The way out is the back link to the landing page — practice is not a
 * lesson, so it must not promise "All lessons". The run owns its restart.
 */
export default function PracticePage() {
  return (
    <main class="practice-page">
      <A class="game-page__back" href="/">
        Back to home
      </A>
      <PracticeShell />
    </main>
  );
}

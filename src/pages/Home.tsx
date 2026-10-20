import { A } from "@solidjs/router";
import HomeBackdrop from "../components/home/HomeBackdrop";

/**
 * The landing: one promise, one plain explanation, and exactly two ways in —
 * Lessons and Practice. The lesson list lives on `/lessons` and practice on
 * `/practice`; this page never imports the catalog or the progress store, so
 * a brand-new learner sees the same hero as a finished one.
 *
 * The page is the hero alone. The backdrop is the one moving thing: a grey
 * dot grid with a slow ripple, hidden from assistive tech and transparent to
 * the pointer, so the two actions stay the only things to press.
 */
export default function Home() {
  return (
    <main class="home">
      <HomeBackdrop />
      <div class="home__inner">
        <header class="home__hero">
          <h1 class="home__title">Learn to read music.</h1>
          <p class="home__lede">
            39 lessons take you from the first clef to the last cadence. Practice
            drills note reading against the clock.
          </p>
          <div class="home__actions">
            <A class="home__cta home__cta--primary" href="/lessons">
              Start the lessons
            </A>
            <A class="home__cta" href="/practice">
              Practice note reading
            </A>
          </div>
        </header>
      </div>
    </main>
  );
}

import { A } from "@solidjs/router";
import BrandMark from "../components/brand/BrandMark";

/**
 * T2's landing page: the name, a plain explanation, the staff, and exactly
 * two doors — Lessons and Practice.
 *
 * The lesson list lives on `/lessons`; practice lives on `/practice`. This
 * page never imports the catalog or the progress store — nothing here is
 * gated, so a brand-new learner with every lesson locked sees the same two
 * links as a finished one.
 *
 * The staff below the explanation is the product's one full five-line staff:
 * the hero's rule, carrying the same gold note the wordmark's "o" is,
 * drawn once and nowhere else. The doors read as two adjacent piano keys
 * inside one frame: a white key (Lessons) and a black key (Practice,
 * filled with the ink the app already uses for primary controls).
 */
export default function Home() {
  return (
    <main class="home">
      <header class="home__header">
        <h1>Harmonic</h1>
        <p class="home__lede">
          Learn to read music. 39 lessons build the skill in order, and practice
          mode drills note reading against the clock.
        </p>
      </header>

      {/* The memorable element, at staff scale: five rules, one gold note. */}
      <BrandMark lines={5} class="home__staff" />

      <div class="home__doors">
        <A class="home__door" href="/lessons">
          <span class="home__door-title">Lessons</span>
          <span class="home__door-lede">The full course in order.</span>
        </A>
        <A class="home__door home__door--ink" href="/practice">
          <span class="home__door-title">Practice</span>
          <span class="home__door-lede">
            Guess the note on the staff against the clock. One miss ends the run.
          </span>
        </A>
      </div>
    </main>
  );
}

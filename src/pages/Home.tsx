import { A } from "@solidjs/router";

/**
 * T2's landing page: a masthead plus exactly two doors, Lessons and Practice.
 *
 * The lesson list lives on `/lessons`; practice lives on `/practice`. This
 * page never imports the catalog or the progress store — nothing here is
 * gated, so a brand-new learner with every lesson locked sees the same two
 * links as a finished one. The doors read as two adjacent piano keys inside
 * one frame: a white key (Lessons) and a black key (Practice, filled with
 * the ink the app already uses for primary controls).
 */
export default function Home() {
  return (
    <main class="home">
      <header class="home__header">
        <h1>Music Theory Practice</h1>
        <p class="home__lede">
          Work through the lessons in order, or drill note reading on your own.
        </p>
      </header>

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

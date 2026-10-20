import { A } from "@solidjs/router";
import { For } from "solid-js";
import BrandMark from "../components/brand/BrandMark";

/** Session flag for the one entrance the landing is allowed. */
export const HOME_INTRO_KEY = "harmonic:home-intro";

/** Two octaves plus the closing C: C to C, fifteen white keys. */
const WHITE_KEY_COUNT = 15;
const WHITE_KEYS = Array.from({ length: WHITE_KEY_COUNT }, (_, index) => index);

/** In each octave a black key sits after white key 0, 1, 3, 4, and 5. */
const BLACK_KEY_AFTER = [0, 1, 3, 4, 5] as const;
const BLACK_KEYS = Array.from({ length: 10 }, (_, index) => {
  const octave = Math.floor(index / BLACK_KEY_AFTER.length);
  const after = octave * 7 + BLACK_KEY_AFTER[index % BLACK_KEY_AFTER.length];

  // Half a step later than the white key it follows, so the entrance sweeps
  // the keyboard in playing order instead of jumping between the two rows.
  return { after, order: after + 0.5 };
});

/** Left edge of a black key: centred on the boundary after `after`. */
function blackKeyLeft(after: number): string {
  const centre = ((after + 1) / WHITE_KEY_COUNT) * 100;
  const halfWidth = (100 / WHITE_KEY_COUNT) * 0.31;
  return `${centre - halfWidth}%`;
}

/**
 * The entrance plays on the first landing of a session and never again on
 * internal navigation. The flag is read in the component body, not in
 * `onMount`, so the class is on the first paint — a post-mount toggle would
 * paint the settled instrument for a frame before rewinding it.
 *
 * Storage can be unavailable (private modes, blocked cookies). That is not a
 * reason to fail the landing: the page simply arrives settled.
 */
function playIntroOnce(): boolean {
  try {
    if (window.sessionStorage.getItem(HOME_INTRO_KEY) !== null) return false;
    window.sessionStorage.setItem(HOME_INTRO_KEY, "1");
    return true;
  } catch {
    return false;
  }
}

/**
 * The landing: a hook, one plain explanation, and exactly two ways in —
 * Lessons and Practice. The lesson list lives on `/lessons` and practice on
 * `/practice`; this page never imports the catalog or the progress store, so
 * a brand-new learner sees the same hero as a finished one.
 *
 * The instrument is the page's one memorable element: the five-line staff
 * the product teaches, seated above a two-octave keyboard drawn from spans.
 * It is illustration, not a control — hidden from assistive tech and
 * transparent to the pointer — so the only things to press are the two
 * actions above it.
 */
export default function Home() {
  const intro = playIntroOnce();

  return (
    <main class={intro ? "home home--intro" : "home"}>
      <header class="home__hero">
        <h1 class="home__title">The staff, decoded.</h1>
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

      <div class="home__instrument" aria-hidden="true">
        <BrandMark lines={5} class="home__staff" />
        <div class="home__keyboard">
          <div class="home__white-keys">
            <For each={WHITE_KEYS}>
              {(index) => (
                <span class="home__key home__key--white" style={{ "--key-order": index }} />
              )}
            </For>
          </div>
          <For each={BLACK_KEYS}>
            {(key) => (
              <span
                class="home__key home__key--black"
                style={{ left: blackKeyLeft(key.after), "--key-order": key.order }}
              />
            )}
          </For>
        </div>
      </div>
    </main>
  );
}

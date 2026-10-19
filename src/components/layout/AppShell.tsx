import { A } from "@solidjs/router";
import type { ParentProps } from "solid-js";
import Wordmark from "../brand/Wordmark";
import skzDsgn from "../../assets/SKZ-DSGN.svg?raw";

/**
 * The global shell: navbar and footer framing every routed page, with the
 * brand now carrying both ends. The navbar's home link is the wordmark —
 * the name on its staff rule — and the footer repeats the wordmark, one line
 * of what the product is, and the same two destinations.
 *
 * The destinations themselves are unchanged from T1's plain frame: exactly
 * three anchors in the navbar (wordmark, Lessons, Practice) and exactly two
 * destinations in the footer. The wordmark in the footer is deliberately not
 * a link — it is identity, not a third way out, so the footer's link surface
 * stays the two routes and the one credit below. The routed page renders
 * through `props.children` and keeps its own `main` landmark, so the
 * page-level structure — and the tests that target it — stays intact.
 *
 * The footer is the bar: full width, on the same whisper-grey ground as the
 * navbar, closed at the top by the same hairline. Its inner column — the
 * flex row of brand block and links — keeps the shell's 42rem measure, so
 * the column still lines up with the navbar's and `main`'s. The credit is
 * the bar's own child rather than the column's: it floats in the bar's
 * bottom-right corner, out past the measure, and rides the footer's link
 * rule — same ink, same gold arrival — without a rule of its own.
 */
export default function AppShell(props: ParentProps) {
  return (
    <div class="app-shell">
      <header class="app-shell__header">
        <nav class="app-shell__nav">
          <A class="app-shell__wordmark" href="/">
            <Wordmark />
          </A>
          <ul class="app-shell__menu">
            <li>
              <A href="/lessons">Lessons</A>
            </li>
            <li>
              <A href="/practice">Practice</A>
            </li>
          </ul>
        </nav>
      </header>
      {props.children}
      <footer class="app-shell__footer">
        <div class="app-shell__footer-column">
          <div class="app-shell__footer-brand">
            <Wordmark class="app-shell__footer-wordmark" />
            <p class="app-shell__footer-line">
              Music theory lessons and note-reading practice.
            </p>
          </div>
          <ul class="app-shell__footer-links">
            <li>
              <A href="/lessons">Lessons</A>
            </li>
            <li>
              <A href="/practice">Practice</A>
            </li>
          </ul>
        </div>
        <a class="app-shell__credit" href="https://skz.dev.ar">
          <span class="app-shell__credit-mark" innerHTML={skzDsgn} />
        </a>
      </footer>
    </div>
  );
}

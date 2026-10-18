import { A } from "@solidjs/router";
import type { ParentProps } from "solid-js";
import Wordmark from "../brand/Wordmark";

/**
 * The global shell: navbar and footer framing every routed page, with the
 * brand now carrying both ends. The navbar's home link is the wordmark —
 * the name on its staff rule — and the footer repeats the wordmark, one line
 * of what the product is, and the same two destinations.
 *
 * The destinations themselves are unchanged from T1's plain frame: exactly
 * three anchors in the navbar (wordmark, Lessons, Practice) and exactly two
 * in the footer. The wordmark in the footer is deliberately not a link — it
 * is identity, not a third way out, so the footer's link surface stays the
 * two routes and nothing more. The routed page renders through
 * `props.children` and keeps its own `main` landmark, so the page-level
 * structure — and the tests that target it — stays intact.
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
      </footer>
    </div>
  );
}

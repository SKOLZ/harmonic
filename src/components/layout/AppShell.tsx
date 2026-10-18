import { A } from "@solidjs/router";
import type { ParentProps } from "solid-js";

/**
 * T1's global shell: the navbar and footer every route sits between.
 *
 * Deliberately plain — a black hairline under the nav, a quiet footer,
 * existing tokens only. The brand work owns the identity; this frame must
 * not spend the boldness before it lands. The routed page renders through
 * `props.children` and keeps its own `main` landmark, so the page-level
 * structure — and the tests that target it — stays intact.
 */
export default function AppShell(props: ParentProps) {
  return (
    <div class="app-shell">
      <header class="app-shell__header">
        <nav class="app-shell__nav">
          <A class="app-shell__wordmark" href="/">
            Harmonic
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
        <A href="/lessons">Lessons</A>
        <A href="/practice">Practice</A>
      </footer>
    </div>
  );
}

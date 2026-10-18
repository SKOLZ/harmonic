import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { JSX } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it } from "vitest";
import App from "../../App";

/**
 * T1's shell contract: every route renders between a global navbar and a
 * quiet footer. The routed page keeps its own `main` landmark; the navbar
 * carries exactly three anchors — the Harmonic wordmark, Lessons, Practice —
 * and the footer repeats the two destinations and nothing more.
 *
 * Mounts drive the real App router (history pushed per route), the same
 * shape the page suites use for App-level assertions, so the shell is
 * tested where it actually ships: wrapping every route.
 */
const cleanups: Array<() => void> = [];

function mount(ui: () => JSX.Element): HTMLDivElement {
  const host = document.createElement("div");
  document.body.appendChild(host);
  cleanups.push(() => host.remove());
  const dispose = render(ui, host);
  cleanups.push(() => dispose());
  return host;
}

async function waitFor(check: () => boolean, label: string): Promise<void> {
  const deadline = Date.now() + 2000;
  while (!check()) {
    if (Date.now() > deadline) {
      throw new Error(`waitFor timed out: ${label}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

/** Every route in the table, with the page marker that proves it rendered. */
const shellRoutes = [
  { path: "/", page: ".home" },
  { path: "/lessons", page: ".lessons" },
  { path: "/lesson/1", page: ".game-page" },
  { path: "/practice", page: ".practice-hub" },
  { path: "/practice/note-guessing", page: ".practice-page" },
] as const;

async function mountRoute(path: string, page: string): Promise<HTMLElement> {
  window.history.pushState(null, "", path);
  const host = mount(() => <App />);
  await waitFor(() => host.querySelector(page) !== null, `${path} page marker ${page}`);
  return host;
}

afterEach(() => {
  while (cleanups.length > 0) cleanups.pop()?.();
  document.body.replaceChildren();
  window.history.pushState(null, "", "/");
});

describe("App shell: navbar and footer frame every route", () => {
  for (const { path, page } of shellRoutes) {
    it(`frames ${path} with one navbar, one footer, and the page main between them`, async () => {
      const host = await mountRoute(path, page);

      expect(host.querySelectorAll("nav")).toHaveLength(1);
      expect(host.querySelectorAll("footer")).toHaveLength(1);

      const nav = host.querySelector("nav")!;
      const main = host.querySelector("main")!;
      const footer = host.querySelector("footer")!;

      // The routed page keeps its own main landmark: the page root (the
      // marker class) sits on main itself, inside the frame.
      expect(main.matches(page)).toBe(true);

      // Navbar above the page, footer below it, in document order.
      expect(nav.compareDocumentPosition(main) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(main.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it(`offers Harmonic, Lessons, and Practice from the navbar at ${path}`, async () => {
      const host = await mountRoute(path, page);
      const nav = host.querySelector("nav")!;

      const wordmark = nav.querySelector<HTMLAnchorElement>('a[href="/"]');
      expect(wordmark, path).not.toBeNull();
      expect(wordmark!.textContent?.trim(), path).toBe("Harmonic");

      const lessons = nav.querySelector<HTMLAnchorElement>('a[href="/lessons"]');
      expect(lessons?.textContent?.trim(), path).toBe("Lessons");
      const practice = nav.querySelector<HTMLAnchorElement>('a[href="/practice"]');
      expect(practice?.textContent?.trim(), path).toBe("Practice");

      // Exactly these three — the navbar is the whole global link surface.
      expect(nav.querySelectorAll("a"), path).toHaveLength(3);
    });

    it(`repeats the two destinations in the footer at ${path}, and nothing more`, async () => {
      const host = await mountRoute(path, page);
      const footer = host.querySelector("footer")!;

      expect(footer.querySelectorAll("a"), path).toHaveLength(2);
      expect(
        footer.querySelector('a[href="/lessons"]')?.textContent?.trim(),
        path,
      ).toBe("Lessons");
      expect(
        footer.querySelector('a[href="/practice"]')?.textContent?.trim(),
        path,
      ).toBe("Practice");
    });
  }
});

/**
 * T2's retheme of T1's plain frame: the navbar wordmark is the name on a
 * staff rule, and the footer carries the same brand block plus one line of
 * what the product is. The anchor counts and the two-destination contract
 * above are untouched — the brand is added inside them, not instead of them.
 */
describe("App shell: the brand frames every route", () => {
  for (const { path, page } of shellRoutes) {
    it(`sets the navbar wordmark in the brand at ${path}`, async () => {
      const host = await mountRoute(path, page);
      const wordmark = host.querySelector('nav a[href="/"]')!;

      expect(wordmark.querySelector(".brand-wordmark__name")?.textContent?.trim()).toBe(
        "Harmonic",
      );

      // The companion is the single-rule mark: one rule, one notehead —
      // never the full staff, which belongs to the hero alone.
      const mark = wordmark.querySelector(".brand-mark");
      expect(mark, path).not.toBeNull();
      expect(mark!.querySelectorAll(".brand-mark__rule"), path).toHaveLength(1);
      expect(mark!.querySelectorAll(".brand-mark__notehead"), path).toHaveLength(1);
      expect(mark!.getAttribute("aria-hidden"), path).toBe("true");
    });

    it(`gives the footer the brand, one line, and the two links at ${path}`, async () => {
      const host = await mountRoute(path, page);
      const footer = host.querySelector("footer")!;

      expect(footer.querySelector(".brand-wordmark__name")?.textContent?.trim()).toBe(
        "Harmonic",
      );
      expect(footer.querySelector(".brand-mark__rule"), path).not.toBeNull();
      expect(footer.querySelector(".brand-mark__notehead"), path).not.toBeNull();

      const line = footer.querySelector(".app-shell__footer-line");
      expect(line, path).not.toBeNull();
      expect(line!.textContent!.trim().length, path).toBeGreaterThan(0);

      // The brand block adds no destinations: still exactly two links.
      expect(footer.querySelectorAll("a"), path).toHaveLength(2);
    });
  }
});

/**
 * T3's layout contract: the navbar centres its row and dresses its two menu
 * links as primary controls, the two hubs fill the shell's measure while the
 * landing and the game pages keep `main`'s page measure, and the footer
 * stacks its two links without an underline and turns them gold on hover.
 *
 * Layout lives in styles.css, so it is pinned the way BrandMark pins its
 * token contract and CountdownRing pins its reduced-motion contract: read
 * straight from the shipped stylesheet, tokens and declarations only, never a
 * raw hex that would block retheming for ever. The structural assertions
 * above stand unchanged — buttons change how the navbar's links look, never
 * how many there are.
 */
function styles(): string {
  return readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");
}

/** The declaration block for a selector, tolerating a comma-separated
    neighbour (`main.lessons, main.practice-hub {`). */
function block(selector: string): string {
  return styles().match(new RegExp(`${selector}\\s*(?:,[^{]+)?\\{[^}]*\\}`))?.[0] ?? "";
}

describe("App shell: T3 layout contract", () => {
  it("centres the navbar row and dresses the two menu links as primary controls", () => {
    const nav = block("\\.app-shell__nav");
    expect(nav, ".app-shell__nav has a declaration block").not.toBe("");
    // The reported defect: baseline alignment pushed the links off the
    // wordmark's centre line. The row now centres on its cross axis. The
    // navbar's measure is asserted separately — it keeps the 42rem cap so
    // the landing still lines up with it.
    expect(nav).toContain("align-items: center");

    // The primary-control material the product already uses for Confirm /
    // Next: ink fill, on-action white, 2px radius, the controls' own padding.
    const menuLink = block("\\.app-shell__menu a");
    expect(menuLink, ".app-shell__menu a has a declaration block").not.toBe("");
    expect(menuLink).toContain("background: var(--ink)");
    expect(menuLink).toContain("color: var(--on-action)");
    expect(menuLink).toContain("border-radius: 2px");
    expect(menuLink).toContain("padding: 0.5rem 1.1rem");

    // The wordmark stays a text link: no fill, no border, no control box.
    const wordmark = block("\\.app-shell__wordmark");
    expect(wordmark, ".app-shell__wordmark has a declaration block").not.toBe("");
    expect(wordmark).not.toContain("background");
    expect(wordmark).not.toContain("border");
  });

  it("gives every surface the same centered measure, so nothing is an island", () => {
    // One column, top to bottom: navbar, main, and footer all cap at 42rem
    // and center. Below that measure `max-width` stops binding and each
    // surface fills the viewport, which is the responsive behaviour asked
    // for — a cap never forces a minimum width.
    const nav = block("\\.app-shell__nav");
    expect(nav, ".app-shell__nav has a declaration block").not.toBe("");
    expect(nav).toContain("max-width: 42rem");
    expect(nav).toContain("margin: 0 auto");

    const footer = block("\\.app-shell__footer");
    expect(footer, ".app-shell__footer has a declaration block").not.toBe("");
    expect(footer).toContain("max-width: 42rem");
    // The footer centers through left/right auto rather than `0 auto`, and
    // the top auto doubles as the push that pins it to the shell's bottom.
    expect(footer).toContain("margin: auto auto 0");

    const pageMeasure = block("main");
    expect(pageMeasure, "main keeps its declaration block").not.toBe("");
    expect(pageMeasure).toContain("max-width: 42rem");
    expect(pageMeasure).toContain("margin: 0 auto");

    // The hubs carry no override of their own — they inherit main's measure.
    // A block here would mean something opted out again and went edge-to-edge.
    expect(block("main\\.lessons"), "the lessons hub has no width override").toBe("");
    expect(block("main\\.practice-hub"), "the practice hub has no width override").toBe("");
  });

  it("stacks the footer links, drops their underline, and turns them gold on hover", () => {
    const links = block("\\.app-shell__footer-links");
    expect(links, ".app-shell__footer-links has a declaration block").not.toBe("");
    expect(links).toContain("flex-direction: column");

    const footerLink = block("\\.app-shell__footer a");
    expect(footerLink, "the footer link rule has a declaration block").not.toBe("");
    expect(footerLink).toContain("text-decoration: none");

    const hover = block("\\.app-shell__footer a:hover");
    expect(hover, "the footer link hover has a declaration block").not.toBe("");
    expect(hover).toContain("color: var(--gold)");
  });
});

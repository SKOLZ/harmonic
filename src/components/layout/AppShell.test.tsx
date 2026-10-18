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

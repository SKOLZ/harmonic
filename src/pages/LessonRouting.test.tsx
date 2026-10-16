import { HashRouter, Route } from "@solidjs/router";
import type { JSX } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import App from "../App";
import { catalog } from "../games/catalog";
import { PROGRESS_STORAGE_KEY, UNLOCK_THRESHOLD } from "../lib/progress";
import GamePage from "./GamePage";

/**
 * T1's contract: the URL surface is ordinal. `/lesson/1` is `catalog[0]` and
 * `/lesson/N` is `catalog[N-1]`, regardless of the musictheory.net source ids
 * the catalog carries as metadata — `/lesson/11` is the eleventh lesson
 * (source id 23), never source id 11. An ordinal outside 1..catalog.length
 * renders the not-found state.
 *
 * GamePage mounts inside a router the same way gamePageWiring.test.tsx mounts
 * it (hash history, no window pathname to mutate). The App-level test drives
 * the real history router against window.location.pathname, which is the
 * half HashRouter cannot satisfy.
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

function title(host: HTMLElement): string | undefined {
  return host.querySelector(".game-shell__title")?.textContent ?? undefined;
}

/** Mount GamePage at an ordinal path, with optional pre-seeded progress. */
async function mountLesson(
  path: string,
  seed?: Record<string, number>,
): Promise<HTMLElement> {
  if (seed !== undefined) {
    window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(seed));
  }
  window.location.hash = `#${path}`;
  const host = mount(() => (
    <HashRouter>
      <Route path="/" component={() => <p class="home-page">Home</p>} />
      <Route path="/lesson/:id" component={GamePage} />
    </HashRouter>
  ));
  await waitFor(() => host.querySelector(".game-page") !== null, `${path} page`);
  return host;
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  while (cleanups.length > 0) cleanups.pop()?.();
  document.body.replaceChildren();
  window.location.hash = "";
  window.history.pushState(null, "", "/");
});

describe("GamePage: ordinal lesson paths", () => {
  it("renders /lesson/1 as the first catalog lesson, not source id 1", async () => {
    const host = await mountLesson("/lesson/1");

    expect(title(host)).toBe(catalog[0]!.title);
  });

  it("renders an unlocked mid-chain ordinal from its catalog position", async () => {
    // Ordinal 2 is catalog[1], unlocked once catalog[0] (source id 10) is done.
    const host = await mountLesson("/lesson/2", {
      [String(catalog[0]!.id)]: UNLOCK_THRESHOLD,
    });

    expect(title(host)).toBe(catalog[1]!.title);
  });

  it("treats /lesson/11 as the eleventh lesson, not source id 11", async () => {
    // Under source-id resolution this seed would unlock catalog[1] ("Note
    // Duration"); under ordinals it unlocks catalog[10] ("Scale Degrees").
    const host = await mountLesson("/lesson/11", {
      [String(catalog[9]!.id)]: UNLOCK_THRESHOLD,
    });

    expect(title(host)).toBe(catalog[10]!.title);
    expect(title(host)).not.toBe("Note Duration");
  });

  it("renders not-found for an ordinal past the end of the catalog", async () => {
    const host = await mountLesson(`/lesson/${catalog.length + 1}`);

    expect(host.textContent).toContain("Lesson not found");
    expect(host.querySelector(".game-shell")).toBeNull();
  });

  it("renders not-found for ordinal 0", async () => {
    const host = await mountLesson("/lesson/0");

    expect(host.textContent).toContain("Lesson not found");
  });

  it("renders not-found for a non-numeric path segment", async () => {
    const host = await mountLesson("/lesson/abc");

    expect(host.textContent).toContain("Lesson not found");
  });
});

describe("App: history routing serves clean deep links", () => {
  it("renders the first lesson from pathname /lesson/1 with no hash", async () => {
    window.history.pushState(null, "", "/lesson/1");

    const host = mount(() => <App />);

    await waitFor(
      () => host.querySelector(".game-shell") !== null,
      "first lesson shell at /lesson/1",
    );
    expect(title(host)).toBe(catalog[0]!.title);
  });

  it("renders Home from the bare pathname /", async () => {
    const host = mount(() => <App />);

    await waitFor(() => host.querySelector(".home") !== null, "home page");
    expect(host.querySelector(".game-shell")).toBeNull();
  });
});

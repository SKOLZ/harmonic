import { MemoryRouter, Route } from "@solidjs/router";
import type { JSX } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import App from "../App";
import { catalog } from "../games/catalog";
import { PROGRESS_STORAGE_KEY, UNLOCK_THRESHOLD } from "../lib/progress";
import Home from "./Home";

/**
 * Home is the landing page: a masthead plus exactly two doors, Lessons and
 * Practice. The lesson list lives on /lessons (LessonsPage.test.tsx); these
 * tests protect the landing's own contract — two ungated choices, and no
 * lesson rows or lesson hrefs leaking onto `/`.
 *
 * `Home` builds its doors from `@solidjs/router`'s `A`, so it mounts inside a
 * router the same way `App` mounts it (memory history, no window hash to
 * mutate). Mount pattern follows GameShell.test.tsx.
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

/** Mount Home at the path App routes it on. */
async function mountHome(): Promise<HTMLElement> {
  const host = mount(() => (
    <MemoryRouter>
      <Route path="/" component={Home} />
    </MemoryRouter>
  ));
  await waitFor(() => host.querySelector(".home") !== null, "home page");
  return host;
}

function doors(host: HTMLElement): HTMLElement[] {
  return [...host.querySelectorAll<HTMLElement>(".home__door")];
}

function doorByHref(host: HTMLElement, href: string): HTMLAnchorElement {
  const found = host.querySelector<HTMLAnchorElement>(`.home__door[href="${href}"]`);
  if (!found) {
    throw new Error(`no landing door linking to ${JSON.stringify(href)}`);
  }
  return found;
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  while (cleanups.length > 0) cleanups.pop()?.();
  document.body.replaceChildren();
});

describe("Home: the landing page", () => {
  it("renders the masthead with the product name", async () => {
    const host = await mountHome();

    expect(host.querySelector("h1")?.textContent?.trim()).toBe("Music Theory Practice");
    expect(host.querySelector(".home__lede")).not.toBeNull();
  });

  it("offers exactly two options: Lessons and Practice", async () => {
    const host = await mountHome();

    expect(doors(host)).toHaveLength(2);
    expect(doorByHref(host, "/lessons").querySelector(".home__door-title")?.textContent?.trim()).toBe(
      "Lessons",
    );
    expect(doorByHref(host, "/practice").querySelector(".home__door-title")?.textContent?.trim()).toBe(
      "Practice",
    );
  });

  it("shows no lesson rows and no lesson hrefs on the landing", async () => {
    const host = await mountHome();

    // The catalog's rows live on /lessons now: `/` carries no per-lesson
    // links at all, so the two doors are the page's only anchors. Scoped to
    // `.home` — the page's own container — because the global navbar frames
    // every route and contributes its own anchors outside the page.
    const home = host.querySelector(".home");
    expect(home).not.toBeNull();
    expect(home!.querySelectorAll('a[href^="/lesson/"]')).toHaveLength(0);
    expect(home!.querySelectorAll(".lessons__lesson")).toHaveLength(0);
    expect(home!.querySelectorAll("a")).toHaveLength(2);
    expect(doors(host).some((door) => door.closest(".lessons__lesson") !== null)).toBe(false);
  });
});

describe("Home: neither landing option is gated by lesson progress", () => {
  it("shows both doors to a brand-new learner with every lesson locked", async () => {
    // Empty progress store: on the lesson list every row but the first is
    // locked; on the landing both doors must still be plain links.
    const host = await mountHome();

    for (const href of ["/lessons", "/practice"]) {
      const door = doorByHref(host, href);
      expect(door.tagName, href).toBe("A");
      expect(door.closest(".lessons__lesson--locked"), href).toBeNull();
      expect(door.getAttribute("aria-disabled"), href).toBeNull();
    }
  });

  it("keeps both doors open regardless of recorded progress", async () => {
    // Triangulation: the landing must not read the progress store into its
    // link state, so a satisfied streak changes nothing on `/`.
    window.localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({ [catalog[0]!.id]: UNLOCK_THRESHOLD }),
    );

    const host = await mountHome();

    for (const href of ["/lessons", "/practice"]) {
      const door = doorByHref(host, href);
      expect(door.tagName, href).toBe("A");
      expect(door.getAttribute("aria-disabled"), href).toBeNull();
    }
  });
});

describe("Home: App route resolution", () => {
  it("serves the landing from the bare pathname /", async () => {
    window.history.pushState(null, "", "/");

    const host = mount(() => <App />);
    await waitFor(() => host.querySelector(".home") !== null, "landing at /");

    expect(doors(host)).toHaveLength(2);
    expect(host.querySelector(".lessons")).toBeNull();
  });
});

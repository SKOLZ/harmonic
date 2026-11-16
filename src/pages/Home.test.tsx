import { MemoryRouter, Route } from "@solidjs/router";
import type { JSX } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import App from "../App";
import { catalog } from "../games/catalog";
import { PROGRESS_STORAGE_KEY, UNLOCK_THRESHOLD } from "../lib/progress";
import Home from "./Home";

/**
 * Home is the landing page: one promise, one explanation, and exactly two
 * calls to action — Lessons and Practice — over a quiet backdrop. The lesson
 * list lives on /lessons (LessonsPage.test.tsx); these tests protect the
 * landing's own contract: two ungated choices, a decorative canvas that can
 * never be read or pressed, and no lesson rows or lesson hrefs leaking onto
 * `/`.
 *
 * `Home` builds its actions from `@solidjs/router`'s `A`, so it mounts inside
 * a router the same way `App` mounts it (memory history, no window hash to
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

function ctas(host: HTMLElement): HTMLElement[] {
  return [...host.querySelectorAll<HTMLElement>(".home__cta")];
}

function ctaByHref(host: HTMLElement, href: string): HTMLAnchorElement {
  const found = host.querySelector<HTMLAnchorElement>(`.home__cta[href="${href}"]`);
  if (!found) {
    throw new Error(`no landing action linking to ${JSON.stringify(href)}`);
  }
  return found;
}

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});

afterEach(() => {
  while (cleanups.length > 0) cleanups.pop()?.();
  document.body.replaceChildren();
});

describe("Home: the landing page", () => {
  it("renders the hero with a plain promise, not the wordmark", async () => {
    const host = await mountHome();

    expect(host.querySelector("h1")?.textContent?.trim()).toBe("Learn to read music.");
    expect(host.querySelector(".home .brand-wordmark")).toBeNull();
  });

  it("explains the product in plain prose, with the lesson count used exactly once", async () => {
    const host = await mountHome();

    const lede = host.querySelector(".home__lede");
    expect(lede, "the landing explains itself").not.toBeNull();
    expect(lede!.textContent?.replace(/\s+/g, " ").trim()).toBe(
      "39 lessons take you from the first clef to the last cadence. Practice drills note reading against the clock.",
    );

    // 39 is a fact in a sentence, not a stat: one occurrence on the whole
    // landing, and it lives in the explanation rather than in a number block.
    expect(host.textContent?.match(/39/g), "the count appears once").toHaveLength(1);
    expect(lede!.textContent?.match(/39/g), "…and it is the lede's").toHaveLength(1);
  });

  it("draws the backdrop as a silent canvas behind the hero", async () => {
    const host = await mountHome();

    const home = host.querySelector(".home");
    expect(home, "the page is a home surface").not.toBeNull();

    const backdrop = home!.querySelector<HTMLCanvasElement>(".home__backdrop");
    expect(backdrop, "the backdrop is a canvas").not.toBeNull();
    expect(backdrop!.tagName).toBe("CANVAS");

    // Decoration only: no name, no text, no target. The canvas can never
    // become a second thing to read or press beside the two actions.
    expect(backdrop!.getAttribute("aria-hidden")).toBe("true");
    expect(backdrop!.getAttribute("role")).toBeNull();
    expect(backdrop!.getAttribute("aria-label")).toBeNull();
    expect(backdrop!.textContent).toBe("");
    expect(backdrop!.querySelectorAll("a, button, input, select, textarea, [role]")).toHaveLength(
      0,
    );
    expect(backdrop!.hasAttribute("tabindex")).toBe(false);

    // The type sits on top of it inside the measure, and the backdrop comes
    // first so the hero paints over the dots.
    const inner = home!.querySelector(".home__inner");
    expect(inner, "the hero keeps its 58.75rem column").not.toBeNull();
    expect(inner!.querySelector(".home__hero")).not.toBeNull();
    expect(
      backdrop!.compareDocumentPosition(inner!) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("removes the instrument and the entrance from the landing", async () => {
    const host = await mountHome();

    const home = host.querySelector(".home")!;
    expect(home.classList.contains("home--intro")).toBe(false);
    expect(home.querySelector(".home__instrument")).toBeNull();
    expect(home.querySelector(".home__staff")).toBeNull();
    expect(home.querySelector(".home__keyboard")).toBeNull();
    expect(home.querySelector(".home__key")).toBeNull();
    expect(home.querySelector(".brand-mark")).toBeNull();
  });

  it("offers exactly two options: Lessons and Practice", async () => {
    const host = await mountHome();

    expect(ctas(host)).toHaveLength(2);
    expect(ctaByHref(host, "/lessons").textContent?.trim()).toBe("Start the lessons");
    expect(ctaByHref(host, "/practice").textContent?.trim()).toBe("Practice note reading");

    // The two keys: Lessons is the ink primary, Practice the white ground
    // with the gold edge. These classes are the hooks styles.css targets.
    expect(ctaByHref(host, "/lessons").classList.contains("home__cta--primary")).toBe(true);
    expect(ctaByHref(host, "/practice").classList.contains("home__cta--secondary")).toBe(true);
  });

  it("shows no lesson rows and no lesson hrefs on the landing", async () => {
    const host = await mountHome();

    // The catalog's rows live on /lessons now: `/` carries no per-lesson
    // links at all, so the two actions are the page's only anchors. Scoped to
    // `.home` — the page's own container — because the global navbar frames
    // every route and contributes its own anchors outside the page.
    const home = host.querySelector(".home");
    expect(home).not.toBeNull();
    expect(home!.querySelectorAll('a[href^="/lesson/"]')).toHaveLength(0);
    expect(home!.querySelectorAll(".lessons__lesson")).toHaveLength(0);
    expect(home!.querySelectorAll("a")).toHaveLength(2);
    expect(ctas(host).some((cta) => cta.closest(".lessons__lesson") !== null)).toBe(false);
  });
});

describe("Home: neither landing option is gated by lesson progress", () => {
  it("shows both actions to a brand-new learner with every lesson locked", async () => {
    // Empty progress store: on the lesson list every row but the first is
    // locked; on the landing both actions must still be plain links.
    const host = await mountHome();

    for (const href of ["/lessons", "/practice"]) {
      const cta = ctaByHref(host, href);
      expect(cta.tagName, href).toBe("A");
      expect(cta.closest(".lessons__lesson--locked"), href).toBeNull();
      expect(cta.getAttribute("aria-disabled"), href).toBeNull();
    }
  });

  it("keeps both actions open regardless of recorded progress", async () => {
    // Triangulation: the landing must not read the progress store into its
    // link state, so a satisfied streak changes nothing on `/`.
    window.localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({ [catalog[0]!.id]: UNLOCK_THRESHOLD }),
    );

    const host = await mountHome();

    for (const href of ["/lessons", "/practice"]) {
      const cta = ctaByHref(host, href);
      expect(cta.tagName, href).toBe("A");
      expect(cta.getAttribute("aria-disabled"), href).toBeNull();
    }
  });

  it("renders the identical hero to a brand-new and a finished learner", async () => {
    // The hero column, not the whole document: hook, explanation, and actions
    // byte for byte. The canvas is excluded because its size attributes depend
    // on the environment, not on the learner. Nothing on `/` may differ once
    // progress exists — if a count, a lock, or a "continue" ever creeps in,
    // the two documents stop matching here.
    const renderHero = async (): Promise<string> => {
      window.history.pushState(null, "", "/");
      const host = mount(() => <App />);
      await waitFor(() => host.querySelector(".home__inner") !== null, "landing at /");
      return host.querySelector(".home__inner")!.outerHTML;
    };

    window.localStorage.clear();
    const brandNew = await renderHero();
    // Sanity: we are comparing the real hero, not two empty strings.
    expect(brandNew).toContain("Learn to read music.");
    expect(brandNew).toContain("home__cta");

    window.localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({ [catalog[0]!.id]: UNLOCK_THRESHOLD }),
    );
    const finished = await renderHero();

    expect(finished).toBe(brandNew);
  });
});

describe("Home: App route resolution", () => {
  it("serves the landing from the bare pathname /", async () => {
    window.history.pushState(null, "", "/");

    const host = mount(() => <App />);
    await waitFor(() => host.querySelector(".home") !== null, "landing at /");

    expect(host.querySelector("h1")?.textContent?.trim()).toBe("Learn to read music.");
    expect(ctas(host)).toHaveLength(2);
    expect(host.querySelector(".lessons")).toBeNull();
  });
});

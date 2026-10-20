import { MemoryRouter, Route } from "@solidjs/router";
import type { JSX } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import App from "../App";
import { catalog } from "../games/catalog";
import { PROGRESS_STORAGE_KEY, UNLOCK_THRESHOLD } from "../lib/progress";
import Home, { HOME_INTRO_KEY } from "./Home";

/**
 * Home is the landing page: a hook, one explanation, and exactly two calls to
 * action — Lessons and Practice. The lesson list lives on /lessons
 * (LessonsPage.test.tsx); these tests protect the landing's own contract —
 * two ungated choices, a decorative piano keyboard, and no lesson rows or
 * lesson hrefs leaking onto `/`.
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
  it("renders the hero with a hook, not the wordmark", async () => {
    const host = await mountHome();

    expect(host.querySelector("h1")?.textContent?.trim()).toBe("The staff, decoded.");
    expect(host.querySelector(".home__lede")).not.toBeNull();
    expect(host.querySelector(".home .brand-wordmark")).toBeNull();
  });

  it("explains the product in plain prose, with the lesson count used exactly once", async () => {
    const host = await mountHome();

    const lede = host.querySelector(".home__lede");
    expect(lede, "the landing explains itself").not.toBeNull();
    expect(lede!.textContent).toContain("39 lessons");

    // 39 is a fact in a sentence, not a stat: one occurrence on the whole
    // landing, and it lives in the explanation rather than in a number block.
    expect(host.textContent?.match(/39/g), "the count appears once").toHaveLength(1);
    expect(lede!.textContent?.match(/39/g), "…and it is the lede's").toHaveLength(1);
  });

  it("carries the full five-line staff once, above the keyboard", async () => {
    const host = await mountHome();

    const instrument = host.querySelector(".home__instrument");
    expect(instrument, "the instrument holds the drawing").not.toBeNull();
    expect(instrument!.getAttribute("aria-hidden")).toBe("true");

    const staff = host.querySelector(".home__staff");
    expect(staff, "the hero's rule is the staff").not.toBeNull();
    expect(staff!.classList.contains("brand-mark")).toBe(true);
    expect(staff!.querySelectorAll(".brand-mark__rule")).toHaveLength(5);
    expect(staff!.querySelectorAll(".brand-mark__glyph")).toHaveLength(1);

    // Decoration only: no role, no label — the mark can never name a pitch,
    // a duration, or an answer, and it contributes no text to be read.
    expect(staff!.getAttribute("aria-hidden")).toBe("true");
    expect(staff!.getAttribute("role")).toBeNull();
    expect(staff!.getAttribute("aria-label")).toBeNull();
    expect(staff!.textContent).toBe("");

    const keyboard = host.querySelector(".home__keyboard");
    expect(keyboard, "the keyboard closes the instrument").not.toBeNull();
    expect(
      staff!.compareDocumentPosition(keyboard!) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("draws a decorative keyboard with no controls and no text", async () => {
    const host = await mountHome();

    const keyboard = host.querySelector(".home__keyboard");
    expect(keyboard, "the keyboard is drawn").not.toBeNull();
    expect(keyboard!.querySelectorAll(".home__key--white")).toHaveLength(15);
    expect(keyboard!.querySelectorAll(".home__key--black")).toHaveLength(10);
    expect(keyboard!.querySelectorAll("button, a, [role]")).toHaveLength(0);
    expect(keyboard!.textContent).toBe("");

    // The whole instrument is illustration: it must never intercept a click
    // or a selection meant for the page around it.
    expect(host.querySelector(".home__instrument")!.getAttribute("aria-hidden")).toBe(
      "true",
    );
  });

  it("offers exactly two options: Lessons and Practice", async () => {
    const host = await mountHome();

    expect(ctas(host)).toHaveLength(2);
    expect(ctaByHref(host, "/lessons").textContent?.trim()).toBe("Start the lessons");
    expect(ctaByHref(host, "/practice").textContent?.trim()).toBe("Practice note reading");
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

  it("plays the entrance on the first visit of a session, then not again", async () => {
    const first = await mountHome();
    expect(first.querySelector(".home")!.classList.contains("home--intro")).toBe(true);
    expect(window.sessionStorage.getItem(HOME_INTRO_KEY)).toBe("1");

    const second = await mountHome();
    expect(second.querySelector(".home")!.classList.contains("home--intro")).toBe(false);
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

  it("renders the identical hero and actions to a brand-new and a finished learner", async () => {
    // The whole landing, not just the actions: hook, explanation, staff, and
    // keyboard included, byte for byte. Nothing on `/` may differ once
    // progress exists — if a count, a lock, or a "continue" ever creeps in,
    // the two documents stop matching here.
    //
    // The entrance flag is pre-set so both renders skip the one-shot class;
    // otherwise the first mount would carry `home--intro` and the second
    // would not, and this test would compare the animation instead of the
    // progress contract.
    window.sessionStorage.setItem(HOME_INTRO_KEY, "1");

    const renderLanding = async (): Promise<string> => {
      window.history.pushState(null, "", "/");
      const host = mount(() => <App />);
      await waitFor(() => host.querySelector(".home") !== null, "landing at /");
      return host.querySelector(".home")!.outerHTML;
    };

    window.localStorage.clear();
    const brandNew = await renderLanding();
    // Sanity: we are comparing the real hero, not two empty strings.
    expect(brandNew).toContain("The staff, decoded.");
    expect(brandNew).toContain("home__staff");
    expect(brandNew).toContain("home__keyboard");

    window.localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({ [catalog[0]!.id]: UNLOCK_THRESHOLD }),
    );
    const finished = await renderLanding();

    expect(finished).toBe(brandNew);
  });
});

describe("Home: App route resolution", () => {
  it("serves the landing from the bare pathname /", async () => {
    window.history.pushState(null, "", "/");

    const host = mount(() => <App />);
    await waitFor(() => host.querySelector(".home") !== null, "landing at /");

    expect(ctas(host)).toHaveLength(2);
    expect(host.querySelector(".lessons")).toBeNull();
  });

  it("draws the full staff exactly once in the whole page, at hero scale", async () => {
    window.history.pushState(null, "", "/");

    const host = mount(() => <App />);
    await waitFor(() => host.querySelector(".home") !== null, "landing at /");

    const marks = [...host.querySelectorAll(".brand-mark")];
    const ruleCount = (mark: Element) => mark.querySelectorAll(".brand-mark__rule").length;
    const fullStaffs = marks.filter((mark) => ruleCount(mark) === 5);

    expect(fullStaffs, "a second staff would turn the signature into wallpaper").toHaveLength(1);
    expect(fullStaffs[0]!.closest(".home"), "the staff is the hero's rule").not.toBeNull();

    // The wordmark is its own mark now — framed by two hairline rules, with
    // no companion beneath the name — so the hero's staff is the whole
    // page's only BrandMark instance.
    expect(marks).toHaveLength(1);
  });
});

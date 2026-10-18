import { MemoryRouter, type MemoryHistory, Route } from "@solidjs/router";
import type { JSX } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import App from "../App";
import { catalog } from "../games/catalog";
import { PROGRESS_STORAGE_KEY, UNLOCK_THRESHOLD } from "../lib/progress";
import { practiceTopics, type PracticeTopic } from "../lib/practice/topics";
import PracticeHubPage from "./PracticeHubPage";

/**
 * `/practice` is the topic hub: one row per registry entry, open topics as
 * links, locked topics shown but never navigable. The registry ships a single
 * open entry, so the locked path is driven by injected fixture topics — the
 * same discipline T1 used for gating: a mechanism no test exercises rots
 * until a real gated topic lands.
 *
 * App-level assertions drive the real history router (clean hrefs, the shape
 * LessonRouting uses); the fixture rows mount through a memory history parked
 * at `/practice`, the shape LessonsPage uses for its list.
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

/** A read-only memory history parked at /practice, so the page's links render
    as the clean paths (/practice/:slug) App's history router serves. */
const hubHistory: MemoryHistory = {
  get: () => "/practice",
  set: () => {},
  go: () => {},
  listen: () => () => {},
};

/** Mount the hub with injected topics — `undefined` renders the shipped
    registry, the same default the route uses. */
async function mountHub(topics?: readonly PracticeTopic[]): Promise<HTMLElement> {
  const host = mount(() => (
    <MemoryRouter history={hubHistory}>
      <Route path="/practice" component={() => <PracticeHubPage topics={topics} />} />
    </MemoryRouter>
  ));
  await waitFor(() => host.querySelector(".practice-hub") !== null, "practice hub");
  return host;
}

function rows(host: HTMLElement): HTMLElement[] {
  return [...host.querySelectorAll<HTMLElement>("li.practice-hub__topic")];
}

function rowWithTitle(host: HTMLElement, title: string): HTMLElement {
  const found = rows(host).find(
    (row) => row.querySelector(".practice-hub__topic-title")?.textContent?.trim() === title,
  );
  if (!found) {
    throw new Error(`no practice hub row titled ${JSON.stringify(title)}`);
  }
  return found;
}

/** Gated on lesson 2: locked for an empty store, unlocked once lesson 1 is. */
const openFixture: PracticeTopic = {
  slug: "fixture-open",
  title: "Fixture open topic",
  lede: "An open fixture; never part of the registry.",
  unlock: { kind: "open" },
};
const lockedFixture: PracticeTopic = {
  slug: "fixture-locked",
  title: "Fixture locked topic",
  lede: "A lesson-gated fixture; never part of the registry.",
  unlock: { kind: "lesson", ordinal: 2 },
};

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  while (cleanups.length > 0) cleanups.pop()?.();
  document.body.replaceChildren();
  window.history.pushState(null, "", "/");
});

describe("Practice hub: the registry, one row per entry", () => {
  it("lists every registry entry with its title and lede at /practice", async () => {
    window.history.pushState(null, "", "/practice");

    const host = mount(() => <App />);
    await waitFor(() => host.querySelector(".practice-hub") !== null, "practice hub");

    const hubRows = rows(host);
    expect(hubRows).toHaveLength(practiceTopics.length);
    for (const topic of practiceTopics) {
      const row = rowWithTitle(host, topic.title);
      expect(row.textContent, topic.slug).toContain(topic.lede);
    }
    // The hub is not the mode: the shell lives at /practice/:slug only.
    expect(host.querySelector(".practice-shell")).toBeNull();
    expect(host.querySelector(".practice-page")).toBeNull();
    expect(host.querySelector(".home")).toBeNull();
  });

  it("links every shipped topic to /practice/:slug — the registry is all open", async () => {
    window.history.pushState(null, "", "/practice");

    const host = mount(() => <App />);
    await waitFor(() => host.querySelector(".practice-hub") !== null, "practice hub");

    // topics.test.ts pins the shipped registry to `kind: "open"`, so every
    // entry must be a link; a registry entry that ships locked would fail
    // both suites at once rather than silently rendering an inert row.
    for (const topic of practiceTopics) {
      const link = host.querySelector<HTMLAnchorElement>(
        `a[href="/practice/${topic.slug}"]`,
      );
      expect(link, topic.slug).not.toBeNull();
      expect(link!.textContent, topic.slug).toContain(topic.title);
    }
  });
});

describe("Practice hub: lock state", () => {
  it("shows a lesson-gated topic as locked, with no link to its slug", async () => {
    const host = await mountHub([openFixture, lockedFixture]);
    expect(rows(host)).toHaveLength(2);

    const lockedRow = rowWithTitle(host, lockedFixture.title);
    expect(lockedRow.classList.contains("practice-hub__topic--locked")).toBe(true);
    // Shown, not hidden: title and lede are still readable.
    expect(lockedRow.textContent).toContain(lockedFixture.lede);
    // Not navigable: no anchor anywhere in the row, and no href to its slug.
    expect(lockedRow.querySelector("a")).toBeNull();
    expect(host.querySelector('a[href="/practice/fixture-locked"]')).toBeNull();

    const openRow = rowWithTitle(host, openFixture.title);
    expect(openRow.classList.contains("practice-hub__topic--locked")).toBe(false);
    expect(openRow.querySelector('a[href="/practice/fixture-open"]')).not.toBeNull();
    expect(openRow.querySelector(".practice-hub__topic-lock")).toBeNull();
  });

  it("carries the lock state as a word and an aria attribute, not colour alone", async () => {
    const host = await mountHub([openFixture, lockedFixture]);
    const lockedRow = rowWithTitle(host, lockedFixture.title);

    const body = lockedRow.querySelector(".practice-hub__topic-body");
    expect(body?.tagName).toBe("DIV");
    expect(body?.getAttribute("aria-disabled")).toBe("true");

    // The word *is* the cue: it survives grayscale, forced-colours mode, and
    // a screen reader — none of which see the ochre tag. Asserted as the
    // row's own text, so the meaning cannot hide in a pseudo-element.
    const cue = lockedRow.querySelector(".practice-hub__topic-lock");
    expect(cue?.textContent?.trim()).toBe("Locked");
    expect(lockedRow.textContent).toContain("Locked");
  });

  it("links a lesson-gated topic once its prerequisite lesson unlocks", async () => {
    // The row's lock state is read from the live store: seeding lesson 1's
    // streak past the threshold must turn the same row into a link.
    window.localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({ [String(catalog[0]!.id)]: UNLOCK_THRESHOLD }),
    );

    const host = await mountHub([openFixture, lockedFixture]);

    const unlockedRow = rowWithTitle(host, lockedFixture.title);
    expect(unlockedRow.classList.contains("practice-hub__topic--locked")).toBe(false);
    expect(unlockedRow.querySelector('a[href="/practice/fixture-locked"]')).not.toBeNull();
    expect(unlockedRow.querySelector(".practice-hub__topic-lock")).toBeNull();
    expect(unlockedRow.querySelector(".practice-hub__topic-body")?.tagName).toBe("A");
    expect(
      unlockedRow.querySelector(".practice-hub__topic-body")?.getAttribute("aria-disabled"),
    ).toBeNull();
  });
});

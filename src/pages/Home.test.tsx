import { MemoryRouter, Route } from "@solidjs/router";
import type { JSX } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { catalog } from "../games/catalog";
import { PROGRESS_STORAGE_KEY, UNLOCK_THRESHOLD } from "../lib/progress";
import Home from "./Home";

/**
 * Home is the primary navigation surface, and its assertions read the live
 * catalog rather than a fixture so a future appended lesson is covered by
 * these tests without editing them.
 *
 * `Home` builds its links from `@solidjs/router`'s `A`, so it mounts inside a
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

/** Mount Home at the path App routes it on, and wait for the catalog render. */
async function mountHome(): Promise<HTMLElement> {
  const host = mount(() => (
    <MemoryRouter>
      <Route path="/" component={Home} />
    </MemoryRouter>
  ));
  await waitFor(() => host.querySelector(".home") !== null, "home page");
  return host;
}

function sections(host: HTMLElement): HTMLElement[] {
  return [...host.querySelectorAll<HTMLElement>(".home__section")];
}

function sectionTitles(host: HTMLElement): string[] {
  return sections(host).map((section) => section.querySelector(".home__section-title")?.textContent?.trim() ?? "");
}

function rows(host: HTMLElement): HTMLElement[] {
  return [...host.querySelectorAll<HTMLElement>("li.home__lesson")];
}

/** Lesson titles in rendered order under `root` (the host or one section). */
function titlesUnder(root: HTMLElement): string[] {
  return [...root.querySelectorAll(".home__lesson-title")].map(
    (element) => element.textContent?.trim() ?? "",
  );
}

function rowByTitle(host: HTMLElement, title: string): HTMLElement {
  const found = rows(host).find((row) => titlesUnder(row)[0] === title);
  if (!found) {
    throw new Error(`no lesson row titled ${JSON.stringify(title)}`);
  }
  return found;
}

function progressText(row: HTMLElement): string | undefined {
  return row.querySelector(".home__lesson-progress")?.textContent?.trim();
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  while (cleanups.length > 0) cleanups.pop()?.();
  document.body.replaceChildren();
});

describe("Home: sections and lessons come from the live catalog", () => {
  it("renders one section per catalog section, in catalog order", async () => {
    const host = await mountHome();
    const expectedSections = [...new Set(catalog.map((entry) => entry.section))];

    expect(sectionTitles(host)).toEqual(expectedSections);
    expect(sections(host)).toHaveLength(expectedSections.length);
  });

  it("renders every catalog lesson exactly once", async () => {
    const host = await mountHome();

    expect(rows(host)).toHaveLength(catalog.length);
    expect(titlesUnder(host).slice().sort()).toEqual(
      catalog.map((entry) => entry.title).slice().sort(),
    );
  });

  it("renders a section's lessons in catalog order, not sorted by title", async () => {
    const host = await mountHome();

    // The assertion must not be vacuous: at least one section whose catalog
    // order differs from its title order has to exist in the live catalog.
    const bySection = new Map<string, typeof catalog>();
    for (const entry of catalog) {
      bySection.set(entry.section, [...(bySection.get(entry.section) ?? []), entry]);
    }
    const discriminating = [...bySection.values()].filter(
      (entries) =>
        entries.map((entry) => entry.title).join("\n") !==
        [...entries]
          .map((entry) => entry.title)
          .sort((a, b) => a.localeCompare(b))
          .join("\n"),
    );
    expect(
      discriminating.length,
      "catalog order and title order must differ somewhere, or this property is untested",
    ).toBeGreaterThan(0);

    for (const section of sections(host)) {
      const name = section.querySelector(".home__section-title")?.textContent?.trim() ?? "";
      const expected = (bySection.get(name) ?? []).map((entry) => entry.title);
      expect(titlesUnder(section), name).toEqual(expected);
    }

    const discriminatingNames = discriminating.map((entries) => entries[0]!.section);
    for (const name of discriminatingNames) {
      const rendered = titlesUnder(
        sections(host).find(
          (section) => section.querySelector(".home__section-title")?.textContent?.trim() === name,
        )!,
      );
      expect(rendered, name).not.toEqual([...rendered].sort((a, b) => a.localeCompare(b)));
    }
  });
});

describe("Home: lock state", () => {
  it("with no progress, links only the first lesson and locks every other row", async () => {
    const host = await mountHome();
    const lessonRows = rows(host);

    expect(lessonRows[0]!.classList.contains("home__lesson--locked")).toBe(false);
    const firstBody = lessonRows[0]!.querySelector(".home__lesson-body");
    expect(firstBody?.tagName).toBe("A");
    // Lesson URLs are ordinal: catalog[0] is /lesson/1, never its source id.
    expect(firstBody?.getAttribute("href")).toBe("/lesson/1");
    expect(lessonRows[0]!.querySelector(".home__lesson-lock")).toBeNull();

    for (const row of lessonRows.slice(1)) {
      expect(row.classList.contains("home__lesson--locked")).toBe(true);
      // A locked lesson is not a link and says so.
      expect(row.querySelector("a")).toBeNull();
      const body = row.querySelector(".home__lesson-body");
      expect(body?.tagName).toBe("DIV");
      expect(body?.getAttribute("aria-disabled")).toBe("true");
      expect(row.querySelector(".home__lesson-lock")?.textContent?.trim()).toBe("Locked");
    }
  });

  it("links the lesson after one that has reached UNLOCK_THRESHOLD", async () => {
    const first = catalog[0]!;
    const second = catalog[1]!;
    window.localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({ [first.id]: UNLOCK_THRESHOLD }),
    );

    const host = await mountHome();
    const lessonRows = rows(host);

    const unlockedRow = rowByTitle(host, second.title);
    expect(unlockedRow.classList.contains("home__lesson--locked")).toBe(false);
    // second is catalog[1], so its ordinal URL is /lesson/2 — not source id 11.
    expect(unlockedRow.querySelector(".home__lesson-body")?.getAttribute("href")).toBe(
      "/lesson/2",
    );
    expect(unlockedRow.querySelector(".home__lesson-lock")).toBeNull();

    // One satisfied link does not unlock the whole chain: the lesson after the
    // newly unlocked one stays locked.
    const third = catalog[2]!;
    const stillLocked = rowByTitle(host, third.title);
    expect(stillLocked.classList.contains("home__lesson--locked")).toBe(true);
    expect(stillLocked.querySelector("a")).toBeNull();
    expect(lessonRows).toHaveLength(catalog.length);
  });

  it("keeps the first lesson linked regardless of progress", async () => {
    window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify({}));
    const host = await mountHome();

    const firstRow = rows(host)[0]!;
    expect(firstRow.querySelector(".home__lesson-body")?.tagName).toBe("A");
    expect(firstRow.querySelector(".home__lesson-body")?.getAttribute("href")).toBe(
      "/lesson/1",
    );
  });
});

describe("Home: per-lesson progress", () => {
  it("shows each lesson's completed rounds against UNLOCK_THRESHOLD", async () => {
    const seeded: Record<string, number> = {
      [catalog[0]!.id]: 4,
      [catalog[2]!.id]: UNLOCK_THRESHOLD,
    };
    window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(seeded));

    const host = await mountHome();

    for (const entry of catalog) {
      const row = rowByTitle(host, entry.title);
      expect(progressText(row), entry.title).toBe(
        `${seeded[entry.id] ?? 0}/${UNLOCK_THRESHOLD}`,
      );
    }

    // The lede quotes the same threshold the counts are scored against.
    expect(host.querySelector(".home__lede")?.textContent).toContain(
      `${UNLOCK_THRESHOLD}`,
    );
  });

  it("starts every lesson at 0 with an empty store", async () => {
    const host = await mountHome();

    for (const entry of catalog) {
      expect(progressText(rowByTitle(host, entry.title)), entry.title).toBe(
        `0/${UNLOCK_THRESHOLD}`,
      );
    }
  });
});

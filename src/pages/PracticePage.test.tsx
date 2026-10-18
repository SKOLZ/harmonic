import type { JSX } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it } from "vitest";
import App from "../App";

/**
 * T3's route: `/practice/:slug` runs one registry entry; `/practice` itself is
 * the topic hub, asserted in PracticeHubPage.test.tsx. The App-level test
 * drives the real history router the same way LessonRouting.test.tsx does —
 * push the path, mount `<App />`, assert the practice shell mounts with no
 * catalog lookup, no ordinal resolution, and no progress gate in between.
 * A slug no registry entry owns is not a silent route miss: it renders the
 * topic page's not-found branch, the way an out-of-range ordinal does on
 * `/lesson/:id`.
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

afterEach(() => {
  while (cleanups.length > 0) cleanups.pop()?.();
  document.body.replaceChildren();
  window.history.pushState(null, "", "/");
});

describe("PracticePage", () => {
  it("is served by the App router at /practice/note-guessing with no lesson id in the path", async () => {
    // Migrated from /practice: the hub took that path over, so the shell
    // assertion moved down to the topic slug rather than being dropped.
    window.history.pushState(null, "", "/practice/note-guessing");

    const host = mount(() => <App />);
    await waitFor(() => host.querySelector(".practice-shell") !== null, "practice shell");

    expect(host.querySelector(".practice-page")).not.toBeNull();
    const back = host.querySelector(".practice-page a");
    // Leaving practice returns to the topic hub — practice's own list, the
    // way "All lessons" returns a lesson to /lessons.
    expect(back?.getAttribute("href")).toBe("/practice");
    // Practice is not a lesson: its way out must not promise "All lessons".
    expect(back?.textContent?.trim()).toBe("All topics");
    // Nothing lesson-shaped: the route never resolves through the catalog.
    expect(host.querySelector(".game-page")).toBeNull();
    // The static /practice route and the dynamic /practice/:slug route must
    // not both render: a topic URL shows the topic, never the hub.
    expect(host.querySelector(".practice-hub")).toBeNull();
    expect(host.textContent).not.toContain("Lesson not found");
  });

  it("renders not-found for a slug no registry entry owns", async () => {
    window.history.pushState(null, "", "/practice/no-such-topic");

    const host = mount(() => <App />);
    await waitFor(
      () => host.textContent.includes("Practice topic not found"),
      "practice topic not-found branch",
    );

    // Not-found is a state of the topic page, not a route miss or a shell.
    expect(host.querySelector(".practice-page")).not.toBeNull();
    expect(host.querySelector(".practice-shell")).toBeNull();
    expect(host.querySelector(".game-page")).toBeNull();
    expect(host.textContent).not.toContain("Lesson not found");
    // The way out still points at the hub.
    expect(host.querySelector(".practice-page a")?.getAttribute("href")).toBe("/practice");
  });
});

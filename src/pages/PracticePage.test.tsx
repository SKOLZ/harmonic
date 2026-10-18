import type { JSX } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it } from "vitest";
import App from "../App";

/**
 * T4's route: `/practice` sits outside the 39-lesson chain. The App-level test
 * drives the real history router the same way LessonRouting.test.tsx does —
 * push the path, mount `<App />`, assert the practice shell mounts with no
 * catalog lookup, no ordinal resolution, and no progress gate in between.
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
  it("is served by the App router at /practice with no lesson id in the path", async () => {
    window.history.pushState(null, "", "/practice");

    const host = mount(() => <App />);
    await waitFor(() => host.querySelector(".practice-shell") !== null, "practice shell");

    expect(host.querySelector(".practice-page")).not.toBeNull();
    const back = host.querySelector(".practice-page a");
    expect(back?.getAttribute("href")).toBe("/");
    // Practice is not a lesson: its way out must not promise "All lessons".
    expect(back?.textContent?.trim()).toBe("Back to home");
    // Nothing lesson-shaped: the route never resolves through the catalog.
    expect(host.querySelector(".game-page")).toBeNull();
    expect(host.textContent).not.toContain("Lesson not found");
  });
});

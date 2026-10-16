import { HashRouter, Route } from "@solidjs/router";
import type { JSX } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LessonModule } from "../games/types";
import { UNLOCK_THRESHOLD } from "../lib/progress";
import type { Round } from "../lib/rounds/types";
import GamePage from "./GamePage";

/**
 * T3 wiring: a miss fails the run, and the fresh randomized set the learner
 * restarts with comes from the lesson module's generator — the shell never
 * invents questions. The registry is mocked only to count calls and to pin
 * round content; every generated round answers "B", so clicking "A" is always
 * a miss no matter which ten the draw selects.
 */
const { generateCalls } = vi.hoisted(() => ({ generateCalls: [] as number[] }));

function generatedRound(poolIndex: number): Round {
  return {
    id: `fixed-${poolIndex}`,
    prompt: { kind: "text", text: `Question ${poolIndex}?` },
    answer: { kind: "choices", options: ["A", "B", "C"], correctIndex: 1 },
    rule: `Rule ${poolIndex}.`,
  };
}

vi.mock("../games/registry", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../games/registry")>();
  return {
    ...actual,
    getLessonModule(id: number): LessonModule {
      return {
        entry: actual.getLessonModule(id).entry,
        generateRounds: () => {
          generateCalls.push(id);
          // Ids embed the call index: visit 1 draws 0..11, the restart 100..111.
          const base = (generateCalls.length - 1) * 100;
          return Array.from({ length: 12 }, (_, i) => generatedRound(base + i));
        },
      };
    },
  };
});

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

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  while (cleanups.length > 0) cleanups.pop()?.();
  document.body.replaceChildren();
  generateCalls.length = 0;
  window.location.hash = "";
});

describe("GamePage: a missed run restarts from a freshly generated set", () => {
  it("keeps generation at one call per visit, then regenerates on Start over", async () => {
    window.location.hash = "#/lesson/1";
    const host = mount(() => (
      <HashRouter>
        <Route path="/" component={() => <p class="home-page">Home</p>} />
        <Route path="/lesson/:id" component={GamePage} />
      </HashRouter>
    ));

    await waitFor(() => host.querySelector(".game-shell") !== null, "lesson shell");
    expect(generateCalls).toEqual([10]);
    // The first draw's rounds carry ids 0..11 — not the restart's 100..111.
    expect(host.textContent).toMatch(/Question \d{1,2}\?/);

    // One wrong answer fails the run; the miss itself does not regenerate.
    const miss = host.querySelector<HTMLButtonElement>(".choices__button");
    expect(miss).not.toBeNull();
    miss!.click();
    expect(host.textContent).toContain("Not quite.");
    expect(generateCalls).toEqual([10]);
    expect(host.textContent).toContain(`0/${UNLOCK_THRESHOLD}`);

    const startOver = [...host.querySelectorAll("button")].find(
      (button) => button.textContent?.trim() === "Start over",
    );
    expect(startOver).toBeDefined();
    startOver!.click();

    // Restarting draws a fresh set of ten from the lesson generator.
    expect(generateCalls).toEqual([10, 10]);
    await waitFor(() => /Question 1\d\d\?/.test(host.textContent ?? ""), "fresh question");
    expect(host.textContent).toContain(`0/${UNLOCK_THRESHOLD}`);
    expect(host.querySelector(".game-shell__feedback")).toBeNull();
  });
});

import type { JSX } from "solid-js";
import { render } from "solid-js/web";
import { HashRouter, Route } from "@solidjs/router";
import { afterEach, describe, expect, it, vi } from "vitest";
import GamePage from "../pages/GamePage";
import { PROGRESS_STORAGE_KEY } from "../lib/progress";
import type { LessonModule } from "./types";

/**
 * Part C wiring: GamePage asks the registry for rounds instead of using a
 * shared demo set, and it generates them once per lesson visit — answering a
 * round (which re-renders GameShell) must not regenerate the round list, while
 * coming back to a lesson must.
 *
 * The registry is mocked only to count calls; the wrapped module is the real
 * one, so the rounds on screen are the genuine generated ones.
 */
const { generateCalls } = vi.hoisted(() => ({ generateCalls: [] as number[] }));

vi.mock("./registry", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./registry")>();
  return {
    ...actual,
    getLessonModule(id: number): LessonModule {
      const module = actual.getLessonModule(id);
      return {
        entry: module.entry,
        generateRounds: (rng: () => number) => {
          generateCalls.push(id);
          return module.generateRounds(rng);
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

afterEach(() => {
  while (cleanups.length > 0) cleanups.pop()?.();
  document.body.replaceChildren();
  generateCalls.length = 0;
  localStorage.clear();
  window.location.hash = "";
});

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

describe("GamePage lesson wiring", () => {
  it("generates rounds from the registry once per lesson visit", async () => {
    // Lesson 11 unlocks only after 10 correct rounds of lesson 10.
    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify({ "10": 10 }));
    window.location.hash = "#/lesson/10";

    const host = mount(() => (
      <HashRouter>
        <Route path="/" component={() => <p class="home-page">Home</p>} />
        <Route path="/lesson/:id" component={GamePage} />
      </HashRouter>
    ));

    await waitFor(() => host.querySelector(".game-shell") !== null, "lesson 10 shell");
    expect(generateCalls).toEqual([10]);
    expect(title(host)).toBe("The Staff, Clefs, and Ledger Lines");

    // Answering re-renders GameShell; the round list must stay untouched.
    const choice = host.querySelector<HTMLButtonElement>(".choices__button");
    expect(choice).not.toBeNull();
    choice!.click();
    expect(generateCalls).toEqual([10]);

    window.location.hash = "#/lesson/11";
    await waitFor(() => title(host) === "Note Duration", "lesson 11 shell");
    expect(generateCalls).toEqual([10, 11]);

    // A fresh visit to a lesson regenerates, i.e. once per visit, not once ever.
    window.location.hash = "#/";
    await waitFor(() => host.querySelector(".game-page") === null, "leave game page");
    window.location.hash = "#/lesson/10";
    await waitFor(() => title(host) === "The Staff, Clefs, and Ledger Lines", "lesson 10 again");
    expect(generateCalls).toEqual([10, 11, 10]);
  });

  it("shows the locked screen without asking the registry for rounds", async () => {
    // No progress recorded, so lesson 12 stays locked and unregistered.
    window.location.hash = "#/lesson/12";
    const host = mount(() => (
      <HashRouter>
        <Route path="/lesson/:id" component={GamePage} />
      </HashRouter>
    ));

    await waitFor(() => host.querySelector(".game-page__locked") !== null, "locked screen");
    expect(host.textContent).toContain("Lesson locked");
    expect(generateCalls).toEqual([]);
  });
});

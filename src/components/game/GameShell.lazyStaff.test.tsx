import type { JSX } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it } from "vitest";
import type { Round } from "../../lib/rounds/types";
import GameShell from "./GameShell";

/**
 * T15 code-split: the staff renderer is a lazy registry entry, so the shell —
 * not StaffPrompt — owns the Suspense boundary. Every other staff-prompt test
 * mounts StaffPrompt statically and asserts the SVG synchronously; this file
 * is the only one that exercises the production path, where the notation
 * chunk (StaffPrompt + Staff + VexFlow) arrives asynchronously on first staff
 * render.
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

afterEach(() => {
  while (cleanups.length > 0) cleanups.pop()?.();
  document.body.replaceChildren();
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

function staffRound(id: string): Round {
  return {
    id,
    prompt: { kind: "staff", clef: "treble", notes: ["C4", "Eb4", "G4"] },
    answer: { kind: "choices", options: ["A", "B", "C"], correctIndex: 0 },
    rule: `Rule for ${id}.`,
  };
}

describe("GameShell lazy staff boundary", () => {
  it("engraves a staff prompt once the lazy notation chunk resolves", async () => {
    const host = mount(() => (
      <GameShell lessonId="10" lessonTitle="Lazy staff" rounds={[staffRound("s1")]} />
    ));
    // The SVG is behind the dynamic import(), so it cannot be asserted in the
    // same synchronous block as the mount — poll until the chunk lands.
    await waitFor(() => host.querySelector("svg") !== null, "staff svg");
    const wrapper = host.querySelector(".prompt--staff");
    expect(wrapper).not.toBeNull();
    // The aria-label contract (T6c/T8c) must be identical through the lazy
    // path: structural labels only — clef, accidental count, glyph count.
    expect(wrapper!.getAttribute("aria-label")).toBe(
      "Staff notation, treble clef, 3 notes",
    );
    expect(
      host.querySelector("svg")!.querySelectorAll("path").length,
    ).toBeGreaterThanOrEqual(5);
  });

  it("an illustration-only text round pulls the notation chunk without delaying the prompt", async () => {
    const round: Round = {
      id: "i1",
      prompt: { kind: "text", text: "Which note is enharmonic with C#?" },
      answer: { kind: "choices", options: ["Db", "D", "B", "Eb"], correctIndex: 0 },
      rule: "C# and Db name the same pitch.",
      illustration: { clef: "treble", notes: ["C#4"] },
    };
    const host = mount(() => (
      <GameShell lessonId="20" lessonTitle="Lazy illustration" rounds={[round]} />
    ));
    // The text prompt and answer control are outside the illustration's
    // Suspense: they paint before the chunk lands.
    expect(host.querySelector(".prompt--text")?.textContent).toBe(
      "Which note is enharmonic with C#?",
    );
    expect([...host.querySelectorAll("button")].map((b) => b.textContent)).toEqual([
      "Db",
      "D",
      "B",
      "Eb",
    ]);
    // The illustration itself waits on the same lazy chunk as a staff prompt.
    await waitFor(
      () => host.querySelector(".game-shell__illustration svg") !== null,
      "illustration svg",
    );
    expect(
      host.querySelector(".game-shell__illustration .prompt--staff")?.getAttribute("aria-label"),
    ).toBe("Staff notation, treble clef, 1 note");
  });
});

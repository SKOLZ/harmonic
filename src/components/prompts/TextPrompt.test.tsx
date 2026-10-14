import type { JSX } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it } from "vitest";
import TextPrompt from "./TextPrompt";

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

describe("TextPrompt", () => {
  it("renders the prompt text", () => {
    const host = mount(() => (
      <TextPrompt prompt={{ kind: "text", text: "What is the relative minor of A major?" }} />
    ));
    expect(host.textContent).toContain("What is the relative minor of A major?");
    expect(host.querySelector(".prompt--text")).not.toBeNull();
  });

  it("throws a clear error when handed a non-text prompt", () => {
    expect(() =>
      mount(() => (
        <TextPrompt prompt={{ kind: "staff", clef: "treble", notes: ["c/4"] }} />
      )),
    ).toThrow(/"text".*"staff"|staff.*text/i);
  });
});

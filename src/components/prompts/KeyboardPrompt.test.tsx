import type { JSX } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it } from "vitest";
import KeyboardPrompt from "./KeyboardPrompt";

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

describe("KeyboardPrompt", () => {
  it("renders the keyboard in display mode", () => {
    const host = mount(() => (
      <KeyboardPrompt prompt={{ kind: "keyboard", highlight: ["F#4"] }} />
    ));
    const wrapper = host.querySelector(".prompt--keyboard");
    expect(wrapper).not.toBeNull();
    const keyboard = host.querySelector(".keyboard");
    expect(keyboard).not.toBeNull();
    expect(keyboard!.getAttribute("data-selectable")).toBe("false");
    const keys = [...host.querySelectorAll("button[data-note]")];
    expect(keys).toHaveLength(25);
    // The key buttons keep their own aria-labels in the DOM, but the prompt
    // wrapper is the only thing exposed to assistive tech (see below).
    expect(keys[0].getAttribute("aria-label")).toBeTruthy();
  });

  it("describes the prompt structurally: range and count, not which keys", () => {
    const host = mount(() => (
      <KeyboardPrompt prompt={{ kind: "keyboard", highlight: ["F#4"] }} />
    ));
    const wrapper = host.querySelector(".prompt--keyboard");
    expect(wrapper!.getAttribute("role")).toBe("img");
    expect(wrapper!.getAttribute("aria-label")).toBe(
      "Piano keyboard, C4 to C6, 1 key highlighted",
    );
  });

  it("never announces the highlighted key names", () => {
    const host = mount(() => (
      <KeyboardPrompt prompt={{ kind: "keyboard", highlight: ["F#4", "G4"] }} />
    ));
    const label =
      host.querySelector(".prompt--keyboard")?.getAttribute("aria-label") ?? "";
    expect(label).toContain("2 keys highlighted");
    expect(label).not.toContain("F#");
    expect(label).not.toContain("F sharp");
    expect(label).not.toContain("G4");
    expect(label).not.toContain("G 4");
  });

  it("counts every octave a pitch-class highlight lights, not the array length", () => {
    // "C" without an octave matches C4, C5 and C6 — three highlighted keys
    // from a one-entry highlight array.
    const host = mount(() => (
      <KeyboardPrompt prompt={{ kind: "keyboard", highlight: ["C"] }} />
    ));
    expect(
      host.querySelector(".prompt--keyboard")?.getAttribute("aria-label"),
    ).toBe("Piano keyboard, C4 to C6, 3 keys highlighted");
  });

  it("reflects the shifted octave range and its highlight count in the label", () => {
    const host = mount(() => (
      <KeyboardPrompt prompt={{ kind: "keyboard", highlight: ["C3"], octave: 2 }} />
    ));
    expect(
      host.querySelector(".prompt--keyboard")?.getAttribute("aria-label"),
    ).toBe("Piano keyboard, C2 to C4, 1 key highlighted");
  });

  it("passes the highlight through so prompted keys are marked", () => {
    const host = mount(() => (
      <KeyboardPrompt prompt={{ kind: "keyboard", highlight: ["F#4"] }} />
    ));
    expect(
      host.querySelector('button[data-note="F#4"]')?.getAttribute("data-highlighted"),
    ).toBe("true");
    expect(
      host.querySelector('button[data-note="G4"]')?.getAttribute("data-highlighted"),
    ).toBe("false");
  });

  it("shifts the drawn range when octave is set", () => {
    const host = mount(() => (
      <KeyboardPrompt prompt={{ kind: "keyboard", highlight: ["C3"], octave: 2 }} />
    ));
    const notes = [...host.querySelectorAll("button[data-note]")].map((button) =>
      button.getAttribute("data-note"),
    );
    expect(notes[0]).toBe("C2");
    expect(notes.at(-1)).toBe("C4");
  });

  it("clicking a key does nothing: the prompt is display-only", () => {
    const host = mount(() => (
      <KeyboardPrompt prompt={{ kind: "keyboard", highlight: ["C4"] }} />
    ));
    const key = host.querySelector('button[data-note="C4"]') as HTMLButtonElement;
    expect(key).not.toBeNull();
    expect(key.getAttribute("data-selected")).toBe("false");
    key.click();
    expect(key.getAttribute("data-selected")).toBe("false");
  });

  it("throws a clear error when handed a non-keyboard prompt", () => {
    expect(() =>
      mount(() => <KeyboardPrompt prompt={{ kind: "text", text: "pick a key" }} />),
    ).toThrow(/"keyboard".*"text"|text.*keyboard/i);
  });
});

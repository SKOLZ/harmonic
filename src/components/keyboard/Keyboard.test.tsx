import { createSignal, type JSX } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import Keyboard from "./Keyboard";

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

function keyButton(host: HTMLElement, noteName: string): HTMLButtonElement {
  const button = host.querySelector(`button[data-note="${noteName}"]`);
  if (button === null) {
    throw new Error(`no key button for ${noteName}`);
  }
  return button as HTMLButtonElement;
}

describe("Keyboard", () => {
  it("renders one real button per key of the default C4–C6 range", () => {
    const host = mount(() => <Keyboard />);
    const buttons = [...host.querySelectorAll("button")];
    expect(buttons).toHaveLength(25);
    for (const button of buttons) {
      expect(button.tagName).toBe("BUTTON");
      expect(button.getAttribute("type")).toBe("button");
    }
    // Chromatic DOM order, one button per midi step.
    const notes = buttons.map((button) => button.getAttribute("data-note"));
    expect(notes[0]).toBe("C4");
    expect(notes[1]).toBe("C#4");
    expect(notes.at(-1)).toBe("C6");
  });

  it("names every key with an aria-label a screen reader can speak", () => {
    const host = mount(() => <Keyboard />);
    expect(keyButton(host, "C4").getAttribute("aria-label")).toBe("C 4");
    expect(keyButton(host, "C#4").getAttribute("aria-label")).toBe("C sharp 4");
    expect(keyButton(host, "C6").getAttribute("aria-label")).toBe("C 6");
    for (const button of host.querySelectorAll("button")) {
      expect(button.getAttribute("aria-label")).toBeTruthy();
    }
  });

  it("applies per-key geometry as inline style data", () => {
    const host = mount(() => <Keyboard />);
    const white = keyButton(host, "C4");
    expect(parseFloat(white.style.left)).toBe(0);
    expect(parseFloat(white.style.width)).toBeCloseTo(100 / 15, 10);
    // Black keys are narrower than white keys and stack above them.
    const black = keyButton(host, "C#4");
    expect(parseFloat(black.style.width)).toBeLessThan(parseFloat(white.style.width));
    expect(parseFloat(black.style.height)).toBeLessThan(parseFloat(white.style.height));
  });

  it("marks white and black keys in the DOM", () => {
    const host = mount(() => <Keyboard />);
    const white = keyButton(host, "C4");
    expect(white.getAttribute("data-black")).toBe("false");
    expect(white.className).toContain("keyboard__key--white");
    const black = keyButton(host, "C#4");
    expect(black.getAttribute("data-black")).toBe("true");
    expect(black.className).toContain("keyboard__key--black");
  });

  it("shows the note name as visible text on white keys only", () => {
    const host = mount(() => <Keyboard />);
    expect(keyButton(host, "C4").textContent?.trim()).toBe("C4");
    expect(keyButton(host, "C#4").textContent?.trim()).toBe("");
  });

  it("marks highlighted keys structurally, not by colour alone", () => {
    const host = mount(() => <Keyboard highlight={["C4", "F#5"]} />);
    const highlighted = keyButton(host, "C4");
    expect(highlighted.getAttribute("data-highlighted")).toBe("true");
    expect(
      highlighted.querySelector('[data-marker="highlighted"]'),
    ).not.toBeNull();
    // The highlighted state is announced as well as drawn.
    expect(highlighted.getAttribute("aria-label")).toBe("C 4, highlighted");
    const plain = keyButton(host, "D4");
    expect(plain.getAttribute("data-highlighted")).toBe("false");
    expect(plain.querySelector("[data-marker]")).toBeNull();
  });

  it("matches highlights by pitch, so 'B flat 4' lights the Bb/A# key", () => {
    const host = mount(() => <Keyboard highlight={["B flat 4"]} />);
    expect(keyButton(host, "A#4").getAttribute("data-highlighted")).toBe("true");
    expect(keyButton(host, "A4").getAttribute("data-highlighted")).toBe("false");
  });

  it("marks selected keys with aria-pressed and a selection marker", () => {
    const host = mount(() => <Keyboard selected={["F#4"]} />);
    const selected = keyButton(host, "F#4");
    expect(selected.getAttribute("aria-pressed")).toBe("true");
    expect(selected.getAttribute("data-selected")).toBe("true");
    expect(selected.querySelector('[data-marker="selected"]')).not.toBeNull();
    const plain = keyButton(host, "G4");
    expect(plain.getAttribute("aria-pressed")).toBe("false");
    expect(plain.getAttribute("data-selected")).toBe("false");
  });

  it("keeps highlight and selection independent when both apply to one key", () => {
    const host = mount(() => <Keyboard highlight={["C4"]} selected={["C4"]} />);
    const both = keyButton(host, "C4");
    expect(both.getAttribute("data-highlighted")).toBe("true");
    expect(both.getAttribute("data-selected")).toBe("true");
    expect(both.querySelector('[data-marker="highlighted"]')).not.toBeNull();
    expect(both.querySelector('[data-marker="selected"]')).not.toBeNull();
    expect(both.getAttribute("aria-pressed")).toBe("true");
    // Unaffected neighbours carry neither state.
    const plain = keyButton(host, "D4");
    expect(plain.getAttribute("data-highlighted")).toBe("false");
    expect(plain.getAttribute("data-selected")).toBe("false");
    expect(plain.querySelector("[data-marker]")).toBeNull();
  });

  it("is not selectable by default: clicks do nothing and keys leave the tab order", () => {
    const onToggle = vi.fn();
    const host = mount(() => <Keyboard onToggle={onToggle} />);
    const button = keyButton(host, "C4");
    expect(button.tabIndex).toBe(-1);
    expect(host.querySelector(".keyboard")?.getAttribute("data-selectable")).toBe(
      "false",
    );
    button.click();
    expect(onToggle).not.toHaveBeenCalled();
  });

  it("toggles through onToggle with the canonical note name when selectable", () => {
    const onToggle = vi.fn();
    const host = mount(() => <Keyboard selectable onToggle={onToggle} />);
    const button = keyButton(host, "C#4");
    expect(button.tabIndex).toBe(0);
    expect(host.querySelector(".keyboard")?.getAttribute("data-selectable")).toBe(
      "true",
    );
    button.click();
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onToggle).toHaveBeenCalledWith("C#4");
  });

  it("reflects parent-driven selection changes back into the DOM", () => {
    const [selected, setSelected] = createSignal<string[]>([]);
    const host = mount(() => (
      <Keyboard
        selectable
        selected={selected()}
        onToggle={(noteName) =>
          setSelected((current) =>
            current.includes(noteName)
              ? current.filter((n) => n !== noteName)
              : [...current, noteName],
          )
        }
      />
    ));
    const button = keyButton(host, "C4");
    expect(button.getAttribute("aria-pressed")).toBe("false");

    button.click();
    expect(button.getAttribute("aria-pressed")).toBe("true");
    expect(button.getAttribute("data-selected")).toBe("true");
    expect(button.querySelector('[data-marker="selected"]')).not.toBeNull();

    button.click();
    expect(button.getAttribute("aria-pressed")).toBe("false");
    expect(button.querySelector("[data-marker]")).toBeNull();
  });

  it("reacts to highlight changes without remounting", () => {
    const [highlight, setHighlight] = createSignal<string[]>([]);
    const host = mount(() => <Keyboard highlight={highlight()} />);
    expect(keyButton(host, "E4").getAttribute("data-highlighted")).toBe("false");

    setHighlight(["E4"]);
    expect(keyButton(host, "E4").getAttribute("data-highlighted")).toBe("true");

    setHighlight([]);
    expect(keyButton(host, "E4").getAttribute("data-highlighted")).toBe("false");
    expect(keyButton(host, "E4").querySelector("[data-marker]")).toBeNull();
  });

  it("honours a custom range", () => {
    const host = mount(() => <Keyboard startNote="C3" endNote="E4" />);
    const buttons = [...host.querySelectorAll("button")];
    expect(buttons).toHaveLength(17);
    expect(buttons[0].getAttribute("data-note")).toBe("C3");
    expect(buttons.at(-1)?.getAttribute("data-note")).toBe("E4");
  });
});

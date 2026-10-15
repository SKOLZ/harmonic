import { createSignal, type JSX } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AnswerSpec, AnswerSubmission } from "../../lib/rounds/types";
import NotePickAnswer from "./NotePickAnswer";

/**
 * solid-js/web's `render` needs an explicit mount element and returns a bare
 * disposer, so each test mounts into a fresh host registered for cleanup
 * (same pattern as ChoicesAnswer.test.tsx).
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

const answer: AnswerSpec = {
  kind: "notePick",
  correctNotes: ["C4", "E4"],
};

function keyButton(host: HTMLElement, noteName: string): HTMLButtonElement {
  const button = host.querySelector(`button[data-note="${noteName}"]`);
  if (button === null) {
    throw new Error(`no keyboard key for ${noteName}`);
  }
  return button as HTMLButtonElement;
}

function buttonByLabel(host: HTMLElement, label: string): HTMLButtonElement {
  const found = [...host.querySelectorAll("button")].find(
    (button) => button.textContent?.trim() === label,
  );
  if (!found) {
    throw new Error(`no button labelled ${JSON.stringify(label)}`);
  }
  return found as HTMLButtonElement;
}

function selectedNotes(host: HTMLElement): string[] {
  return [...host.querySelectorAll(".note-pick__selection li")].map(
    (item) => item.textContent ?? "",
  );
}

describe("NotePickAnswer", () => {
  it("renders the piano keyboard in selectable mode with Confirm and Clear buttons", () => {
    const host = mount(() => <NotePickAnswer answer={answer} onSubmit={() => {}} />);
    const keyboard = host.querySelector(".keyboard");
    expect(keyboard).not.toBeNull();
    expect(keyboard?.getAttribute("data-selectable")).toBe("true");
    expect(keyButton(host, "C4").tagName).toBe("BUTTON");
    expect(selectedNotes(host)).toEqual([]);

    const confirm = buttonByLabel(host, "Confirm");
    expect(confirm.tagName).toBe("BUTTON");
    expect(confirm.type).toBe("button");
    expect(confirm.disabled).toBe(false);

    const clear = buttonByLabel(host, "Clear");
    expect(clear.tagName).toBe("BUTTON");
    // Nothing to clear yet, so Reset-style affordances stay out of the way.
    expect(clear.disabled).toBe(true);
  });

  it("clicking a key toggles it in and out of the selection without submitting", () => {
    const onSubmit = vi.fn();
    const host = mount(() => <NotePickAnswer answer={answer} onSubmit={onSubmit} />);

    keyButton(host, "C4").click();
    expect(keyButton(host, "C4").getAttribute("aria-pressed")).toBe("true");
    expect(keyButton(host, "C4").getAttribute("data-selected")).toBe("true");
    expect(selectedNotes(host)).toEqual(["C4"]);
    expect(buttonByLabel(host, "Clear").disabled).toBe(false);

    keyButton(host, "E4").click();
    expect(selectedNotes(host)).toEqual(["C4", "E4"]);
    expect(keyButton(host, "E4").getAttribute("aria-pressed")).toBe("true");

    keyButton(host, "C4").click();
    expect(selectedNotes(host)).toEqual(["E4"]);
    expect(keyButton(host, "C4").getAttribute("aria-pressed")).toBe("false");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("Confirm emits the selected notes as a notePick submission", () => {
    const onSubmit = vi.fn();
    const host = mount(() => <NotePickAnswer answer={answer} onSubmit={onSubmit} />);
    keyButton(host, "E4").click();
    keyButton(host, "C4").click();
    buttonByLabel(host, "Confirm").click();
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({ kind: "notePick", notes: ["E4", "C4"] });
  });

  it("Clear empties the selection", () => {
    const host = mount(() => <NotePickAnswer answer={answer} onSubmit={() => {}} />);
    keyButton(host, "C4").click();
    keyButton(host, "E4").click();
    expect(selectedNotes(host)).toHaveLength(2);

    buttonByLabel(host, "Clear").click();
    expect(selectedNotes(host)).toEqual([]);
    for (const note of ["C4", "E4"]) {
      expect(keyButton(host, note).getAttribute("aria-pressed")).toBe("false");
    }
    expect(buttonByLabel(host, "Clear").disabled).toBe(true);
  });

  it("locks the keyboard and the action buttons once the round is revealed", () => {
    const onSubmit = vi.fn();
    const host = mount(() => (
      <NotePickAnswer
        answer={answer}
        onSubmit={onSubmit}
        revealed
        submission={{ kind: "notePick", notes: ["C4"] }}
      />
    ));
    expect(host.querySelector(".keyboard")?.getAttribute("data-selectable")).toBe("false");
    expect(buttonByLabel(host, "Confirm").disabled).toBe(true);
    expect(buttonByLabel(host, "Clear").disabled).toBe(true);

    keyButton(host, "E4").click();
    keyButton(host, "C4").click();
    expect(selectedNotes(host)).toEqual(["C4"]);

    buttonByLabel(host, "Confirm").click();
    buttonByLabel(host, "Clear").click();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows the stored submission while revealed and lets the learner re-select after a retry", () => {
    const [submission, setSubmission] = createSignal<AnswerSubmission | null>(null);
    const [revealed, setRevealed] = createSignal(false);
    const onSubmit = vi.fn((value: AnswerSubmission) => {
      setSubmission(value);
      setRevealed(true);
    });
    const host = mount(() => (
      <NotePickAnswer
        answer={answer}
        onSubmit={onSubmit}
        revealed={revealed()}
        submission={submission()}
      />
    ));

    keyButton(host, "C4").click();
    buttonByLabel(host, "Confirm").click();
    expect(selectedNotes(host)).toEqual(["C4"]);
    expect(keyButton(host, "C4").getAttribute("aria-pressed")).toBe("true");

    // Retry: GameShell clears the stored submission and reopens the round.
    setSubmission(null);
    setRevealed(false);
    expect(selectedNotes(host)).toEqual(["C4"]);
    expect(keyButton(host, "E4").getAttribute("aria-pressed")).toBe("false");

    keyButton(host, "E4").click();
    buttonByLabel(host, "Confirm").click();
    expect(onSubmit).toHaveBeenLastCalledWith({ kind: "notePick", notes: ["C4", "E4"] });
  });
});

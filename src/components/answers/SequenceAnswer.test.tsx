import { createSignal, type JSX } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AnswerSpec, AnswerSubmission } from "../../lib/rounds/types";
import SequenceAnswer from "./SequenceAnswer";

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
  kind: "sequence",
  correctOrder: ["C4", "D4", "E4"],
};

function availableButtons(host: HTMLElement): HTMLButtonElement[] {
  return [
    ...host.querySelectorAll<HTMLButtonElement>(".sequence-answer__available button"),
  ];
}

function availableButton(host: HTMLElement, label: string): HTMLButtonElement {
  const found = availableButtons(host).find((button) => button.textContent?.trim() === label);
  if (!found) {
    throw new Error(
      `no available item ${JSON.stringify(label)}; tray holds ${JSON.stringify(
        availableButtons(host).map((button) => button.textContent?.trim()),
      )}`,
    );
  }
  return found;
}

function availableLabels(host: HTMLElement): string[] {
  return availableButtons(host)
    .map((button) => button.textContent?.trim() ?? "")
    .sort();
}

function orderList(host: HTMLElement): string[] {
  return [...host.querySelectorAll(".sequence-answer__order li")].map(
    (item) => item.textContent ?? "",
  );
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

describe("SequenceAnswer", () => {
  it("presents every available item as a real button with an empty ordered list", () => {
    const host = mount(() => <SequenceAnswer answer={answer} onSubmit={() => {}} />);
    expect(availableLabels(host)).toEqual(["C4", "D4", "E4"]);
    for (const button of availableButtons(host)) {
      expect(button.tagName).toBe("BUTTON");
      expect(button.type).toBe("button");
      expect(button.disabled).toBe(false);
    }
    expect(orderList(host)).toEqual([]);

    for (const label of ["Confirm", "Undo", "Reset"]) {
      const button = buttonByLabel(host, label);
      expect(button.tagName).toBe("BUTTON");
      expect(button.type).toBe("button");
    }
    expect(buttonByLabel(host, "Confirm").disabled).toBe(false);
    expect(buttonByLabel(host, "Undo").disabled).toBe(true);
    expect(buttonByLabel(host, "Reset").disabled).toBe(true);
  });

  it("clicking items in order builds a visible ordered list and empties the tray", () => {
    const onSubmit = vi.fn();
    const host = mount(() => <SequenceAnswer answer={answer} onSubmit={onSubmit} />);

    availableButton(host, "D4").click();
    expect(orderList(host)).toEqual(["D4"]);
    expect(availableLabels(host)).toEqual(["C4", "E4"]);

    availableButton(host, "C4").click();
    expect(orderList(host)).toEqual(["D4", "C4"]);
    expect(availableLabels(host)).toEqual(["E4"]);
    expect(buttonByLabel(host, "Undo").disabled).toBe(false);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("Confirm emits the clicked order as a sequence submission", () => {
    const onSubmit = vi.fn();
    const host = mount(() => <SequenceAnswer answer={answer} onSubmit={onSubmit} />);
    availableButton(host, "C4").click();
    availableButton(host, "D4").click();
    availableButton(host, "E4").click();
    buttonByLabel(host, "Confirm").click();
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({
      kind: "sequence",
      order: ["C4", "D4", "E4"],
    });
  });

  it("Undo removes the last placed item and Reset clears the whole list", () => {
    const host = mount(() => <SequenceAnswer answer={answer} onSubmit={() => {}} />);
    availableButton(host, "D4").click();
    availableButton(host, "C4").click();

    buttonByLabel(host, "Undo").click();
    expect(orderList(host)).toEqual(["D4"]);
    expect(availableLabels(host)).toEqual(["C4", "E4"]);

    buttonByLabel(host, "Undo").click();
    expect(orderList(host)).toEqual([]);
    expect(availableLabels(host)).toEqual(["C4", "D4", "E4"]);
    expect(buttonByLabel(host, "Undo").disabled).toBe(true);

    availableButton(host, "C4").click();
    availableButton(host, "E4").click();
    expect(orderList(host)).toEqual(["C4", "E4"]);

    buttonByLabel(host, "Reset").click();
    expect(orderList(host)).toEqual([]);
    expect(availableLabels(host)).toEqual(["C4", "D4", "E4"]);
    expect(buttonByLabel(host, "Reset").disabled).toBe(true);
  });

  it("locks the tray and the action buttons once the round is revealed", () => {
    const onSubmit = vi.fn();
    const host = mount(() => (
      <SequenceAnswer
        answer={answer}
        onSubmit={onSubmit}
        revealed
        submission={{ kind: "sequence", order: ["D4"] }}
      />
    ));
    // The submitted order is displayed, so only the unplaced items remain.
    expect(orderList(host)).toEqual(["D4"]);
    expect(availableLabels(host)).toEqual(["C4", "E4"]);
    for (const button of availableButtons(host)) {
      expect(button.disabled).toBe(true);
    }
    expect(buttonByLabel(host, "Confirm").disabled).toBe(true);
    expect(buttonByLabel(host, "Undo").disabled).toBe(true);
    expect(buttonByLabel(host, "Reset").disabled).toBe(true);

    availableButton(host, "C4").click();
    availableButton(host, "E4").click();
    buttonByLabel(host, "Confirm").click();
    expect(orderList(host)).toEqual(["D4"]);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows the stored submission while revealed and restores the order after a retry", () => {
    const [submission, setSubmission] = createSignal<AnswerSubmission | null>(null);
    const [revealed, setRevealed] = createSignal(false);
    const onSubmit = vi.fn((value: AnswerSubmission) => {
      setSubmission(value);
      setRevealed(true);
    });
    const host = mount(() => (
      <SequenceAnswer
        answer={answer}
        onSubmit={onSubmit}
        revealed={revealed()}
        submission={submission()}
      />
    ));

    availableButton(host, "D4").click();
    buttonByLabel(host, "Confirm").click();
    expect(orderList(host)).toEqual(["D4"]);
    expect(buttonByLabel(host, "Confirm").disabled).toBe(true);

    // Retry: GameShell clears the stored submission and reopens the round.
    setSubmission(null);
    setRevealed(false);
    expect(orderList(host)).toEqual(["D4"]);
    expect(availableLabels(host)).toEqual(["C4", "E4"]);
    expect(availableButton(host, "C4").disabled).toBe(false);

    availableButton(host, "C4").click();
    buttonByLabel(host, "Confirm").click();
    expect(onSubmit).toHaveBeenLastCalledWith({
      kind: "sequence",
      order: ["D4", "C4"],
    });
  });
});

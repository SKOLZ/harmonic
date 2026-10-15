import type { JSX } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AnswerSpec } from "../../lib/rounds/types";
import ChoicesAnswer from "./ChoicesAnswer";

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
  kind: "choices",
  options: ["C", "D", "E"],
  correctIndex: 1,
};

function optionButtons(host: HTMLElement): HTMLButtonElement[] {
  return [...host.querySelectorAll(".choices__button")] as HTMLButtonElement[];
}

describe("ChoicesAnswer", () => {
  it("renders one real button per option, labelled with the option text", () => {
    const host = mount(() => <ChoicesAnswer answer={answer} onSubmit={() => {}} />);
    const buttons = host.querySelectorAll("button");
    expect(buttons).toHaveLength(3);
    for (const button of buttons) {
      expect(button.tagName).toBe("BUTTON");
    }
    expect(optionButtons(host).map((b) => b.textContent)).toEqual(["C", "D", "E"]);
  });

  it("emits a choices submission with the clicked index through onSubmit", () => {
    const onSubmit = vi.fn();
    const host = mount(() => <ChoicesAnswer answer={answer} onSubmit={onSubmit} />);
    optionButtons(host)[2].click();
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({ kind: "choices", selectedIndex: 2 });
  });

  it("locks every option once the round is revealed", () => {
    const onSubmit = vi.fn();
    const host = mount(() => <ChoicesAnswer answer={answer} revealed onSubmit={onSubmit} />);
    const buttons = optionButtons(host);
    expect(buttons).toHaveLength(3);
    for (const button of buttons) {
      expect(button.disabled).toBe(true);
    }
    buttons[0].click();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("is enabled by default before any reveal", () => {
    const host = mount(() => <ChoicesAnswer answer={answer} onSubmit={() => {}} />);
    for (const button of optionButtons(host)) {
      expect(button.disabled).toBe(false);
    }
  });

  it("reflects the stored submission by marking the submitted index as selected", () => {
    const host = mount(() => (
      <ChoicesAnswer
        answer={answer}
        onSubmit={() => {}}
        submission={{ kind: "choices", selectedIndex: 2 }}
      />
    ));
    const selected = [
      ...host.querySelectorAll('.choices__button[data-selected="true"]'),
    ] as HTMLButtonElement[];
    expect(selected).toHaveLength(1);
    expect(selected[0].textContent).toBe("E");
    // An unsubmitted round marks nothing.
    const fresh = mount(() => <ChoicesAnswer answer={answer} onSubmit={() => {}} />);
    expect(fresh.querySelectorAll('.choices__button[data-selected="true"]')).toHaveLength(0);
  });
});

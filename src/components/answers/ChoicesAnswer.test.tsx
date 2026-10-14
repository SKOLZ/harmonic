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
    const host = mount(() => <ChoicesAnswer answer={answer} onSelect={() => {}} />);
    const buttons = host.querySelectorAll("button");
    expect(buttons).toHaveLength(3);
    for (const button of buttons) {
      expect(button.tagName).toBe("BUTTON");
    }
    expect(optionButtons(host).map((b) => b.textContent)).toEqual(["C", "D", "E"]);
  });

  it("reports the chosen index through onSelect", () => {
    const onSelect = vi.fn();
    const host = mount(() => <ChoicesAnswer answer={answer} onSelect={onSelect} />);
    optionButtons(host)[2].click();
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it("disables every option once the round is revealed", () => {
    const onSelect = vi.fn();
    const host = mount(() => <ChoicesAnswer answer={answer} disabled onSelect={onSelect} />);
    const buttons = optionButtons(host);
    expect(buttons).toHaveLength(3);
    for (const button of buttons) {
      expect(button.disabled).toBe(true);
    }
    buttons[0].click();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("is enabled by default before any reveal", () => {
    const host = mount(() => <ChoicesAnswer answer={answer} onSelect={() => {}} />);
    for (const button of optionButtons(host)) {
      expect(button.disabled).toBe(false);
    }
  });
});

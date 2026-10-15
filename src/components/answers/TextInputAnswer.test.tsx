import { createSignal, type JSX } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AnswerSpec, AnswerSubmission } from "../../lib/rounds/types";
import TextInputAnswer from "./TextInputAnswer";

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
  kind: "textInput",
  accepted: ["Bb", "B flat"],
  expected: "B flat",
};

function answerInput(host: HTMLElement): HTMLInputElement {
  const input = host.querySelector("input");
  if (input === null) {
    throw new Error(`no <input> rendered; host text was ${JSON.stringify(host.textContent)}`);
  }
  return input as HTMLInputElement;
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

function typeInto(input: HTMLInputElement, text: string): void {
  input.value = text;
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function pressEnter(input: HTMLInputElement): void {
  input.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }),
  );
}

describe("TextInputAnswer", () => {
  it("renders a real labelled text input and a real submit button", () => {
    const host = mount(() => <TextInputAnswer answer={answer} onSubmit={() => {}} />);
    const input = answerInput(host);
    expect(input.tagName).toBe("INPUT");
    expect(input.type).toBe("text");
    expect(input.disabled).toBe(false);
    const label = host.querySelector("label");
    expect(label).not.toBeNull();
    expect(label?.getAttribute("for")).toBe(input.id);
    expect(input.id).not.toBe("");
    const button = buttonByLabel(host, "Submit");
    expect(button.tagName).toBe("BUTTON");
    expect(button.disabled).toBe(false);
  });

  it("emits a textInput submission with the text exactly as typed", () => {
    const onSubmit = vi.fn();
    const host = mount(() => <TextInputAnswer answer={answer} onSubmit={onSubmit} />);
    typeInto(answerInput(host), "  B flat ");
    buttonByLabel(host, "Submit").click();
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({ kind: "textInput", text: "  B flat " });
  });

  it("submits on Enter in the input, not only on the button", () => {
    const onSubmit = vi.fn();
    const host = mount(() => <TextInputAnswer answer={answer} onSubmit={onSubmit} />);
    typeInto(answerInput(host), "Bb");
    pressEnter(answerInput(host));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({ kind: "textInput", text: "Bb" });
  });

  it("locks the field and the button once the round is revealed", () => {
    const onSubmit = vi.fn();
    const host = mount(() => (
      <TextInputAnswer
        answer={answer}
        onSubmit={onSubmit}
        revealed
        submission={{ kind: "textInput", text: "Bb" }}
      />
    ));
    const input = answerInput(host);
    expect(input.disabled).toBe(true);
    expect(buttonByLabel(host, "Submit").disabled).toBe(true);

    typeInto(input, "nope");
    pressEnter(input);
    buttonByLabel(host, "Submit").click();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows the stored submission text while revealed", () => {
    const host = mount(() => (
      <TextInputAnswer
        answer={answer}
        onSubmit={() => {}}
        revealed
        submission={{ kind: "textInput", text: "B flat" }}
      />
    ));
    expect(answerInput(host).value).toBe("B flat");
  });

  it("restores the previously typed text when the round reopens after a retry", () => {
    const [submission, setSubmission] = createSignal<AnswerSubmission | null>(null);
    const [revealed, setRevealed] = createSignal(false);
    const onSubmit = vi.fn((value: AnswerSubmission) => {
      setSubmission(value);
      setRevealed(true);
    });
    const host = mount(() => (
      <TextInputAnswer
        answer={answer}
        onSubmit={onSubmit}
        revealed={revealed()}
        submission={submission()}
      />
    ));

    typeInto(answerInput(host), "Bb");
    buttonByLabel(host, "Submit").click();
    expect(answerInput(host).value).toBe("Bb");
    expect(answerInput(host).disabled).toBe(true);

    // GameShell's retry clears the stored submission and reopens the round;
    // the in-progress draft must survive so the learner corrects a near-miss
    // instead of retyping the whole answer.
    setSubmission(null);
    setRevealed(false);

    expect(answerInput(host).value).toBe("Bb");
    expect(answerInput(host).disabled).toBe(false);
    expect(buttonByLabel(host, "Submit").disabled).toBe(false);
  });
});

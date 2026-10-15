import type { JSX } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { progress, PROGRESS_STORAGE_KEY, UNLOCK_THRESHOLD } from "../../lib/progress";
import type { Round } from "../../lib/rounds/types";
import GameShell from "./GameShell";

/**
 * solid-js/web's `render` requires an explicit mount element and returns a
 * bare disposer, so each test mounts into a fresh host div registered for
 * cleanup before rendering (same pattern as Staff.test.tsx).
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

let recordSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  window.localStorage.clear();
  recordSpy = vi.spyOn(progress, "recordCorrect");
});

afterEach(() => {
  recordSpy.mockRestore();
  while (cleanups.length > 0) cleanups.pop()?.();
  document.body.replaceChildren();
});

function choiceRound(id: string, correctIndex = 1): Round {
  return {
    id,
    prompt: { kind: "text", text: `Question ${id}?` },
    answer: { kind: "choices", options: ["A", "B", "C"], correctIndex },
    rule: `Rule for ${id}.`,
  };
}

function textRound(id: string, expected = "B flat", accepted = ["B flat", "Bb"]): Round {
  return {
    id,
    prompt: { kind: "text", text: `Question ${id}?` },
    answer: { kind: "textInput", accepted, expected },
    rule: `Rule for ${id}.`,
  };
}

function notePickRound(id: string, correctNotes: string[]): Round {
  return {
    id,
    prompt: { kind: "text", text: `Question ${id}?` },
    answer: { kind: "notePick", correctNotes },
    rule: `Rule for ${id}.`,
  };
}

function sequenceRound(id: string, correctOrder: string[]): Round {
  return {
    id,
    prompt: { kind: "text", text: `Question ${id}?` },
    answer: { kind: "sequence", correctOrder },
    rule: `Rule for ${id}.`,
  };
}

function typeInto(host: HTMLElement, text: string): void {
  const input = host.querySelector("input");
  if (input === null) {
    throw new Error("no text input rendered");
  }
  input.value = text;
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function keyButton(host: HTMLElement, noteName: string): HTMLButtonElement {
  const button = host.querySelector(`button[data-note="${noteName}"]`);
  if (button === null) {
    throw new Error(`no keyboard key for ${noteName}`);
  }
  return button as HTMLButtonElement;
}

function availableButton(host: HTMLElement, label: string): HTMLButtonElement {
  const found = [
    ...host.querySelectorAll<HTMLButtonElement>(".sequence-answer__available button"),
  ].find((button) => button.textContent?.trim() === label);
  if (!found) {
    throw new Error(`no available sequence item labelled ${JSON.stringify(label)}`);
  }
  return found;
}

function buttonByLabel(host: HTMLElement, label: string): HTMLButtonElement {
  const found = [...host.querySelectorAll("button")].find(
    (b) => b.textContent?.trim() === label,
  );
  if (!found) {
    throw new Error(
      `no button labelled ${JSON.stringify(label)}; found ${JSON.stringify(
        [...host.querySelectorAll("button")].map((b) => b.textContent?.trim()),
      )}`,
    );
  }
  return found as HTMLButtonElement;
}

function optionButtons(host: HTMLElement): HTMLButtonElement[] {
  return [...host.querySelectorAll(".choices__button")] as HTMLButtonElement[];
}

function optionByLabel(host: HTMLElement, label: string): HTMLButtonElement {
  const found = optionButtons(host).find((b) => b.textContent?.trim() === label);
  if (!found) throw new Error(`no option button labelled ${JSON.stringify(label)}`);
  return found;
}

describe("GameShell", () => {
  it("renders the lesson title, the first prompt, and the answer options", () => {
    const rounds = [choiceRound("r1"), choiceRound("r2")];
    const host = mount(() => (
      <GameShell lessonId="10" lessonTitle="The Basics" rounds={rounds} />
    ));
    expect(host.querySelector("h1")?.textContent).toBe("The Basics");
    expect(host.textContent).toContain("Question r1?");
    expect(optionButtons(host).map((b) => b.textContent)).toEqual(["A", "B", "C"]);
  });

  it("a correct answer reveals feedback and records progress exactly once", () => {
    // Two rounds so the correct-answer action is Next, not Finish (covered below).
    const rounds = [choiceRound("r1", 1), choiceRound("r2", 1)];
    const host = mount(() => (
      <GameShell lessonId="10" lessonTitle="The Basics" rounds={rounds} />
    ));
    optionByLabel(host, "B").click();

    expect(recordSpy).toHaveBeenCalledTimes(1);
    expect(recordSpy).toHaveBeenCalledWith(10);
    expect(host.textContent).toContain("Correct!");
    expect(host.textContent).toContain("Rule for r1.");
    // Feedback names the correct answer.
    expect(host.textContent).toContain("B");
    // Options lock once revealed.
    for (const button of optionButtons(host)) {
      expect(button.disabled).toBe(true);
    }
    expect(buttonByLabel(host, "Next")).toBeTruthy();
  });

  it("a wrong answer reveals the correct answer and rule without recording; Retry returns to answering", () => {
    const rounds = [choiceRound("r1", 1)];
    const host = mount(() => (
      <GameShell lessonId="10" lessonTitle="The Basics" rounds={rounds} />
    ));
    optionByLabel(host, "A").click();

    expect(recordSpy).not.toHaveBeenCalled();
    expect(host.textContent).toContain("Not quite.");
    expect(host.textContent).toContain("Rule for r1.");
    expect(host.textContent).toContain("B");
    expect(buttonByLabel(host, "Retry")).toBeTruthy();

    buttonByLabel(host, "Retry").click();
    expect(host.querySelector(".game-shell__feedback")).toBeNull();
    for (const button of optionButtons(host)) {
      expect(button.disabled).toBe(false);
    }

    // Retry then answering correctly records exactly once overall.
    optionByLabel(host, "B").click();
    expect(recordSpy).toHaveBeenCalledTimes(1);
  });

  it("after a correct answer, Next advances to the next round", () => {
    const rounds = [choiceRound("r1", 1), choiceRound("r2", 0)];
    const host = mount(() => (
      <GameShell lessonId="10" lessonTitle="The Basics" rounds={rounds} />
    ));
    optionByLabel(host, "B").click();
    buttonByLabel(host, "Next").click();

    expect(host.textContent).toContain("Question r2?");
    expect(host.textContent).not.toContain("Question r1?");
    expect(host.querySelector(".game-shell__feedback")).toBeNull();

    optionByLabel(host, "A").click();
    expect(recordSpy).toHaveBeenCalledTimes(2);
  });

  it("Finish replaces Next on the last round and completes the lesson", () => {
    const rounds = [choiceRound("r1", 1)];
    const host = mount(() => (
      <GameShell lessonId="10" lessonTitle="The Basics" rounds={rounds} />
    ));
    optionByLabel(host, "B").click();

    expect(buttonByLabel(host, "Finish")).toBeTruthy();
    expect([...host.querySelectorAll("button")].some((b) => b.textContent === "Next")).toBe(
      false,
    );

    buttonByLabel(host, "Finish").click();
    expect(host.textContent).toContain("Lesson complete");
    expect(host.querySelector(".game-shell__feedback")).toBeNull();
    expect(recordSpy).toHaveBeenCalledTimes(1);
  });

  it("shows unlock progress against the threshold and the unlocked notice once reached", () => {
    const rounds = Array.from({ length: UNLOCK_THRESHOLD }, (_, i) =>
      choiceRound(`r${i}`, 1),
    );
    const host = mount(() => (
      <GameShell lessonId="10" lessonTitle="The Basics" rounds={rounds} />
    ));
    expect(host.textContent).toContain(`0/${UNLOCK_THRESHOLD}`);

    for (let i = 0; i < UNLOCK_THRESHOLD; i += 1) {
      optionByLabel(host, "B").click();
      if (i < UNLOCK_THRESHOLD - 1) buttonByLabel(host, "Next").click();
    }

    expect(recordSpy).toHaveBeenCalledTimes(UNLOCK_THRESHOLD);
    expect(host.textContent).toContain(`${UNLOCK_THRESHOLD}/${UNLOCK_THRESHOLD}`);
    expect(host.textContent).toMatch(/unlocked/i);
  });

  it("shows persisted progress for the lesson on mount", () => {
    window.localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({ "10": 4, "11": 9 }),
    );
    const rounds = [choiceRound("r1")];
    const host = mount(() => (
      <GameShell lessonId="10" lessonTitle="The Basics" rounds={rounds} />
    ));
    expect(host.textContent).toContain(`4/${UNLOCK_THRESHOLD}`);
  });

  it("calls onExit when provided and omits the Exit button otherwise", () => {
    const onExit = vi.fn();
    const rounds = [choiceRound("r1")];
    const withExit = mount(() => (
      <GameShell lessonId="10" lessonTitle="The Basics" rounds={rounds} onExit={onExit} />
    ));
    buttonByLabel(withExit, "Exit").click();
    expect(onExit).toHaveBeenCalledTimes(1);

    const withoutExit = mount(() => (
      <GameShell lessonId="10" lessonTitle="The Basics" rounds={rounds} />
    ));
    expect([...withoutExit.querySelectorAll("button")].some((b) => b.textContent === "Exit")).toBe(
      false,
    );
  });
});

describe("GameShell: every answer kind flows through the same submit path", () => {
  it("a textInput round reveals feedback and records progress exactly once", () => {
    const rounds = [textRound("r1"), textRound("r2")];
    const host = mount(() => (
      <GameShell lessonId="10" lessonTitle="The Basics" rounds={rounds} />
    ));
    typeInto(host, "B flat");
    buttonByLabel(host, "Submit").click();

    expect(recordSpy).toHaveBeenCalledTimes(1);
    expect(recordSpy).toHaveBeenCalledWith(10);
    expect(host.textContent).toContain("Correct!");
    expect(host.textContent).toContain("B flat");
    expect(host.textContent).toContain("Rule for r1.");
    expect((host.querySelector("input") as HTMLInputElement).disabled).toBe(true);
    expect(buttonByLabel(host, "Next")).toBeTruthy();
  });

  it("a wrong textInput answer records nothing and Retry restores the typed draft", () => {
    const rounds = [textRound("r1")];
    const host = mount(() => (
      <GameShell lessonId="10" lessonTitle="The Basics" rounds={rounds} />
    ));
    typeInto(host, "Naturals");
    buttonByLabel(host, "Submit").click();

    expect(recordSpy).not.toHaveBeenCalled();
    expect(host.textContent).toContain("Not quite.");
    expect(host.textContent).toContain("B flat");
    expect(buttonByLabel(host, "Retry")).toBeTruthy();

    buttonByLabel(host, "Retry").click();
    expect(host.querySelector(".game-shell__feedback")).toBeNull();
    const input = host.querySelector("input") as HTMLInputElement;
    expect(input.disabled).toBe(false);
    expect(input.value).toBe("Naturals");

    typeInto(host, "B flat");
    buttonByLabel(host, "Submit").click();
    expect(recordSpy).toHaveBeenCalledTimes(1);
  });

  it("a notePick round submits the toggled keys and locks the keyboard on reveal", () => {
    const rounds = [notePickRound("r1", ["C4", "E4"])];
    const host = mount(() => (
      <GameShell lessonId="10" lessonTitle="The Basics" rounds={rounds} />
    ));
    keyButton(host, "C4").click();
    keyButton(host, "E4").click();
    buttonByLabel(host, "Confirm").click();

    expect(recordSpy).toHaveBeenCalledTimes(1);
    expect(recordSpy).toHaveBeenCalledWith(10);
    expect(host.textContent).toContain("Correct!");
    expect(host.textContent).toContain("C4 + E4");
    expect(host.textContent).toContain("Rule for r1.");
    expect(host.querySelector(".keyboard")?.getAttribute("data-selectable")).toBe("false");
    expect(buttonByLabel(host, "Finish")).toBeTruthy();
  });

  it("a sequence round submits the clicked order through the same submit path", () => {
    const rounds = [sequenceRound("r1", ["C4", "D4", "E4"])];
    const host = mount(() => (
      <GameShell lessonId="10" lessonTitle="The Basics" rounds={rounds} />
    ));
    availableButton(host, "C4").click();
    availableButton(host, "D4").click();
    availableButton(host, "E4").click();
    buttonByLabel(host, "Confirm").click();

    expect(recordSpy).toHaveBeenCalledTimes(1);
    expect(recordSpy).toHaveBeenCalledWith(10);
    expect(host.textContent).toContain("Correct!");
    expect(host.textContent).toContain("C4 → D4 → E4");
    expect(host.textContent).toContain("Rule for r1.");
  });

  it("advancing to the next round starts with a fresh control, not the previous draft", () => {
    const rounds = [textRound("r1"), textRound("r2")];
    const host = mount(() => (
      <GameShell lessonId="10" lessonTitle="The Basics" rounds={rounds} />
    ));
    typeInto(host, "B flat");
    buttonByLabel(host, "Submit").click();
    buttonByLabel(host, "Next").click();

    expect(host.textContent).toContain("Question r2?");
    const input = host.querySelector("input") as HTMLInputElement;
    expect(input.value).toBe("");
    expect(input.disabled).toBe(false);
    expect(recordSpy).toHaveBeenCalledTimes(1);
  });
});

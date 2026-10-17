import type { JSX } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { progress, PROGRESS_STORAGE_KEY } from "../../lib/progress";
import type { PromptSpec, Round } from "../../lib/rounds/types";
import PracticeShell from "./PracticeShell";
import { QUESTION_TIME_MS } from "./timer";

/**
 * T4's endless run: one note at a time against the shared countdown, scored
 * until a miss. Every test injects a scripted `draw`, so the pitch on screen
 * is known before any click — a randomly drawn note would make "click the
 * right key" seed-dependent, exactly the flakiness T3 hit under its
 * reset-on-miss contract.
 *
 * Rounds use a text prompt (instant) except the two that must observe the
 * staff itself, which wait on the lazy notation chunk like
 * GameShell.lazyStaff.test.tsx does. Fake timers and `waitFor` never mix:
 * the fake-timer tests drive the clock explicitly and assert synchronously.
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

async function waitFor(check: () => boolean, label: string): Promise<void> {
  const deadline = Date.now() + 2000;
  while (!check()) {
    if (Date.now() > deadline) {
      throw new Error(`waitFor timed out: ${label}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

let recordSpy: ReturnType<typeof vi.spyOn>;
let resetSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  window.localStorage.clear();
  recordSpy = vi.spyOn(progress, "recordCorrect");
  resetSpy = vi.spyOn(progress, "resetStreak");
});

afterEach(() => {
  recordSpy.mockRestore();
  resetSpy.mockRestore();
  vi.useRealTimers();
  while (cleanups.length > 0) cleanups.pop()?.();
  document.body.replaceChildren();
});

function noteRound(id: string, pitch: string, prompt: PromptSpec): Round {
  return {
    id,
    prompt,
    answer: { kind: "notePick", correctNotes: [pitch] },
    rule: `Rule for ${id}.`,
  };
}

/**
 * A scripted draw: hands out `pitches` in order (repeating the last one if the
 * run outlives the script) and records the pitch it was asked to avoid.
 */
function scripted(pitches: string[], staff = false) {
  const seen: Array<string | undefined> = [];
  let index = 0;
  return {
    seen,
    draw(previousPitch?: string): Round {
      seen.push(previousPitch);
      const pitch = pitches[Math.min(index, pitches.length - 1)]!;
      const id = `p${index + 1}`;
      index += 1;
      const prompt: PromptSpec = staff
        ? { kind: "staff", clef: "treble", notes: [pitch] }
        : { kind: "text", text: `Question ${id}?` };
      return noteRound(id, pitch, prompt);
    },
  };
}

function keyButton(host: HTMLElement, noteName: string): HTMLButtonElement {
  const button = host.querySelector(`button[data-note="${noteName}"]`);
  if (button === null) {
    throw new Error(`no keyboard key for ${noteName}`);
  }
  return button as HTMLButtonElement;
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
  return found;
}

function buttonLabels(host: HTMLElement): string[] {
  return [...host.querySelectorAll("button")].map((b) => b.textContent?.trim() ?? "");
}

function timerText(host: HTMLElement): string | undefined {
  return host.querySelector(".game-shell__timer")?.textContent?.trim() ?? undefined;
}

/** Stroke offset of the countdown ring's progress arc, or null when absent. */
function ringOffset(host: HTMLElement): number | null {
  const arc = host.querySelector(".game-shell__timer-ring-progress");
  return arc === null ? null : Number(arc.getAttribute("stroke-dashoffset"));
}

function progressSnapshot(): Record<string, number> {
  const raw = window.localStorage.getItem(PROGRESS_STORAGE_KEY);
  return raw === null ? {} : (JSON.parse(raw) as Record<string, number>);
}

/** Pick `pitch`, confirm it, and wait for the reveal. */
async function answer(host: HTMLElement, pitch: string): Promise<void> {
  keyButton(host, pitch).click();
  buttonByLabel(host, "Confirm").click();
  await waitFor(
    () => host.querySelector(".game-shell__feedback") !== null,
    `reveal after answering ${pitch}`,
  );
}

/** Twelve real keys inside the practice keyboard, so the script never runs dry. */
const LONG_RUN_PITCHES = [
  "G4", "B4", "D5", "F4", "A4", "C5", "E5", "G5", "A5", "B5", "C6", "D4",
];

describe("PracticeShell: the endless run", () => {
  it("renders the drawn note, the keyboard to answer with, and a score at zero", async () => {
    const { draw } = scripted(["G4"]);
    const host = mount(() => <PracticeShell draw={draw} />);

    expect(host.querySelector("h1")?.textContent).toBe("Guess the Note");
    expect(host.textContent).toContain("Question p1?");
    expect(host.querySelector(".keyboard")?.getAttribute("data-selectable")).toBe("true");
    expect(host.textContent).toContain("Score: 0");
    expect(timerText(host)).toBe(`${QUESTION_TIME_MS / 1000}s`);
  });

  it("a correct answer scores a point and advances to the next drawn question", async () => {
    const { draw } = scripted(["G4", "B4"]);
    const host = mount(() => <PracticeShell draw={draw} />);

    await answer(host, "G4");
    expect(host.textContent).toContain("Correct!");
    expect(host.textContent).toContain("Score: 1");

    buttonByLabel(host, "Next").click();
    expect(host.textContent).toContain("Question p2?");
    expect(host.querySelector(".game-shell__feedback")).toBeNull();
  });

  it("never ends: every correct answer draws another question instead of completing", async () => {
    const { draw } = scripted(LONG_RUN_PITCHES);
    const host = mount(() => <PracticeShell draw={draw} />);

    for (let i = 0; i < LONG_RUN_PITCHES.length; i += 1) {
      await answer(host, LONG_RUN_PITCHES[i]!);
      expect(host.textContent).toContain(`Score: ${i + 1}`);
      buttonByLabel(host, "Next").click();
      expect(host.textContent).toContain(`Question p${i + 2}?`);
    }
  });

  it("a wrong answer ends the run, keeps the score, and offers a fresh one", async () => {
    const { draw, seen } = scripted(["G4", "B4"]);
    const host = mount(() => <PracticeShell draw={draw} />);

    await answer(host, "G4");
    buttonByLabel(host, "Next").click();
    await answer(host, "C4"); // wrong: the round expects B4

    expect(host.textContent).toContain("Not quite.");
    expect(host.textContent).toContain("Rule for p2.");
    expect(host.textContent).toMatch(/Run over/);
    expect(host.textContent).toContain("Score: 1");
    expect(buttonByLabel(host, "Play again")).toBeTruthy();
    // A miss ends the run: there is no way to re-answer or skip past it.
    expect(buttonLabels(host)).not.toContain("Next");
    expect(buttonLabels(host)).not.toContain("Retry");
    // The failed question is the last thing drawn; a miss never pre-draws the
    // fresh question — that is the restart's job (asserted below).
    expect(seen).toHaveLength(2); // one draw at mount + the one that followed the correct answer
  });

  it("writes nothing to the lesson progress store across a full miss", async () => {
    const { draw } = scripted(["G4"]);
    const host = mount(() => <PracticeShell draw={draw} />);

    await answer(host, "C4"); // wrong

    expect(recordSpy).not.toHaveBeenCalled();
    expect(resetSpy).not.toHaveBeenCalled();
    expect(progressSnapshot()).toEqual({});
  });

  it("Play again starts a fresh run at zero from a new draw", async () => {
    const { draw, seen } = scripted(["G4", "B4"]);
    const host = mount(() => <PracticeShell draw={draw} />);

    await answer(host, "C4"); // wrong on the first question
    buttonByLabel(host, "Play again").click();

    expect(host.textContent).toContain("Score: 0");
    expect(host.textContent).toContain("Question p2?");
    expect(host.querySelector(".game-shell__feedback")).toBeNull();
    // A restart draws again; which pitch it avoids is the staff round's job
    // (covered below) — here only that a fresh question was drawn matters.
    expect(seen).toHaveLength(2);
    // Playable again through the same keyboard path.
    await answer(host, "B4");
    expect(host.textContent).toContain("Score: 1");
  });
});

describe("PracticeShell: one countdown, one failure path", () => {
  it("the ring arc shrinks by the same remaining-time fraction as the displayed number", async () => {
    vi.useFakeTimers();
    const { draw } = scripted(["G4"]);
    const host = mount(() => <PracticeShell draw={draw} />);
    expect(timerText(host)).toBe(`${QUESTION_TIME_MS / 1000}s`);
    expect(ringOffset(host)).toBe(0);

    vi.advanceTimersByTime(QUESTION_TIME_MS / 2);
    expect(timerText(host)).toBe(`${QUESTION_TIME_MS / 1000 / 2}s`);
    expect(ringOffset(host)).toBe(50);
  });

  it("an expired timer ends the run exactly like a wrong answer", async () => {
    vi.useFakeTimers();
    const { draw } = scripted(["G4"]);
    const host = mount(() => <PracticeShell draw={draw} />);
    expect(timerText(host)).toBe(`${QUESTION_TIME_MS / 1000}s`);

    vi.advanceTimersByTime(QUESTION_TIME_MS);

    expect(host.textContent).toContain("Time's up.");
    expect(host.textContent).toContain("Rule for p1.");
    expect(host.textContent).toMatch(/Run over/);
    expect(host.textContent).toContain("Score: 0");
    expect(buttonByLabel(host, "Play again")).toBeTruthy();
    // Same terminal UI as a wrong answer: no Next, no Retry, no re-answering.
    expect(buttonLabels(host)).not.toContain("Next");
    expect(buttonLabels(host)).not.toContain("Retry");
    expect(host.querySelector(".game-shell__timer")).toBeNull();
    // Still never a progress write: the clock is not a lesson.
    expect(recordSpy).not.toHaveBeenCalled();
    expect(resetSpy).not.toHaveBeenCalled();
    expect(progressSnapshot()).toEqual({});
  });

  it("a correct answer stops the countdown and the old deadline cannot fail the run", async () => {
    vi.useFakeTimers();
    const { draw } = scripted(["G4"]);
    const host = mount(() => <PracticeShell draw={draw} />);

    keyButton(host, "G4").click();
    buttonByLabel(host, "Confirm").click();
    expect(host.querySelector(".game-shell__timer")).toBeNull();

    vi.advanceTimersByTime(QUESTION_TIME_MS * 2);

    expect(host.textContent).toContain("Correct!");
    expect(host.textContent).toContain("Score: 1");
    expect(host.textContent).not.toMatch(/Run over/);
  });

  it("every new question gets a full countdown, not the previous one's remainder", async () => {
    vi.useFakeTimers();
    const { draw } = scripted(["G4", "B4"]);
    const host = mount(() => <PracticeShell draw={draw} />);

    vi.advanceTimersByTime(QUESTION_TIME_MS / 2);
    keyButton(host, "G4").click();
    buttonByLabel(host, "Confirm").click();
    buttonByLabel(host, "Next").click();

    expect(timerText(host)).toBe(`${QUESTION_TIME_MS / 1000}s`);
    vi.advanceTimersByTime(5000);
    expect(timerText(host)).toBe(`${QUESTION_TIME_MS / 1000 - 5}s`);
  });

  it("Play again after a timeout re-arms a full countdown", async () => {
    vi.useFakeTimers();
    const { draw } = scripted(["G4", "B4"]);
    const host = mount(() => <PracticeShell draw={draw} />);

    vi.advanceTimersByTime(QUESTION_TIME_MS);
    buttonByLabel(host, "Play again").click();

    expect(timerText(host)).toBe(`${QUESTION_TIME_MS / 1000}s`);
  });
});

describe("PracticeShell: the staff never names the pitch", () => {
  it("speaks only the structural label while engraving the drawn note", async () => {
    const { draw } = scripted(["F#4"], true);
    const host = mount(() => <PracticeShell draw={draw} />);
    await waitFor(() => host.querySelector(".prompt--staff") !== null, "staff prompt");

    const prompt = host.querySelector(".prompt--staff")!;
    expect(prompt.getAttribute("aria-label")).toBe("Staff notation, treble clef, 1 note");
    // No pitch name anywhere in the prompt's text: the learner must not be told.
    expect(prompt.textContent ?? "").not.toMatch(/\b[A-G]#?\d\b/);
    // The keyboard the answer is made on does carry the names — those are options.
    expect(keyButton(host, "F#4").tagName).toBe("BUTTON");
  });

  it("passes the engraved pitch to the next draw, on advance and on restart", async () => {
    const { draw, seen } = scripted(["G4", "B4", "D5"], true);
    const host = mount(() => <PracticeShell draw={draw} />);
    await waitFor(() => host.querySelector(".prompt--staff") !== null, "staff prompt");
    expect(seen).toEqual([undefined]);

    await answer(host, "G4");
    buttonByLabel(host, "Next").click();
    await waitFor(
      () => host.querySelector(".game-shell__feedback") === null,
      "second question on screen",
    );

    await answer(host, "B4");
    buttonByLabel(host, "Next").click();
    await answer(host, "C4"); // wrong on the third question (D5)
    buttonByLabel(host, "Play again").click();

    expect(seen).toEqual([undefined, "G4", "B4", "D5"]);
  });
});

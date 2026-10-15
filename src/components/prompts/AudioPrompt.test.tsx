import type { JSX } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";

// The synth needs a real AudioContext, which happy-dom does not implement.
// Mock the four play functions so the test asserts the dispatch — which verb
// reaches which synth entry point with which arguments — not Web Audio itself.
vi.mock("../../lib/audio/synth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/audio/synth")>();
  return {
    ...actual,
    playNote: vi.fn(),
    playChord: vi.fn(),
    playScale: vi.fn(),
    playInterval: vi.fn(),
  };
});

import {
  DEFAULT_NOTE_DURATION_SEC,
  playChord,
  playInterval,
  playNote,
  playScale,
} from "../../lib/audio/synth";
import AudioPrompt from "./AudioPrompt";

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
  vi.clearAllMocks();
});

function playButton(host: HTMLElement): HTMLButtonElement {
  const button = host.querySelector("button.prompt--audio-play");
  if (button === null) {
    throw new Error("no Play button rendered");
  }
  return button as HTMLButtonElement;
}

function expectSilent(): void {
  expect(playNote).not.toHaveBeenCalled();
  expect(playChord).not.toHaveBeenCalled();
  expect(playScale).not.toHaveBeenCalled();
  expect(playInterval).not.toHaveBeenCalled();
}

describe("AudioPrompt", () => {
  it("renders one real, labelled Play button", () => {
    const host = mount(() => (
      <AudioPrompt prompt={{ kind: "audio", play: "note", notes: ["A4"] }} />
    ));
    expect(host.querySelector(".prompt--audio")).not.toBeNull();
    const button = playButton(host);
    expect(button.tagName).toBe("BUTTON");
    expect(button.getAttribute("type")).toBe("button");
    expect(button.tabIndex).toBe(0);
    expect(button.textContent?.trim()).toBe("Play");
    expect(button.getAttribute("aria-label")).toBe("Play note");
  });

  it("never touches the synth during mount or in an effect", async () => {
    mount(() => (
      <AudioPrompt prompt={{ kind: "audio", play: "chord", notes: ["C4", "E4", "G4"] }} />
    ));
    // Let any queued effect flush before judging; browsers block audio that
    // starts without a gesture, so silence here is the contract.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expectSilent();
  });

  it("plays a single note only when the button is clicked", () => {
    const host = mount(() => (
      <AudioPrompt prompt={{ kind: "audio", play: "note", notes: ["A4"] }} />
    ));
    expectSilent();
    playButton(host).click();
    expect(playNote).toHaveBeenCalledTimes(1);
    expect(playNote).toHaveBeenCalledWith(440, DEFAULT_NOTE_DURATION_SEC);
    expect(playChord).not.toHaveBeenCalled();
  });

  it("plays a chord as one frequency list when clicked", () => {
    const host = mount(() => (
      <AudioPrompt prompt={{ kind: "audio", play: "chord", notes: ["C4", "E4", "G4"] }} />
    ));
    playButton(host).click();
    expect(playChord).toHaveBeenCalledTimes(1);
    const [frequencies, durationSec] = vi.mocked(playChord).mock.calls[0];
    expect(durationSec).toBe(DEFAULT_NOTE_DURATION_SEC);
    expect(frequencies).toHaveLength(3);
    expect(frequencies[0]).toBeCloseTo(261.63, 1);
    expect(frequencies[1]).toBeCloseTo(329.63, 1);
    expect(frequencies[2]).toBeCloseTo(392.0, 1);
    expect(playNote).not.toHaveBeenCalled();
  });

  it("detects a major scale from its notes and dispatches to playScale", () => {
    const host = mount(() => (
      <AudioPrompt
        prompt={{
          kind: "audio",
          play: "scale",
          notes: ["C4", "D4", "E4", "F4", "G4", "A4", "B4"],
        }}
      />
    ));
    playButton(host).click();
    expect(playScale).toHaveBeenCalledTimes(1);
    expect(playScale).toHaveBeenCalledWith("C4", "major");
    expect(playNote).not.toHaveBeenCalled();
    expect(playChord).not.toHaveBeenCalled();
  });

  it("detects a natural minor scale from its notes", () => {
    const host = mount(() => (
      <AudioPrompt
        prompt={{
          kind: "audio",
          play: "scale",
          notes: ["A3", "B3", "C4", "D4", "E4", "F4", "G4"],
        }}
      />
    ));
    playButton(host).click();
    expect(playScale).toHaveBeenCalledWith("A3", "naturalMinor");
  });

  it("derives the interval number and quality from the two notes", () => {
    const perfectFifth = mount(() => (
      <AudioPrompt prompt={{ kind: "audio", play: "interval", notes: ["C4", "G4"] }} />
    ));
    playButton(perfectFifth).click();
    expect(playInterval).toHaveBeenCalledTimes(1);
    expect(playInterval).toHaveBeenCalledWith("C4", 5, "perfect");

    const minorThird = mount(() => (
      <AudioPrompt prompt={{ kind: "audio", play: "interval", notes: ["C4", "Eb4"] }} />
    ));
    playButton(minorThird).click();
    expect(playInterval).toHaveBeenCalledWith("C4", 3, "minor");
    expect(playNote).not.toHaveBeenCalled();
  });

  it("plays a descending interval as the same pitch pair, low note first", () => {
    const host = mount(() => (
      <AudioPrompt prompt={{ kind: "audio", play: "interval", notes: ["G4", "C4"] }} />
    ));
    playButton(host).click();
    expect(playInterval).toHaveBeenCalledWith("C4", 5, "perfect");
  });

  it("throws a clear error when handed a non-audio prompt", () => {
    expect(() =>
      mount(() => <AudioPrompt prompt={{ kind: "text", text: "listen up" }} />),
    ).toThrow(/"audio".*"text"|text.*audio/i);
  });
});

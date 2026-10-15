import type { JSX } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it } from "vitest";
import StaffPrompt from "../components/prompts/StaffPrompt";
import type { PromptSpec } from "../lib/rounds/types";

/**
 * Part A contract: the `staff` PromptSpec carries an optional VexFlow duration
 * code and StaffPrompt forwards it to Staff, so rhythm lessons (11–14) can show
 * real note values instead of a note head that is always a quarter note.
 *
 * This suite lives in src/games because the task's allowed edit surfaces name
 * StaffPrompt.tsx but not its existing test file (one of the 320 baseline tests
 * that must stay untouched).
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

/** Geometry of every drawn path, for comparing two rendered staves. */
function pathGeometry(host: HTMLElement): (string | null)[] {
  return [...host.querySelectorAll("path")].map((path) => path.getAttribute("d"));
}

function staffSpec(duration?: string): PromptSpec {
  return duration === undefined
    ? { kind: "staff", clef: "treble", notes: ["C4"] }
    : { kind: "staff", clef: "treble", notes: ["C4"], duration };
}

describe("staff prompt duration pass-through", () => {
  it("draws different geometry for a duration-carrying spec than for one without", () => {
    const withoutDuration = mount(() => <StaffPrompt prompt={staffSpec()} />);
    const wholeNote = mount(() => <StaffPrompt prompt={staffSpec("w")} />);

    const defaultGeometry = pathGeometry(withoutDuration);
    const wholeGeometry = pathGeometry(wholeNote);
    expect(defaultGeometry.length).toBeGreaterThan(5);
    expect(wholeGeometry.length).toBeGreaterThan(5);
    // A whole note (open head, no stem) cannot engrave the same paths as the
    // default quarter note unless the duration reached the Staff component.
    expect(wholeGeometry).not.toEqual(defaultGeometry);
  });

  it("draws a rest when the duration code carries the rest suffix", () => {
    const note = mount(() => <StaffPrompt prompt={staffSpec("q")} />);
    const rest = mount(() => <StaffPrompt prompt={staffSpec("qr")} />);

    expect(pathGeometry(rest)).not.toEqual(pathGeometry(note));
  });
});

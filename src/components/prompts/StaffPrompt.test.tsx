import type { JSX } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it } from "vitest";
import StaffPrompt from "./StaffPrompt";

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

describe("StaffPrompt", () => {
  it("renders the staff variant through the Staff component", () => {
    const host = mount(() => (
      <StaffPrompt
        prompt={{ kind: "staff", clef: "treble", notes: ["C4", "Eb4", "G4"] }}
      />
    ));
    const wrapper = host.querySelector(".prompt--staff");
    expect(wrapper).not.toBeNull();
    expect(wrapper!.getAttribute("data-clef")).toBe("treble");
    const svg = host.querySelector("svg");
    expect(svg).not.toBeNull();
    // The five staff lines alone are five paths; notes add more.
    expect(svg!.querySelectorAll("path").length).toBeGreaterThanOrEqual(5);
    // The graphic carries a spoken description for screen readers.
    expect(wrapper!.getAttribute("role")).toBe("img");
    const label = wrapper!.getAttribute("aria-label") ?? "";
    expect(label).toContain("C4");
    expect(label).toContain("treble");
  });

  it("applies the key signature from the spec", () => {
    const withoutKey = mount(() => (
      <StaffPrompt prompt={{ kind: "staff", clef: "treble", notes: ["C4"] }} />
    ));
    const withKey = mount(() => (
      <StaffPrompt
        prompt={{ kind: "staff", clef: "treble", notes: ["C4"], keySignature: "Eb" }}
      />
    ));
    expect(pathGeometry(withKey)).not.toEqual(pathGeometry(withoutKey));
  });

  it("converts note-name strings through the theory layer's parser", () => {
    // "H" is not a note letter in any accepted spelling, so this only passes
    // when the strings go through the theory parser instead of a hand-rolled one.
    expect(() =>
      mount(() => (
        <StaffPrompt prompt={{ kind: "staff", clef: "bass", notes: ["H4"] }} />
      )),
    ).toThrow(/Invalid note/);
  });

  it("throws a clear error when handed a non-staff prompt", () => {
    expect(() =>
      mount(() => <StaffPrompt prompt={{ kind: "keyboard", highlight: ["F#4"] }} />),
    ).toThrow(/"staff".*"keyboard"|keyboard.*staff/i);
  });
});

import { createSignal, type JSX } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it } from "vitest";
import { parseNote } from "../../lib/theory";
import Staff from "./Staff";

/**
 * solid-js/web's `render` requires an explicit mount element and returns a
 * bare disposer (not an object with `unmount`), so each test mounts into a
 * fresh host div that is registered for cleanup before rendering.
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

describe("Staff", () => {
  it("renders a VexFlow SVG staff into the document", () => {
    const host = mount(() => (
      <Staff
        notes={[parseNote("C4"), parseNote("Eb4"), parseNote("F#4")]}
        keySignature={parseNote("Eb")}
      />
    ));
    const svg = host.querySelector("svg");
    expect(svg).not.toBeNull();
    // The five staff lines alone are five paths; notes add more.
    expect(svg!.querySelectorAll("path").length).toBeGreaterThanOrEqual(5);
  });

  it("clears and redraws on prop changes instead of stacking SVGs", () => {
    const [notes, setNotes] = createSignal([parseNote("C4")]);
    const host = mount(() => <Staff notes={notes()} />);
    const first = host.querySelector("svg");
    expect(host.querySelectorAll("svg")).toHaveLength(1);

    setNotes([parseNote("D4"), parseNote("E4"), parseNote("F4")]);

    // One SVG, and it is a fresh one — the container was cleared, not appended to.
    expect(host.querySelectorAll("svg")).toHaveLength(1);
    expect(host.querySelector("svg")).not.toBe(first);
    expect(host.querySelector("svg")!.querySelectorAll("path").length).toBeGreaterThanOrEqual(5);
  });

  it("forwards the ref to its container div", () => {
    let el: HTMLDivElement | undefined;
    mount(() => (
      <Staff
        notes={[parseNote("C4")]}
        ref={(node) => {
          el = node;
        }}
      />
    ));
    expect(el).toBeInstanceOf(HTMLDivElement);
  });

  it("uses a default size and lets callers override it", () => {
    let defaulted: HTMLDivElement | undefined;
    mount(() => (
      <Staff
        notes={[parseNote("C4")]}
        ref={(node) => {
          defaulted = node;
        }}
      />
    ));
    expect(defaulted?.style.width).toBe("400px");
    expect(defaulted?.style.height).toBe("120px");

    let wide: HTMLDivElement | undefined;
    mount(() => (
      <Staff
        notes={[parseNote("C4")]}
        width={640}
        height={160}
        ref={(node) => {
          wide = node;
        }}
      />
    ));
    expect(wide?.style.width).toBe("640px");
    expect(wide?.style.height).toBe("160px");
  });

  it("applies the clef prop instead of always drawing treble", () => {
    const trebleHost = mount(() => <Staff notes={[parseNote("C4")]} clef="treble" />);
    const bassHost = mount(() => <Staff notes={[parseNote("C4")]} clef="bass" />);
    expect(pathGeometry(bassHost)).not.toEqual(pathGeometry(trebleHost));
  });

  it("renders when the voice beat count matches a non-default duration", () => {
    const host = mount(() => (
      <Staff notes={[parseNote("C4"), parseNote("D4"), parseNote("E4")]} duration="8" />
    ));
    expect(host.querySelector("svg")).not.toBeNull();
  });

  it("draws an accidental glyph for altered notes", () => {
    const naturalHost = mount(() => <Staff notes={[parseNote("C4")]} />);
    const sharpHost = mount(() => <Staff notes={[parseNote("C#4")]} />);
    expect(pathGeometry(sharpHost)).not.toEqual(pathGeometry(naturalHost));
  });
});

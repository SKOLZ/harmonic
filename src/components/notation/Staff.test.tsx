import { createSignal, type JSX } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
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

/**
 * VexFlow 5 wraps each StaveNote in `<g class="vf-stavenote">` and each key's
 * notehead in `<g class="vf-notehead">`, so the group counts are exactly the
 * number of engraved StaveNote objects — one per sequential slot, but one for a
 * whole chord — independent of path/text glyph bookkeeping.
 */
function svgGroups(host: HTMLElement, className: string): Element[] {
  return [...host.querySelectorAll("g")].filter(
    (group) => group.getAttribute("class") === className,
  );
}

function staveNoteGroups(host: HTMLElement): Element[] {
  return svgGroups(host, "vf-stavenote");
}

function noteheadGroups(host: HTMLElement): Element[] {
  return svgGroups(host, "vf-notehead");
}

/**
 * The minimum of FontFaceSet Staff consults before engraving. happy-dom has
 * no `document.fonts` at all, so tests that need the browser's async font
 * state install this stand-in and get a restore function that removes it
 * again.
 */
interface FontsStub {
  check(font: string): boolean;
  load(font: string): Promise<unknown>;
}

function stubFonts(stub: FontsStub): () => void {
  const doc = document as { fonts?: FontsStub };
  const previous = doc.fonts;
  doc.fonts = stub;
  return () => {
    if (previous === undefined) delete doc.fonts;
    else doc.fonts = previous;
  };
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

  it("engraves a simultaneous spec as one stacked chord, not one note per slot", () => {
    const triad = [parseNote("C4"), parseNote("E4"), parseNote("G4")];
    const sequentialHost = mount(() => <Staff notes={triad} />);
    const chordHost = mount(() => <Staff notes={triad} simultaneous />);

    const sequential = staveNoteGroups(sequentialHost);
    const simultaneous = staveNoteGroups(chordHost);
    // Three sequential quarter notes: three StaveNote objects, three groups.
    expect(sequential).toHaveLength(3);
    // One chord: a single StaveNote carrying every key, so one group.
    expect(simultaneous).toHaveLength(1);
    expect(simultaneous.length).toBeLessThan(sequential.length);
  });

  it("still engraves a sequential staff as one note per slot", () => {
    // Lesson 12's measure shape: the flag must never make a melodic line stack.
    const notes = [
      parseNote("C5"),
      parseNote("D5"),
      parseNote("E5"),
      parseNote("F5"),
    ];
    const omittedHost = mount(() => <Staff notes={notes} />);
    const falseHost = mount(() => <Staff notes={notes} simultaneous={false} />);
    expect(staveNoteGroups(omittedHost)).toHaveLength(4);
    expect(staveNoteGroups(falseHost)).toHaveLength(4);
    expect(staveNoteGroups(omittedHost)).toHaveLength(
      staveNoteGroups(falseHost).length,
    );
  });

  it("attaches each accidental to its own tone inside a stacked chord", () => {
    const chordHost = mount(() => (
      <Staff
        notes={[parseNote("C4"), parseNote("Eb4"), parseNote("G4")]}
        simultaneous
      />
    ));
    const heads = noteheadGroups(chordHost);
    expect(heads).toHaveLength(3);
    // The accidental glyph is drawn inside its tone's own notehead group
    // (NoteHead.draw -> StaveNote.drawModifiers matches modifier index), so
    // only the middle head — the flat — carries one.
    const glyphs = (head: Element) => head.querySelectorAll("text").length;
    expect(glyphs(heads[1])).toBeGreaterThan(glyphs(heads[0]));
    expect(glyphs(heads[1])).toBeGreaterThan(glyphs(heads[2]));
  });

  it("defers the first draw until the vexflow music fonts resolve", async () => {
    let releaseFonts!: () => void;
    const fontsReady = new Promise<void>((resolve) => {
      releaseFonts = resolve;
    });
    const restore = stubFonts({ check: () => false, load: () => fontsReady });
    try {
      const host = mount(() => <Staff notes={[parseNote("C4")]} />);
      // The music faces are not ready, so engraving must wait: canvas
      // measureText would otherwise bake fallback-font glyph widths into the
      // stem/clef geometry (the detached-stem defect).
      expect(host.querySelector("svg")).toBeNull();

      releaseFonts();
      await vi.waitFor(() => expect(host.querySelector("svg")).not.toBeNull());
      expect(host.querySelectorAll("svg")).toHaveLength(1);
    } finally {
      restore();
    }
  });

  it("draws synchronously when the music fonts are already available", () => {
    const load = vi.fn(() => Promise.resolve([]));
    const restore = stubFonts({ check: () => true, load });
    try {
      const host = mount(() => <Staff notes={[parseNote("C4")]} />);
      expect(host.querySelector("svg")).not.toBeNull();
      // Nothing to wait for; a second pass would only risk flicker.
      expect(load).not.toHaveBeenCalled();
    } finally {
      restore();
    }
  });

  it("discards a font-deferred draw that newer props supersede", async () => {
    let releaseFonts!: () => void;
    const fontsReady = new Promise<void>((resolve) => {
      releaseFonts = resolve;
    });
    const restore = stubFonts({ check: () => false, load: () => fontsReady });
    try {
      const [notes, setNotes] = createSignal([parseNote("C4")]);
      const host = mount(() => <Staff notes={notes()} />);
      // Props change while the first draw is still waiting on the faces.
      setNotes([parseNote("D4"), parseNote("E4")]);

      releaseFonts();
      await vi.waitFor(() => expect(host.querySelector("svg")).not.toBeNull());

      // Only the latest request is engraved — two slots, not the stale one.
      expect(host.querySelectorAll("svg")).toHaveLength(1);
      expect(staveNoteGroups(host)).toHaveLength(2);
    } finally {
      restore();
    }
  });

  it("keeps the svg's inline size in step with the fitted viewport", () => {
    // height is a MINIMUM: the ledger-line C4 and the treble clef push the
    // content past 60px, and every size channel must grow together. An inline
    // svg height left behind by renderer.resize() would win over the height
    // attribute and silently scale the taller viewBox down.
    const host = mount(() => (
      <Staff notes={[parseNote("C4"), parseNote("C5")]} height={60} />
    ));
    const svg = host.querySelector("svg");
    expect(svg).not.toBeNull();
    const fitted = Number(svg!.getAttribute("height"));
    expect(fitted).toBeGreaterThan(60);
    expect(svg!.style.height).toBe(`${fitted}px`);
    expect(svg!.style.width).toBe(`${svg!.getAttribute("width")}px`);
    // Staff's own sized div is the svg's parent, not the mount wrapper.
    const sized = svg!.parentElement as HTMLDivElement;
    expect(sized.style.height).toBe(`${fitted}px`);
  });
});

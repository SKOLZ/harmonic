import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { JSX } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it } from "vitest";
import NoteGlyph from "./NoteGlyph";

/**
 * The brand's one drawn form: a gold note — a tilted notehead, optionally
 * crossed by a ledger line — in a single fixed viewBox. The SVG exists for
 * flexibility: the same shape seats in both brand places, the wordmark's
 * ledger-crossed "o" and the hero staff's bare middle rule, scaled by one
 * CSS length rather than redrawn.
 *
 * These tests pin that contract: one modest viewBox widened only as far as
 * the ledger line needs, the standard notation tilt, gold from the accent's
 * own token, and decoration only — no role, no label, no text. Geometry
 * stays deliberately spare; every earlier drawn notehead failed review for
 * growing too detailed to read at 20px, and the stem is banned for good.
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

function styles(): string {
  return readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");
}

/** The declaration block that starts at a selector, up to its closing brace. */
function block(selector: string): string {
  return styles().match(new RegExp(`${selector}\\s*\\{[^}]*\\}`))?.[0] ?? "";
}

describe("NoteGlyph", () => {
  it("draws one tilted notehead in a viewBox widened only for the ledger line", () => {
    const host = mount(() => <NoteGlyph />);
    const svg = host.querySelector("svg")!;

    // One modest viewBox at every size: a context scales the glyph with a
    // single length, so the wordmark's "o" and the hero's rule carry the
    // identical shape. Two viewBoxes would be two brands. The width (11,
    // centred on the head at x=5) exists only so the ledger line's stroke
    // can reach the viewBox edge without clipping.
    expect(svg.getAttribute("viewBox")).toBe("-0.5 0 11 20");
    expect(svg.querySelectorAll("ellipse")).toHaveLength(1);
    // The default form is the bare notehead: no stem, no ledger.
    expect(svg.querySelectorAll("rect, line")).toHaveLength(0);
    // No path soup and no second shape family: the previous drawn heads
    // failed review by accreting curvature decisions invisible at 20px.
    expect(svg.querySelectorAll("path, circle, polygon, polyline, text")).toHaveLength(0);
  });

  it("tilts the notehead by the standard notation angle", () => {
    // ~-20° is the tilt every engraved notehead uses — right side up —
    // and the transform is about the ellipse's own centre so the tilt
    // cannot drift the head away from its seat.
    const host = mount(() => <NoteGlyph />);
    const head = host.querySelector("ellipse")!;

    expect(head.getAttribute("transform")).toMatch(/^rotate\(-20\b/);
  });

  it("crosses the notehead with a horizontal ledger line only when asked", () => {
    const host = mount(() => <NoteGlyph ledger />);
    const svg = host.querySelector("svg")!;
    const ledgers = svg.querySelectorAll("line");

    expect(ledgers).toHaveLength(1);
    const ledger = ledgers[0]!;
    // Horizontal, through the notehead's centre — the ellipse's cy, the
    // viewBox's vertical centre — the line a note outside the staff wears.
    expect(ledger.getAttribute("y1")).toBe("10");
    expect(ledger.getAttribute("y2")).toBe("10");
    // Wider than the notehead: the tilted ellipse spans ~0.74..9.26 at its
    // widest, so 0..10 extends past it on both sides.
    expect(ledger.getAttribute("x1")).toBe("0");
    expect(ledger.getAttribute("x2")).toBe("10");
    // Still one head, still no stem: the ledger adds a line, never soup.
    expect(svg.querySelectorAll("ellipse")).toHaveLength(1);
    expect(svg.querySelectorAll("rect")).toHaveLength(0);
  });

  it("stays decoration: aria-hidden, no role, no label, no text", () => {
    const host = mount(() => <NoteGlyph ledger />);
    const svg = host.querySelector("svg")!;

    expect(svg.getAttribute("aria-hidden")).toBe("true");
    expect(svg.getAttribute("role")).toBeNull();
    expect(svg.getAttribute("aria-label")).toBeNull();
    expect(svg.textContent).toBe("");
  });

  it("takes an extra class for the context that seats it, without losing its own", () => {
    const host = mount(() => <NoteGlyph class="brand-mark__glyph" />);
    const svg = host.querySelector("svg")!;

    expect(svg.classList.contains("note-glyph")).toBe(true);
    expect(svg.classList.contains("brand-mark__glyph")).toBe(true);
  });

  it("sizes from one em-driven length so any context scales the whole glyph", () => {
    const glyph = block("\\.note-glyph");

    expect(glyph, "the glyph has a declaration block").not.toBe("");
    expect(glyph).toContain("--note-glyph-size: 1em");
    expect(glyph).toContain("height: var(--note-glyph-size)");
    // The viewBox supplies the aspect ratio: one dimension drives the box.
    expect(glyph).toContain("width: auto");
  });

  it("paints head and ledger with the gold token, never a status colour", () => {
    const head = block("\\.note-glyph__head");
    const ledger = block("\\.note-glyph__ledger");

    expect(head, "the notehead has a declaration block").not.toBe("");
    expect(head).toContain("fill: var(--gold)");
    expect(ledger, "the ledger line has a declaration block").not.toBe("");
    expect(ledger).toContain("stroke: var(--gold)");
    // A hairline: thin enough to read as a staff rule at every seat size.
    expect(ledger).toContain("stroke-width: 1");

    // Verdict colours carry a meaning the brand mark must never assert.
    expect(head + ledger).not.toMatch(/var\(--(ok|danger|warn)\)/);
  });

  it("retires the stem entirely — no rule, no reference, no rect", () => {
    // The stem was the geometry every failed mark shared: extra strokes
    // that had to be repositioned at every size and still read as wrong.
    // Nothing in the brand may bring it back.
    const css = styles();
    expect(css).not.toMatch(/note-glyph__stem/);

    const host = mount(() => <NoteGlyph ledger />);
    expect(host.querySelectorAll("rect")).toHaveLength(0);
  });
});

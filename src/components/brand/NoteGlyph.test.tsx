import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { JSX } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it } from "vitest";
import NoteGlyph from "./NoteGlyph";

/**
 * The brand's one drawn form: a gold note — tilted notehead plus stem —
 * in a single fixed viewBox. The SVG exists for flexibility: the same
 * shape seats in both brand places, the wordmark's "o" and the hero
 * staff's middle rule, scaled by one CSS length rather than redrawn.
 *
 * These tests pin that contract: one modest viewBox, the standard
 * notation tilt, gold from the accent's own token, and decoration only —
 * no role, no label, no text. Geometry stays deliberately spare; every
 * earlier drawn notehead failed review for growing too detailed to read
 * at 20px.
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
  it("draws one tilted notehead and one stem — the minimum that reads as a note", () => {
    const host = mount(() => <NoteGlyph />);
    const svg = host.querySelector("svg")!;

    // One modest viewBox at every size: a context scales the glyph with a
    // single length, so the wordmark's "o" and the hero's rule carry the
    // identical shape. Two viewBoxes would be two brands.
    expect(svg.getAttribute("viewBox")).toBe("0 0 10 20");
    expect(svg.querySelectorAll("ellipse")).toHaveLength(1);
    expect(svg.querySelectorAll("rect")).toHaveLength(1);
    // No path soup and no second shape family: the previous drawn heads
    // failed review by accreting curvature decisions invisible at 20px.
    expect(svg.querySelectorAll("path, circle, line, polygon, polyline, text")).toHaveLength(0);
  });

  it("tilts the notehead by the standard notation angle", () => {
    // ~-20° is the tilt every engraved notehead uses — right side up —
    // and the transform is about the ellipse's own centre so the tilt
    // cannot drift the head away from the stem.
    const host = mount(() => <NoteGlyph />);
    const head = host.querySelector("ellipse")!;

    expect(head.getAttribute("transform")).toMatch(/^rotate\(-20\b/);
  });

  it("stays decoration: aria-hidden, no role, no label, no text", () => {
    const host = mount(() => <NoteGlyph />);
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

  it("paints head and stem with the gold token, never a status colour", () => {
    const head = block("\\.note-glyph__head");
    const stem = block("\\.note-glyph__stem");

    expect(head, "the notehead has a declaration block").not.toBe("");
    expect(head).toContain("fill: var(--gold)");
    expect(stem, "the stem has a declaration block").not.toBe("");
    expect(stem).toContain("fill: var(--gold)");

    // Verdict colours carry a meaning the brand mark must never assert.
    expect(head + stem).not.toMatch(/var\(--(ok|danger|warn)\)/);
  });
});

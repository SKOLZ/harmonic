import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { JSX } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it } from "vitest";
import BrandMark from "./BrandMark";

/**
 * The mark is the brand's one memorable element: a gold note — the shared
 * NoteGlyph — resting on a staff rule. Three forms were rejected in visual
 * review (a symmetric ellipse, an asymmetric two-arc path, a CSS circle)
 * before the glyph earned its place, so the geometry budget stays fixed:
 * one svg, one tilted notehead, one stem, one viewBox — the same shape at
 * wordmark scale and at hero scale. The wordmark carries the name; the
 * note carries the gold.
 *
 * These tests pin the shape of that restraint, plus the width contract:
 * one rule by default, five only when a caller asks for the full staff.
 *
 * Colour lives in styles.css, so the token contract is read the same way
 * CountdownRing's reduced-motion contract is: straight from the stylesheet.
 * The contract pins the *token* and the *meaning* — never a raw hex, which
 * would block retheming the hue for ever.
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

describe("BrandMark", () => {
  it("renders one staff rule carrying one gold note — the mark at wordmark scale", () => {
    const host = mount(() => <BrandMark />);
    const mark = host.querySelector(".brand-mark")!;

    expect(mark.querySelectorAll(".brand-mark__rule")).toHaveLength(1);
    expect(mark.querySelectorAll(".brand-mark__glyph")).toHaveLength(1);
  });

  it("seats the shared note glyph: one svg, one notehead, one stem, nothing else", () => {
    const host = mount(() => <BrandMark lines={5} />);
    const mark = host.querySelector(".brand-mark")!;

    // The mark's entire drawn geometry is the NoteGlyph — the same shape
    // the wordmark seats in its "o" — so the brand says one thing at both
    // sizes. No second shape family may accrete beside it.
    const svg = mark.querySelector("svg")!;
    expect(svg, "the mark carries the glyph").not.toBeNull();
    expect(mark.querySelectorAll("svg")).toHaveLength(1);
    expect(svg.querySelectorAll("ellipse")).toHaveLength(1);
    expect(svg.querySelectorAll("rect")).toHaveLength(1);
    expect(svg.querySelectorAll("path, circle, line, polygon, polyline, text")).toHaveLength(0);
    expect(svg.textContent).toBe("");
  });

  it("draws the full five-line staff only when a caller asks for lines={5}", () => {
    const host = mount(() => <BrandMark lines={5} />);
    const mark = host.querySelector(".brand-mark")!;

    expect(mark.querySelectorAll(".brand-mark__rule")).toHaveLength(5);
    expect(mark.querySelectorAll(".brand-mark__glyph")).toHaveLength(1);
  });

  it("stays decoration: aria-hidden, no role, no label, no text", () => {
    const host = mount(() => <BrandMark lines={5} />);
    const mark = host.querySelector(".brand-mark")!;

    expect(mark.getAttribute("aria-hidden")).toBe("true");
    expect(mark.getAttribute("role")).toBeNull();
    expect(mark.getAttribute("aria-label")).toBeNull();
    expect(mark.textContent).toBe("");
  });

  it("carries an extra class from its caller without losing its own", () => {
    const host = mount(() => <BrandMark class="home__staff" />);
    const mark = host.querySelector(".brand-mark")!;

    expect(mark.classList.contains("home__staff")).toBe(true);
  });
});

describe("BrandMark: the colour contract", () => {
  it("declares gold as the one warm accent, and leaves no warning hue in the palette", () => {
    const css = styles();

    // Gold is named for the colour, not for a job: the note, the "Locked"
    // stamps, and link hover all draw from this single declaration.
    expect(css).toMatch(/--gold:\s*#[0-9a-f]{6}\s*;/);
    expect(css).toMatch(/--gold-bg:\s*#[0-9a-f]{6}\s*;/);

    // Status is green or red only. The warning tokens are deleted outright —
    // not aliased, not repurposed — so no colour in the product can mean
    // "caution" again.
    expect(css).not.toMatch(/--warn:/);
    expect(css).not.toMatch(/--warn-bg:/);

    // The old job-named token is gone too, so the hue has exactly one name.
    // (`--brand-mark-*` are the mark's geometry lengths, not the hue.)
    expect(css).not.toMatch(/--brand:/);
  });

  it("paints the note with the gold token, never with a status colour", () => {
    const head = block("\\.note-glyph__head");

    expect(head, "the notehead has a declaration block").not.toBe("");
    expect(head).toContain("fill: var(--gold)");
    // Verdict colours carry a meaning the mark must never assert.
    expect(head).not.toMatch(/var\(--(ok|danger|warn)\)/);
  });

  it("sizes the glyph by one em token, so a context scales the whole mark", () => {
    // One length, em-driven: the hero changes only font-size, and the
    // note grows with its rules the way a head does on a real staff.
    const mark = block("\\.brand-mark");
    const glyph = block("\\.brand-mark__glyph");

    expect(mark, "the mark has a declaration block").not.toBe("");
    expect(mark).toContain("--brand-mark-glyph:");
    expect(glyph, "the glyph has a declaration block").not.toBe("");
    expect(glyph).toContain("height: var(--brand-mark-glyph)");
    // The notehead centre is the viewBox centre, so this lands it on the
    // middle rule — the same maths the retired CSS dot used.
    expect(glyph).toContain("top: 50%");
    expect(glyph).toContain("translateY(-50%)");
  });

  it("retires the CSS dot entirely — no token, no class, no reference", () => {
    // The circle that briefly replaced the drawn heads is gone: the glyph
    // is the mark's only form, so nothing may keep the old geometry alive.
    const css = styles();

    expect(css).not.toMatch(/--brand-mark-dot/);
    expect(block("\\.brand-mark__dot")).toBe("");
  });

  it("draws the rules in the app's structural ink", () => {
    const rule = block("\\.brand-mark__rule");

    expect(rule, "the staff rules have a declaration block").not.toBe("");
    expect(rule).toContain("var(--ink)");
    expect(rule).not.toContain("var(--gold)");
  });
});

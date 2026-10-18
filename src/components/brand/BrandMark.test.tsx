import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { JSX } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it } from "vitest";
import BrandMark from "./BrandMark";

/**
 * The mark is the brand's one memorable element: a staff rule carrying a
 * single gold note. These tests pin its two shapes of restraint — one note
 * and nothing else (an asymmetric notehead and its stem: no clef, no flag,
 * no beam, no second glyph) and one warm colour (`--gold`, the accent's own
 * token, so the hue is named for what it is rather than for one of its
 * jobs) — plus the width contract: one rule by default, five only when a
 * caller asks for the full staff.
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
  it("draws one staff rule carrying one note — the mark at wordmark scale", () => {
    const host = mount(() => <BrandMark />);
    const mark = host.querySelector(".brand-mark")!;

    expect(mark.querySelectorAll(".brand-mark__rule")).toHaveLength(1);
    expect(mark.querySelectorAll(".brand-mark__notehead")).toHaveLength(1);

    // One note and nothing else: an asymmetric notehead (a path — two arcs
    // of different curvature meeting at the tips, the way an engraver cuts
    // a notehead, never a symmetric ellipse) plus its stem. No clef, no
    // flag, no beam, no second glyph.
    const notehead = mark.querySelector(".brand-mark__notehead")!;
    expect(notehead.querySelectorAll("path")).toHaveLength(1);
    expect(notehead.querySelectorAll("rect")).toHaveLength(1);
    expect(notehead.querySelectorAll("*")).toHaveLength(2);
  });

  it("draws the full five-line staff only when a caller asks for lines={5}", () => {
    const host = mount(() => <BrandMark lines={5} />);
    const mark = host.querySelector(".brand-mark")!;

    expect(mark.querySelectorAll(".brand-mark__rule")).toHaveLength(5);
    expect(mark.querySelectorAll(".brand-mark__notehead")).toHaveLength(1);
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

    // Gold is named for the colour, not for a job: the notehead, the "Locked"
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

  it("paints the notehead with the gold token, never with a status colour", () => {
    const notehead = block("\\.brand-mark__notehead");

    expect(notehead, "the notehead has a declaration block").not.toBe("");
    expect(notehead).toContain("fill: var(--gold)");
    // Verdict colours carry a meaning the mark must never assert.
    expect(notehead).not.toMatch(/var\(--(ok|danger|warn)\)/);
  });

  it("draws the rules in the app's structural ink", () => {
    const rule = block("\\.brand-mark__rule");

    expect(rule, "the staff rules have a declaration block").not.toBe("");
    expect(rule).toContain("var(--ink)");
    expect(rule).not.toContain("var(--gold)");
  });
});

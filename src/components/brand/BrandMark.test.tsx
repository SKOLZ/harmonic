import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { JSX } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it } from "vitest";
import BrandMark from "./BrandMark";

/**
 * The mark is the brand's one memorable element: a gold dot resting on a
 * staff rule. Two drawn noteheads were rejected in visual review — first a
 * symmetric ellipse, then an asymmetric two-arc path — for the same reason
 * both times: a small drawn glyph has nowhere to hide. So the mark draws
 * nothing. The wordmark carries the brand, and the gold lives in one
 * circle rendered in CSS — the one shape that cannot look strange at any
 * size.
 *
 * These tests pin the shape of that restraint — one circle and nothing
 * else (no svg, no path, no rect, no second glyph) and one warm colour
 * (`--gold`, the accent's own token, so the hue is named for what it is
 * rather than for one of its jobs) — plus the width contract: one rule by
 * default, five only when a caller asks for the full staff.
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
  it("renders one staff rule carrying one gold dot — the mark at wordmark scale", () => {
    const host = mount(() => <BrandMark />);
    const mark = host.querySelector(".brand-mark")!;

    expect(mark.querySelectorAll(".brand-mark__rule")).toHaveLength(1);
    expect(mark.querySelectorAll(".brand-mark__dot")).toHaveLength(1);
  });

  it("draws nothing: no svg, no path, no rect, no second shape", () => {
    const host = mount(() => <BrandMark lines={5} />);
    const mark = host.querySelector(".brand-mark")!;

    // The whole geometry budget of the brand is now one circle, and even
    // that is a declaration in styles.css rather than a drawn glyph. Two
    // noteheads failed review in a row; nothing here may be drawable again.
    expect(mark.querySelector("svg")).toBeNull();
    expect(mark.querySelectorAll("path, rect, circle, ellipse, line, polygon, polyline")).toHaveLength(
      0,
    );

    const dot = mark.querySelector(".brand-mark__dot")!;
    expect(dot.querySelectorAll("*")).toHaveLength(0);
    expect(dot.textContent).toBe("");
  });

  it("keeps the legacy slot name the shell and landing suites pin", () => {
    // AppShell.test.tsx and Home.test.tsx sit outside this change's edit
    // surface and still query `.brand-mark__notehead`. The dot carries that
    // class as an alias so those suites keep passing untouched; drop it only
    // when they are renamed together with it.
    const host = mount(() => <BrandMark />);
    const mark = host.querySelector(".brand-mark")!;

    expect(mark.querySelectorAll(".brand-mark__notehead")).toHaveLength(1);
  });

  it("draws the full five-line staff only when a caller asks for lines={5}", () => {
    const host = mount(() => <BrandMark lines={5} />);
    const mark = host.querySelector(".brand-mark")!;

    expect(mark.querySelectorAll(".brand-mark__rule")).toHaveLength(5);
    expect(mark.querySelectorAll(".brand-mark__dot")).toHaveLength(1);
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

    // Gold is named for the colour, not for a job: the dot, the "Locked"
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

  it("paints the dot with the gold token, never with a status colour", () => {
    const dot = block("\\.brand-mark__dot");

    expect(dot, "the dot has a declaration block").not.toBe("");
    expect(dot).toContain("background: var(--gold)");
    // Verdict colours carry a meaning the mark must never assert.
    expect(dot).not.toMatch(/var\(--(ok|danger|warn)\)/);
  });

  it("renders the dot as a circle sized by the mark's own em token", () => {
    // One shape, one length: the diameter is a single em token, so a
    // context scales the whole mark with font-size alone and the circle
    // stays a circle — width and height are the same declaration.
    const dot = block("\\.brand-mark__dot");

    expect(dot, "the dot has a declaration block").not.toBe("");
    expect(dot).toContain("border-radius: 50%");
    expect(dot).toContain("width: var(--brand-mark-dot)");
    expect(dot).toContain("height: var(--brand-mark-dot)");
  });

  it("draws the rules in the app's structural ink", () => {
    const rule = block("\\.brand-mark__rule");

    expect(rule, "the staff rules have a declaration block").not.toBe("");
    expect(rule).toContain("var(--ink)");
    expect(rule).not.toContain("var(--gold)");
  });
});

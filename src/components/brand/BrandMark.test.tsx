import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { JSX } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it } from "vitest";
import BrandMark from "./BrandMark";

/**
 * The mark is the brand's one memorable element: a staff rule carrying a
 * single ochre notehead. These tests pin its two shapes of restraint — one
 * shape (a lone ellipse, no clef, no stem, no illustration) and one warm
 * colour (`--brand`, a token of its own so retheming the gate colour cannot
 * retheme the logo) — plus the width contract: one rule by default, five
 * only when a caller asks for the full staff.
 *
 * Colour lives in styles.css, so the token contract is read the same way
 * CountdownRing's reduced-motion contract is: straight from the stylesheet.
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
  it("draws one staff rule carrying one notehead — the mark at wordmark scale", () => {
    const host = mount(() => <BrandMark />);
    const mark = host.querySelector(".brand-mark")!;

    expect(mark.querySelectorAll(".brand-mark__rule")).toHaveLength(1);
    expect(mark.querySelectorAll(".brand-mark__notehead")).toHaveLength(1);

    // One shape: the notehead is a single tilted ellipse. No stem, no clef,
    // no staff lines beyond the one rule it sits on — nothing illustrated.
    const notehead = mark.querySelector(".brand-mark__notehead")!;
    expect(notehead.querySelectorAll("*")).toHaveLength(1);
    expect(notehead.querySelector("ellipse")).not.toBeNull();
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
  it("adds --brand as the ochre under its own name, and keeps --warn on the gate", () => {
    const css = styles();

    // Same value, separate declaration: the brand copies the ochre rather
    // than borrowing --warn, so retheming the gate cannot retheme the logo.
    expect(css).toMatch(/--brand:\s*#8a6a1f\s*;/);
    expect(css).toMatch(/--warn:\s*#8a6a1f\s*;/);
    expect(css).not.toMatch(/--brand:\s*var\(--warn\)/);
  });

  it("paints the notehead with --brand, never with the gate colour", () => {
    const notehead = block("\\.brand-mark__notehead");

    expect(notehead, "the notehead has a declaration block").not.toBe("");
    expect(notehead).toContain("fill: var(--brand)");
    expect(notehead).not.toContain("var(--warn)");
  });

  it("draws the rules in the app's structural ink", () => {
    const rule = block("\\.brand-mark__rule");

    expect(rule, "the staff rules have a declaration block").not.toBe("");
    expect(rule).toContain("var(--ink)");
    expect(rule).not.toContain("var(--brand)");
  });
});

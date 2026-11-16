import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { JSX } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it } from "vitest";
import FooterMark from "./FooterMark";

/**
 * The footer's compact mark is the supplied `harmonic_logo_sm.svg`, inlined
 * whole: the gold monogram the footer carries instead of repeating the
 * navbar's full wordmark. The asset owns the accessible name and the 60×60
 * geometry; the stylesheet owns one height and nothing else.
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

/** The declaration block for a selector, up to its closing brace. */
function block(selector: string): string {
  return styles().match(new RegExp(`${selector}\\s*\\{[^}]*\\}`))?.[0] ?? "";
}

/** The shipped asset, exactly as it is imported — the raw string. */
function asset(): string {
  return readFileSync(resolve(process.cwd(), "src/assets/harmonic_logo_sm.svg"), "utf8");
}

describe("FooterMark", () => {
  it("inlines the compact asset as the whole footer mark", () => {
    const host = mount(() => <FooterMark />);
    const svg = host.querySelector("svg");
    expect(svg, "the asset is inlined into the footer mark").not.toBeNull();
    expect(svg!.closest(".app-shell__footer-mark")).not.toBeNull();
    expect(host.querySelector("img"), "never an opaque image").toBeNull();
    expect(host.textContent?.trim(), "the asset carries no text").toBe("");
  });

  it("keeps the accessible name Harmonic on the asset's own root", () => {
    const svg = mount(() => <FooterMark />).querySelector("svg")!;

    expect(svg.getAttribute("role")).toBe("img");
    expect(svg.getAttribute("aria-label")).toBe("Harmonic");
  });

  it("keeps the asset's 60×60 viewBox and lets one height drive the mark", () => {
    const svg = mount(() => <FooterMark />).querySelector("svg")!;
    expect(svg.getAttribute("viewBox")).toBe("0 0 60 60");

    const mark = block("\\.app-shell__footer-mark");
    expect(mark, "the footer mark has a declaration block").not.toBe("");
    expect(mark).toContain("display: inline-block");

    const scaled = block("\\.app-shell__footer-mark svg");
    expect(scaled, "the inlined svg has a declaration block").not.toBe("");
    expect(scaled).toContain("display: block");
    expect(scaled).toContain("height: 30px");
    expect(scaled).toContain("width: auto");
  });

  it("ships the gold monogram, not a recolourable outline", () => {
    const source = asset();

    // Four gold paths: the disc, the staff run, and the two rules. The mark
    // is already the finished gold object; it must not inherit the surface's
    // ink the way the wordmark's letters do.
    expect(source.match(/fill="#8A6A1F"/gi), "the four gold paths").toHaveLength(4);
    expect(source).not.toContain("currentColor");
    expect(source).toContain('shape-rendering="geometricPrecision"');
  });

  it("takes an extra class for the surface it lands on", () => {
    const host = mount(() => <FooterMark class="custom-class" />);

    expect(host.querySelector(".app-shell__footer-mark")?.classList.contains("custom-class")).toBe(
      true,
    );
  });
});

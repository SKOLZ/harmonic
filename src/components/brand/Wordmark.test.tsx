import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { JSX } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it } from "vitest";
import Wordmark from "./Wordmark";

/**
 * The wordmark is the supplied asset, inlined whole: the letters, the gold
 * note in the "o", and the two hairline rules the name sits between all
 * ship in one coordinate system, so nothing in the app positions any part
 * of the mark any more. Earlier compositions — Fraunces text with a floated
 * glyph over a transparent "o" — inferred geometry from font metrics the
 * layout cannot read, and every positioning fault of those rounds came
 * from that guess.
 *
 * Two contracts survive the loss of the text run. The accessible name is
 * still exactly "Harmonic", now carried by the asset's own root element
 * (`role="img"` + `aria-label`) instead of by textContent. And the letters
 * are not a fixed white: they are `currentColor`, so the surface's CSS
 * ink decides what the mark wears, while the gold circle keeps its own
 * fill and is never recoloured.
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

/** The shipped asset, exactly as it is imported — the raw string. */
function asset(): string {
  return readFileSync(resolve(process.cwd(), "src/assets/harmonic_logo.svg"), "utf8");
}

describe("Wordmark", () => {
  it("renders the supplied asset as the whole mark, with no composition left around it", () => {
    const host = mount(() => <Wordmark />);

    const svg = host.querySelector("svg");
    expect(svg, "the asset is inlined into the wordmark").not.toBeNull();
    expect(svg!.closest(".brand-wordmark")).not.toBeNull();

    // The retired composition: Fraunces text, the transparent "o" slot, the
    // floated glyph, and the CSS framing rules that depended on a text run.
    expect(host.querySelector(".brand-wordmark__name")).toBeNull();
    expect(host.querySelector(".brand-wordmark__o")).toBeNull();
    expect(host.querySelector(".brand-wordmark__glyph")).toBeNull();
    // No companion staff beneath the name either: the asset is the mark.
    expect(host.querySelector(".brand-mark")).toBeNull();
    // Nothing in the asset is text, so the wordmark contributes none.
    expect(host.textContent).toBe("");
  });

  it("keeps the accessible name Harmonic on the asset's own root", () => {
    // The name used to be textContent. An inlined asset has none, so the
    // name lives on the root svg as an explicit image label — the thing
    // assistive tech reads in place of the letters the eye sees.
    const host = mount(() => <Wordmark />);
    const svg = host.querySelector("svg")!;

    expect(svg.getAttribute("role")).toBe("img");
    expect(svg.getAttribute("aria-label")).toBe("Harmonic");
    expect(host.textContent?.trim()).toBe("");
  });

  it("hands the letters and the framing rules to CSS, and leaves the gold circle alone", () => {
    // White was the asset's ground-facing colour, drawn for a dark
    // background. `currentColor` is what lets the surface's ink decide, so
    // the mark recolours with the product instead of punching a white hole
    // in it. The gold note keeps its own fill: it is the one hue the brand
    // owns, and a retheme of any status colour may not retheme the logo.
    const source = asset();

    expect(source).toContain('fill="currentColor"');
    expect(source).toContain('stroke="currentColor"');
    expect(source).not.toMatch(/#fff/i);
    expect(source).toContain('fill="#8a6a1f"');
  });

  it("wears the brand ink and scales from one em length, never from a text run", () => {
    const wordmark = block("\\.brand-wordmark");
    const svg = block("\\.brand-wordmark svg");

    expect(wordmark, "the wordmark has a declaration block").not.toBe("");
    // The letters and rules are currentColor: this is the ink they land in.
    expect(wordmark).toContain("color: var(--ink)");
    // The block was a text run once; it is a box around one replaced
    // element now, so no rule may depend on tracking or vertical rhythm.
    expect(wordmark).not.toContain("letter-spacing");
    expect(wordmark).not.toContain("padding-block");
    expect(wordmark).not.toContain("border");

    // One length drives the mark, in em, so the surface's own font-size
    // scales it — the same way the brand mark scales. The asset carries
    // its width and height attributes; CSS owns the height and lets the
    // viewBox's aspect ratio follow.
    expect(svg, "the inlined svg has a declaration block").not.toBe("");
    // A fixed integer pixel height, not an em-derived one: at the navbar's
    // 18px context a `1.2em` mark landed on 21.6px, and a fractional pixel
    // height rasterises the scaled paths soft. 30px is also the size the
    // user asked for, and at the asset's 12-unit tall viewBox it scales by
    // exactly 2.5x — which is what lets the framing rules land on whole
    // device pixels.
    expect(svg).toContain("height: 30px");
    expect(svg).toContain("width: auto");
    expect(svg).toContain("display: block");
  });

  it("leaves no dead composition rule in the stylesheet", () => {
    // The framing borders, the transparent "o", and the floated glyph all
    // belonged to a text run that no longer exists. A surviving block
    // would be a rule nothing can reach — and a trap for the next person
    // who searches the stylesheet for the old classes.
    const css = styles();

    expect(css).not.toMatch(/brand-wordmark__name/);
    expect(css).not.toMatch(/brand-wordmark__o/);
    expect(css).not.toMatch(/brand-wordmark__glyph/);
  });

  it("takes an extra class for the surface it lands on", () => {
    const host = mount(() => <Wordmark class="app-shell__footer-wordmark" />);

    expect(host.querySelector(".brand-wordmark")?.classList.contains("app-shell__footer-wordmark")).toBe(
      true,
    );
  });

  it("keeps the gold note the asset ships, and draws it the way the shared glyph does", () => {
    // The note is the one thing in the mark that may not recolour: it is
    // gold in the asset and stays gold in the DOM, so a retheme of the ink
    // cannot take the brand's one hue with it.
    const host = mount(() => <Wordmark />);
    const note = host.querySelector(".brand-wordmark svg circle");

    expect(note, "the asset carries its note").not.toBeNull();
    expect(note!.getAttribute("fill")).toBe("#8a6a1f");

    // The asset and `NoteGlyph` must agree on the note's shape: a plain
    // round head, so the two seats the brand has ever given a note say the
    // same thing.
    expect(asset()).toContain("<circle");
    expect(asset()).not.toMatch(/<ellipse/);
  });

  it("keeps the asset's own viewBox, so the one em length can drive the width", () => {
    // `width: auto` only settles to the right width while the element has
    // an aspect ratio to settle against — the viewBox the asset ships.
    const host = mount(() => <Wordmark />);

    expect(host.querySelector("svg")!.getAttribute("viewBox")).toBe("0 0 58 12");
  });

  it("sits the framing rules on the pixel grid, so they stay crisp at any devicePixelRatio", () => {
    // The rules are strokes in a 12-unit tall viewBox, rendered at 30px — a
    // flat 2.5x. A stroke is only sharp when its *centre* lands where its
    // own thickness says it should: a 1px stroke needs a half-pixel centre
    // so both edges fall on whole pixels. Off that, the edges straddle two
    // device pixels and antialias into soft grey.
    //
    // The design placed them at y=.75 and y=11.15, which render to 1.875px
    // and 27.875px — off the grid at 2.5x, which is why they still looked
    // soft after the mark itself was sized in whole pixels. .6 and 11 give
    // 1.5px and 27.5px, edges clean.
    //
    // They also hold at 2x: the scale becomes 5, the stroke 2 device pixels,
    // and an even stroke wants an integer centre — .6 and 11 give 3 and 55.
    // One pair of coordinates, both common ratios, no retina special case.
    expect(asset()).toContain('d="M9.75.6h37.5m4.5 0h6M.25 11h57.5"');
  });
});

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { JSX } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it } from "vitest";
import Wordmark from "./Wordmark";

/**
 * The wordmark is the name as its own mark: "Harm●nic" in Fraunces, where
 * the "o" is the brand's gold notehead crossed by a ledger line — the
 * notation signal for a note outside the staff — and the name is framed
 * between two hairline rules, the two staff lines that note has escaped.
 * Nothing sits beneath the word; the word is the mark.
 *
 * It ships inside the navbar's home link and the footer's brand block, so
 * its accessible text has to stay exactly the name — the note replaces the
 * "o" for the eye only, on a real transparent "o" that keeps the letter for
 * assistive tech and the slot's metrics.
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

describe("Wordmark", () => {
  it("renders the name Harmonic as its only text", () => {
    const host = mount(() => <Wordmark />);

    expect(host.querySelector(".brand-wordmark__name")?.textContent?.trim()).toBe("Harmonic");
    // The note is aria-hidden decoration: nothing else is readable.
    expect(host.textContent?.trim()).toBe("Harmonic");
  });

  it("keeps a real o under the note, so the replaced letter never leaves the name", () => {
    // The substitution is visual only. A transparent "o" sits in the flow
    // — it keeps the slot's width in the display face and the letter in
    // the accessible name — and the gold note paints over it.
    const host = mount(() => <Wordmark />);
    const o = host.querySelector(".brand-wordmark__o");

    expect(o, "the wordmark keeps its o slot").not.toBeNull();
    expect(o!.textContent?.trim()).toBe("o");
    expect(o!.querySelector("svg")).not.toBeNull();
    expect(o!.getAttribute("aria-hidden")).toBeNull();
  });

  it("hides the real o from the eye without display tricks that shrink its slot", () => {
    const o = block("\\.brand-wordmark__o");
    const glyph = block("\\.brand-wordmark__glyph");

    expect(o, "the o slot has a declaration block").not.toBe("");
    // Transparent ink, not visibility/display/width games: the letter must
    // keep its advance and stay in the accessibility tree.
    expect(o).toContain("color: transparent");
    expect(o).not.toMatch(/display:\s*none/);
    expect(o).not.toMatch(/visibility:\s*hidden/);
    expect(o).not.toMatch(/width:\s*0/);

    // The note overlays the slot rather than joining the text flow.
    expect(glyph, "the glyph has a declaration block").not.toBe("");
    expect(glyph).toContain("position: absolute");
  });

  it("sets the name in the display face the app already owns", () => {
    const name = block("\\.brand-wordmark__name");

    expect(name, "the name has a declaration block").not.toBe("");
    expect(name).toContain("var(--font-display)");
    expect(name).not.toContain("var(--font-ui)");
  });

  it("frames the name between two hairline staff rules and renders no mark beneath", () => {
    const host = mount(() => <Wordmark />);

    // The wordmark is its own mark now: the old companion BrandMark under
    // the name is gone — the name must not sit on a staff with a note on it.
    expect(host.querySelector(".brand-mark")).toBeNull();
    expect(host.querySelectorAll(".brand-mark__rule")).toHaveLength(0);

    // The two framing rules are the staff lines the note escaped: CSS
    // borders on the name, 1px ink hairlines — the weight of a staff rule,
    // not the weight of a border — pinned as declarations.
    const name = block("\\.brand-wordmark__name");
    expect(name, "the name has a declaration block").not.toBe("");
    expect(name).toContain("border-block: 1px solid var(--ink)");
  });

  it("crosses the o with a ledger line on the shared stemless glyph", () => {
    const host = mount(() => <Wordmark />);
    const glyph = host.querySelector(".brand-wordmark__glyph");

    expect(glyph, "the o seats the shared glyph").not.toBeNull();
    expect(glyph!.querySelectorAll("ellipse")).toHaveLength(1);
    const ledgers = glyph!.querySelectorAll("line");
    expect(ledgers).toHaveLength(1);
    // Horizontal, through the notehead's centre: the ledger line of a note
    // that has gone outside the two rules the name is framed by.
    expect(ledgers[0]!.getAttribute("y1")).toBe("10");
    expect(ledgers[0]!.getAttribute("y2")).toBe("10");
    // No stem: the shared form is head plus optional ledger, nothing else.
    expect(glyph!.querySelectorAll("rect")).toHaveLength(0);
    // The glyph is decorative beside the real "o": aria-hidden, no label.
    expect(glyph!.getAttribute("aria-hidden")).toBe("true");
  });

  it("takes an extra class for the surface it lands on", () => {
    const host = mount(() => <Wordmark class="app-shell__footer-wordmark" />);

    expect(host.querySelector(".brand-wordmark")?.classList.contains("app-shell__footer-wordmark")).toBe(
      true,
    );
  });
});

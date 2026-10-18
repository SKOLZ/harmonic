import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { JSX } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it } from "vitest";
import Wordmark from "./Wordmark";

/**
 * The wordmark is the name on a line: "Harm●nic" in Fraunces, where the
 * "o" is the brand's gold note and the single-rule mark is the companion
 * below. It ships inside the navbar's home link and the footer's brand
 * block, so its accessible text has to stay exactly the name — the note
 * replaces the "o" for the eye only, on a real transparent "o" that keeps
 * the letter for assistive tech and the slot's metrics. The mark below it
 * is decoration and contributes nothing.
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
    // The note and the mark are aria-hidden decoration: nothing else is readable.
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

  it("composes the name with the single-rule mark carrying the gold note", () => {
    const host = mount(() => <Wordmark />);
    const mark = host.querySelector(".brand-mark");

    expect(mark).not.toBeNull();
    expect(mark!.querySelectorAll(".brand-mark__rule")).toHaveLength(1);
    expect(mark!.querySelectorAll(".brand-mark__glyph")).toHaveLength(1);
    expect(mark!.querySelectorAll("svg")).toHaveLength(1);
    expect(mark!.getAttribute("aria-hidden")).toBe("true");
  });

  it("takes an extra class for the surface it lands on", () => {
    const host = mount(() => <Wordmark class="app-shell__footer-wordmark" />);

    expect(host.querySelector(".brand-wordmark")?.classList.contains("app-shell__footer-wordmark")).toBe(
      true,
    );
  });
});

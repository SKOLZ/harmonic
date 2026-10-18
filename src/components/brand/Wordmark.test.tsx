import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { JSX } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it } from "vitest";
import Wordmark from "./Wordmark";

/**
 * The wordmark is the name resting on a line: "Harmonic" in Fraunces with
 * the single-rule mark as its companion. It ships inside the navbar's home
 * link and the footer's brand block, so its accessible text has to stay
 * exactly the name — the mark is decoration and contributes nothing to it.
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

describe("Wordmark", () => {
  it("renders the name Harmonic as its only text", () => {
    const host = mount(() => <Wordmark />);

    expect(host.querySelector(".brand-wordmark__name")?.textContent?.trim()).toBe("Harmonic");
    // The mark is aria-hidden decoration: nothing else is readable.
    expect(host.textContent?.trim()).toBe("Harmonic");
  });

  it("sets the name in the display face the app already owns", () => {
    const css = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");
    const name = css.match(/\.brand-wordmark__name\s*\{[^}]*\}/)?.[0] ?? "";

    expect(name, "the name has a declaration block").not.toBe("");
    expect(name).toContain("var(--font-display)");
    expect(name).not.toContain("var(--font-ui)");
  });

  it("composes the name with the single-rule mark, not the full staff", () => {
    const host = mount(() => <Wordmark />);
    const mark = host.querySelector(".brand-mark");

    expect(mark).not.toBeNull();
    expect(mark!.querySelectorAll(".brand-mark__rule")).toHaveLength(1);
    expect(mark!.querySelectorAll(".brand-mark__notehead")).toHaveLength(1);
    expect(mark!.getAttribute("aria-hidden")).toBe("true");
  });

  it("takes an extra class for the surface it lands on", () => {
    const host = mount(() => <Wordmark class="app-shell__footer-wordmark" />);

    expect(host.querySelector(".brand-wordmark")?.classList.contains("app-shell__footer-wordmark")).toBe(
      true,
    );
  });
});

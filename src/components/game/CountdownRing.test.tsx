import type { JSX } from "solid-js";
import { createSignal } from "solid-js";
import { render } from "solid-js/web";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QUESTION_TIME_MS } from "./timer";
import CountdownRing from "./CountdownRing";

/**
 * The countdown ring is a pure view of the shared countdown signal: the arc
 * geometry is the remaining-time fraction, the seconds label rides the same
 * signal, and the component schedules no clock of its own — one clock only.
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
  vi.useRealTimers();
});

function progressArc(host: HTMLElement): SVGElement | null {
  return host.querySelector(".game-shell__timer-ring-progress");
}

function arcOffset(host: HTMLElement): number | null {
  const arc = progressArc(host);
  return arc === null ? null : Number(arc.getAttribute("stroke-dashoffset"));
}

describe("CountdownRing", () => {
  it("renders the seconds label inside a ring: track circle plus shrinking progress arc", () => {
    const [remaining] = createSignal(QUESTION_TIME_MS);
    const host = mount(() => <CountdownRing remainingMs={remaining} />);

    // The number stays the primary cue.
    expect(host.querySelector(".game-shell__timer-value")?.textContent).toBe(
      `${QUESTION_TIME_MS / 1000}s`,
    );
    // Full duration: the arc is the complete circumference, offset zero.
    expect(host.querySelector(".game-shell__timer-ring-track")).not.toBeNull();
    const arc = progressArc(host)!;
    expect(arc.getAttribute("stroke-dasharray")).toBe("100");
    expect(arcOffset(host)).toBe(0);
  });

  it("consumes the arc by the same remaining-time fraction the label shows", () => {
    const [remaining, setRemaining] = createSignal(QUESTION_TIME_MS);
    const host = mount(() => <CountdownRing remainingMs={remaining} />);

    setRemaining(QUESTION_TIME_MS / 2);
    expect(host.querySelector(".game-shell__timer-value")?.textContent).toBe("10s");
    // Circumference 100: 50% of the ring left → offset 50.
    expect(arcOffset(host)).toBe(50);

    setRemaining(QUESTION_TIME_MS / 4);
    expect(host.querySelector(".game-shell__timer-value")?.textContent).toBe("5s");
    expect(arcOffset(host)).toBe(75);

    setRemaining(0);
    expect(arcOffset(host)).toBe(100);
  });

  it("introduces no clock of its own: the arc is driven only by the remainingMs it is given", () => {
    vi.useFakeTimers();
    const [remaining, setRemaining] = createSignal(QUESTION_TIME_MS);
    const host = mount(() => <CountdownRing remainingMs={remaining} />);

    // Mounting and ticking the signal schedules no interval or timeout here.
    expect(vi.getTimerCount()).toBe(0);
    setRemaining(QUESTION_TIME_MS / 2);
    expect(vi.getTimerCount()).toBe(0);
    expect(arcOffset(host)).toBe(50);
  });

  it("keeps the screen-reader contract: role=timer, aria-live=off, decorative ring hidden", () => {
    const [remaining] = createSignal(QUESTION_TIME_MS);
    const host = mount(() => <CountdownRing remainingMs={remaining} />);

    const timer = host.querySelector(".game-shell__timer")!;
    expect(timer.getAttribute("role")).toBe("timer");
    expect(timer.getAttribute("aria-live")).toBe("off");
    // The ring is decoration: assistive tech still reads only the seconds.
    expect(timer.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    expect(timer.textContent?.trim()).toBe(`${QUESTION_TIME_MS / 1000}s`);
  });
});

describe("CountdownRing: reduced motion", () => {
  it("degrades to a static full ring: the stylesheet hides the progress arc under prefers-reduced-motion", () => {
    const css = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");
    const media = css.match(/@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\}/);
    expect(media, "styles.css keeps a prefers-reduced-motion block").not.toBeNull();
    expect(media![1]).toContain(".game-shell__timer-ring-progress");
    expect(media![1]).toMatch(/display:\s*none/);
  });
});

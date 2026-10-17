import { createSignal, type JSX } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, describe, expect, it } from "vitest";
import { getLessonModule, registeredLessonIds } from "../../games/registry";
import { createRng } from "../../games/rng";
import type { PromptSpec, Round } from "../../lib/rounds/types";
import { PRACTICE_NOTES } from "../../lib/rounds/practice";
import { parseNote } from "../../lib/theory";
import GameShell from "../game/GameShell";
import StaffPrompt from "../prompts/StaffPrompt";
import Staff from "./Staff";
import { GLYPH_INK } from "./glyphInk";

/**
 * T2 — reproduction harness for the two defects real testing reported:
 * "the staff and the treble clef were cut at the bottom" and "the stem of a
 * note was detached from the circle part of it".
 *
 * The oracle is deliberately independent of Staff's own bookkeeping: it reads
 * back what VexFlow wrote into the DOM. `SVGContext` creates exactly three
 * drawable element kinds — `path` (stave lines, ledger lines, stems), `rect`
 * (barlines and the invisible per-note bounds) and `text` (clef, notehead and
 * accidental glyphs) — and the `viewBox`/`height` pair says where the viewport
 * cuts. Anything whose geometry is not a full staff space inside that window
 * is clipped, which is what a learner sees.
 */

/** VexFlow's `Tables.STAVE_LINE_DISTANCE` — one staff space. */
const STAFF_SPACE = 10;

const cleanups: Array<() => void> = [];

function mount(ui: () => JSX.Element): HTMLDivElement {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const dispose = render(ui, host);
  cleanups.push(() => {
    dispose();
    host.remove();
  });
  return host;
}

afterEach(() => {
  while (cleanups.length > 0) cleanups.pop()?.();
  document.body.replaceChildren();
});

async function waitFor(check: () => boolean, label: string): Promise<void> {
  const deadline = Date.now() + 2000;
  while (!check()) {
    if (Date.now() > deadline) {
      throw new Error(`waitFor timed out: ${label}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

type StaffPromptSpec = Extract<PromptSpec, { kind: "staff" }>;

/**
 * Every distinct staff prompt the registered lesson pools can draw. Twelve
 * seeds per lesson cover each pool several times over (`sampleRounds` draws
 * 12 of ~22, so a handful of draws visits nearly every member); the prompts
 * are de-duplicated so a pool that repeats a shape renders once.
 */
function lessonStaffPrompts(): StaffPromptSpec[] {
  const seen = new Map<string, StaffPromptSpec>();
  for (const id of registeredLessonIds()) {
    const module = getLessonModule(id);
    for (let seed = 1; seed <= 12; seed += 1) {
      for (const round of module.generateRounds(createRng(seed))) {
        const prompt = round.prompt;
        if (prompt.kind !== "staff") continue;
        const key = JSON.stringify(prompt);
        if (!seen.has(key)) seen.set(key, prompt);
      }
    }
  }
  return [...seen.values()];
}

function svgOf(host: HTMLElement): SVGElement {
  const svg = host.querySelector("svg");
  if (svg === null) throw new Error("no SVG was rendered");
  return svg;
}

/**
 * Every distinct staff prompt the endless-practice pool can draw — one per
 * `PRACTICE_NOTES` entry (T7). The lesson sweep never covered this pool: it
 * spans C3–C6 across both clefs and includes sharps, exercising engraving
 * shapes the lesson sweep has never seen.
 */
function practiceStaffPrompts(): StaffPromptSpec[] {
  const seen = new Map<string, StaffPromptSpec>();
  for (const note of PRACTICE_NOTES) {
    const prompt: StaffPromptSpec = {
      kind: "staff",
      clef: note.clef,
      notes: [note.pitch],
    };
    const key = JSON.stringify(prompt);
    if (!seen.has(key)) seen.set(key, prompt);
  }
  return [...seen.values()];
}

/**
 * Vertical coordinates VexFlow wrote. Path `d` data is read by pairing the
 * numbers: `SVGContext` emits only absolute uppercase commands, each with an
 * even number of coordinates. A relative (lower-case) command would silently
 * mis-pair, so it is rejected loudly instead.
 */
function pathYs(d: string): number[] {
  if (/[a-z]/.test(d)) {
    throw new Error(`unexpected relative path command: ${d}`);
  }
  const numbers = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  const ys: number[] = [];
  for (let i = 1; i < numbers.length; i += 2) ys.push(numbers[i]!);
  return ys;
}

function pathXs(d: string): number[] {
  if (/[a-z]/.test(d)) {
    throw new Error(`unexpected relative path command: ${d}`);
  }
  const numbers = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  const xs: number[] = [];
  for (let i = 0; i < numbers.length; i += 2) xs.push(numbers[i]!);
  return xs;
}

interface Extent {
  min: number;
  max: number;
}

/** Vertical extent of every element drawn into `svg`. */
function extent(svg: SVGElement): Extent {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  const track = (value: number): void => {
    if (Number.isFinite(value)) {
      min = Math.min(min, value);
      max = Math.max(max, value);
    }
  };
  for (const path of svg.querySelectorAll("path")) {
    for (const y of pathYs(path.getAttribute("d") ?? "")) track(y);
  }
  for (const rect of svg.querySelectorAll("rect")) {
    const y = Number(rect.getAttribute("y"));
    track(y);
    track(y + Number(rect.getAttribute("height")));
  }
  for (const text of svg.querySelectorAll("text")) {
    // A text glyph's `y` is its alphabetic baseline, not its ink box (T7).
    // Measure the true ink box so the sweep catches a clef's loop poking above
    // the viewBox even when the baseline itself is comfortably inside.
    const ink = textGlyphInk(text);
    track(ink.top);
    track(ink.bottom);
  }
  return { min, max };
}

/**
 * The true ink extent of one `<text>` glyph, in absolute SVG y.
 *
 * The glyph sits on its alphabetic baseline (`y`); its ink box is the
 * glyph-ink table's staff-space offsets from that baseline, scaled by the
 * staff space. An unlisted codepoint falls back to its baseline so a new glyph
 * degrades to the old measurement instead of crashing.
 */
function textGlyphInk(text: Element): { top: number; bottom: number } {
  const baseline = Number(text.getAttribute("y"));
  const codepoint = [...(text.textContent ?? "")][0]?.codePointAt(0);
  const ink = codepoint === undefined ? undefined : GLYPH_INK[codepoint];
  if (ink === undefined) {
    return { top: baseline, bottom: baseline };
  }
  return {
    top: baseline + ink.top * STAFF_SPACE,
    bottom: baseline + ink.bottom * STAFF_SPACE,
  };
}

interface ViewportWindow {
  top: number;
  bottom: number;
  height: number;
}

/** The visible window: the `viewBox` the SVG clips its content to. */
function viewport(svg: SVGElement): ViewportWindow {
  const parts = (svg.getAttribute("viewBox") ?? "").split(/[\s,]+/).map(Number);
  expect(parts).toHaveLength(4);
  const [, top, , height] = parts as [number, number, number, number];
  return { top, bottom: top + height, height };
}

function renderStaffPrompt(prompt: StaffPromptSpec): HTMLElement {
  return mount(() => <StaffPrompt prompt={prompt} />);
}

/**
 * Check that every engraved note's stem still touches its own notehead: one
 * stem endpoint must land exactly on a notehead anchor, and the stem must run
 * alongside that notehead horizontally rather than beside it. Accidental
 * glyphs share the notehead group but are not anchors, so only notehead
 * glyphs (U+E0A4 …) are considered.
 */
function attachmentFailures(svg: SVGElement): string[] {
  const failures: string[] = [];
  for (const group of svg.querySelectorAll("g.vf-stavenote")) {
    const heads = [...group.querySelectorAll("g.vf-notehead text")].filter((glyph) =>
      [...(glyph.textContent ?? "")].some((char) => {
        const code = char.codePointAt(0) ?? 0;
        return code >= 0xe0a0 && code <= 0xe0ff;
      }),
    );
    const stemPath = group.querySelector("g.vf-stem path")?.getAttribute("d") ?? null;
    // Whole notes and rests have no stem; nothing to attach.
    if (stemPath === null) continue;
    if (heads.length === 0) {
      failures.push("stem without any notehead");
      continue;
    }
    const headYs = heads.map((head) => Number(head.getAttribute("y")));
    const headXs = heads.map((head) => Number(head.getAttribute("x")));
    const stemYs = pathYs(stemPath);
    const stemX = pathXs(stemPath)[0]!;
    if (!stemYs.some((y) => headYs.includes(y))) {
      failures.push(`no stem endpoint (${stemYs.join("/")}) on a notehead (${headYs.join("/")})`);
    }
    if (!headXs.some((x) => Math.abs(x - stemX) < STAFF_SPACE)) {
      failures.push(`stem x=${stemX} not within a staff space of any notehead (${headXs.join("/")})`);
    }
  }
  return failures;
}

const shapes: Array<{ name: string; prompt: StaffPromptSpec }> = [
  { name: "sequential measure", prompt: { kind: "staff", clef: "treble", notes: ["C5", "D5", "E5", "F5"], duration: "q" } },
  { name: "ledger-line note", prompt: { kind: "staff", clef: "treble", notes: ["C4"], duration: "q" } },
  { name: "chord with an upward stem", prompt: { kind: "staff", clef: "treble", notes: ["C4", "E4", "G4"], duration: "q", simultaneous: true } },
  { name: "chord with a downward stem", prompt: { kind: "staff", clef: "treble", notes: ["C5", "E5", "G5"], duration: "q", simultaneous: true } },
  { name: "bass measure", prompt: { kind: "staff", clef: "bass", notes: ["G2", "B2", "D3"], duration: "q" } },
  { name: "dense eight-note scale", prompt: { kind: "staff", clef: "treble", notes: ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"], duration: "q" } },
];

describe("Staff viewport — bottom clipping", () => {
  it("keeps every drawn element a full staff space inside the viewport for every lesson pool staff prompt", () => {
    const failures: string[] = [];
    for (const prompt of lessonStaffPrompts()) {
      const host = renderStaffPrompt(prompt);
      const svg = svgOf(host);
      const win = viewport(svg);
      const drawn = extent(svg);
      const svgHeight = Number(svg.getAttribute("height"));
      const container = host.querySelector(".prompt--staff > div") as HTMLElement | null;
      const containerHeight = container?.style.height ?? "";
      // The SVG height attribute is written from the same number as the
      // viewBox, so it must match exactly. The container's CSS height is
      // serialized (happy-dom rounds to 2 decimals), so it is compared within
      // float tolerance.
      if (svgHeight !== win.height) {
        failures.push(`${JSON.stringify(prompt.notes)}: svg height ${svgHeight} ≠ viewBox height ${win.height}`);
      }
      if (Math.abs(Number.parseFloat(containerHeight) - win.height) > 1e-6) {
        failures.push(`${JSON.stringify(prompt.notes)}: container height ${containerHeight} ≠ viewport ${win.height}px`);
      }
      if (drawn.max + STAFF_SPACE > win.bottom) {
        failures.push(
          `${JSON.stringify(prompt.notes)} ${prompt.clef}${prompt.simultaneous ? " chord" : ""}: bottom ` +
            `${drawn.max} overflows the window (top ${win.top}, bottom ${win.bottom}) by ` +
            `${drawn.max + STAFF_SPACE - win.bottom}px`,
        );
      }
      if (drawn.min - STAFF_SPACE < win.top) {
        failures.push(
          `${JSON.stringify(prompt.notes)} ${prompt.clef}: top ${drawn.min} overflows the window ` +
            `(top ${win.top}) by ${win.top - (drawn.min - STAFF_SPACE)}px`,
        );
      }
    }
    expect(failures.slice(0, 10)).toEqual([]);
    expect(failures).toHaveLength(0);
  });

  it("keeps every drawn element a full staff space inside the viewport for every practice-pool staff prompt", () => {
    const failures: string[] = [];
    for (const prompt of practiceStaffPrompts()) {
      const host = renderStaffPrompt(prompt);
      const svg = svgOf(host);
      const win = viewport(svg);
      const drawn = extent(svg);
      const svgHeight = Number(svg.getAttribute("height"));
      const container = host.querySelector(".prompt--staff > div") as HTMLElement | null;
      const containerHeight = container?.style.height ?? "";
      // The SVG height attribute is written from the same number as the
      // viewBox, so it must match exactly. The container's CSS height is
      // serialized (happy-dom rounds to 2 decimals), so it is compared within
      // float tolerance.
      if (svgHeight !== win.height) {
        failures.push(`${JSON.stringify(prompt.notes)}: svg height ${svgHeight} ≠ viewBox height ${win.height}`);
      }
      if (Math.abs(Number.parseFloat(containerHeight) - win.height) > 1e-6) {
        failures.push(`${JSON.stringify(prompt.notes)}: container height ${containerHeight} ≠ viewport ${win.height}px`);
      }
      if (drawn.max + STAFF_SPACE > win.bottom) {
        failures.push(
          `${JSON.stringify(prompt.notes)} ${prompt.clef}: bottom ` +
            `${drawn.max} overflows the window (top ${win.top}, bottom ${win.bottom}) by ` +
            `${drawn.max + STAFF_SPACE - win.bottom}px`,
        );
      }
      if (drawn.min - STAFF_SPACE < win.top) {
        failures.push(
          `${JSON.stringify(prompt.notes)} ${prompt.clef}: top ${drawn.min} overflows the window ` +
            `(top ${win.top}) by ${win.top - (drawn.min - STAFF_SPACE)}px`,
        );
      }
      for (const failure of attachmentFailures(svg)) {
        failures.push(`${JSON.stringify(prompt.notes)} ${prompt.clef}: ${failure}`);
      }
    }
    expect(failures.slice(0, 10)).toEqual([]);
    expect(failures).toHaveLength(0);
  });

  it("keeps the stave's five lines inside the viewport", () => {
    const host = renderStaffPrompt({ kind: "staff", clef: "treble", notes: ["C4"] });
    const svg = svgOf(host);
    const win = viewport(svg);
    const paths = [...svg.querySelectorAll("g.vf-stave path")];
    // Each line is one `M x y L x y` path: two identical y values per line.
    expect(paths).toHaveLength(5);
    const lines = paths.map((path) => new Set(pathYs(path.getAttribute("d") ?? "")));
    for (const ys of lines) expect(ys.size).toBe(1);
    const bottomLine = Math.max(...paths.map((path) => Math.max(...pathYs(path.getAttribute("d") ?? ""))));
    expect(bottomLine + STAFF_SPACE).toBeLessThanOrEqual(win.bottom);
  });
});

describe("Staff viewport — detached note stems", () => {
  it("keeps a ledger-line notehead inside the viewport so its stem stays attached to a visible circle", () => {
    const host = renderStaffPrompt({ kind: "staff", clef: "treble", notes: ["C4"], duration: "q" });
    const svg = svgOf(host);
    const win = viewport(svg);
    const group = svg.querySelector("g.vf-stavenote");
    expect(group).not.toBeNull();
    const heads = [...group!.querySelectorAll("g.vf-notehead text")];
    const head = heads.find((glyph) => [...(glyph.textContent ?? "")].some((char) => char.codePointAt(0) === 0xe0a4));
    expect(head).toBeDefined();
    const stem = group!.querySelector("g.vf-stem path");
    expect(head).not.toBeNull();
    expect(stem).not.toBeNull();
    const headY = Number(head!.getAttribute("y"));
    const stemYs = pathYs(stem!.getAttribute("d") ?? "");
    // VexFlow lands a stem endpoint exactly on the notehead's anchor, so the
    // geometry says "attached" — the learner only sees that attachment while
    // the anchor itself is inside the viewport the SVG clips to.
    expect(stemYs).toContain(headY);
    expect(headY + STAFF_SPACE).toBeLessThanOrEqual(win.bottom);
  });

  it("engraves an unclipped, attached staff through GameShell's lazy StaffPrompt boundary", async () => {
    const round: Round = {
      id: "t2-lazy",
      prompt: { kind: "staff", clef: "treble", notes: ["C4", "Eb4", "G4"] },
      answer: { kind: "choices", options: ["A", "B", "C"], correctIndex: 0 },
      rule: "Rule for t2-lazy.",
    };
    const host = mount(() => (
      <GameShell lessonId="10" lessonTitle="T2 lazy staff" rounds={[round]} />
    ));
    await waitFor(() => host.querySelector("svg") !== null, "staff svg");
    const svg = svgOf(host);
    const win = viewport(svg);
    const drawn = extent(svg);
    expect(drawn.max + STAFF_SPACE).toBeLessThanOrEqual(win.bottom);
    expect(drawn.min - STAFF_SPACE).toBeGreaterThanOrEqual(win.top);
    expect(attachmentFailures(svg)).toEqual([]);
  });
});

describe("Staff stem attachment — candidate causes ruled out", () => {
  it("attaches every stem endpoint to one of its own noteheads in every engraving shape", () => {
    const failures: string[] = [];
    for (const { name, prompt } of shapes) {
      const svg = svgOf(renderStaffPrompt(prompt));
      for (const failure of attachmentFailures(svg)) failures.push(`${name}: ${failure}`);
    }
    expect(failures).toEqual([]);
  });

  it("lays sequential noteheads at least a staff space apart, so the formatter is not compressing the measure", () => {
    const failures: string[] = [];
    for (const prompt of lessonStaffPrompts()) {
      if (prompt.simultaneous === true) continue;
      const svg = svgOf(renderStaffPrompt(prompt));
      // A notehead group can hold an accidental glyph next to the notehead
      // itself (U+E0A4); only the notehead anchors horizontal spacing.
      const heads = [...svg.querySelectorAll("g.vf-stavenote g.vf-notehead text")]
        .filter((head) => [...(head.textContent ?? "")].some((char) => char.codePointAt(0) === 0xe0a4))
        .map((head) => Number(head.getAttribute("x")));
      for (let i = 1; i < heads.length; i += 1) {
        const gap = heads[i]! - heads[i - 1]!;
        if (gap < STAFF_SPACE) {
          failures.push(`${JSON.stringify(prompt.notes)}: noteheads ${i - 1}/${i} only ${gap}px apart`);
        }
      }
    }
    expect(failures.slice(0, 10)).toEqual([]);
    expect(failures).toHaveLength(0);
  });

  it("keeps exactly one SVG with attached stems when props change mid-update", () => {
    const [notes, setNotes] = createSignal([parseNote("C4")]);
    const host = mount(() => <Staff notes={notes()} />);
    expect(attachmentFailures(svgOf(host))).toEqual([]);

    setNotes([parseNote("C5"), parseNote("E5")]);

    expect(host.querySelectorAll("svg")).toHaveLength(1);
    expect(attachmentFailures(svgOf(host))).toEqual([]);
  });
});

import { createEffect, mergeProps } from "solid-js";
import {
  Accidental,
  Formatter,
  Renderer,
  Stave,
  StaveNote,
  Voice,
} from "vexflow";
import {
  buildNotationSpec,
  durationToVoiceTime,
  type Clef,
  type NotationSpec,
} from "../../lib/notation/spec";
import type { Note } from "../../lib/theory";
import { GLYPH_INK } from "./glyphInk";

export interface StaffProps {
  notes: Note[];
  clef?: Clef;
  /** Omit to draw without a key signature. */
  keySignature?: Note;
  /** VexFlow duration code, e.g. `q`. */
  duration?: string;
  /**
   * Engrave `notes` as ONE stacked chord instead of one note per slot.
   * Absent/false keeps today's sequential behaviour (a measure or melodic
   * line); true means the notes are simultaneous and share a chord head.
   */
  simultaneous?: boolean;
  width?: number;
  height?: number;
  /** Called with the container div once it is created (sizing, measurement). */
  ref?: (el: HTMLDivElement) => void;
}

const DEFAULT_WIDTH = 400;
const DEFAULT_HEIGHT = 120;
const STAVE_MARGIN_X = 10;
const STAVE_Y = 40;
/** One staff space (VexFlow's STAVE_LINE_DISTANCE) of breathing room. */
const STAFF_SPACE = 10;

/**
 * vexflow's two bundled text faces, at any size: `document.fonts.check`/
 * `load` match on family, and canvas `measureText` resolves them at whatever
 * size the engraving asks for.
 *
 * Both matter because VexFlow measures glyphs (clefs, key signatures,
 * noteheads) with canvas text metrics WHILE it lays out. Drawing before the
 * faces finish loading bakes fallback-metric geometry into the SVG — most
 * visibly a stem path whose x no longer lines up with the notehead glyph,
 * which the browser repaints in place once Bravura arrives but the stem path
 * cannot follow. The next full redraw (e.g. the practice timer expiring) is
 * what "fixes" the picture, so the first draw must wait for the faces.
 */
const MUSIC_FONT_FACES = ["12px Bravura", "12px Academico"];

/**
 * Upper bound on waiting for the faces before engraving anyway. They ship
 * inside the bundle as data URLs, so this is pure local decode time; the
 * timeout only exists so a pathological font environment degrades to
 * fallback metrics (the old behaviour) instead of a blank staff.
 */
const FONT_WAIT_TIMEOUT_MS = 2000;

/** The subset of FontFaceSet Staff consults before engraving. */
interface FontFaceSetLike {
  check(font: string): boolean;
  load(font: string): Promise<unknown>;
}

function musicFontFaceSet(): FontFaceSetLike | undefined {
  return (document as { fonts?: FontFaceSetLike }).fonts;
}

/**
 * True when engraving can run synchronously: either the environment has no
 * FontFace set at all (happy-dom in tests, where vexflow's own font loading
 * is a no-op) or the bundled music faces are already resolved.
 */
function musicFontsReady(): boolean {
  const fonts = musicFontFaceSet();
  if (fonts === undefined) return true;
  return MUSIC_FONT_FACES.every((face) => fonts.check(face));
}

/** Wait (bounded) for the bundled faces. Never rejects. */
function whenMusicFontsReady(): Promise<void> {
  const fonts = musicFontFaceSet();
  if (fonts === undefined || musicFontsReady()) return Promise.resolve();
  const loads = Promise.all(
    MUSIC_FONT_FACES.map((face) => fonts.load(face).catch(() => undefined)),
  );
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, FONT_WAIT_TIMEOUT_MS);
    void loads.then(() => {
      clearTimeout(timer);
      resolve();
    });
  });
}

export default function Staff(props: StaffProps) {
  let container!: HTMLDivElement;

  // Defaults first: mergeProps resolves from the last source backwards, so
  // props (second) must win over the defaults (first) when they are defined.
  const resolved = mergeProps(
    {
      clef: "treble" as Clef,
      duration: "q",
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
    },
    props,
  );

  // Monotonic draw ticket: while a font-deferred draw waits for the music
  // faces, a props change starts a newer ticket and the waiting draw must not
  // apply its stale spec over the newer one.
  let drawSeq = 0;

  createEffect(() => {
    const spec = buildNotationSpec({
      notes: resolved.notes,
      clef: resolved.clef,
      keySignature: resolved.keySignature,
      duration: resolved.duration,
      simultaneous: resolved.simultaneous,
    });
    const width = resolved.width;
    const height = resolved.height;
    const seq = ++drawSeq;
    if (musicFontsReady()) {
      drawStaff(container, spec, width, height);
      return;
    }
    void whenMusicFontsReady().then(() => {
      if (seq !== drawSeq) return;
      drawStaff(container, spec, width, height);
    });
  });

  return (
    <div
      ref={(node) => {
        container = node;
        props.ref?.(node);
      }}
      // The height prop is a MINIMUM canvas; the engraved content can push the
      // real box taller (see drawStaff). Solid owns the width and the initial
      // height; drawStaff overrides height to fit once the glyphs exist.
      style={{ width: `${resolved.width}px`, height: `${resolved.height}px` }}
    />
  );
}

/** One full redraw: clear the container, then rebuild the VexFlow scene. */
function drawStaff(
  container: HTMLDivElement,
  spec: NotationSpec,
  width: number,
  height: number,
): void {
  container.replaceChildren();

  const renderer = new Renderer(container, Renderer.Backends.SVG);
  renderer.resize(width, height);
  const context = renderer.getContext();

  const stave = new Stave(STAVE_MARGIN_X, STAVE_Y, width - 2 * STAVE_MARGIN_X);
  stave.addClef(spec.clef);
  if (spec.keySignature !== null) {
    stave.addKeySignature(spec.keySignature);
  }
  stave.setContext(context).draw();

  // A sequential spec engraves one StaveNote per slot; a simultaneous spec
  // engraves a single StaveNote whose keys hold every tone, so a triad is one
  // stacked chord head instead of three consecutive quarters. VexFlow 5 indexes
  // modifiers by tone within the chord: `addModifier(modifier, i)` sets the
  // modifier's index, `Accidental.format` reads `note.getKeyProps()[i]` to place
  // the glyph on that tone's stave line, and `StaveNote.drawModifiers` draws it
  // only while its own notehead is being drawn — so every altered tone in a
  // stack needs its own Accidental at its own index.
  const staveNotes = spec.simultaneous
    ? [buildStaveNote(spec, spec.keys, spec.accidentals)]
    : spec.keys.map((key, index) =>
        buildStaveNote(spec, [key], [spec.accidentals[index]]),
      );

  // The voice counts engraved StaveNote groups, not tones: a chord occupies one
  // duration, a sequence occupies one slot each, and both fill a STRICT voice.
  const { numBeats, beatValue } = durationToVoiceTime(
    spec.duration,
    staveNotes.length,
  );
  const voice = new Voice({ numBeats, beatValue });
  voice.addTickables(staveNotes);
  new Formatter()
    .joinVoices([voice])
    .format([voice], stave.getNoteEndX() - stave.getNoteStartX());
  voice.draw(context, stave);

  // The scene is on the page but the SVG viewport is still the fixed canvas
  // renderer.resize() carved (0 0 width height). Anything outside it — the
  // stave's bottom line, a barline foot, a ledger notehead with its stem — is
  // clipped, which is the "staff cut off at the bottom" / "detached stem" bug.
  // Frame the viewport on the content that actually got drawn.
  fitViewportToContent(container, width, height);
}

/**
 * Vertical extent of everything VexFlow engraved, read back from the live SVG.
 *
 * The measurement sources are the same three drawable kinds `SVGContext`
 * produces — `path` (stave/ledger lines, stems), `rect` (barlines and the
 * invisible per-note bounds), and `text` (clef, notehead, accidental glyphs) —
 * so the viewport is framed on exactly the geometry a learner sees. VexFlow
 * writes only absolute uppercase path commands with an even coordinate count,
 * so pairing the numbers recovers the y values.
 *
 * The invisible bounds rects already span each stem top-to-bottom (a stem's
 * rect covers its full run), so they cannot under-report; and a stem rect's
 * endpoints land on the notehead anchors, so they cannot over-report past the
 * glyphs either. Reading paths + rects + text therefore tracks the true ink.
 */
function contentExtentY(svg: SVGSVGElement): { min: number; max: number } {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  const track = (value: number): void => {
    if (Number.isFinite(value)) {
      min = Math.min(min, value);
      max = Math.max(max, value);
    }
  };

  for (const path of svg.querySelectorAll("path")) {
    const numbers = (path.getAttribute("d")?.match(/-?\d+(?:\.\d+)?/g) ?? []).map(
      Number,
    );
    for (let i = 1; i < numbers.length; i += 2) track(numbers[i]!);
  }
  for (const rect of svg.querySelectorAll("rect")) {
    const y = Number(rect.getAttribute("y"));
    const h = Number(rect.getAttribute("height"));
    track(y);
    track(y + h);
  }
  for (const text of svg.querySelectorAll("text")) {
    // A text glyph's `y` is its alphabetic baseline, not its ink box (T7). A
    // treble clef's ink reaches ~4.4 staff spaces above its baseline, so
    // tracking the baseline alone under-reports the top and the viewBox clips
    // the clef's upper loop. Measure the true ink box instead.
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

/**
 * Grow the SVG viewport (and its container box) so the drawn content keeps a
 * full staff space of breathing room on every side, instead of clipping to a
 * fixed canvas.
 *
 * `height` stays the MINIMUM box: a caller that asks for 120px and draws a
 * small treble measure still gets 120px; a caller that draws a ledger-line C4
 * (whose notehead and stem reach y=130) gets a taller box so nothing is cut.
 * The `viewBox` height, the SVG's `height` attribute and inline style, and
 * the container's CSS height are kept identical so layout and clipping agree.
 */
function fitViewportToContent(
  container: HTMLDivElement,
  width: number,
  minHeight: number,
): void {
  const svg = container.querySelector("svg");
  if (svg === null) return;

  const { min, max } = contentExtentY(svg);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return;

  const top = min - STAFF_SPACE;
  const height = Math.max(minHeight, max + STAFF_SPACE - top);

  svg.setAttribute("viewBox", `0 ${top} ${width} ${height}`);
  svg.setAttribute("height", String(height));
  svg.setAttribute("width", String(width));
  // renderer.resize() left an inline CSS width/height on the element, and CSS
  // wins over the height attribute. Keep the inline pair in step with the
  // fitted box, or a content-driven height (ledger lines pushing past the
  // minimum) would render at the stale canvas height and be scaled down by
  // preserveAspectRatio.
  svg.style.width = `${width}px`;
  svg.style.height = `${height}px`;
  container.style.height = `${height}px`;
}

/**
 * One StaveNote from parallel `keys`/`accidentals` arrays: a single tone in
 * sequence (its accidental at index 0) or the whole stack in a chord (each
 * accidental at its tone's index). Naturals carry no accidental glyph; only
 * altered tones get one — in VexFlow 5 accidentals are modifiers, so
 * `addAccidental` no longer exists.
 */
function buildStaveNote(
  spec: NotationSpec,
  keys: string[],
  accidentals: (string | null)[],
): StaveNote {
  const staveNote = new StaveNote({
    keys,
    duration: spec.duration,
    clef: spec.clef,
  });
  accidentals.forEach((accidental, index) => {
    if (accidental !== null) {
      staveNote.addModifier(new Accidental(accidental), index);
    }
  });
  return staveNote;
}

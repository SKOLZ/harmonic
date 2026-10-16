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

  createEffect(() => {
    const spec = buildNotationSpec({
      notes: resolved.notes,
      clef: resolved.clef,
      keySignature: resolved.keySignature,
      duration: resolved.duration,
      simultaneous: resolved.simultaneous,
    });
    drawStaff(container, spec, resolved.width, resolved.height);
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
    track(Number(text.getAttribute("y")));
  }

  return { min, max };
}

/**
 * Grow the SVG viewport (and its container box) so the drawn content keeps a
 * full staff space of breathing room on every side, instead of clipping to a
 * fixed canvas.
 *
 * `height` stays the MINIMUM box: a caller that asks for 120px and draws a
 * small treble measure still gets 120px; a caller that draws a ledger-line C4
 * (whose notehead and stem reach y=130) gets a taller box so nothing is cut.
 * The `viewBox` height, the SVG's `height` attribute, and the container's CSS
 * height are kept identical so layout and clipping agree.
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

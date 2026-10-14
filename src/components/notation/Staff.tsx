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
  width?: number;
  height?: number;
  /** Called with the container div once it is created (sizing, measurement). */
  ref?: (el: HTMLDivElement) => void;
}

const DEFAULT_WIDTH = 400;
const DEFAULT_HEIGHT = 120;
const STAVE_MARGIN_X = 10;
const STAVE_Y = 40;

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
    });
    drawStaff(container, spec, resolved.width, resolved.height);
  });

  return (
    <div
      ref={(node) => {
        container = node;
        props.ref?.(node);
      }}
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

  const staveNotes = spec.keys.map((key, index) => {
    const staveNote = new StaveNote({
      keys: [key],
      duration: spec.duration,
      clef: spec.clef,
    });
    // Naturals carry no accidental glyph; only altered notes get one.
    const accidental = spec.accidentals[index];
    if (accidental !== null) {
      // VexFlow 5: accidentals are modifiers (addAccidental no longer exists).
      staveNote.addModifier(new Accidental(accidental), 0);
    }
    return staveNote;
  });

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
}

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

/**
 * Theory-output → frequency adapters. Thin by design: these functions only
 * turn the pure theory layer's notes into equal-temperament frequencies —
 * no spelling, interval or scale logic lives here.
 */

import {
  buildScale,
  midiNumber,
  parseNote,
  spellInterval,
  type IntervalQuality,
  type Note,
  type ScaleType,
} from "../theory";
import {
  DEFAULT_A4_HZ,
  noteToFrequency,
} from "./frequency";

/**
 * Octave assumed for roots written without one: `scaleFrequencies("C", …)`
 * starts on middle C. Explicit octaves (`"A3"`, `"F#2"`) are honoured as-is.
 */
export const DEFAULT_ROOT_OCTAVE = 4;

/** Parses `name`, filling in {@link DEFAULT_ROOT_OCTAVE} when the octave is absent. */
function absoluteNote(name: string): Note {
  const note = parseNote(name);
  return note.octave === undefined ? { ...note, octave: DEFAULT_ROOT_OCTAVE } : note;
}

/** Frequencies of the seven scale degrees, ascending, from {@link buildScale}. */
export function scaleFrequencies(
  root: string,
  scaleType: ScaleType,
  a4Hz: number = DEFAULT_A4_HZ,
): number[] {
  const notes = buildScale(absoluteNote(root), scaleType);
  return notes.map((note) => noteToFrequency(midiNumber(note), a4Hz));
}

/**
 * The two notes of `specificQuality genericNumber` above `root` as
 * frequencies: [lower, upper]. An unknown quality string is rejected by
 * the theory layer with "Unknown interval quality".
 */
export function intervalFrequencies(
  root: string,
  genericNumber: number,
  specificQuality: string,
  a4Hz: number = DEFAULT_A4_HZ,
): [number, number] {
  const lower = absoluteNote(root);
  const upper = spellInterval(lower, genericNumber, specificQuality as IntervalQuality);
  return [noteToFrequency(midiNumber(lower), a4Hz), noteToFrequency(midiNumber(upper), a4Hz)];
}

/**
 * Frequencies for a list of scientific note names, in order. Octave-less
 * names are played at {@link DEFAULT_ROOT_OCTAVE}; pass explicit octaves
 * (e.g. `"C5"`) to voice the chord elsewhere.
 */
export function chordFrequencies(names: string[], a4Hz: number = DEFAULT_A4_HZ): number[] {
  return names.map((name) => noteToFrequency(midiNumber(absoluteNote(name)), a4Hz));
}

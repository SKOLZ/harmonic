/**
 * Piano keyboard geometry and note-name matching. Pure functions — no DOM,
 * no Solid, no audio. The component in `src/components/keyboard` renders
 * whatever this module computes.
 *
 * Canonical spellings: one physical key, one name. White keys are naturals
 * (`C4`, `F5`); every black key is spelled as the sharp of the white key
 * below it (`C#4`, never `Db4`), which is also how its position on the
 * keyboard is derived. Prompts may still supply flats, unicode accidentals
 * or spelled-out names — {@link normalizeNoteName} and
 * {@link matchesHighlight} reconcile those spellings by pitch.
 */
import {
  letterAt,
  letterIndex,
  midiNumber,
  parseNote,
  pitchClass,
  scientificName,
  type Letter,
} from "../theory";

/** One rendered key: identity, canonical spelling, and percent geometry. */
export interface KeyGeometry {
  /** MIDI note number with C4 = 60. */
  midi: number;
  /** Canonical ASCII scientific name, e.g. `C#4` (sharps for black keys). */
  noteName: string;
  isBlack: boolean;
  /** Left edge as a percent of the keyboard width (white keys start at 0). */
  leftPct: number;
  /** Width as a percent of the keyboard width; white keys tile to exactly 100. */
  widthPct: number;
  /** Spoken form for `aria-label`, e.g. `C sharp 4`. */
  ariaLabel: string;
}

export interface KeyboardLayoutOptions {
  /** Inclusive lower bound; must be a natural (white) key with an octave. */
  startNote?: string;
  /** Inclusive upper bound; must be a natural (white) key above `startNote`. */
  endNote?: string;
}

/** Default range: two octaves, C4 (middle C) through C6. */
export const DEFAULT_START_NOTE = "C4";
export const DEFAULT_END_NOTE = "C6";

/** Black keys are this fraction of a white key's width. */
const BLACK_KEY_WIDTH_RATIO = 0.6;

const ACCIDENTAL_WORDS: Readonly<Record<number, string>> = {
  [-2]: "double flat",
  [-1]: "flat",
  0: "",
  1: "sharp",
  2: "double sharp",
};

/**
 * Canonical spelling used for comparisons. Accepts, case-insensitively:
 *
 * - ASCII scientific notation: `C4`, `Bb4`, `F#4`, `Bbb`, `C-1`
 * - Unicode accidentals: `B♭4`, `F♯4`, `E𝄫4`, `F𝄪4`, `C♮4`
 * - Spelled-out accidentals with optional spaces or hyphens:
 *   `B flat 4`, `B-flat 4`, `C sharp 4`, `C double sharp`, `E double flat 4`
 *
 * The first character is always the letter, so `bb` normalises to `Bb`
 * (B-flat); write `Bbb` or `B double flat` for B double flat. Throws on
 * anything that is not a note name.
 */
export function normalizeNoteName(name: string): string {
  const letterMatch = /^([A-Ga-g])([\s\S]*)$/.exec(name.trim());
  if (letterMatch === null) {
    throw new Error(`Invalid note name: "${name}"`);
  }
  const letter = letterMatch[1].toUpperCase();
  const rest = letterMatch[2]
    .replace(/\u{1D12B}/gu, "bb") // 𝄫 double flat
    .replace(/\u{1D12A}/gu, "##") // 𝄪 double sharp
    .replace(/♯/g, "#")
    .replace(/♭/g, "b")
    .replace(/♮/g, "")
    .replace(/double[\s-]*sharp/gi, "##")
    .replace(/double[\s-]*flat/gi, "bb")
    .replace(/sharp/gi, "#")
    .replace(/flat/gi, "b");
  // The octave (with optional minus sign) trails the accidentals; strip it
  // before removing separators so a negative octave survives.
  const octaveMatch = /(-?\d+)$/.exec(rest);
  const octave = octaveMatch?.[0] ?? "";
  const accidentals = rest
    .slice(0, rest.length - octave.length)
    .replace(/[\s_-]+/g, "");
  if (!/^(#{1,2}|b{1,2})?$/.test(accidentals)) {
    throw new Error(`Invalid note name: "${name}"`);
  }
  return letter + accidentals + octave;
}

/** Spoken form of a note name, e.g. `C#4` → `C sharp 4`, `C4` → `C 4`. */
export function accessibleLabel(noteName: string): string {
  const note = parseNote(normalizeNoteName(noteName));
  const parts: string[] = [note.letter];
  const word = ACCIDENTAL_WORDS[note.accidental];
  if (word !== "") {
    parts.push(word);
  }
  if (note.octave !== undefined) {
    parts.push(String(note.octave));
  }
  return parts.join(" ");
}

/**
 * True when `noteName` is covered by the `highlight` list. Both sides are
 * normalised first, then compared by pitch so that one physical key matches
 * every spelling of it (`A#4` ≡ `Bb4`). An entry without an octave matches
 * that pitch class in every octave (`C` matches every C). Throws on an
 * unparseable highlight entry so bad prompt data fails at the boundary.
 */
export function matchesHighlight(noteName: string, highlight: string[]): boolean {
  const target = parseNote(normalizeNoteName(noteName));
  return highlight.some((entry) => {
    const candidate = parseNote(normalizeNoteName(entry));
    if (target.octave !== undefined && candidate.octave !== undefined) {
      return midiNumber(target) === midiNumber(candidate);
    }
    return pitchClass(target) === pitchClass(candidate);
  });
}

/**
 * Builds the key geometry for a range of the keyboard.
 *
 * White keys tile edge-to-edge across exactly 100% of the width: the last
 * white key absorbs the float residue of the division. Each black key sits
 * centred on the boundary after the white key a semitone below it, so its
 * placement falls out of the range's position rather than a lookup table.
 * Bounds must be natural keys with octaves, and `endNote` must lie above
 * `startNote`; anything else throws.
 */
export function keyboardLayout(options?: KeyboardLayoutOptions): KeyGeometry[] {
  const startName = normalizeNoteName(options?.startNote ?? DEFAULT_START_NOTE);
  const endName = normalizeNoteName(options?.endNote ?? DEFAULT_END_NOTE);
  const start = parseNote(startName);
  const end = parseNote(endName);
  if (start.octave === undefined || end.octave === undefined) {
    throw new Error(
      `keyboardLayout: startNote and endNote require an octave, got "${startName}" and "${endName}"`,
    );
  }
  if (start.accidental !== 0 || end.accidental !== 0) {
    throw new Error(
      `keyboardLayout: startNote and endNote must be white keys, got "${startName}" and "${endName}"`,
    );
  }
  const startMidi = midiNumber(start);
  const endMidi = midiNumber(end);
  if (endMidi <= startMidi) {
    throw new Error(
      `keyboardLayout: endNote (${endName}) must be above startNote (${startName})`,
    );
  }

  // White key names walk the C–B letter cycle from start to end.
  const whiteNames: string[] = [];
  let letter: Letter = start.letter;
  let octave = start.octave;
  for (;;) {
    const name = scientificName({ letter, accidental: 0, octave });
    whiteNames.push(name);
    if (name === endName) {
      break;
    }
    const nextLetterIndex = letterIndex(letter) + 1;
    letter = letterAt(nextLetterIndex);
    if (nextLetterIndex === 7) {
      octave += 1;
    }
  }

  const whiteWidth = 100 / whiteNames.length;
  const keys: KeyGeometry[] = [];
  let left = 0;
  for (let i = 0; i < whiteNames.length; i++) {
    const name = whiteNames[i];
    const whiteNote = parseNote(name);
    // The last white key takes the remainder so the row sums to exactly 100.
    const width = i === whiteNames.length - 1 ? 100 - left : whiteWidth;
    const white: KeyGeometry = {
      midi: midiNumber(whiteNote),
      noteName: name,
      isBlack: false,
      leftPct: left,
      widthPct: width,
      ariaLabel: accessibleLabel(name),
    };
    keys.push(white);
    left += width;

    // A black key exists between this white key and the next precisely when
    // they are a whole step apart (E–F and B–C are half steps, so no black
    // key belongs on those boundaries).
    if (i < whiteNames.length - 1) {
      const nextWhiteMidi = midiNumber(parseNote(whiteNames[i + 1]));
      if (nextWhiteMidi === white.midi + 2) {
        const blackName = scientificName({
          letter: whiteNote.letter,
          accidental: 1,
          octave: whiteNote.octave,
        });
        const blackWidth = whiteWidth * BLACK_KEY_WIDTH_RATIO;
        // `left` already advanced to the next white key's edge — the boundary.
        keys.push({
          midi: white.midi + 1,
          noteName: blackName,
          isBlack: true,
          leftPct: left - blackWidth / 2,
          widthPct: blackWidth,
          ariaLabel: accessibleLabel(blackName),
        });
      }
    }
  }
  return keys;
}

import type { Round } from "./types";

/**
 * T4's endless "guess the note" mode draws every question from here.
 *
 * The pool is every key of the practice keyboard, `PRACTICE_START_NOTE` to
 * `PRACTICE_END_NOTE`: naturals and their sharps, three octaves. Two octaves
 * (the app default, C4–C6) would lock the mode to the treble staff, and the
 * lesson-10 rounds this mode is drawn from teach both clefs — so the pool
 * reaches down to C3 and the clef follows the register (bass below middle C,
 * treble at or above it), which also keeps every drawn note inside its staff's
 * readable range rather than buried under ledger lines.
 *
 * Nothing here imports the catalog, a lesson module, or the progress store:
 * practice is outside the 39-lesson chain by construction.
 */

export interface PracticeNote {
  /** Canonical ASCII scientific pitch (`G4`, `F#4`) — the keyboard's own spelling. */
  pitch: string;
  /** The clef that keeps this pitch readable. */
  clef: "treble" | "bass";
}

/** Inclusive bounds of the keyboard the learner answers on. */
export const PRACTICE_START_NOTE = "C3";
export const PRACTICE_END_NOTE = "C6";

/** Every letter that has a black key above it: E–F and B–C are already a semitone. */
const SHARP_LETTERS: ReadonlySet<string> = new Set(["C", "D", "F", "G", "A"]);
const LETTERS = ["C", "D", "E", "F", "G", "A", "B"] as const;
const FIRST_OCTAVE = 3;
const LAST_OCTAVE = 6;

/**
 * Ascending pool, ordered exactly as the keyboard draws its keys, so a test
 * can assert the two lists are the same set.
 */
function buildPool(): PracticeNote[] {
  const notes: PracticeNote[] = [];
  for (let octave = FIRST_OCTAVE; octave <= LAST_OCTAVE; octave += 1) {
    for (const letter of LETTERS) {
      // The range is inclusive of its top bound, which is the C that ends it.
      if (octave === LAST_OCTAVE && letter !== "C") continue;
      const clef = octave <= 3 ? "bass" : "treble";
      notes.push({ pitch: `${letter}${octave}`, clef });
      // The sharp sits a semitone above its natural, so the final octave's
      // C# would fall past PRACTICE_END_NOTE — and past the last keyboard
      // key — rather than being drawable.
      if (SHARP_LETTERS.has(letter) && octave < LAST_OCTAVE) {
        notes.push({ pitch: `${letter}#${octave}`, clef });
      }
    }
  }
  return notes;
}

export const PRACTICE_NOTES: readonly PracticeNote[] = buildPool();

// --- the rule shown once the question is answered ---------------------------
// Feedback is the teaching moment of the run, so each rule names where the
// pitch sits on its staff — the same fact lesson 10's "guess the note" rounds
// drill — without ever being part of the prompt (see the T6c/T8c aria contract).

const LETTER_INDEX: Readonly<Record<string, number>> = {
  C: 0,
  D: 1,
  E: 2,
  F: 3,
  G: 4,
  A: 5,
  B: 6,
};

/** Diatonic steps from the bottom staff line; one step is one line or space. */
const BOTTOM_LINE_INDEX: Readonly<Record<PracticeNote["clef"], number>> = {
  // Treble bottom line E4, bass bottom line G2.
  treble: 4 * 7 + LETTER_INDEX.E,
  bass: 2 * 7 + LETTER_INDEX.G,
};

/** Offsets 0..8 are the staff proper: five lines and the four spaces between. */
const STAFF_SPAN = 8;

function ordinal(value: number): string {
  const remainder = value % 100;
  if (remainder >= 11 && remainder <= 13) return `${value}th`;
  const suffix = { 1: "st", 2: "nd", 3: "rd" }[value % 10] ?? "th";
  return `${value}${suffix}`;
}

/** Diatonic position of a natural pitch: octave × 7 + letter. Accidentals do not move it. */
function diatonicIndex(pitch: string): number {
  const natural = pitch.replace("#", "");
  return Number(natural.slice(1)) * 7 + LETTER_INDEX[natural[0]]!;
}

/** Where `pitch` sits on `clef`, in staff terms: a line/space, or a ledger/space outside. */
function staffPlace(pitch: string, clef: PracticeNote["clef"]): string {
  const offset = diatonicIndex(pitch) - BOTTOM_LINE_INDEX[clef];
  if (offset >= 0 && offset <= STAFF_SPAN) {
    if (offset % 2 === 0) {
      return `the ${ordinal(offset / 2 + 1)} line of the ${clef} staff`;
    }
    return `the ${ordinal((offset + 1) / 2)} space of the ${clef} staff`;
  }
  // Outside the staff: one step at a time, alternating space and ledger line.
  const below = offset < 0;
  const distance = below ? -offset : offset - STAFF_SPAN;
  const side = below ? "below" : "above";
  if (distance % 2 === 1) {
    return `the ${ordinal((distance + 1) / 2)} space ${side} the ${clef} staff`;
  }
  return `the ${ordinal(distance / 2)} ledger line ${side} the ${clef} staff`;
}

function ruleFor(entry: PracticeNote): string {
  const { pitch, clef } = entry;
  const isSharp = pitch.includes("#");
  const place = staffPlace(pitch, clef);
  return isSharp
    ? `A sharp raises the natural below it by a semitone and keeps that natural's place on the staff: ${pitch} sits on ${place}.`
    : `Reading the ${clef} staff from the bottom puts ${pitch} on ${place}.`;
}

/**
 * One question: a single note on a staff, answered by picking that pitch on
 * the keyboard (`notePick` with exactly one member, so set equality is "the
 * one key you meant").
 *
 * `previousPitch` is the note that was just on screen — advance passes the
 * round the learner answered, restart passes the one they missed on — and is
 * filtered out before the rng picks, so a run can never show the same pitch
 * twice in a row. `rng` defaults to `Math.random`; tests inject a fixed
 * sequence so the draw is deterministic and no test depends on a live draw.
 */
export function drawPracticeRound(
  previousPitch: string | undefined,
  rng: () => number = Math.random,
): Round {
  const candidates =
    previousPitch === undefined
      ? PRACTICE_NOTES
      : PRACTICE_NOTES.filter((note) => note.pitch !== previousPitch);
  const entry: PracticeNote = candidates[Math.floor(rng() * candidates.length)];
  return {
    id: `practice-${entry.pitch}`,
    prompt: { kind: "staff", clef: entry.clef, notes: [entry.pitch] },
    answer: { kind: "notePick", correctNotes: [entry.pitch] },
    rule: ruleFor(entry),
  };
}

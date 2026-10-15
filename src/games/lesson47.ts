import {
  bassNote,
  buildSeventh,
  parseNote,
  scientificName,
  type Note,
  type SeventhQuality,
} from "../lib/theory";
import type { AnswerSpec, Round } from "../lib/rounds/types";
import { requireLessonEntry } from "./catalog";
import { sampleStratifiedRounds } from "./rng";
import type { LessonModule } from "./types";

/**
 * Lesson 47 — Seventh Chord Inversion.
 *
 * Content source: musictheory.net lesson 47 (slide text pulled from the live
 * `lesson47.js`): "Like triads, seventh chords can be inverted by moving the
 * lowest note up an octave"; "Root position is the same as a triad — the root
 * is the lowest (bass) note"; "First inversion is also the same — the third
 * is the lowest note"; "Second inversion is also the same — the fifth is the
 * lowest note"; "Now, the seventh is the lowest note of the chord. This is
 * called third inversion"; "Notice that the chord returns to root position."
 * The chart repeats the four positions (Root Position, First Inversion,
 * Second Inversion, Third Inversion) with Bass/Root/Third/Fifth/Seventh
 * columns. The worked example is C major seventh — the lesson's `sounds`
 * data walks midi 60-64-67-71 (C–E–G–B) → 64-67-71-72 (E–G–B–C) →
 * 67-71-72-76 (G–B–C–E) → 71-72-76-79 (B–C–E–G) → 72-76-79-83 (C–E–G–B an
 * octave up), and those five voicings are pinned literally in the tests.
 *
 * Corrections to the task's accepted reference, from the live site: none on
 * substance — four positions (root, first, second, third inversion) because
 * any of the four chord tones can be the bass matches the site exactly. What
 * the reference leaves out and the pool carries: the mechanism is the same
 * one lesson 42 teaches for triads (*moving the lowest note up an octave*,
 * nothing is respelled), a fourth inversion *returns the chord to root
 * position* an octave above where it began, and the site never names its
 * worked chord in prose — the tests identify it as C major seventh from the
 * sounds data alone.
 *
 * Every chord round derives its tones from `buildSeventh` and then applies
 * the site's own definition of inversion (move the lowest note up an octave,
 * via the shared `invertOnce` rule), never a hand-typed voicing; the tests
 * check every round with the core's `identifyInversion` oracle, so a bass
 * that is not really the seventh fails instead of shipping. The pool is 12
 * `staff` + 12 `text` + 4 `keyboard` = 28 and the draw is stratified
 * (`sampleStratifiedRounds`): one staff and one text round are guaranteed in
 * every 12-round draw for every seed.
 */
const choices = (options: string[], correctIndex: number): AnswerSpec => ({
  kind: "choices",
  options,
  correctIndex,
});

/** The site's chart labels: what each inversion is called, in chart order. */
const POSITION_OPTIONS = ["Root position", "First inversion", "Second inversion", "Third inversion"] as const;

/** The site's chart labels: what the bass of each inversion is called. */
const TONE_OPTIONS = ["The root", "The third", "The fifth", "The seventh"] as const;

/** The site's prose name for each seventh quality, for readable rules. */
const QUALITY_DISPLAY: Readonly<Record<SeventhQuality, string>> = {
  majorSeventh: "major seventh",
  minorSeventh: "minor seventh",
  dominantSeventh: "dominant seventh",
  halfDiminishedSeventh: "half-diminished seventh",
  fullyDiminishedSeventh: "diminished seventh",
  minorMajorSeventh: "minor-major seventh",
  augmentedMajorSeventh: "augmented-major seventh",
  augmentedSeventh: "augmented seventh",
};

/**
 * One inversion step, exactly as the site defines it: move the lowest note
 * up an octave. The lifted bass always lands above the old top tone (a
 * seventh chord's seventh is at most eleven semitones above its root, an
 * octave is twelve), so the written notes stay ascending and `notes[0]`
 * remains the bass.
 */
const invertOnce = (notes: readonly Note[]): Note[] => {
  const bass = bassNote(notes);
  return [...notes.slice(1), { ...bass, octave: (bass.octave ?? 4) + 1 }];
};

/** The root-position seventh chord moved through `inversions` inversion steps. */
const seventhIn = (root: string, quality: SeventhQuality, inversions: number): Note[] => {
  let notes = buildSeventh(parseNote(root), quality);
  for (let step = 0; step < inversions; step += 1) {
    notes = invertOnce(notes);
  }
  return notes;
};

/** The same voicing spelled for a prompt: scientific names, bass first. */
const invertedNotes = (root: string, quality: SeventhQuality, inversions: number): string[] =>
  seventhIn(root, quality, inversions).map(scientificName);

/** "Eb4" → "Eb": a note's name without its octave, as prose writes it. */
const toneLabel = (note: Note): string => scientificName(note).replace(/\d+$/, "");

/**
 * The rule every chord round shares: which tone sits in the bass and which
 * inversion that names — the site's per-slide statements ("the third is the
 * lowest note", "the seventh is the lowest note … called third inversion"),
 * applied to this exact voicing, with the inversion mechanism beside them.
 */
const bassRule = (root: string, quality: SeventhQuality, inversions: number): string => {
  const notes = seventhIn(root, quality, inversions);
  const bass = toneLabel(bassNote(notes));
  const cycle = inversions % 4;
  const tone = ["root", "third", "fifth", "seventh"][cycle]!;
  const position = ["Root position", "First inversion", "Second inversion", "Third inversion"][cycle]!;
  const chord = `${QUALITY_DISPLAY[quality]} chord on ${toneLabel(parseNote(root))}`;
  if (cycle === 0) {
    return (
      `Root position is the same as a triad: the root is the lowest (bass) note — ` +
      `${bass} sits at the bottom of the ${chord}.`
    );
  }
  return (
    `${position} puts the ${tone} in the bass: inversion moved the lowest note up an octave, ` +
    `so now the ${tone} — ${bass} — is the lowest note of the ${chord}.`
  );
};

/** Rounds drawn per visit; the pool is larger so replays vary. */
const ROUND_COUNT = 12;

/** Kinds every draw must contain; `sampleStratifiedRounds` enforces it. */
const REQUIRED_KINDS = ["staff", "text"] as const;

/** A staff round asking which inversion the written chord is in. */
const positionRound = (
  id: string,
  root: string,
  quality: SeventhQuality,
  inversions: number,
  clef: "treble" | "bass" = "treble",
): Round => ({
  id,
  prompt: { kind: "staff", clef, notes: invertedNotes(root, quality, inversions), duration: "q" },
  answer: choices([...POSITION_OPTIONS], inversions % 4),
  rule: bassRule(root, quality, inversions),
});

/** A staff round asking which chord tone sits in the bass. */
const toneRound = (
  id: string,
  root: string,
  quality: SeventhQuality,
  inversions: number,
  clef: "treble" | "bass" = "treble",
): Round => ({
  id,
  prompt: { kind: "staff", clef, notes: invertedNotes(root, quality, inversions), duration: "q" },
  answer: choices([...TONE_OPTIONS], inversions % 4),
  rule: bassRule(root, quality, inversions),
});

/** A keyboard round: chord tones lit, the leftmost key is the bass. */
const keyboardRound = (
  id: string,
  root: string,
  quality: SeventhQuality,
  inversions: number,
): Round => ({
  id,
  prompt: { kind: "keyboard", highlight: invertedNotes(root, quality, inversions) },
  answer: choices([...POSITION_OPTIONS], inversions % 4),
  rule: bassRule(root, quality, inversions),
});

export const lesson47Pool: readonly Round[] = [
  // --- staff prompts: which inversion is written on the page? ---------------
  // The site's worked C major seventh chain: root, first, second, third, return.
  positionRound("l47-staff-c-major7-root", "C4", "majorSeventh", 0),
  positionRound("l47-staff-c-major7-first", "C4", "majorSeventh", 1),
  positionRound("l47-staff-c-major7-second", "C4", "majorSeventh", 2),
  positionRound("l47-staff-c-major7-third", "C4", "majorSeventh", 3),
  positionRound("l47-staff-c-major7-returned", "C4", "majorSeventh", 4),
  positionRound("l47-staff-fs-dom-first", "F#4", "dominantSeventh", 1),
  positionRound("l47-staff-ab-major7-second", "Ab4", "majorSeventh", 2),
  positionRound("l47-staff-c-min7-third", "C4", "minorSeventh", 3),

  // --- staff prompts: which chord tone sits in the bass? --------------------
  toneRound("l47-staff-c-dom-root", "C4", "dominantSeventh", 0),
  toneRound("l47-staff-c-dom-first", "C4", "dominantSeventh", 1),
  toneRound("l47-staff-c-dom-second", "C4", "dominantSeventh", 2),
  toneRound("l47-staff-c-dom-third", "C4", "dominantSeventh", 3),

  // --- keyboard prompts: the lit keys, leftmost = bass ----------------------
  keyboardRound("l47-keyboard-c-major7-root", "C4", "majorSeventh", 0),
  keyboardRound("l47-keyboard-c-major7-first", "C4", "majorSeventh", 1),
  keyboardRound("l47-keyboard-c-major7-second", "C4", "majorSeventh", 2),
  keyboardRound("l47-keyboard-c-major7-third", "C4", "majorSeventh", 3),

  // --- text prompts: the site's inversion definitions -----------------------
  {
    id: "l47-text-invert-method",
    prompt: { kind: "text", text: "How can a seventh chord be inverted?" },
    answer: choices(
      ["By moving the lowest note up an octave", "By changing the clef", "By adding a fifth chord tone", "By transposing the chord to a new key"],
      0,
    ),
    rule: "Like triads, seventh chords can be inverted by moving the lowest note up an octave.",
  },
  {
    id: "l47-text-root-bass",
    prompt: {
      kind: "text",
      text: "Which chord tone is the lowest note of a seventh chord in root position?",
    },
    answer: choices(["The root", "The third", "The fifth", "The seventh"], 0),
    rule: "Root position is the same as a triad: the root is the lowest (bass) note.",
  },
  {
    id: "l47-text-first-bass",
    prompt: {
      kind: "text",
      text: "Which chord tone is the lowest note of a seventh chord in first inversion?",
    },
    answer: choices(["The third", "The root", "The fifth", "The seventh"], 0),
    rule: "First inversion puts the third in the bass: the third is the lowest note of the chord.",
  },
  {
    id: "l47-text-second-bass",
    prompt: {
      kind: "text",
      text: "Which chord tone is the lowest note of a seventh chord in second inversion?",
    },
    answer: choices(["The fifth", "The root", "The third", "The seventh"], 0),
    rule: "Second inversion puts the fifth in the bass: the fifth is the lowest note of the chord.",
  },
  {
    id: "l47-text-third-bass",
    prompt: {
      kind: "text",
      text: "Which chord tone is the lowest note of a seventh chord in third inversion?",
    },
    answer: choices(["The seventh", "The root", "The third", "The fifth"], 0),
    rule: "In third inversion the seventh is the lowest note of the chord.",
  },
  {
    id: "l47-text-third-name",
    prompt: {
      kind: "text",
      text: "Which inversion places the seventh of the chord in the bass?",
    },
    answer: choices(["Third inversion", "Second inversion", "First inversion", "Root position"], 0),
    rule: "When the seventh is the lowest note, the chord is in third inversion.",
  },
  {
    id: "l47-text-second-name",
    prompt: {
      kind: "text",
      text: "Which inversion places the fifth of the chord in the bass?",
    },
    answer: choices(["Second inversion", "Root position", "First inversion", "Third inversion"], 0),
    rule: "When the fifth is the lowest note, the chord is in second inversion.",
  },
  {
    id: "l47-text-first-name",
    prompt: {
      kind: "text",
      text: "Which inversion places the third of the chord in the bass?",
    },
    answer: choices(["First inversion", "Second inversion", "Root position", "Third inversion"], 0),
    rule: "When the third is the lowest note, the chord is in first inversion.",
  },
  {
    id: "l47-text-count",
    prompt: { kind: "text", text: "How many positions can a seventh chord be in?" },
    answer: choices(
      ["Four: root position, first, second, and third inversion", "Three: root position, first, and second inversion", "Two: root position and first inversion", "There is no fixed number"],
      0,
    ),
    rule: "A seventh chord has four positions — root position, first, second and third inversion — because any of its four chord tones can be the bass.",
  },
  {
    id: "l47-text-return",
    prompt: {
      kind: "text",
      text: "What happens when a seventh chord is inverted a fourth time?",
    },
    answer: choices(
      ["It returns to root position", "It stays in third inversion", "It becomes a different chord", "It can only be inverted three times"],
      0,
    ),
    rule: "Invert the chord a fourth time and the seventh chord returns to root position, an octave above where it began.",
  },
  {
    id: "l47-text-like",
    prompt: { kind: "text", text: "Like what can seventh chords be inverted?" },
    answer: choices(["Like triads", "Like scales", "Like meters", "Like key signatures"], 0),
    rule: "Like triads, seventh chords invert by moving the lowest note up an octave — the same four chord tones sound in a different order.",
  },
  {
    id: "l47-text-worked",
    prompt: {
      kind: "text",
      text: "Which chord does this lesson invert through all of its positions?",
    },
    answer: choices(["C major seventh", "C dominant seventh", "C minor seventh", "C diminished seventh"], 0),
    rule: "The worked example inverts C major seventh: C–E–G–B becomes E–G–B–C, then G–B–C–E, then B–C–E–G, and returns to C–E–G–B an octave higher.",
  },
];

export const lesson47: LessonModule = {
  entry: requireLessonEntry(47),
  generateRounds: (rng) =>
    sampleStratifiedRounds(lesson47Pool, REQUIRED_KINDS, rng, ROUND_COUNT),
};

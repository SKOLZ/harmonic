import {
  bassNote,
  buildTriad,
  parseNote,
  scientificName,
  type Note,
  type TriadQuality,
} from "../lib/theory";
import type { AnswerSpec, Round } from "../lib/rounds/types";
import { requireLessonEntry } from "./catalog";
import { sampleStratifiedRounds } from "./rng";
import type { LessonModule } from "./types";

/**
 * Lesson 42 — Triad Inversion.
 *
 * Content source: musictheory.net lesson 42 (slide text pulled from the live
 * `lesson42.js`): "Like intervals, triads can be inverted by moving the
 * lowest note up an octave"; "The lowest note, called the *bass note*,
 * determines the name of the inversion"; "When the lowest note is the root
 * of the chord, the triad is in *root position*"; "The bass note is now the
 * third of the chord. This is called *first inversion*"; "Now, the fifth is
 * the lowest note of the chord. This is called *second inversion*"; "Notice
 * that the triad returns to root position." The worked example is C major —
 * the lesson's `sounds` data walks midi 60-64-67 (C–E–G) → 64-67-72
 * (E–G–C) → 67-72-76 (G–C–E) → 72-76-79 (C–E–G an octave up), with the
 * bass note sounded alone first as C, then E, then G; those four voicings
 * are pinned literally in the tests. The site's labels for the chart are
 * Bass, Root, Third, Fifth, Root Position, First Inversion, Second
 * Inversion — the same words the rounds use.
 *
 * Corrections to the task's accepted reference, from the live site: none —
 * root position with the root in the bass, first inversion with the third,
 * second inversion with the fifth all match, verbatim in spirit. What the
 * reference compresses is the mechanism (inversion *moves the lowest note up
 * an octave*, it does not respell anything) and the closing fact that a
 * triad *returns to root position* after the third inversion; both are in
 * the site's slides and in the pool. The lesson never mentions a third
 * inversion for triads — its chart offers only root, first and second — so
 * "third inversion" appears only as a distractor, and one text round pins
 * the fact that triads have no third inversion.
 *
 * Every chord round derives its tones from `buildTriad` and then applies the
 * site's own definition of inversion (move the lowest note up an octave, via
 * `bassNote`), never a hand-typed voicing; the tests check every round with
 * the core's `identifyInversion` oracle, so a bass that is not really the
 * third fails instead of shipping. The pool is 12 `staff` + 12 `text` +
 * 4 `keyboard` = 28 and the draw is stratified
 * (`sampleStratifiedRounds`): one staff and one text round are guaranteed in
 * every 12-round draw, which a plain `sampleRounds` call could no longer
 * promise once keyboard rounds joined the pool.
 */
const choices = (options: string[], correctIndex: number): AnswerSpec => ({
  kind: "choices",
  options,
  correctIndex,
});

/** The site's chart labels: what each inversion is called, in chart order. */
const POSITION_OPTIONS = ["Root position", "First inversion", "Second inversion"] as const;

/** The site's chord-tone labels: what the bass of each inversion is called. */
const TONE_OPTIONS = ["The root", "The third", "The fifth"] as const;

/**
 * One inversion step, exactly as the site defines it: move the lowest note
 * up an octave. The lifted bass always lands above the old fifth (a triad's
 * fifth is at most eight semitones above its root, an octave is twelve), so
 * the written notes stay ascending and `notes[0]` remains the bass.
 */
const invertOnce = (notes: readonly Note[]): Note[] => {
  const bass = bassNote(notes);
  return [...notes.slice(1), { ...bass, octave: (bass.octave ?? 4) + 1 }];
};

/** The root-position triad moved through `inversions` inversion steps. */
const triadIn = (root: string, quality: TriadQuality, inversions: number): Note[] => {
  let notes = buildTriad(parseNote(root), quality);
  for (let step = 0; step < inversions; step += 1) {
    notes = invertOnce(notes);
  }
  return notes;
};

/** The same voicing spelled for a prompt: scientific names, bass first. */
const invertedNotes = (root: string, quality: TriadQuality, inversions: number): string[] =>
  triadIn(root, quality, inversions).map(scientificName);

/** "Eb4" → "Eb": a note's name without its octave, as prose writes it. */
const toneLabel = (note: Note): string => scientificName(note).replace(/\d+$/, "");

/**
 * The rule every chord round shares: which tone sits in the bass and which
 * inversion that names — the site's "the bass note determines the name of
 * the inversion", applied to this exact voicing.
 */
const bassRule = (root: string, quality: TriadQuality, inversions: number): string => {
  const notes = triadIn(root, quality, inversions);
  const bass = toneLabel(bassNote(notes));
  const tone = ["root", "third", "fifth"][inversions % 3];
  const position = ["root position", "first inversion", "second inversion"][inversions % 3];
  return (
    `The bass note determines the name of the inversion: ${bass} is the ` +
    `${tone} of the ${quality} triad on ${toneLabel(parseNote(root))}, ` +
    `so this chord is in ${position}.`
  );
};

/** Rounds drawn per visit; the pool is larger so replays vary. */
const ROUND_COUNT = 12;

/** Kinds every draw must contain; `sampleStratifiedRounds` enforces it. */
const REQUIRED_KINDS = ["staff", "text"] as const;

/** A staff round asking which inversion the written triad is in. */
const positionRound = (
  id: string,
  root: string,
  quality: TriadQuality,
  inversions: number,
  clef: "treble" | "bass",
): Round => ({
  id,
  prompt: { kind: "staff", clef, notes: invertedNotes(root, quality, inversions), duration: "q", simultaneous: true },
  answer: choices([...POSITION_OPTIONS], inversions % 3),
  rule: bassRule(root, quality, inversions),
});

/** A staff round asking which chord tone sits in the bass. */
const toneRound = (
  id: string,
  root: string,
  quality: TriadQuality,
  inversions: number,
  clef: "treble" | "bass",
): Round => ({
  id,
  prompt: { kind: "staff", clef, notes: invertedNotes(root, quality, inversions), duration: "q", simultaneous: true },
  answer: choices([...TONE_OPTIONS], inversions % 3),
  rule: bassRule(root, quality, inversions),
});

/** A keyboard round: chord tones lit, the leftmost key is the bass. */
const keyboardRound = (
  id: string,
  root: string,
  quality: TriadQuality,
  inversions: number,
): Round => ({
  id,
  prompt: { kind: "keyboard", highlight: invertedNotes(root, quality, inversions) },
  answer: choices([...POSITION_OPTIONS], inversions % 3),
  rule: bassRule(root, quality, inversions),
});

export const lesson42Pool: readonly Round[] = [
  // --- staff prompts: which inversion is written on the page? ---------------
  // The site's worked C major chain: root, first, second, and the return.
  positionRound("l42-staff-c-major-root", "C4", "major", 0, "treble"),
  positionRound("l42-staff-c-major-first", "C4", "major", 1, "treble"),
  positionRound("l42-staff-c-major-second", "C4", "major", 2, "treble"),
  positionRound("l42-staff-c-major-returned", "C4", "major", 3, "treble"),
  positionRound("l42-staff-eb-major-second", "Eb4", "major", 2, "treble"),
  positionRound("l42-staff-b-minor-first", "B3", "minor", 1, "treble"),

  // --- staff prompts: which chord tone sits in the bass? --------------------
  toneRound("l42-staff-eb-major-root", "Eb4", "major", 0, "treble"),
  toneRound("l42-staff-c-minor-second", "C4", "minor", 2, "treble"),
  toneRound("l42-staff-b-major-first", "B3", "major", 1, "treble"),
  toneRound("l42-staff-c-major-first-bass", "C3", "major", 1, "bass"),
  toneRound("l42-staff-b-diminished-root", "B4", "diminished", 0, "treble"),
  toneRound("l42-staff-c-major-second-bass", "C3", "major", 2, "bass"),

  // --- keyboard prompts: the lit keys, leftmost = bass ----------------------
  keyboardRound("l42-keyboard-c-major-root", "C4", "major", 0),
  keyboardRound("l42-keyboard-c-major-first", "C4", "major", 1),
  keyboardRound("l42-keyboard-c-major-second", "C4", "major", 2),
  keyboardRound("l42-keyboard-eb-major-first", "Eb4", "major", 1),

  // --- text prompts: the site's inversion definitions -----------------------
  {
    id: "l42-text-invert-definition",
    prompt: { kind: "text", text: "How can a triad be inverted?" },
    answer: choices(
      ["By moving the lowest note up an octave", "By changing the key signature", "By adding a fourth chord tone", "By respelling every note as a sharp"],
      0,
    ),
    rule: "Like intervals, triads can be inverted by moving the lowest note up an octave.",
  },
  {
    id: "l42-text-name-determiner",
    prompt: { kind: "text", text: "What determines the name of a triad's inversion?" },
    answer: choices(
      ["The lowest note, called the bass note", "The loudest note in the chord", "The note nearest the top of the staff", "The accidental on the root"],
      0,
    ),
    rule: "The lowest note, called the bass note, determines the name of the inversion.",
  },
  {
    id: "l42-text-bass-name",
    prompt: { kind: "text", text: "What is the lowest note of a chord called?" },
    answer: choices(["The bass note", "The root", "The fifth", "The melody"], 0),
    rule: "Every chord has a lowest-sounding note — the bass note — and in a triad that note names the inversion.",
  },
  {
    id: "l42-text-root-position",
    prompt: {
      kind: "text",
      text: "Which chord tone must sit in the bass for a triad to be in root position?",
    },
    answer: choices(["The root", "The third", "The fifth", "The seventh"], 0),
    rule: "When the lowest note is the root of the chord, the triad is in root position.",
  },
  {
    id: "l42-text-first-inversion",
    prompt: { kind: "text", text: "Which chord tone is the bass note in first inversion?" },
    answer: choices(["The third", "The root", "The fifth", "The seventh"], 0),
    rule: "The bass note is now the third of the chord — that is first inversion.",
  },
  {
    id: "l42-text-second-inversion",
    prompt: { kind: "text", text: "Which chord tone is the bass note in second inversion?" },
    answer: choices(["The fifth", "The root", "The third", "The seventh"], 0),
    rule: "Now the fifth is the lowest note of the chord — that is second inversion.",
  },
  {
    id: "l42-text-first-name",
    prompt: {
      kind: "text",
      text: "Which inversion is a triad in when its third is the lowest note?",
    },
    answer: choices(["First inversion", "Second inversion", "Root position", "Third inversion"], 0),
    rule: "When the bass note is the third of the chord, the triad is in first inversion.",
  },
  {
    id: "l42-text-second-name",
    prompt: {
      kind: "text",
      text: "Which inversion is a triad in when its fifth is the lowest note?",
    },
    answer: choices(["Second inversion", "First inversion", "Root position", "Third inversion"], 0),
    rule: "When the fifth is the lowest note of the chord, the triad is in second inversion.",
  },
  {
    id: "l42-text-return",
    prompt: {
      kind: "text",
      text: "What position does a triad return to after being inverted three times?",
    },
    answer: choices(["Root position", "First inversion", "Second inversion", "It stays in second inversion"], 0),
    rule: "Invert the triad a third time and the triad returns to root position, one octave above where it began.",
  },
  {
    id: "l42-text-inversions-of-a-triad",
    prompt: {
      kind: "text",
      text: "Which inversions can a triad be in besides root position?",
    },
    answer: choices(
      ["First inversion and second inversion", "First inversion only", "First, second, and third inversions", "Any number of inversions"],
      0,
    ),
    rule: "A triad's three tones cycle through root position, first inversion and second inversion, so besides root position it has first inversion and second inversion — there is no third inversion of a triad.",
  },
  {
    id: "l42-text-same-notes",
    prompt: { kind: "text", text: "When a triad is inverted, which notes sound?" },
    answer: choices(
      ["The same three notes, with the lowest moved up an octave", "Only the root and the fifth", "Three different notes from a new key", "The root doubled an octave higher"],
      0,
    ),
    rule: "Inversion moves the lowest note up an octave, so the same three notes sound in a different order.",
  },
  {
    id: "l42-text-worked-example",
    prompt: {
      kind: "text",
      text: "Which triad does this lesson invert through all of its positions?",
    },
    answer: choices(["C major", "C minor", "E major", "G major"], 0),
    rule: "The worked example inverts C major: C–E–G becomes E–G–C, then G–C–E, then C–E–G an octave higher.",
  },
];

export const lesson42: LessonModule = {
  entry: requireLessonEntry(42),
  generateRounds: (rng) =>
    sampleStratifiedRounds(lesson42Pool, REQUIRED_KINDS, rng, ROUND_COUNT),
};

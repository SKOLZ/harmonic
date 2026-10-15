import {
  buildScale,
  parseNote,
  scientificName,
  type ScaleType,
} from "../lib/theory";
import type { AnswerSpec, Round } from "../lib/rounds/types";
import { requireLessonEntry } from "./catalog";
import { sampleRounds } from "./rng";
import type { LessonModule } from "./types";

/**
 * Lesson 22 — The Minor Scales.
 *
 * Content source: musictheory.net lesson 22 (slide text pulled from the live
 * `lesson22.js`): "While there is only one major scale, three different
 * variations of the minor scale exist." Natural minor is built from the
 * formula W–H–W–W–H–W–W (shown through A minor — no accidentals — G# minor —
 * five sharps — and C minor — three flats). "To convert any natural minor
 * scale into harmonic minor, raise the seventh note by a half step" (the
 * site's worked example: C natural minor's Bb becomes B). "To convert a
 * natural minor scale into melodic minor, raise both the sixth and seventh
 * notes by a half step" (Ab and Bb become A and B). Melodic minor is then
 * qualified: "Usually, melodic minor is used only when ascending" and "When
 * descending, composers prefer to use the natural minor scale."
 *
 * Corrections to the task's accepted reference, from the live site: none
 * material — title, the W–H–W–W–H–W–W natural-minor pattern, the harmonic
 * seventh, and the melodic sixth/seventh plus natural-minor descent all match.
 * The site's own wording is "composers prefer to use the natural minor scale"
 * on the way down rather than an automatic "revert", and it opens with the
 * only-one-major-scale/three-minors contrast. Rounds whose roots are not the
 * site's worked examples (A harmonic, A melodic, F natural minor) apply the
 * site's stated formulas through `buildScale`, so the spellings come from the
 * theory core, not from hand-typed note lists — same for the staff prompts.
 * Scale content stays on the staff (not the keyboard) so the pool is 11
 * `staff` rounds + 11 `text` rounds = 22: any draw of 12 must include at
 * least one of each kind — the mix is structural, not luck.
 */
const choices = (options: string[], correctIndex: number): AnswerSpec => ({
  kind: "choices",
  options,
  correctIndex,
});

/** The seven degrees of a scale, spelled for the staff. */
const scaleNotes = (root: string, type: ScaleType): string[] =>
  buildScale(parseNote(root), type).map(scientificName);

/** The same scale as prose: `spelled("C", "harmonicMinor")` → "C D Eb F G Ab B". */
const spelled = (root: string, type: ScaleType): string =>
  scaleNotes(root, type).join(" ");

/** Rounds drawn per visit; the pool is larger so replays vary. */
const ROUND_COUNT = 12;

export const lesson22Pool: readonly Round[] = [
  // --- staff prompts: identify the minor scale and convert it ---------------
  {
    id: "l22-staff-a-natural-minor-name",
    prompt: { kind: "staff", clef: "treble", notes: scaleNotes("A4", "naturalMinor"), duration: "q" },
    answer: choices(["A major", "A natural minor", "A harmonic minor", "C major"], 1),
    rule: "A natural minor is spelled A B C D E F G, built W–H–W–W–H–W–W from A with no notes with accidentals.",
  },
  {
    id: "l22-staff-c-natural-minor-name",
    prompt: { kind: "staff", clef: "treble", notes: scaleNotes("C4", "naturalMinor"), duration: "q" },
    answer: choices(["C major", "Eb major", "C natural minor", "C harmonic minor"], 2),
    rule: "C natural minor is spelled C D Eb F G Ab Bb — three flats — from the formula W–H–W–W–H–W–W.",
  },
  {
    id: "l22-staff-c-harmonic-name",
    prompt: { kind: "staff", clef: "treble", notes: scaleNotes("C4", "harmonicMinor"), duration: "q" },
    answer: choices(["C natural minor", "C melodic minor", "C harmonic minor", "C major"], 2),
    rule: "Raising the seventh note of C natural minor (Bb) by a half step gives B, so C harmonic minor is C D Eb F G Ab B.",
  },
  {
    id: "l22-staff-c-melodic-name",
    prompt: { kind: "staff", clef: "treble", notes: scaleNotes("C4", "melodicMinor"), duration: "q" },
    answer: choices(["C natural minor", "C harmonic minor", "C major", "C melodic minor"], 3),
    rule: "Melodic minor raises both the sixth and seventh notes a half step, so Ab and Bb become A and B: C D Eb F G A B.",
  },
  {
    id: "l22-staff-gs-natural-minor-name",
    prompt: { kind: "staff", clef: "treble", notes: scaleNotes("G#4", "naturalMinor"), duration: "q" },
    answer: choices(["G# major", "E major", "G# natural minor", "G# harmonic minor"], 2),
    rule: "G# natural minor is spelled G# A# B C# D# E F# — five sharps — from the formula W–H–W–W–H–W–W.",
  },
  {
    id: "l22-staff-f-natural-minor-name",
    prompt: { kind: "staff", clef: "treble", notes: scaleNotes("F4", "naturalMinor"), duration: "q" },
    answer: choices(["F natural minor", "F major", "F harmonic minor", "Db major"], 0),
    rule: "F natural minor is spelled F G Ab Bb C Db Eb — four flats — from the formula W–H–W–W–H–W–W.",
  },
  {
    id: "l22-staff-c-to-harmonic",
    prompt: {
      kind: "staff",
      clef: "treble",
      notes: scaleNotes("C4", "naturalMinor"),
      duration: "q",
    },
    answer: choices(["Ab4", "G4", "Bb4", "Eb4"], 2),
    rule: "To convert any natural minor scale into harmonic minor, raise the seventh note by a half step — here Bb becomes B.",
  },
  {
    id: "l22-staff-a-to-harmonic",
    prompt: {
      kind: "staff",
      clef: "treble",
      notes: scaleNotes("A4", "naturalMinor"),
      duration: "q",
    },
    answer: choices(["D5", "C5", "F5", "G5"], 3),
    rule: "A natural minor's seventh note is G, and harmonic minor raises it a half step to G#.",
  },
  {
    id: "l22-staff-a-to-melodic",
    prompt: {
      kind: "staff",
      clef: "treble",
      notes: scaleNotes("A4", "naturalMinor"),
      duration: "q",
    },
    answer: choices(
      ["Only the seventh note, G", "The fifth and sixth notes, E and F", "Only the sixth note, F", "The sixth and seventh notes, F and G"],
      3,
    ),
    rule: "To convert a natural minor scale into melodic minor, raise both the sixth and seventh notes by a half step — in A minor, F and G become F# and G#.",
  },
  {
    id: "l22-staff-c-natural-half-step",
    prompt: {
      kind: "staff",
      clef: "treble",
      notes: scaleNotes("C4", "naturalMinor"),
      duration: "q",
    },
    answer: choices(["C–D", "D–Eb", "F–G", "Bb–C"], 1),
    rule: "The natural-minor formula W–H–W–W–H–W–W puts the half steps between degrees 2 and 3 and between degrees 5 and 6 — in C minor, D–Eb and G–Ab.",
  },
  {
    id: "l22-staff-a-natural-half-step-bass",
    prompt: {
      kind: "staff",
      clef: "bass",
      notes: scaleNotes("A2", "naturalMinor"),
      duration: "q",
    },
    answer: choices(["A–B", "D–E", "B–C", "F–G"], 2),
    rule: "In A natural minor the half steps are B–C and E–F, the two places where the natural-minor formula takes an h.",
  },

  // --- text prompts: the three minor scales and their formulas --------------
  {
    id: "l22-text-three-variations",
    prompt: { kind: "text", text: "How many variations of the minor scale exist?" },
    answer: choices(["One", "Two", "Three", "Four"], 2),
    rule: "While there is only one major scale, three different variations of the minor scale exist: natural, harmonic, and melodic.",
  },
  {
    id: "l22-text-natural-formula",
    prompt: { kind: "text", text: "Which pattern of steps builds the natural minor scale?" },
    answer: choices(
      ["Whole, half, whole, whole, half, whole, whole", "Whole, whole, half, whole, whole, whole, half", "Whole, half, whole, whole, whole, half, whole", "Whole, whole, half, whole, half, whole, whole"],
      0,
    ),
    rule: "The natural minor scale is constructed with the formula W–H–W–W–H–W–W.",
  },
  {
    id: "l22-text-to-harmonic",
    prompt: {
      kind: "text",
      text: "How do you convert a natural minor scale into harmonic minor?",
    },
    answer: choices(
      ["Raise both the sixth and seventh notes by a half step", "Lower the seventh note by a half step", "Raise the seventh note by a half step", "Raise the sixth note by a half step"],
      2,
    ),
    rule: "To convert any natural minor scale into harmonic minor, raise the seventh note by a half step.",
  },
  {
    id: "l22-text-to-melodic",
    prompt: { kind: "text", text: "How do you convert a natural minor scale into melodic minor?" },
    answer: choices(
      ["Raise only the seventh note by a half step", "Raise both the sixth and seventh notes by a half step", "Lower the sixth and seventh notes by a half step", "Raise the fifth note by a half step"],
      1,
    ),
    rule: "To convert a natural minor scale into melodic minor, raise both the sixth and seventh notes by a half step.",
  },
  {
    id: "l22-text-melodic-ascending",
    prompt: { kind: "text", text: "When is melodic minor usually used?" },
    answer: choices(
      ["Only when descending", "In both directions equally", "Only when ascending", "Only in place of major scales"],
      2,
    ),
    rule: "Usually, melodic minor is used only when ascending.",
  },
  {
    id: "l22-text-descending-natural",
    prompt: { kind: "text", text: "When descending, which scale do composers prefer to use?" },
    answer: choices(
      ["The natural minor scale", "The harmonic minor scale", "The melodic minor scale with raised notes", "The major scale"],
      0,
    ),
    rule: "When descending, composers prefer to use the natural minor scale.",
  },
  {
    id: "l22-text-no-accidentals",
    prompt: { kind: "text", text: "Which of these minor scales uses no accidentals?" },
    answer: choices(["C natural minor", "A natural minor", "G# natural minor", "F natural minor"], 1),
    rule: "The A natural minor scale has no notes with accidentals: A B C D E F G.",
  },
  {
    id: "l22-text-gs-sharps",
    prompt: { kind: "text", text: "How many sharps does G# natural minor have?" },
    answer: choices(["Four", "Five", "Six", "Three"], 1),
    rule: "The G# natural minor scale has five sharps: G#, A#, C#, D# and F#.",
  },
  {
    id: "l22-text-c-flats",
    prompt: { kind: "text", text: "How many flats does C natural minor have?" },
    answer: choices(["Three", "Two", "Four", "One"], 0),
    rule: "The C natural minor scale has three flats: Eb, Ab and Bb.",
  },
  {
    id: "l22-text-c-harmonic-spelling",
    prompt: { kind: "text", text: "How is C harmonic minor spelled?" },
    answer: choices(
      [spelled("C", "naturalMinor"), spelled("C", "melodicMinor"), "C D Eb F G A Bb", spelled("C", "harmonicMinor")],
      3,
    ),
    rule: "C harmonic minor is C D Eb F G Ab B — the raised seventh replaces Bb with B.",
  },
  {
    id: "l22-text-c-melodic-spelling",
    prompt: { kind: "text", text: "How is C melodic minor spelled ascending?" },
    answer: choices(
      [spelled("C", "naturalMinor"), spelled("C", "harmonicMinor"), "C D Eb F G A Bb", spelled("C", "melodicMinor")],
      3,
    ),
    rule: "C melodic minor is C D Eb F G A B — the raised sixth and seventh replace Ab and Bb.",
  },
];

export const lesson22: LessonModule = {
  entry: requireLessonEntry(22),
  generateRounds: (rng) => sampleRounds(lesson22Pool, rng, ROUND_COUNT),
};

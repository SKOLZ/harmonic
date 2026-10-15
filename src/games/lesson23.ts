import {
  buildScale,
  degreeName,
  parseNote,
  scientificName,
  type ScaleType,
} from "../lib/theory";
import type { AnswerSpec, Round } from "../lib/rounds/types";
import { requireLessonEntry } from "./catalog";
import { sampleRounds } from "./rng";
import type { LessonModule } from "./types";

/**
 * Lesson 23 — Scale Degrees.
 *
 * Content source: musictheory.net lesson 23 (slide text pulled from the live
 * `lesson23.js`): "Each note of a scale has a special name, called a scale
 * degree." Tonic is the first (and last) note; dominant the fifth; subdominant
 * the fourth — "the same distance below the tonic as the dominant is above it
 * (a generic fifth)", with "sub" Latin for "under"; mediant the third, "in the
 * middle of the tonic and dominant"; submediant the sixth, "in the middle of
 * the upper tonic and subdominant"; supertonic the second, "super" Latin for
 * "above". The seventh is special: "If the seventh note is a half step below
 * the tonic, it is called a leading tone", leading tones "also occur in
 * harmonic minor and melodic minor", while "In natural minor, the seventh note
 * is a whole step below the tonic. In this case, the note is called a
 * subtonic." A number with a caret may also indicate a scale degree — the
 * dominant as a 5 with a caret.
 *
 * Corrections to the task's accepted reference, from the live site: none — all
 * eight degree names, their numbers, and the subtonic-for-the-lowered-
 * seventh distinction match. The site teaches more than the reference lists,
 * and all of it is incorporated: the generic-fifth symmetry of subdominant and
 * dominant, the Latin etymologies of sub-/super-, the mediant/submediant
 * "middle" reasoning, leading tones in harmonic and melodic minor, and the
 * caret notation.
 *
 * The degree names in the answer options come from `degreeName` in the theory
 * core, so the natural-minor 7th ("subtonic") versus every-other 7th
 * ("leading tone") distinction is the core's, not a re-typed copy; staff note
 * lists come from `buildScale`. Scale content stays on the staff (not the
 * keyboard) so the pool is 11 `staff` rounds + 11 `text` rounds = 22: any
 * draw of 12 must include at least one of each kind — the mix is structural,
 * not luck.
 */
const choices = (options: string[], correctIndex: number): AnswerSpec => ({
  kind: "choices",
  options,
  correctIndex,
});

/** The seven degrees of a scale, spelled for the staff. */
const scaleNotes = (root: string, type: ScaleType): string[] =>
  buildScale(parseNote(root), type).map(scientificName);

/** Capitalised degree name from the theory core: `degree("major", 5)` → "Dominant". */
const degree = (type: ScaleType, n: number): string => {
  const name = degreeName(type, n);
  return name.charAt(0).toUpperCase() + name.slice(1);
};

/** Rounds drawn per visit; the pool is larger so replays vary. */
const ROUND_COUNT = 12;

export const lesson23Pool: readonly Round[] = [
  // --- staff prompts: name the degree the page is asking about -------------
  {
    id: "l23-staff-c-major-dominant",
    prompt: { kind: "staff", clef: "treble", notes: scaleNotes("C4", "major"), duration: "q" },
    answer: choices([degree("major", 4), degree("major", 6), degree("major", 5), degree("major", 1)], 2),
    rule: "The fifth note of a scale is called the dominant.",
  },
  {
    id: "l23-staff-c-major-subdominant",
    prompt: { kind: "staff", clef: "treble", notes: scaleNotes("C4", "major"), duration: "q" },
    answer: choices([degree("major", 5), degree("major", 4), degree("major", 2), degree("major", 6)], 1),
    rule: "The fourth note is called the subdominant — the same distance below the tonic as the dominant is above it (a generic fifth).",
  },
  {
    id: "l23-staff-d-major-mediant",
    prompt: { kind: "staff", clef: "treble", notes: scaleNotes("D4", "major"), duration: "q" },
    answer: choices([degree("major", 6), degree("major", 5), degree("major", 3), degree("major", 2)], 2),
    rule: "The third note is called the mediant since it is in the middle of the tonic and dominant.",
  },
  {
    id: "l23-staff-d-major-submediant",
    prompt: { kind: "staff", clef: "treble", notes: scaleNotes("D4", "major"), duration: "q" },
    answer: choices([degree("major", 6), degree("major", 3), degree("major", 4), degree("major", 7)], 0),
    rule: "The submediant is the sixth degree, in the middle of the upper tonic and the subdominant.",
  },
  {
    id: "l23-staff-d-major-supertonic",
    prompt: { kind: "staff", clef: "treble", notes: scaleNotes("D4", "major"), duration: "q" },
    answer: choices([degree("major", 1), degree("major", 7), degree("major", 5), degree("major", 2)], 3),
    rule: "The second note is called the supertonic; super is Latin for above.",
  },
  {
    id: "l23-staff-a-minor-tonic",
    prompt: { kind: "staff", clef: "treble", notes: scaleNotes("A4", "naturalMinor"), duration: "q" },
    answer: choices([degree("major", 3), degree("major", 5), degree("naturalMinor", 1), degree("naturalMinor", 2)], 2),
    rule: "The first (and last) note of a scale is called the tonic — A begins and ends A natural minor.",
  },
  {
    id: "l23-staff-c-major-leading-tone",
    prompt: { kind: "staff", clef: "treble", notes: scaleNotes("C4", "major"), duration: "q" },
    answer: choices([degree("naturalMinor", 7), degree("major", 5), degree("major", 7), degree("major", 6)], 2),
    rule: "If the seventh note is a half step below the tonic it is called a leading tone: B in C major wants to lead into C.",
  },
  {
    id: "l23-staff-c-minor-subtonic",
    prompt: { kind: "staff", clef: "treble", notes: scaleNotes("C4", "naturalMinor"), duration: "q" },
    answer: choices([degree("naturalMinor", 7), degree("major", 7), degree("major", 4), degree("major", 5)], 0),
    rule: "In natural minor the seventh note is a whole step below the tonic, and in this case the note is called a subtonic.",
  },
  {
    id: "l23-staff-c-harmonic-leading-tone",
    prompt: { kind: "staff", clef: "treble", notes: scaleNotes("C4", "harmonicMinor"), duration: "q" },
    answer: choices([degree("naturalMinor", 7), degree("major", 6), degree("major", 3), degree("major", 7)], 3),
    rule: "Leading tones also occur in harmonic minor and melodic minor, where the seventh is again a half step below the tonic.",
  },
  {
    id: "l23-staff-g-major-fourth-bass",
    prompt: { kind: "staff", clef: "bass", notes: scaleNotes("G2", "major"), duration: "q" },
    answer: choices(["The third degree", "The fifth degree", "The fourth degree", "The seventh degree"], 2),
    rule: "The fourth note is the subdominant, and the prefix sub- is Latin for under or beneath.",
  },
  {
    id: "l23-staff-f-major-mediant-bass",
    prompt: { kind: "staff", clef: "bass", notes: scaleNotes("F2", "major"), duration: "q" },
    answer: choices(["The fifth degree", "The third degree", "The sixth degree", "The fourth degree"], 1),
    rule: "The mediant is the third scale degree, sitting in the middle of the tonic and the dominant.",
  },

  // --- text prompts: the degree vocabulary and its reasoning ----------------
  {
    id: "l23-text-what-is-a-scale-degree",
    prompt: { kind: "text", text: "What is a scale degree?" },
    answer: choices(
      ["A special name for each note of a scale", "The distance between two notes", "A type of chord", "The number of notes in a key"],
      0,
    ),
    rule: "Each note of a scale has a special name, called a scale degree.",
  },
  {
    id: "l23-text-tonic",
    prompt: { kind: "text", text: "Which note of a scale is the tonic?" },
    answer: choices(["The fifth note", "The first and last note", "The fourth note", "The seventh note"], 1),
    rule: "The first (and last) note is called the tonic.",
  },
  {
    id: "l23-text-dominant",
    prompt: { kind: "text", text: "Which note of a scale is the dominant?" },
    answer: choices(["The fourth note", "The sixth note", "The fifth note", "The first note"], 2),
    rule: "The fifth note is called the dominant.",
  },
  {
    id: "l23-text-subdominant",
    prompt: { kind: "text", text: "Which note of a scale is the subdominant?" },
    answer: choices(["The fifth note", "The second note", "The third note", "The fourth note"], 3),
    rule: "The fourth note is called the subdominant — the same distance below the tonic as the dominant is above it.",
  },
  {
    id: "l23-text-why-subdominant",
    prompt: { kind: "text", text: "Why is the fourth degree called the subdominant?" },
    answer: choices(
      ["It lies a half step above the tonic", "It lies in the middle of the tonic and dominant", "It is the highest note of the scale", "It lies the same distance below the tonic as the dominant lies above it"],
      3,
    ),
    rule: "The prefix sub- is Latin for under or beneath: the subdominant lies a generic fifth below the tonic while the dominant lies a fifth above.",
  },
  {
    id: "l23-text-why-mediant",
    prompt: { kind: "text", text: "Why is the third degree called the mediant?" },
    answer: choices(
      ["It lies above the dominant", "It lies in the middle of the tonic and dominant", "It is a half step below the tonic", "It is the first note of the scale"],
      1,
    ),
    rule: "The mediant is named for sitting in the middle of the tonic and the dominant.",
  },
  {
    id: "l23-text-why-submediant",
    prompt: { kind: "text", text: "Why is the sixth degree called the submediant?" },
    answer: choices(
      ["It lies a whole step above the tonic", "It leads into the tonic", "It lies in the middle of the upper tonic and the subdominant", "It sits directly above the dominant"],
      2,
    ),
    rule: "The sixth note is the submediant since it is in the middle of the upper tonic and the subdominant.",
  },
  {
    id: "l23-text-super",
    prompt: { kind: "text", text: "What does super mean in supertonic?" },
    answer: choices(["Below", "Above", "Half", "Double"], 1),
    rule: "The second note is called the supertonic. Super is Latin for above.",
  },
  {
    id: "l23-text-leading-tone",
    prompt: { kind: "text", text: "When is the seventh degree called a leading tone?" },
    answer: choices(
      ["When it is a whole step below the tonic", "When it is a fifth above the tonic", "When it is the last note of the scale", "When it is a half step below the tonic"],
      3,
    ),
    rule: "If the seventh note is a half step below the tonic, it is called a leading tone.",
  },
  {
    id: "l23-text-subtonic",
    prompt: { kind: "text", text: "What is the seventh degree of a natural minor scale called?" },
    answer: choices(["The leading tone", "The submediant", "The subtonic", "The dominant"], 2),
    rule: "In natural minor the seventh note is a whole step below the tonic; in this case the note is called a subtonic.",
  },
  {
    id: "l23-text-caret",
    prompt: { kind: "text", text: "How can a number mark a scale degree?" },
    answer: choices(
      ["A negative number", "A number with a caret over it — the dominant as a 5 with a caret", "A number inside brackets", "A number followed by a flat"],
      1,
    ),
    rule: "A number with a caret may also be used to indicate a scale degree — for example the dominant may be labelled as a 5 with a caret.",
  },
];

export const lesson23: LessonModule = {
  entry: requireLessonEntry(23),
  generateRounds: (rng) => sampleRounds(lesson23Pool, rng, ROUND_COUNT),
};

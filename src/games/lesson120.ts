import { parseNote, scientificName, type Note, type ScaleType } from "../lib/theory";
import type { AnswerSpec, Round } from "../lib/rounds/types";
import { requireLessonEntry } from "./catalog";
import { deriveNeapolitan } from "../lib/theory/neapolitan";
import { sampleStratifiedRounds } from "./rng";
import type { LessonModule } from "./types";

/**
 * Lesson 120 — Building Neapolitan Chords.
 *
 * Content source: musictheory.net lesson 120 (slide text pulled from the live
 * `lesson120.js`). The site defines the chord — "A *Neapolitan chord* is
 * simply a major triad that is built on a special note"; "This note is the
 * lowered second degree (the supertonic) of a major or minor scale" — then
 * works four keys step by step: first "figure out the second scale degree",
 * then "we will lower it" (C minor: D → Db; E minor: F# → F natural;
 * Ab major: Bb → Bbb; A major: B → Bb), then "build a major triad" (Db–F–Ab,
 * F–A–C, Bbb–Db–Fb, Bb–D–F), closing each with the conclusion sentence
 * ("Thus, a {Bbb} major chord is the Neapolitan of {Ab} Major." and so on).
 * Every staff round rebuilds its chord through the core (`deriveNeapolitan`)
 * and sounds exactly the MIDI the site's own `sounds` payload plays for the
 * finished chord; the doubled rounds are the same chord with the root again
 * an octave higher.
 *
 * No key signature is drawn: the four worked keys span different signatures
 * (and Bbb/Fb spellings no signature would suppress anyway), so each chord
 * carries its own accidentals. The pool is 8 `staff` + 12 `text` = 20, drawn
 * stratified with one staff and one text round guaranteed per 12-round draw.
 *
 * Site wording note: the slides never say "half step" in so many words, but
 * every one of the four worked "lowerings" is exactly one semitone on the
 * same letter — the core asserts that distance at generation time, so the
 * rules may state it.
 */
const choices = (options: string[], correctIndex: number): AnswerSpec => ({
  kind: "choices",
  options,
  correctIndex,
});

/** Choices whose correct index is the answer's own position in `options`. */
function answerChoices(answer: string, options: readonly string[]): AnswerSpec {
  const correctIndex = options.indexOf(answer);
  if (correctIndex < 0) {
    throw new Error(`lesson120: answer ${JSON.stringify(answer)} missing from options`);
  }
  return choices([...options], correctIndex);
}

/** Note name without octave ("Db", "Bbb") — the site's spelling habit. */
function noteName(note: Note): string {
  return scientificName(note).replace(/\d+$/, "");
}

/** English article for a chord root name ("a Db", "an F"). */
function articleOf(name: string): string {
  return /^[AEIO]/.test(name) ? "an" : "a";
}

interface KeyFact {
  label: string;
  root: string;
  scaleType: ScaleType;
}

/** The four keys the site works through, in lesson order. */
const KEYS = {
  c: { label: "C minor", root: "C", scaleType: "naturalMinor" },
  e: { label: "E minor", root: "E", scaleType: "naturalMinor" },
  ab: { label: "Ab major", root: "Ab", scaleType: "major" },
  a: { label: "A major", root: "A", scaleType: "major" },
} as const satisfies Record<string, KeyFact>;

const OPTION = {
  c: "The Neapolitan of C minor",
  e: "The Neapolitan of E minor",
  ab: "The Neapolitan of Ab major",
  a: "The Neapolitan of A major",
} as const;

interface StaffEntry {
  id: string;
  key: KeyFact;
  answer: string;
  doubled: boolean;
  options: readonly string[];
}

/** Eight staff rounds: the site's four Neapolitans, close and octave-doubled. */
const STAFF: readonly StaffEntry[] = [
  {
    id: "l120-staff-c-close",
    key: KEYS.c,
    answer: OPTION.c,
    doubled: false,
    options: [OPTION.e, OPTION.c, OPTION.ab, OPTION.a],
  },
  {
    id: "l120-staff-e-close",
    key: KEYS.e,
    answer: OPTION.e,
    doubled: false,
    options: [OPTION.e, OPTION.c, OPTION.ab, OPTION.a],
  },
  {
    id: "l120-staff-ab-close",
    key: KEYS.ab,
    answer: OPTION.ab,
    doubled: false,
    options: [OPTION.c, OPTION.e, OPTION.a, OPTION.ab],
  },
  {
    id: "l120-staff-a-close",
    key: KEYS.a,
    answer: OPTION.a,
    doubled: false,
    options: [OPTION.c, OPTION.e, OPTION.ab, OPTION.a],
  },
  {
    id: "l120-staff-c-oct",
    key: KEYS.c,
    answer: OPTION.c,
    doubled: true,
    options: [OPTION.ab, OPTION.a, OPTION.c, OPTION.e],
  },
  {
    id: "l120-staff-e-oct",
    key: KEYS.e,
    answer: OPTION.e,
    doubled: true,
    options: [OPTION.c, OPTION.e, OPTION.ab, OPTION.a],
  },
  {
    id: "l120-staff-ab-oct",
    key: KEYS.ab,
    answer: OPTION.ab,
    doubled: true,
    options: [OPTION.c, OPTION.ab, OPTION.e, OPTION.a],
  },
  {
    id: "l120-staff-a-oct",
    key: KEYS.a,
    answer: OPTION.a,
    doubled: true,
    options: [OPTION.a, OPTION.c, OPTION.e, OPTION.ab],
  },
];

/** One worked key as a staff round: derived chord, site conclusion as answer. */
const staffRound = (entry: StaffEntry): Round => {
  const { second, lowered, triad } = deriveNeapolitan(
    parseNote(`${entry.key.root}4`),
    entry.key.scaleType,
  );
  const rootName = noteName(lowered);
  const notes = entry.doubled
    ? [...triad, { ...triad[0]!, octave: (triad[0]!.octave ?? 4) + 1 }]
    : triad;
  const spelled = notes.map(noteName).join("–");
  const doubledNote = entry.doubled ? " The root sounds again an octave higher." : "";
  return {
    id: entry.id,
    prompt: {
      kind: "staff",
      clef: "treble",
      notes: notes.map((note) => scientificName(note)),
      duration: "q",
      simultaneous: true,
    },
    answer: answerChoices(entry.answer, entry.options),
    rule:
      `${spelled} is ${articleOf(rootName)} ${rootName} major chord — the Neapolitan of ${entry.key.label}: ` +
      `the major triad on the lowered second degree (${noteName(second)} lowered by one half step to ${rootName}).` +
      doubledNote,
  };
};

/** Twelve text rounds: the site's definition, steps and conclusions. */
const TEXT_ROUNDS: readonly Round[] = [
  {
    id: "l120-text-chord-kind",
    prompt: { kind: "text", text: "What is a Neapolitan chord?" },
    answer: answerChoices("A major triad built on a special note", [
      "A major triad built on a special note",
      "A diminished triad built on the leading tone",
      "A minor triad built on the subdominant",
      "An augmented triad built on the mediant",
    ]),
    rule: "A Neapolitan chord is simply a major triad built on a special note.",
  },
  {
    id: "l120-text-special-note",
    prompt: { kind: "text", text: "Which note is a Neapolitan chord built on?" },
    answer: answerChoices("The lowered second degree (the supertonic)", [
      "The raised leading tone",
      "The lowered fourth degree",
      "The lowered second degree (the supertonic)",
      "The raised submediant",
    ]),
    rule: "The special note is the lowered second degree (the supertonic) of the scale.",
  },
  {
    id: "l120-text-scales",
    prompt: {
      kind: "text",
      text: "The Neapolitan's root is the lowered second degree of which scales?",
    },
    answer: answerChoices("A major or minor scale", [
      "Whole-tone scales only",
      "A major or minor scale",
      "Only the harmonic minor scale",
      "Pentatonic scales only",
    ]),
    rule: "This note is the lowered second degree (the supertonic) of a major or minor scale.",
  },
  {
    id: "l120-text-step1",
    prompt: { kind: "text", text: "What is the first step when building a Neapolitan?" },
    answer: answerChoices("Figure out the second scale degree", [
      "Spell the key signature",
      "Choose an inversion",
      "Build the triad first",
      "Figure out the second scale degree",
    ]),
    rule: "First, figure out the second scale degree.",
  },
  {
    id: "l120-text-step2",
    prompt: { kind: "text", text: "How do we alter the second scale degree?" },
    answer: answerChoices("Lower it by one half step", [
      "Lower it by one half step",
      "Raise it by one half step",
      "Lower it by a whole step",
      "Leave it unchanged",
    ]),
    rule:
      "Next, we lower that degree by one half step — Db sits a half step below D, and F a half step below F#, " +
      "exactly as in the worked examples.",
  },
  {
    id: "l120-text-step3",
    prompt: { kind: "text", text: "What kind of triad do we build on the lowered degree?" },
    answer: answerChoices("A major triad", [
      "A diminished triad",
      "A minor triad",
      "A major triad",
      "An augmented triad",
    ]),
    rule: "Now build a major triad; the C minor example results in Db–F–Ab.",
  },
  {
    id: "l120-text-degree-c",
    prompt: { kind: "text", text: "In C minor, what is the second scale degree?" },
    answer: answerChoices("D", ["C", "D", "E", "F"]),
    // The question's pitch is the tonic named by the key; the degree the
    // learner counts stays off the page (the lesson-21 starting-root shape).
    illustration: { clef: "treble", notes: ["C4"] },
    rule: "In C minor, the second scale degree is D.",
  },
  {
    id: "l120-text-degree-e",
    prompt: { kind: "text", text: "In E minor, what is the second scale degree?" },
    answer: answerChoices("F#", ["F#", "E", "G", "D"]),
    illustration: { clef: "treble", notes: ["E4"] },
    rule: "In E minor, the second scale degree is F#.",
  },
  {
    id: "l120-text-degree-a",
    prompt: { kind: "text", text: "In A major, what is the second scale degree?" },
    answer: answerChoices("B", ["G", "A", "B", "C"]),
    illustration: { clef: "treble", notes: ["A4"] },
    rule: "In A major, the second scale degree is B.",
  },
  {
    id: "l120-text-lower-ab",
    prompt: {
      kind: "text",
      text: "In Ab major the second scale degree is Bb. What is it lowered to?",
    },
    answer: answerChoices("Bbb", ["A", "Bb", "Bbb", "B"]),
    // Bb — the degree to lower — is the question's named pitch; the lowered
    // answer Bbb stays off the page.
    illustration: { clef: "treble", notes: ["Bb4"] },
    rule:
      "In Ab major the second scale degree is Bb; lowering it one half step gives Bbb, " +
      "and the major triad on Bbb spells Bbb–Db–Fb.",
  },
  {
    id: "l120-text-concl-e",
    prompt: { kind: "text", text: "Which chord is the Neapolitan of E minor?" },
    answer: answerChoices("F major", ["F major", "Ab major", "G major", "F minor"]),
    // The named key's tonic anchors the lesson's three-step process; the
    // derived chord ("F major") is prose the learner builds, never a glyph.
    illustration: { clef: "treble", notes: ["E4"] },
    rule: "Thus, an F major chord is the Neapolitan of E minor.",
  },
  {
    id: "l120-text-concl-ab",
    prompt: { kind: "text", text: "Which chord is the Neapolitan of Ab major?" },
    answer: answerChoices("Bbb major", ["Fb major", "Db major", "Bbb major", "Bb major"]),
    illustration: { clef: "treble", notes: ["Ab4"] },
    rule: "Thus, a Bbb major chord is the Neapolitan of Ab major.",
  },
];

/** Rounds drawn per visit; the pool is larger so replays vary. */
const ROUND_COUNT = 12;

/** Kinds every draw must contain; `sampleStratifiedRounds` enforces it. */
const REQUIRED_KINDS = ["staff", "text"] as const;

export const lesson120Pool: readonly Round[] = [
  ...STAFF.map(staffRound),
  ...TEXT_ROUNDS,
];

export const lesson120: LessonModule = {
  entry: requireLessonEntry(120),
  generateRounds: (rng) =>
    sampleStratifiedRounds(lesson120Pool, REQUIRED_KINDS, rng, ROUND_COUNT),
};

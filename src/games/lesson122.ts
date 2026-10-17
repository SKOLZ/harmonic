import {
  buildSeventh,
  buildTriad,
  chordInversion,
  inversionFigure,
  letterIndex,
  parseNote,
  romanNumeral,
  romanNumeralSeventh,
  scientificName,
  type Letter,
} from "../lib/theory";
import type { AnswerSpec, Round } from "../lib/rounds/types";
import { requireLessonEntry } from "./catalog";
import { ascendingVoicing, neapolitanSixth } from "../lib/theory/neapolitan";
import { sampleStratifiedRounds } from "./rng";
import type { LessonModule } from "./types";

/**
 * Lesson 122 — Analysis: Moonlight Sonata.
 *
 * Content source: musictheory.net lesson 122 (slide text pulled from the live
 * `lesson122.js`). The site examines "measures 49-51 of Beethoven's
 * _Moonlight Sonata_ (Opus 27, Number 2, Movement 1)": "Since we are starting
 * in the middle of the piece, I will reveal the key signature: it is in
 * {C#} minor"; measure 49 holds "{G#}–{B#}–{D#}–{F#}, a {G#} dominant
 * seventh chord. Since the {B#} is the lowest note, the chord is in first
 * inversion", then "{C#}–{E}–{G#}, a {C#} minor triad"; measure 50 holds
 * "{D}–{F#}–{A}, a {D} major triad in first inversion. This is the
 * Neapolitan sixth chord in {C#} minor", then "{G#}–{B#}–{F#}, a {G#
 * dominant seventh chord with a missing fifth"; measure 51 opens with
 * "another {C#} minor triad".
 *
 * SCOPE + CONTRACT (reported to the parent): the site's visuals are
 * canvas-drawn scores (`ui_lessons.js` paints frames to a 640×240 canvas) —
 * there is no extractable engraving and the lesson ships `has-sound-stream`
 * instead of a `sounds` map — so each round reconstructs one chord of the
 * analysis as a single stacked staff prompt under C# minor's signature
 * (four sharps, drawn as the relative major E, which is what a key signature
 * field names), with the slide's spelled pitch classes as the oracle. The
 * site states no roman numerals in this lesson; the numerals in the rules
 * (V6/5, i, V7) are core-derived here, and the learner-facing answers stay
 * the site's own phrases. The pool is 7 `staff` + 8 `text` = 15, drawn
 * stratified with one staff and one text round guaranteed per 12-round draw.
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
    throw new Error(`lesson122: answer ${JSON.stringify(answer)} missing from options`);
  }
  return choices([...options], correctIndex);
}

/** The analysis key: C# minor; degree math compares letters only. */
const KEY_TONIC: Letter = "C";

/** Degree of a letter within C# minor (C# = 1, D# = 2, … G# = 5). */
function degreeInKey(letter: Letter): number {
  return (((letterIndex(letter) - letterIndex(KEY_TONIC)) % 7 + 7) % 7) + 1;
}

/**
 * The measure-49 numeral. `romanNumeralSeventh` already embeds the
 * root-position seventh's suffix (dominantSeventh → "V7"), so a first-
 * inversion figure REPLACES that trailing "7" instead of stacking on it
 * (the T12b lesson-62 gotcha: composing the two yields "V76/5").
 */
const V65 = (() => {
  const v7 = romanNumeralSeventh("dominantSeventh", degreeInKey("G"));
  if (!v7.endsWith("7")) {
    throw new Error(`lesson122: unexpected dominant-seventh symbol ${v7}`);
  }
  return v7.slice(0, -1) + inversionFigure("seventh", 1);
})();

const I_SYMBOL = romanNumeral("minor", degreeInKey("C"));
const V7_SYMBOL = romanNumeralSeventh("dominantSeventh", degreeInKey("G"));

/** Measure 49's V7 in first inversion: G# dominant seventh, B# in the bass. */
function v65Voicing(rootOctave: number): string[] {
  const seventh = buildSeventh(parseNote(`G#${rootOctave}`), "dominantSeventh");
  return ascendingVoicing(chordInversion(seventh, 1)).map((note) => scientificName(note));
}

/** Measure 50's second half: the G# dominant seventh with no fifth. */
function v7WithoutFifth(): string[] {
  return buildSeventh(parseNote("G#4"), "dominantSeventh")
    .filter((_, index) => index !== 2)
    .map((note) => scientificName(note));
}

const ANSWERS = {
  v65: "A G# dominant seventh chord in first inversion",
  minorTriad: "A C# minor triad",
  n6: "The Neapolitan sixth chord in C# minor",
  v7missing: "A G# dominant seventh chord with a missing fifth",
} as const;

interface StaffEntry {
  id: string;
  notes: readonly string[];
  answer: string;
  options: readonly string[];
  rule: string;
}

/** The seven analysed chords of measures 49–50, spelled as the slides do. */
const STAFF_ENTRIES: readonly StaffEntry[] = [
  {
    id: "l122-staff-m49a",
    notes: v65Voicing(4),
    answer: ANSWERS.v65,
    options: [
      "A G# dominant seventh chord in root position",
      ANSWERS.v65,
      "A C# minor seventh chord",
      "A D# major triad",
    ],
    rule:
      `B#–D#–F#–G# with the B# lowest is the G# dominant seventh chord in first inversion — ` +
      `${V65} in C# minor (the B# is the lowest note).`,
  },
  {
    id: "l122-staff-m49a-low",
    notes: v65Voicing(3),
    answer: ANSWERS.v65,
    options: [
      "A D# dominant seventh chord",
      "A C# minor seventh chord",
      ANSWERS.v65,
      "A G# dominant seventh chord in root position",
    ],
    rule:
      `B#–D#–F#–G# an octave lower is still the G# dominant seventh chord in first inversion — ` +
      `${V65} in C# minor.`,
  },
  {
    id: "l122-staff-m49b",
    notes: buildTriad(parseNote("C#4"), "minor").map((note) => scientificName(note)),
    answer: ANSWERS.minorTriad,
    options: ["An E minor triad", ANSWERS.minorTriad, "A G# major triad", "A D# diminished triad"],
    rule: `C#–E–G# is a C# minor triad in root position — ${I_SYMBOL} in C# minor.`,
  },
  {
    // The site's canvas shows the triad spread rather than closed; the slide
    // text fixes only the pitch classes (C#–E–G#) and the root position.
    id: "l122-staff-m49b-wide",
    notes: ["C#4", "G#4", "C#5", "E5"],
    answer: ANSWERS.minorTriad,
    options: [ANSWERS.minorTriad, "An A major triad", "A G# dominant seventh chord", "A D# minor triad"],
    rule:
      `C#–G#–C#–E is the same C# minor triad spread wider — still ${I_SYMBOL} in C# minor.`,
  },
  {
    id: "l122-staff-m50a",
    notes: neapolitanSixth(parseNote("C#4"), "naturalMinor").map((note) => scientificName(note)),
    answer: ANSWERS.n6,
    options: [
      "A II major triad in first inversion",
      "A IV chord",
      "The subdominant seventh",
      ANSWERS.n6,
    ],
    rule:
      "F#–A–D with the F# lowest is a D major triad in first inversion — " +
      "the Neapolitan sixth chord in C# minor; D is the lowered second degree.",
  },
  {
    id: "l122-staff-m50a-wide",
    notes: [
      ...neapolitanSixth(parseNote("C#4"), "naturalMinor").map((note) => scientificName(note)),
      scientificName({
        ...neapolitanSixth(parseNote("C#4"), "naturalMinor")[0]!,
        octave: 5,
      }),
    ],
    answer: ANSWERS.n6,
    options: [
      ANSWERS.n6,
      "A diminished seventh chord",
      "A half-diminished seventh chord",
      "A Neapolitan chord in root position",
    ],
    rule:
      "F#–A–D–F# is the Neapolitan sixth again, with the bass F# doubled above: " +
      "the D major triad in first inversion.",
  },
  {
    id: "l122-staff-m50b",
    notes: v7WithoutFifth(),
    answer: ANSWERS.v7missing,
    options: [
      ANSWERS.v7missing,
      "A G# dominant seventh chord in root position",
      "An F# dominant seventh chord",
      "A C# minor seventh chord",
    ],
    rule:
      `G#–B#–F# is the G# dominant seventh chord in root position, missing its fifth — ` +
      `${V7_SYMBOL} in C# minor with only root, third and seventh sounding.`,
  },
];

const staffRound = (entry: StaffEntry): Round => ({
  id: entry.id,
  prompt: {
    kind: "staff",
    clef: "treble",
    notes: [...entry.notes],
    keySignature: "E",
    duration: "q",
    simultaneous: true,
  },
  answer: answerChoices(entry.answer, entry.options),
  rule: entry.rule,
});

/** Eight text rounds: the site's key, measure and identification conclusions. */
const TEXT_ROUNDS: readonly Round[] = [
  {
    id: "l122-text-measures",
    prompt: {
      kind: "text",
      text: "Which measures of Moonlight Sonata does this analysis examine?",
    },
    answer: answerChoices("Measures 49-51", [
      "Measures 1-3",
      "Measures 49-51",
      "Measures 20-22",
      "Measures 70-72",
    ]),
    rule:
      "The analysis examines measures 49-51 of Beethoven's Moonlight Sonata " +
      "(Opus 27, Number 2, Movement 1).",
  },
  {
    id: "l122-text-key",
    prompt: { kind: "text", text: "What key does the revealed key signature show?" },
    answer: answerChoices("C# minor", ["C# major", "F# minor", "C# minor", "A major"]),
    rule: "Starting in the middle of the piece, the lesson reveals the key signature: C# minor.",
  },
  {
    id: "l122-text-why-reveal",
    prompt: { kind: "text", text: "Why is the key revealed before the analysis?" },
    answer: answerChoices("Because the analysis starts in the middle of the piece", [
      "Because the piece has no key signature",
      "Because the analysis starts in the middle of the piece",
      "Because the piece modulates immediately",
      "Because measure 49 opens the piece",
    ]),
    rule:
      "Because the analysis starts in the middle of the piece, the key signature " +
      "(four sharps, C# minor) is revealed up front.",
  },
  {
    id: "l122-text-lowest-49",
    prompt: { kind: "text", text: "Which note is the lowest in the first half of measure 49?" },
    answer: answerChoices("B#", ["G#", "D#", "F#", "B#"]),
    rule:
      "In the first half of measure 49 the B# is the lowest note, " +
      "so the G# dominant seventh chord sounds in first inversion.",
  },
  {
    id: "l122-text-missing-50",
    prompt: { kind: "text", text: "Which chord tone is missing from the second half of measure 50?" },
    answer: answerChoices("The fifth", ["The third", "The root", "The fifth", "The seventh"]),
    rule:
      "The second half of measure 50 sounds G#–B#–F# — the root, third and seventh " +
      "of the G# dominant seventh (V7), missing its fifth, D#.",
  },
  {
    id: "l122-text-m50-identify",
    prompt: { kind: "text", text: "How is the D major triad in measure 50 identified?" },
    answer: answerChoices(ANSWERS.n6, [
      ANSWERS.n6,
      "A secondary dominant",
      "The IV chord in first inversion",
      "An augmented sixth chord",
    ]),
    // Root-alone (the lesson-40 shape): the question names the triad by root,
    // so D goes on the page and the identification stays the learner's work.
    illustration: { clef: "treble", notes: ["D4"] },
    rule:
      "The first half of measure 50 holds D–F#–A with F# in the bass: " +
      "the Neapolitan sixth chord in C# minor.",
  },
  {
    id: "l122-text-why-neapolitan",
    prompt: { kind: "text", text: "Why is D–F#–A a Neapolitan in C# minor?" },
    answer: answerChoices("D is the lowered second degree of C# minor", [
      "D is the lowered second degree of C# minor",
      "D is the leading tone of C# minor",
      "A is the dominant of C# minor",
      "F# is the mediant of C# minor",
    ]),
    // The question names the full triad D–F#–A, so the engraving draws those
    // pitches as one stacked chord; the answer is the reason (prose), which a
    // bare D-major triad on the staff does not display.
    illustration: { clef: "treble", notes: ["D4", "F#4", "A4"], simultaneous: true },
    rule:
      "In C# minor the second scale degree is D#; lowered one half step it becomes D, " +
      "so a D major triad there is the Neapolitan sixth.",
  },
  {
    id: "l122-text-m51",
    prompt: { kind: "text", text: "Which chord contains the first part of measure 51?" },
    answer: answerChoices(ANSWERS.minorTriad, [
      ANSWERS.minorTriad,
      "A D major triad",
      "A G# dominant seventh chord",
      "A B# diminished triad",
    ]),
    rule: "The first part of measure 51 contains C#–E–G# — another C# minor triad (i in C# minor).",
  },
];

/** Rounds drawn per visit; the pool is larger so replays vary. */
const ROUND_COUNT = 12;

/** Kinds every draw must contain; `sampleStratifiedRounds` enforces it. */
const REQUIRED_KINDS = ["staff", "text"] as const;

export const lesson122Pool: readonly Round[] = [
  ...STAFF_ENTRIES.map(staffRound),
  ...TEXT_ROUNDS,
];

export const lesson122: LessonModule = {
  entry: requireLessonEntry(122),
  generateRounds: (rng) =>
    sampleStratifiedRounds(lesson122Pool, REQUIRED_KINDS, rng, ROUND_COUNT),
};

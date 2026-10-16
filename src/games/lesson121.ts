import {
  buildScale,
  chordInversion,
  degreeNote,
  parseNote,
  scientificName,
  type Note,
  type ScaleType,
} from "../lib/theory";
import type { AnswerSpec, Round } from "../lib/rounds/types";
import { requireLessonEntry } from "./catalog";
import { ascendingVoicing, neapolitanSixth } from "./neapolitan";
import { sampleStratifiedRounds } from "./rng";
import type { LessonModule } from "./types";

/**
 * Lesson 121 — Using Neapolitan Chords.
 *
 * Content source: musictheory.net lesson 121 (slide text pulled from the live
 * `lesson121.js`). The site: "Although root position and second inversion
 * Neapolitans exist, first inversion is normally used"; "In this inversion,
 * the Neapolitan is called a *Neapolitan sixth*"; "Notice that the
 * Neapolitan sixth's bass note is the same as a first inversion {iio} (or
 * {ii}) or a root position {iv} (or {IV})"; "For this reason, it often
 * substitutes for these chords. Hence, it primarily functions as a
 * predominant." Two played examples follow, both in C minor: i–VI–{ii6}–V–i
 * with the {ii6} replaced by a Neapolitan sixth on the repeat, and
 * i–iv–i6/4–V–i with the iv replaced.
 *
 * SITE LOOSENESS (reported to the parent, re-derived rather than encoded):
 * the example slide writes `{ii6}`, but the site's own `sounds` payload for
 * that chord ([41, 56, 65, 74] = F–Ab–D) is a DIMINISHED supertonic triad in
 * first inversion — ii°6 in C minor — matching the same lesson's earlier
 * `{iio}` spelling and the harmonic minor's quality on degree 2. The pool
 * therefore teaches the quality-correct pair (ii°6 in minor, ii6 in major)
 * and the rules spell the example chord ii°6.
 *
 * Staff voicings reconstruct the site's shared-bass fact in treble register
 * (the site's visuals are canvas-drawn scores, not extractable notation):
 * every chord around the common bass F, derived through the core
 * (`buildScale`/`degreeNote` third-stacking, `chordInversion`,
 * `neapolitanSixth`), and asserted against the site's sounded MIDI pitch
 * classes. No key signature is drawn —
 * the rounds mix C major and C minor sonorities, and a signature would
 * silently respell or hide accidentals for half of them. The pool is
 * 7 `staff` + 9 `text` = 16, drawn stratified with one staff and one text
 * round guaranteed per 12-round draw.
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
    throw new Error(`lesson121: answer ${JSON.stringify(answer)} missing from options`);
  }
  return choices([...options], correctIndex);
}

/** A diatonic triad of C, rotated `rotations` times and lifted to ascend. */
function diatonicVoicing(scaleType: ScaleType, degree: number, rotations: number): Note[] {
  const scale = buildScale(parseNote("C4"), scaleType);
  // degreeNote wraps above the scale's top octave, so lift into one ascending
  // stack before rotating (the same lift pattern neapolitanSixth uses).
  const triad = ascendingVoicing([
    degreeNote(scale, degree),
    degreeNote(scale, degree + 2),
    degreeNote(scale, degree + 4),
  ]);
  return ascendingVoicing(chordInversion(triad, rotations));
}

/** The site's Neapolitan sixth of C minor: F–Ab–Db, F in the bass. */
function n6Voicing(): Note[] {
  return neapolitanSixth(parseNote("C4"), "naturalMinor");
}

interface StaffEntry {
  id: string;
  notes: readonly string[];
  answer: string;
  options: readonly string[];
  rule: string;
}

/** Seven staff rounds around the shared bass F the site's chart teaches. */
const STAFF_ENTRIES: readonly StaffEntry[] = [
  {
    id: "l121-staff-n6-close",
    notes: n6Voicing().map((note) => scientificName(note)),
    answer: "The Neapolitan sixth",
    options: ["ii°6", "The Neapolitan sixth", "iv", "V"],
    rule:
      "F–Ab–Db with F in the bass is a Db major triad in first inversion — the Neapolitan sixth of C minor; " +
      "its bass F is the same as the ii°6's and the iv's.",
  },
  {
    id: "l121-staff-n6-wide",
    notes: [
      ...n6Voicing().map((note) => scientificName(note)),
      scientificName({ ...n6Voicing()[0]!, octave: 5 }),
    ],
    answer: "The Neapolitan sixth",
    options: ["The Neapolitan sixth", "iv", "ii6", "V"],
    rule:
      "F–Ab–Db–F is the Neapolitan sixth again, with the bass F doubled on top: " +
      "first inversion of the Db major triad, the Neapolitan sixth of C minor.",
  },
  {
    id: "l121-staff-iio6",
    notes: diatonicVoicing("naturalMinor", 2, 1).map((note) => scientificName(note)),
    answer: "ii°6",
    options: ["ii6", "iv", "ii°6", "V"],
    rule:
      "F–Ab–D is a D diminished triad in first inversion — the ii°6 of C minor; " +
      "in a major key the same bass supports a ii6.",
  },
  {
    id: "l121-staff-ii6",
    notes: diatonicVoicing("major", 2, 1).map((note) => scientificName(note)),
    answer: "ii6",
    options: ["ii6", "ii°6", "IV", "V"],
    rule:
      "F–A–D is a D minor triad in first inversion — the ii6 in C major; " +
      "in minor that supertonic triad is diminished (ii°6).",
  },
  {
    id: "l121-staff-iv",
    notes: diatonicVoicing("naturalMinor", 4, 0).map((note) => scientificName(note)),
    answer: "iv",
    options: ["IV", "iv", "ii°6", "N6"],
    rule:
      "F–Ab–C is an F minor triad in root position — the iv of C minor, " +
      "whose bass the Neapolitan sixth shares.",
  },
  {
    id: "l121-staff-iv-major",
    notes: diatonicVoicing("major", 4, 0).map((note) => scientificName(note)),
    answer: "IV",
    options: ["iv", "N6", "IV", "V"],
    rule:
      "F–A–C is an F major triad in root position — the IV in C major, " +
      "whose bass the Neapolitan sixth shares.",
  },
  {
    id: "l121-staff-v",
    notes: diatonicVoicing("major", 5, 0).map((note) => scientificName(note)),
    answer: "V",
    options: ["V", "iv", "ii6", "ii°6"],
    rule:
      "G–B–D is a G major triad in root position — the V of C minor; " +
      "the example progression moves from the ii°6 stand-in to this V and on to i.",
  },
];

const staffRound = (entry: StaffEntry): Round => ({
  id: entry.id,
  prompt: {
    kind: "staff",
    clef: "treble",
    notes: [...entry.notes],
    duration: "q",
    simultaneous: true,
  },
  answer: answerChoices(entry.answer, entry.options),
  rule: entry.rule,
});

/** Nine text rounds: the site's usage chart in prose. */
const TEXT_ROUNDS: readonly Round[] = [
  {
    id: "l121-text-inversion",
    prompt: { kind: "text", text: "Which inversion of the Neapolitan is normally used?" },
    answer: answerChoices("First inversion", [
      "Second inversion",
      "First inversion",
      "Root position",
      "Third inversion",
    ]),
    rule: "Although root position and second inversion Neapolitans exist, first inversion is normally used.",
  },
  {
    id: "l121-text-name",
    prompt: { kind: "text", text: "What is the Neapolitan in first inversion called?" },
    answer: answerChoices("A Neapolitan sixth", [
      "A Neapolitan chord in root position",
      "A Neapolitan seventh",
      "A Neapolitan sixth",
      "A Neapolitan chord in second inversion",
    ]),
    rule: "In this inversion, the Neapolitan is called a Neapolitan sixth.",
  },
  {
    id: "l121-text-bass-share",
    prompt: {
      kind: "text",
      text: "The Neapolitan sixth's bass note is the same as which chords?",
    },
    answer: answerChoices(
      "A first-inversion ii° (ii in major) or a root-position iv (IV in major)",
      [
        "A first-inversion ii° (ii in major) or a root-position iv (IV in major)",
        "A root-position I or a first-inversion V",
        "A second-inversion vi or a root-position III",
        "A first-inversion V or a root-position ii",
      ],
    ),
    rule:
      "The Neapolitan sixth's bass note is the same as a first-inversion ii° " +
      "(ii in major) or a root-position iv (IV in major).",
  },
  {
    id: "l121-text-function",
    prompt: {
      kind: "text",
      text: "Because it often substitutes for those chords, what function does it primarily take?",
    },
    answer: answerChoices("Predominant", ["Dominant", "Tonic", "Cadential function", "Predominant"]),
    rule:
      "For this reason, it often substitutes for these chords; hence it primarily functions as a predominant.",
  },
  {
    id: "l121-text-others",
    prompt: { kind: "text", text: "Which other inversions of the Neapolitan exist?" },
    answer: answerChoices("Root position and second inversion", [
      "Root position and second inversion",
      "Only second inversion",
      "Root position only",
      "First and third inversions",
    ]),
    rule:
      "Root position and second inversion Neapolitans exist, but first inversion is the one normally used.",
  },
  {
    id: "l121-text-replace-ii",
    prompt: {
      kind: "text",
      text: "Which chord does the Neapolitan sixth replace in the first example?",
    },
    answer: answerChoices("The ii°6 chord", [
      "The V chord",
      "The ii°6 chord",
      "The iv chord",
      "The vii° chord",
    ]),
    rule:
      "In the first example the chord over F sounds F–Ab–D — a diminished supertonic triad " +
      "in first inversion (ii°6) — and the Neapolitan sixth replaces it.",
  },
  {
    id: "l121-text-replace-iv",
    prompt: {
      kind: "text",
      text: "Which chord does the Neapolitan sixth replace in the second example?",
    },
    answer: answerChoices("The iv chord", [
      "The ii6 chord",
      "The V chord",
      "The i chord",
      "The iv chord",
    ]),
    rule: "In the second example the Neapolitan sixth replaces the iv chord: both put F in the bass.",
  },
  {
    id: "l121-text-bass-degree",
    prompt: {
      kind: "text",
      text: "In C minor, which scale degree is the Neapolitan sixth's bass note, F?",
    },
    answer: answerChoices("The fourth scale degree", [
      "The second scale degree",
      "The fourth scale degree",
      "The sixth scale degree",
      "The seventh scale degree",
    ]),
    rule:
      "In C minor the Neapolitan sixth's bass is F — the fourth scale degree, " +
      "the same bass as the iv chord.",
  },
  {
    id: "l121-text-substitute",
    prompt: {
      kind: "text",
      text: "Why does the Neapolitan sixth often substitute for ii and iv?",
    },
    answer: answerChoices("They share the same bass note", [
      "They share the same bass note",
      "They share the same root",
      "They share the same quality",
      "They share the same inversion",
    ]),
    rule:
      "They share the same bass note, so the Neapolitan sixth often substitutes for them.",
  },
];

/** Rounds drawn per visit; the pool is larger so replays vary. */
const ROUND_COUNT = 12;

/** Kinds every draw must contain; `sampleStratifiedRounds` enforces it. */
const REQUIRED_KINDS = ["staff", "text"] as const;

export const lesson121Pool: readonly Round[] = [
  ...STAFF_ENTRIES.map(staffRound),
  ...TEXT_ROUNDS,
];

export const lesson121: LessonModule = {
  entry: requireLessonEntry(121),
  generateRounds: (rng) =>
    sampleStratifiedRounds(lesson121Pool, REQUIRED_KINDS, rng, ROUND_COUNT),
};

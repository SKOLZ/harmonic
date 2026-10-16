import {
  bassNote,
  buildTriad,
  diatonicTriads,
  identifyInversion,
  inversionFigure,
  parseNote,
  romanNumeral,
  scientificName,
  type Note,
  type TriadQuality,
} from "../lib/theory";
import type { AnswerSpec, Round } from "../lib/rounds/types";
import { requireLessonEntry } from "./catalog";
import { sampleStratifiedRounds } from "./rng";
import type { LessonModule } from "./types";

/**
 * Lesson 61 — Triads in Second Inversion.
 *
 * Content source: musictheory.net lesson 61 (slide text pulled from the live
 * `lesson61.js`). The lesson's prose: composers "use root position and first
 * inversion triads freely", but "second inversion usually occurs in three
 * situations" — (1) to smooth out a bass line, where it "is called a passing
 * six-four chord"; (2) to straighten a bass line, "is called a pedal six-four
 * chord"; (3) "a second inversion triad that precedes a V chord in a cadence",
 * the cadential six-four. It defines that cadential chord as "a V with two
 * nonharmonic tones", charts the passing six-four "between predominants and
 * dominants", and closes on why the cadence is worth the trouble: "the
 * cadence will sound stronger due to the cadential six-four's presence".
 *
 * SCOPE + CONTRACT GAP (reported to the parent, not invented here): the site
 * teaches each situation with a moving bass across two or three chords in one
 * continuous score. The existing `Round` contract carries ONE staff prompt —
 * a single stacked chord — so this module captures the expressible parts: the
 * six diatonic second-inversion (6/4) figures in C major, which is the
 * prerequisite identification the lesson rests on, and the site's own three
 * situation names, definitions and cadence facts as text rounds. A
 * multi-chord or sequential bass-line prompt kind is a contract decision
 * handed back to the parent and is deliberately NOT invented here.
 *
 * Every symbol is re-derived by the core (`diatonicTriads` + `romanNumeral` +
 * `inversionFigure` + `identifyInversion`), so a voicing whose bass is not
 * really the fifth fails the test instead of shipping. The pool is 6 `staff`
 * + 7 `text` = 13, drawn stratified with one staff and one text round
 * guaranteed per 12-round draw.
 *
 * Note on site wording: slide 3 spells the adverb "preceeds". This module
 * ships the correct spelling "precedes" (the option string and rule use it
 * verbatim) and the typo is reported to the parent rather than encoded.
 */
const choices = (options: string[], correctIndex: number): AnswerSpec => ({
  kind: "choices",
  options,
  correctIndex,
});

/** Numeric inversion index `inversionFigure` expects, keyed by the core's label. */
const INVERSION_NUM: Readonly<Record<"rootPosition" | "first" | "second" | "third", number>> = {
  rootPosition: 0,
  first: 1,
  second: 2,
  third: 3,
};

/** C-major numerals, derived from the core once — never hand-typed. */
const C_MAJOR_NUMERALS: ReadonlyMap<string, string> = new Map(
  diatonicTriads(parseNote("C"), "major").map((triad) => [
    triad.notes[0]!.letter,
    romanNumeral(triad.quality, triad.degree),
  ]),
);

/** The site's own inversion mechanism: move the lowest note up an octave. */
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

/** English "a"/"an" before a word ("an augmented fourth"). */
const article = (word: string): string => (/^[aeiou]/i.test(word) ? "an" : "a");

/** The Roman-numeral + figure symbol the core derives for a C-major chord. */
function symbolOf(root: string, notes: readonly string[]): string {
  const rootNote = parseNote(root);
  const inversion = identifyInversion(
    rootNote,
    notes.map((note) => parseNote(note)),
  );
  const numeral = C_MAJOR_NUMERALS.get(rootNote.letter);
  if (numeral === undefined) {
    throw new Error(`symbolOf: ${root} is not a C-major diatonic root`);
  }
  return numeral + inversionFigure("triad", INVERSION_NUM[inversion]);
}

interface SecondInversionEntry {
  root: string;
  quality: TriadQuality;
  options: readonly string[];
}

/** One C-major second-inversion figure: symbol derived, never hand-typed. */
const secondInversionRound = (id: string, entry: SecondInversionEntry): Round => {
  const notes = invertedNotes(entry.root, entry.quality, 2);
  const symbol = symbolOf(entry.root, notes);
  const correctIndex = entry.options.indexOf(symbol);
  if (correctIndex < 0) {
    throw new Error(`${id}: derived symbol ${symbol} missing from options`);
  }
  const bass = toneLabel(triadIn(entry.root, entry.quality, 2)[0]!);
  return {
    id,
    prompt: { kind: "staff", clef: "treble", notes, duration: "q", simultaneous: true },
    answer: choices([...entry.options], correctIndex),
    rule:
      `${notes.map((note) => toneLabel(parseNote(note))).join("–")} is ${article(entry.quality)} ${entry.quality} triad. ` +
      `In C major it is ${symbol}: the fifth ${bass} is the lowest note, so the triad is in second inversion.`,
  };
};

/** Rounds drawn per visit; the pool is larger so replays vary. */
const ROUND_COUNT = 12;

/** Kinds every draw must contain; `sampleStratifiedRounds` enforces it. */
const REQUIRED_KINDS = ["staff", "text"] as const;

export const lesson61Pool: readonly Round[] = [
  // --- staff prompts: the six diatonic second-inversion figures in C major ---
  secondInversionRound("l61-staff-i-64", {
    root: "C4",
    quality: "major",
    options: ["I6/4", "I6", "I", "V6/4"],
  }),
  secondInversionRound("l61-staff-ii-64", {
    root: "D4",
    quality: "minor",
    options: ["ii", "ii6/4", "ii6", "IV6/4"],
  }),
  secondInversionRound("l61-staff-iv-64", {
    root: "F4",
    quality: "major",
    options: ["IV6", "IV", "I6/4", "IV6/4"],
  }),
  secondInversionRound("l61-staff-v-64", {
    root: "G4",
    quality: "major",
    options: ["V6", "V", "V6/4", "vi6/4"],
  }),
  secondInversionRound("l61-staff-vi-64", {
    root: "A4",
    quality: "minor",
    options: ["vi6", "vi", "iii6", "vi6/4"],
  }),
  secondInversionRound("l61-staff-viio-64", {
    root: "B3",
    quality: "diminished",
    options: ["vii°6", "vii°", "vii°6/4", "V6/4"],
  }),

  // --- text prompts: the site's three situations and cadence facts ----------
  {
    id: "l61-text-three-situations",
    prompt: {
      kind: "text",
      text: "Into how many situations does a second inversion triad usually fall?",
    },
    answer: choices(["Three", "Two", "Four", "One"], 0),
    rule:
      "While composers use root position and first inversion triads freely, second inversion usually occurs in three situations.",
  },
  {
    id: "l61-text-passing",
    prompt: {
      kind: "text",
      text: "A second inversion triad steps between two chords to keep the bass moving. What is it called?",
    },
    answer: choices(
      ["A pedal six-four chord", "A passing six-four chord", "A cadential six-four chord", "An augmented six-four chord"],
      1,
    ),
    rule:
      "Like first inversion, second inversion may be used to smooth out a bass line; a second inversion triad used in this fashion is called a passing six-four chord.",
  },
  {
    id: "l61-text-pedal",
    prompt: {
      kind: "text",
      text: "A second inversion triad repeats over a stationary bass. What is it called?",
    },
    answer: choices(
      ["A passing six-four chord", "A cadential six-four chord", "A pedal six-four chord", "A sustained root position chord"],
      2,
    ),
    rule:
      "Second inversion may also be used to straighten a bass line; a second inversion triad used in this fashion is called a pedal six-four chord.",
  },
  {
    id: "l61-text-cadential-def",
    prompt: {
      kind: "text",
      text: "What is a cadential six-four chord?",
    },
    answer: choices(
      [
        "A root position triad before a cadence",
        "A second inversion triad that precedes a V chord in a cadence",
        "A first inversion triad on beat one",
        "A seventh chord resolving to I",
      ],
      1,
    ),
    rule: "A cadential six-four chord is a second inversion triad that precedes a V chord in a cadence.",
  },
  {
    id: "l61-text-alternate",
    prompt: {
      kind: "text",
      text: "Besides reading the cadential six-four as its own chord, how else may its notes be analyzed?",
    },
    answer: choices(
      ["A V chord in root position", "A suspension over V", "A chain of passing tones", "A V with two nonharmonic tones"],
      3,
    ),
    rule: "Alternatively, its notes may be analyzed as a V with two nonharmonic tones.",
  },
  {
    id: "l61-text-chart",
    prompt: {
      kind: "text",
      text: "Where does the passing six-four chord sit in a progression chart?",
    },
    answer: choices(
      ["Between I and IV chords", "At the start of a phrase", "Between predominants and dominants", "After a final cadence"],
      2,
    ),
    rule: "The passing six-four chord appears between predominants and dominants.",
  },
  {
    id: "l61-text-cadence-stronger",
    prompt: {
      kind: "text",
      text: "Why is a cadential six-four worth writing at the end of a phrase?",
    },
    answer: choices(
      [
        "The cadence will sound stronger due to the cadential six-four's presence",
        "The cadence will sound weaker",
        "The cadence becomes a half cadence",
        "No change is heard",
      ],
      0,
    ),
    rule:
      "Because the cadential six-four delays the arrival of V, the cadence will sound stronger due to the cadential six-four's presence.",
  },
];

export const lesson61: LessonModule = {
  entry: requireLessonEntry(61),
  generateRounds: (rng) =>
    sampleStratifiedRounds(lesson61Pool, REQUIRED_KINDS, rng, ROUND_COUNT),
};

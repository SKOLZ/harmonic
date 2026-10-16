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
 * Lesson 60 — Triads in First Inversion.
 *
 * Content source: musictheory.net lesson 60 (slide text pulled from the live
 * `lesson60.js`). The lesson's prose: first inversion was "introduced to
 * smooth out the bass line" rather than "altering the top voices … Instead of
 * altering the top voices, the chord is placed in first inversion"; "Early
 * composers did not like using augmented or diminished intervals", which held
 * them back from first inversion; and the reason it won out anyway — "Only
 * the first inversion contains no augmented nor diminished intervals" — plus
 * the diminished-triad specifics: its root-position figure "contains a
 * diminished fifth", its second inversion "contains an augmented fourth" and
 * "second inversion is rarely encountered". Preference for first inversion is
 * not a "strict rules" matter: "sometimes first inversion is used simply
 * because a composer likes its sound".
 *
 * SCOPE + CONTRACT GAP (reported to the parent, not invented here): the site
 * frames the lesson around one continuous four-voice score whose upper voices
 * stay put while the bass moves. The existing `Round` contract carries ONE
 * staff prompt — a single stacked chord — so this module captures the parts
 * that are expressible: the six diatonic first-inversion figures in C major
 * (the lesson's stated prerequisite: "construct, identify, and analyze first
 * inversion triads") and the three diminished-triad figures whose bass-relative
 * intervals the site annotates. The moving-bass/across-measure voice-leading
 * story becomes text rounds. A multi-staff or sequential voice-leading prompt
 * kind is a contract decision handed back to the parent and is deliberately
 * NOT invented here.
 *
 * THE SITE'S LOOSE SENTENCE, RESOLVED: "Only the first inversion contains no
 * augmented nor diminished intervals" is false as written — the first
 * inversion of B diminished still spans an augmented fourth (F–B). It is true
 * of the intervals above the BASS, which is exactly how the site distributes
 * its four annotation labels across the three figures: root position bass ↔
 * diminished fifth, first-inversion bass ↔ minor third and major sixth, second
 * inversion bass ↔ augmented fourth (and sixth). This module therefore ships
 * the bass-precise reading in its rules and the report flags the loose
 * phrasing as a site wording issue rather than encoding it.
 *
 * Every symbol is re-derived by the core (`diatonicTriads` + `romanNumeral` +
 * `inversionFigure` + `identifyInversion`); every diminished interval name is
 * re-derived by `intervalName(genericIntervalNumber, halfSteps)`. The pool is
 * 9 `staff` + 6 `text` = 15, drawn stratified with one staff and one text
 * round guaranteed per 12-round draw.
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

interface FirstInversionEntry {
  root: string;
  quality: TriadQuality;
  options: readonly string[];
}

/** One C-major first-inversion figure: symbol derived, never hand-typed. */
const firstInversionRound = (id: string, entry: FirstInversionEntry): Round => {
  const notes = invertedNotes(entry.root, entry.quality, 1);
  const symbol = symbolOf(entry.root, notes);
  const correctIndex = entry.options.indexOf(symbol);
  if (correctIndex < 0) {
    throw new Error(`${id}: derived symbol ${symbol} missing from options`);
  }
  const bass = toneLabel(triadIn(entry.root, entry.quality, 1)[0]!);
  return {
    id,
    prompt: { kind: "staff", clef: "treble", notes, duration: "q", simultaneous: true },
    answer: choices([...entry.options], correctIndex),
    rule:
      `${notes.map((note) => toneLabel(parseNote(note))).join("–")} is ${article(entry.quality)} ${entry.quality} triad. ` +
      `In C major it is ${symbol}: the third ${bass} is the lowest note, so the triad is in first inversion.`,
  };
};

/** The four diminished answers, shared by all three diminished figures. */
const DIMINISHED_OPTIONS = [
  "A diminished fifth",
  "An augmented fourth",
  "None — only a minor third and a major sixth sound above the bass",
  "A perfect fifth",
] as const;

interface DiminishedEntry {
  notes: readonly string[];
  answer: string;
  rule: string;
}

/**
 * One diminished-triad figure. The answer and rule are the site's own claims
 * about the intervals above the BASS; the test re-derives every interval name
 * from the core, so a mislabelled figure fails instead of shipping.
 */
const diminishedRound = (id: string, entry: DiminishedEntry): Round => {
  const correctIndex = DIMINISHED_OPTIONS.indexOf(entry.answer as (typeof DIMINISHED_OPTIONS)[number]);
  if (correctIndex < 0) {
    throw new Error(`${id}: answer ${entry.answer} missing from the diminished options`);
  }
  return {
    id,
    prompt: { kind: "staff", clef: "treble", notes: [...entry.notes], duration: "q", simultaneous: true },
    answer: choices([...DIMINISHED_OPTIONS], correctIndex),
    rule: entry.rule,
  };
};

/** Rounds drawn per visit; the pool is larger so replays vary. */
const ROUND_COUNT = 12;

/** Kinds every draw must contain; `sampleStratifiedRounds` enforces it. */
const REQUIRED_KINDS = ["staff", "text"] as const;

export const lesson60Pool: readonly Round[] = [
  // --- staff prompts: the six diatonic first-inversion figures in C major ---
  firstInversionRound("l60-staff-i6", {
    root: "C4",
    quality: "major",
    options: ["I6", "I", "I6/4", "V6"],
  }),
  firstInversionRound("l60-staff-ii6", {
    root: "D4",
    quality: "minor",
    options: ["ii", "ii6", "IV6", "ii6/4"],
  }),
  firstInversionRound("l60-staff-iv6", {
    root: "F4",
    quality: "major",
    options: ["I6", "IV", "IV6", "ii6"],
  }),
  firstInversionRound("l60-staff-v6", {
    root: "G4",
    quality: "major",
    options: ["V", "V6/4", "vi6", "V6"],
  }),
  firstInversionRound("l60-staff-vi6", {
    root: "A4",
    quality: "minor",
    options: ["vi", "vi6", "V6", "iii6"],
  }),
  firstInversionRound("l60-staff-viio6", {
    root: "B3",
    quality: "diminished",
    options: ["vii°6", "vii°", "vii°6/4", "V6"],
  }),

  // --- staff prompts: the diminished triad in its three figures -------------
  diminishedRound("l60-staff-dim-root", {
    notes: ["B3", "D4", "F4"],
    answer: "A diminished fifth",
    rule:
      "B–D–F is the diminished triad in root position: above the bass B the intervals are Minor 3rd and Diminished 5th, " +
      "so this figure contains a diminished fifth.",
  }),
  diminishedRound("l60-staff-dim-first", {
    notes: ["D4", "F4", "B4"],
    answer: "None — only a minor third and a major sixth sound above the bass",
    rule:
      "D–F–B is the same diminished triad in first inversion: above the bass D the intervals are Minor 3rd and Major 6th, " +
      "so only the first inversion contains no augmented nor diminished intervals above the bass.",
  }),
  diminishedRound("l60-staff-dim-second", {
    notes: ["F4", "B4", "D5"],
    answer: "An augmented fourth",
    rule:
      "F–B–D is the same diminished triad in second inversion: above the bass F the intervals are Augmented 4th and Major 6th, " +
      "so this figure contains an augmented fourth; a diminished triad in second inversion is rarely encountered.",
  }),

  // --- text prompts: the site's prose about first inversion -----------------
  {
    id: "l60-text-smooth-bass",
    prompt: {
      kind: "text",
      text: "Why were first inversion triads introduced?",
    },
    answer: choices(
      ["To smooth out the bass line", "To make the chords louder", "To keep the same bass note", "To avoid using the fifth"],
      0,
    ),
    rule:
      "Early composers kept every triad in root position; first inversion was introduced to smooth out the bass line.",
  },
  {
    id: "l60-text-repeat-chord",
    prompt: {
      kind: "text",
      text: "The bass note repeats across two chords. What may the composer do instead of changing the upper voices?",
    },
    answer: choices(
      ["Change the bass note", "Place the chord in first inversion", "Add a seventh tone", "Rest the top voice"],
      1,
    ),
    rule: "Instead of altering the top voices, the chord is placed in first inversion.",
  },
  {
    id: "l60-text-early-composers",
    prompt: {
      kind: "text",
      text: "What held early composers back from using first inversion?",
    },
    answer: choices(
      ["They preferred root position only", "They lacked the required instruments", "They did not like using augmented or diminished intervals", "They followed a strict meter"],
      2,
    ),
    rule:
      "Early composers did not like using augmented or diminished intervals, so they avoided first inversion triads.",
  },
  {
    id: "l60-text-prefer-first",
    prompt: {
      kind: "text",
      text: "Why did first inversion eventually win out over root position?",
    },
    answer: choices(
      ["All inversions contain a perfect fifth", "Root position has no thirds", "Second inversion is always preferred", "Only the first inversion contains no augmented nor diminished intervals above the bass"],
      3,
    ),
    rule:
      "Only the first inversion contains no augmented nor diminished intervals above the bass, which is why it became the preferred voicing.",
  },
  {
    id: "l60-text-dim-second-rare",
    prompt: {
      kind: "text",
      text: "How often does a diminished triad appear in second inversion?",
    },
    answer: choices(["Frequently", "Rarely", "Only in minor keys", "Never"], 1),
    rule:
      "A diminished triad in second inversion is rarely encountered: above its bass the sound is an augmented fourth and a major sixth.",
  },
  {
    id: "l60-text-not-strict",
    prompt: {
      kind: "text",
      text: "Is preferring first inversion a strict rule?",
    },
    answer: choices(
      ["Yes — always", "Yes — except in cadences", "Yes — for diminished triads", "No — sometimes first inversion is used simply because a composer likes its sound"],
      3,
    ),
    rule:
      "The preference is not strict rules: sometimes first inversion is used simply because a composer likes its sound.",
  },
];

export const lesson60: LessonModule = {
  entry: requireLessonEntry(60),
  generateRounds: (rng) =>
    sampleStratifiedRounds(lesson60Pool, REQUIRED_KINDS, rng, ROUND_COUNT),
};

import {
  buildTriad,
  diatonicTriads,
  letterIndex,
  parseNote,
  romanNumeral,
  scientificName,
  type TriadQuality,
} from "../lib/theory";
import type { AnswerSpec, Round } from "../lib/rounds/types";
import { requireLessonEntry } from "./catalog";
import { sampleStratifiedRounds } from "./rng";
import type { LessonModule } from "./types";

/**
 * Lesson 50 — Composing with Minor Scales.
 *
 * Content source: musictheory.net lesson 50 (slide text pulled from the live
 * `lesson50.js`): "Unlike the major scale, three different minor scales
 * exist." "Composers will often merge two of these scales, natural minor and
 * harmonic minor, for a more pleasing sound." The lesson recalls the diatonic
 * triads of both scales, notes "many of the triads are the same", and pinpoints
 * the three pairs that differ "due to harmonic minor's raised seventh degree"
 * (III–III+, v–V, VII–vii°). It then states the composing guidance: "III is
 * prefered to III+ … III+, being an augmented chord, has a peculiar sound";
 * "V is preferred to v since V contains a leading tone (and therefore is
 * stronger). This does not mean that v cannot be used"; "VII and vii° are both
 * used equally."
 *
 * Staff rounds show one of the ten distinct merged-minor triads (spelled by
 * `buildTriad`) and ask which scale form(s) contain it; membership is re-derived
 * from `diatonicTriads`, never hand-typed. Text rounds pin the site's prose
 * conclusions. Numerals come from `romanNumeral`. The pool is 10 `staff` +
 * 7 `text` = 17, drawn stratified with one staff and one text round guaranteed
 * per 12-round draw.
 *
 * NOTE on the site's final slide: it claims "The merged minor scale contains
 * nine different diatonic triads," but its own earlier slide enumerates three
 * differing pairs plus four shared triads — 4 shared + 6 unique = 10. The core
 * (`diatonicTriads` over both scales) confirms 10 distinct pitch-class sets, so
 * the site's "nine" is an internal error and no round asserts a count.
 */
const choices = (options: string[], correctIndex: number): AnswerSpec => ({
  kind: "choices",
  options,
  correctIndex,
});

/** The three scale-form answers a staff round offers. */
const SOURCE_OPTIONS = ["Natural minor only", "Harmonic minor only", "Both minor scales"] as const;
type Source = "natural" | "harmonic" | "both";
const SOURCE_INDEX: Readonly<Record<Source, number>> = { natural: 0, harmonic: 1, both: 2 };

/**
 * Scale membership re-derived from the theory core: which of C natural minor
 * and C harmonic minor contain the triad on `letter` of `quality`.
 */
function sourceOf(letter: string, quality: TriadQuality): Source {
  const natural = diatonicTriads(parseNote("C"), "naturalMinor");
  const harmonic = diatonicTriads(parseNote("C"), "harmonicMinor");
  const matches = (list: ReturnType<typeof diatonicTriads>) =>
    list.some((triad) => triad.notes[0]!.letter === letter && triad.quality === quality);
  const inNatural = matches(natural);
  const inHarmonic = matches(harmonic);
  if (inNatural && inHarmonic) return "both";
  if (inNatural) return "natural";
  if (inHarmonic) return "harmonic";
  throw new Error(`no scale contains ${letter} ${quality}`);
}

/** Degree of a root letter within C minor (letters C–B occupy degrees 1–7). */
function degreeOf(letter: string): number {
  return ((letterIndex(letter as never) - letterIndex("C")) % 7) + 1;
}

/** "Eb4" → "Eb": a tone's name without its octave, as prose writes it. */
const toneLabel = (note: string): string => note.replace(/\d+$/, "");

/**
 * One merged-minor triad: spelled by the core, membership derived, rule from
 * the site's own composing guidance.
 */
const triadRound = (id: string, root: string, quality: TriadQuality, siteFact: string): Round => {
  const spelling = buildTriad(parseNote(root), quality).map(scientificName);
  const letter = parseNote(root).letter;
  const source = sourceOf(letter, quality);
  const numeral = romanNumeral(quality, degreeOf(letter));
  return {
    id,
    prompt: { kind: "staff", clef: "treble", notes: spelling, duration: "q", simultaneous: true },
    answer: choices([...SOURCE_OPTIONS], SOURCE_INDEX[source]),
    rule: `${spelling.map(toneLabel).join("–")} is ${numeral}. ${siteFact}`,
  };
};

/** Rounds drawn per visit; the pool is larger so replays vary. */
const ROUND_COUNT = 12;

/** Kinds every draw must contain; `sampleStratifiedRounds` enforces it. */
const REQUIRED_KINDS = ["staff", "text"] as const;

const SHARED_FACT =
  "Many of the diatonic triads are the same in natural and harmonic minor, and this triad belongs to both.";

export const lesson50Pool: readonly Round[] = [
  // --- staff prompts: the ten distinct merged-minor triads -----------------
  // Shared by natural and harmonic minor.
  triadRound("l50-staff-i", "C4", "minor", SHARED_FACT),
  triadRound("l50-staff-iidim", "D4", "diminished", SHARED_FACT),
  triadRound("l50-staff-iv", "F4", "minor", SHARED_FACT),
  triadRound("l50-staff-vi", "Ab4", "major", SHARED_FACT),
  // Unique to natural minor.
  triadRound(
    "l50-staff-iii",
    "Eb4",
    "major",
    "III is prefered to III+ because III+, being an augmented chord, has a peculiar sound. This major triad comes from natural minor; harmonic minor's raised seventh degree spells the third chord III+ instead.",
  ),
  triadRound(
    "l50-staff-v",
    "G4",
    "minor",
    "V is preferred to v since V contains a leading tone (and therefore is stronger), but this does not mean that v cannot be used. This minor dominant comes from natural minor.",
  ),
  triadRound(
    "l50-staff-vii",
    "Bb4",
    "major",
    "VII and vii° are both used equally; each has a different function. This major triad comes from natural minor.",
  ),
  // Unique to harmonic minor.
  triadRound(
    "l50-staff-iiiaug",
    "Eb4",
    "augmented",
    "III is prefered to III+ because III+, being an augmented chord, has a peculiar sound. This augmented triad is unique to harmonic minor's raised seventh degree.",
  ),
  triadRound(
    "l50-staff-vmaj",
    "G4",
    "major",
    "V is preferred to v since V contains a leading tone (and therefore is stronger). This major dominant is unique to harmonic minor's raised seventh degree.",
  ),
  triadRound(
    "l50-staff-viidim",
    "B4",
    "diminished",
    "VII and vii° are both used equally; each has a different function. This diminished triad is unique to harmonic minor's raised seventh degree.",
  ),

  // --- text prompts: the site's prose conclusions ---------------------------
  {
    id: "l50-text-count",
    prompt: {
      kind: "text",
      text: "Unlike the major scale, how many different minor scales exist?",
    },
    answer: choices(["Three", "Two", "Four", "Seven"], 0),
    rule: "Unlike the major scale, three different minor scales exist.",
  },
  {
    id: "l50-text-merge",
    prompt: {
      kind: "text",
      text: "Which two minor scales do composers often merge for a more pleasing sound?",
    },
    answer: choices(
      ["Natural minor and harmonic minor", "Harmonic minor and melodic minor", "Major and natural minor", "The three minor scales"],
      0,
    ),
    rule: "Composers will often merge two of these scales, natural minor and harmonic minor, for a more pleasing sound.",
  },
  {
    id: "l50-text-iii-pref",
    prompt: { kind: "text", text: "Why is III preferred to III+?" },
    answer: choices(
      ["III+, being an augmented chord, has a peculiar sound", "It resolves more strongly", "It contains a leading tone", "It is easier to play"],
      0,
    ),
    rule: "III is prefered to III+. This is because III+, being an augmented chord, has a peculiar sound.",
  },
  {
    id: "l50-text-v-pref",
    prompt: { kind: "text", text: "Why is V preferred to v in the merged minor scale?" },
    answer: choices(
      ["V contains a leading tone", "v contains a leading tone", "V is augmented", "v is stronger"],
      0,
    ),
    rule: "V is preferred to v since V contains a leading tone (and therefore is stronger). This does not mean that v cannot be used.",
  },
  {
    id: "l50-text-v-usable",
    prompt: { kind: "text", text: "Since V is preferred to v, can v still be used?" },
    answer: choices(["Yes", "No", "Only in first inversion", "Only at a cadence"], 0),
    rule: "This does not mean that v cannot be used; the minor dominant v remains available to the composer.",
  },
  {
    id: "l50-text-vii-use",
    prompt: { kind: "text", text: "How do VII and vii° compare in use?" },
    answer: choices(
      ["Both are used equally", "vii° is always preferred", "VII is always preferred", "Neither is used"],
      0,
    ),
    rule: "VII and vii° are both used equally. As you will later learn, each has a different function.",
  },
  {
    id: "l50-text-pairs",
    prompt: {
      kind: "text",
      text: "Which three pairs of triads differ between natural and harmonic minor?",
    },
    answer: choices(
      ["III–III+, v–V, and VII–vii°", "i–i, ii°–ii°, and iv–iv", "I–II, III–IV, and V–VI", "III–IV, v–VI, and VII–i"],
      0,
    ),
    rule: "Three pairs of triads (III–III+, v–V, and VII–vii°) are different due to harmonic minor's raised seventh degree.",
  },
];

export const lesson50: LessonModule = {
  entry: requireLessonEntry(50),
  generateRounds: (rng) =>
    sampleStratifiedRounds(lesson50Pool, REQUIRED_KINDS, rng, ROUND_COUNT),
};

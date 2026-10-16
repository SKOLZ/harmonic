import type { AnswerSpec, Round } from "../lib/rounds/types";
import { requireLessonEntry } from "./catalog";
import { sampleStratifiedRounds } from "./rng";
import type { LessonModule } from "./types";

/**
 * Lesson 53 — Nonharmonic Tones.
 *
 * Content source: musictheory.net lesson 53 (slide text pulled from the live
 * `lesson53.js`): "*Nonharmonic tones* (or *non-chord tones*) are notes that
 * do not belong in a certain chord." The lesson defines its two prerequisites
 * ("A *step* is equal to an interval of a generic second." "A *skip* is equal
 * to an interval of a generic third or more.") and then eight US types: PT,
 * NT, Ant., ET, App., Sus., Ret., CT — each with a prose definition, an
 * accent statement, and (for CT) the aliases "double neighboring tones" and
 * "neighbor group". The site's own `labels` map supplies the abbreviations.
 *
 * The site's worked figures are animation frames (image data with no note
 * names in the payload), so each staff figure here is constructed from the
 * site's own prose definition of its type rather than copied from the visual.
 * Every figure is a melodic line (three tones, four for CT), so none sets
 * `simultaneous` — these are nonharmonic tones between chord tones, not
 * stacked chords. The CT figure deliberately does not offer ET or App: its
 * interior windows are a textbook escape tone (C5–D5–B4) and appoggiatura
 * (D5–B4–C5), and the site's arity-based definitions (CT uses *two*
 * nonharmonic tones in succession) make CT the only whole-figure reading —
 * see the classifier oracle in the test.
 *
 * The pool is 8 `staff` + 16 `text` = 24, drawn stratified with one staff and
 * one text round guaranteed per 12-round draw.
 */
const choices = (options: string[], correctIndex: number): AnswerSpec => ({
  kind: "choices",
  options,
  correctIndex,
});

/** The eight answer phrases, matching the site's `labels` abbreviations. */
const TYPE = {
  pt: "A passing tone (PT)",
  nt: "A neighboring tone (NT)",
  ant: "An anticipation (Ant.)",
  et: "An escape tone (ET)",
  app: "An appoggiatura (App.)",
  sus: "A suspension (Sus.)",
  ret: "A retardation (Ret.)",
  ct: "A changing tone (CT)",
} as const;

interface Figure {
  /** The engraved melodic figure, built from the type's site definition. */
  notes: readonly string[];
  /** Four offered type phrases; exactly one fits the figure. */
  options: readonly string[];
  correctIndex: number;
  rule: string;
}

const FIGURES: Readonly<Record<string, Figure>> = {
  "l53-staff-pt": {
    notes: ["C5", "D5", "E5"],
    options: [TYPE.pt, TYPE.nt, TYPE.app, TYPE.et],
    correctIndex: 0,
    rule: "C–D–E keeps moving by step in the same direction, with D between the chord tones C and E; a passing tone (PT) is approached by step and then continues by step in the same direction.",
  },
  "l53-staff-nt": {
    notes: ["C5", "D5", "C5"],
    options: [TYPE.pt, TYPE.nt, TYPE.et, TYPE.ant],
    correctIndex: 1,
    rule: "D is approached by step from C and returns by step to C; a neighboring tone (NT) is approached by step and then returns by step to the original note.",
  },
  "l53-staff-ant": {
    notes: ["C5", "D5", "D5"],
    options: [TYPE.sus, TYPE.ant, TYPE.nt, TYPE.pt],
    correctIndex: 1,
    rule: "D is approached by step from C and then remains the same; an anticipation (Ant.) is basically a note of the second chord played early. Anticipations are not accented.",
  },
  "l53-staff-et": {
    notes: ["C5", "D5", "B4"],
    options: [TYPE.et, TYPE.pt, TYPE.nt, TYPE.app],
    correctIndex: 0,
    rule: "D is approached by step from C and then skips down to B; an escape tone (ET) is approached by step and then skips in the opposite direction.",
  },
  "l53-staff-app": {
    notes: ["C5", "E5", "D5"],
    options: [TYPE.app, TYPE.et, TYPE.pt, TYPE.sus],
    correctIndex: 0,
    rule: "E is approached by a skip from C and then steps down to D; an appoggiatura (App.) is approached by skip and then steps in the opposite direction.",
  },
  "l53-staff-sus": {
    notes: ["C5", "C5", "B4"],
    options: [TYPE.sus, TYPE.ret, TYPE.ant, TYPE.nt],
    correctIndex: 0,
    rule: "C is held over from the first chord and then steps downward to B; a suspension (Sus.) keeps a note the same and then steps downward.",
  },
  "l53-staff-ret": {
    notes: ["C5", "C5", "D5"],
    options: [TYPE.sus, TYPE.ret, TYPE.ant, TYPE.nt],
    correctIndex: 1,
    rule: "C is held over from the first chord and then steps upward to D; a retardation (Ret.) keeps a note the same and then steps upward.",
  },
  "l53-staff-ct": {
    notes: ["C5", "D5", "B4", "C5"],
    // ET and App are intentionally absent: the interior 3-tone windows of this
    // figure are exactly an escape tone and an appoggiatura, and offering
    // them would let a partial reading compete with the intended answer.
    options: [TYPE.pt, TYPE.nt, TYPE.ct, TYPE.sus],
    correctIndex: 2,
    rule: "D and B are two nonharmonic tones in succession: D is approached by step, then skips in the opposite direction to B, and B then resolves by step. Changing tones (CT) use two nonharmonic tones in succession.",
  },
};

/** One engraved figure round; every option set is fixed per figure. */
const figureRound = (id: string): Round => {
  const figure = FIGURES[id];
  if (figure === undefined) {
    throw new Error(`lesson53: unknown figure ${id}`);
  }
  return {
    id,
    prompt: { kind: "staff", clef: "treble", notes: [...figure.notes], duration: "q" },
    answer: choices([...figure.options], figure.correctIndex),
    rule: figure.rule,
  };
};

/** Rounds drawn per visit; the pool is larger so replays vary. */
const ROUND_COUNT = 12;

/** Kinds every draw must contain; `sampleStratifiedRounds` enforces it. */
const REQUIRED_KINDS = ["staff", "text"] as const;

export const lesson53Pool: readonly Round[] = [
  // --- staff prompts: the eight named figures --------------------------------
  figureRound("l53-staff-pt"),
  figureRound("l53-staff-nt"),
  figureRound("l53-staff-ant"),
  figureRound("l53-staff-et"),
  figureRound("l53-staff-app"),
  figureRound("l53-staff-sus"),
  figureRound("l53-staff-ret"),
  figureRound("l53-staff-ct"),

  // --- text prompts: the site's prose definitions -----------------------------
  {
    id: "l53-text-def",
    prompt: { kind: "text", text: "What is a nonharmonic tone?" },
    answer: choices(
      [
        "A note that does not belong in a certain chord",
        "The root of a chord",
        "A note listed in the key signature",
        "The third of a triad",
      ],
      0,
    ),
    rule: "Nonharmonic tones (or non-chord tones) are notes that do not belong in a certain chord.",
  },
  {
    id: "l53-text-step",
    prompt: { kind: "text", text: "What interval is a step?" },
    answer: choices(
      [
        "An interval of a generic third",
        "An interval of a generic second",
        "An interval of a generic fourth",
        "An interval of a unison",
      ],
      1,
    ),
    rule: "A step is equal to an interval of a generic second.",
  },
  {
    id: "l53-text-skip",
    prompt: { kind: "text", text: "What interval is a skip?" },
    answer: choices(
      [
        "An interval of a generic second",
        "An interval of a unison",
        "An interval of a generic third or more",
        "An interval of a generic fourth",
      ],
      2,
    ),
    rule: "A skip is equal to an interval of a generic third or more.",
  },
  {
    id: "l53-text-pt",
    prompt: {
      kind: "text",
      text: "How is a passing tone approached, and how does it continue?",
    },
    answer: choices(
      [
        "By step, then returns by step to the original note",
        "By step, then continues by step in the same direction",
        "By skip, then steps in the opposite direction",
        "By step, then remains the same",
      ],
      1,
    ),
    rule: "A passing tone (PT) is approached by step and then continues by step in the same direction.",
  },
  {
    id: "l53-text-apt",
    prompt: { kind: "text", text: "When is a passing tone called accented?" },
    answer: choices(
      [
        "When it occurs with the second chord",
        "When it occurs with the first chord",
        "When it is approached by skip",
        "When it resolves upward",
      ],
      0,
    ),
    rule: "If a passing tone occurs with the second chord (instead of in the middle of the two chords), it is called an accented passing tone (>PT).",
  },
  {
    id: "l53-text-ant",
    prompt: { kind: "text", text: "What is an anticipation?" },
    answer: choices(
      [
        "A note of the second chord played early",
        "A note that resolves by step downward",
        "The final note of a phrase",
        "A chord tone held over the bar line",
      ],
      0,
    ),
    rule: "An anticipation (Ant.) is approached by step and then remains the same. It is basically a note of the second chord played early.",
  },
  {
    id: "l53-text-ant-accent",
    prompt: { kind: "text", text: "Are anticipations accented?" },
    answer: choices(
      ["Yes, they occur with the second chord", "No", "Only when approached by skip", "Only in minor keys"],
      1,
    ),
    rule: "Anticipations are not accented.",
  },
  {
    id: "l53-text-et",
    prompt: {
      kind: "text",
      text: "How is an escape tone approached, and how does it continue?",
    },
    answer: choices(
      [
        "By step, then skips in the opposite direction",
        "By skip, then steps in the opposite direction",
        "By step, then continues by step in the same direction",
        "By keeping the same note, then stepping down",
      ],
      0,
    ),
    rule: "An escape tone (ET) is approached by step and then skips in the opposite direction.",
  },
  {
    id: "l53-text-app",
    prompt: {
      kind: "text",
      text: "How is an appoggiatura approached, and how does it resolve?",
    },
    answer: choices(
      [
        "By step, then skips in the opposite direction",
        "By keeping the same note, then stepping down",
        "By skip, then steps in the opposite direction",
        "By step, then continues by step in the same direction",
      ],
      2,
    ),
    rule: "An appoggiatura (App.) is approached by skip and then steps in the opposite direction.",
  },
  {
    id: "l53-text-app-accent",
    prompt: { kind: "text", text: "Are appoggiaturas accented?" },
    answer: choices(
      [
        "No — they occur between the two chords",
        "Yes — they occur with the second chord",
        "Only when they resolve upward",
        "Only in minor keys",
      ],
      1,
    ),
    rule: "Appoggiaturas are accented -- they occur with the second chord.",
  },
  {
    id: "l53-text-sus",
    prompt: { kind: "text", text: "What does a suspension do?" },
    answer: choices(
      [
        "It keeps a note the same and then steps upward",
        "It approaches by skip, then steps down",
        "It keeps a note the same and then steps downward",
        "It approaches by step, then skips",
      ],
      2,
    ),
    rule: "A suspension (Sus.) keeps a note the same and then steps downward.",
  },
  {
    id: "l53-text-ret",
    prompt: { kind: "text", text: "What does a retardation do?" },
    answer: choices(
      [
        "It keeps a note the same and then steps downward",
        "It keeps a note the same and then steps upward",
        "It approaches by step, then skips",
        "It approaches by skip, then steps",
      ],
      1,
    ),
    rule: "A retardation (Ret.) keeps a note the same and then steps upward.",
  },
  {
    id: "l53-text-accent-sus",
    prompt: { kind: "text", text: "Are suspensions and retardations accented?" },
    answer: choices(
      ["No — neither is accented", "Only suspensions are accented", "Yes — both are accented", "Only retardations are accented"],
      2,
    ),
    rule: "Both the retardation and suspension are accented.",
  },
  {
    id: "l53-text-ct",
    prompt: {
      kind: "text",
      text: "How many nonharmonic tones does a changing tone use?",
    },
    answer: choices(
      ["One, approached by step", "Two, in succession", "One, approached by skip", "Three, in succession"],
      1,
    ),
    rule: "Changing tones (CT) use two nonharmonic tones in succession.",
  },
  {
    id: "l53-text-ct-alias",
    prompt: { kind: "text", text: "What else are changing tones called?" },
    answer: choices(
      ["Passing groups", "Chordal tones", "Double neighboring tones or a neighbor group", "Leading tones"],
      2,
    ),
    rule: "They are sometimes called double neighboring tones or a neighbor group.",
  },
  {
    id: "l53-text-others",
    prompt: {
      kind: "text",
      text: "What does the lesson say about nonharmonic tones beyond the named ones?",
    },
    answer: choices(
      [
        "No other types exist",
        "They are forbidden in common practice",
        "Composers may choose to use others",
        "They only occur in minor keys",
      ],
      2,
    ),
    rule: "While the named non-harmonic tones discussed in this lesson are the most common, composers may choose to use others.",
  },
];

export const lesson53: LessonModule = {
  entry: requireLessonEntry(53),
  generateRounds: (rng) =>
    sampleStratifiedRounds(lesson53Pool, REQUIRED_KINDS, rng, ROUND_COUNT),
};

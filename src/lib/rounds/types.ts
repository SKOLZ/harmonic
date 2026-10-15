// Shared round model for every minigame. Types only — renderers and answer
// controls live in later tasks; this file is the contract they all speak.

export const PROMPT_KINDS = ["text", "staff", "audio", "keyboard"] as const;
export const ANSWER_KINDS = ["choices", "textInput", "notePick", "sequence"] as const;

/**
 * What the learner is asked to look at or listen to.
 *
 * - `text`: a plain question string (e.g. "What is the relative minor of A major?").
 * - `staff`: rendered notation — a clef, an optional key signature, and scientific
 *   pitch names ("C4", "Eb4"). These are parsed through the theory layer the same
 *   way every other note list in a round is; conversion to VexFlow keys happens
 *   inside the staff renderer, not here. `duration` is an optional VexFlow 5
 *   duration code applied to every note in the prompt: `w` whole, `h` half,
 *   `q` quarter, `8` eighth, `16` sixteenth (`32`, `64` also valid), `d` marks
 *   a dot after the code (`qd`), and a trailing `r` draws a rest instead of a
 *   note (`qr` quarter rest, `8r` eighth rest). Omitted means `q`.
 * - `audio`: something to hear — the `play` verb says whether the pitches form a
 *   single note, a chord, a scale, or an interval, so the synth knows how to group them.
 * - `keyboard`: a piano visual with certain keys highlighted (pitch names like "F#4");
 *   `octave` optionally shifts the drawn range.
 */
export type PromptSpec =
  | { kind: "text"; text: string }
  | { kind: "staff"; clef: "treble" | "bass"; notes: string[]; keySignature?: string; duration?: string }
  | { kind: "audio"; play: "note" | "chord" | "scale" | "interval"; notes: string[] }
  | { kind: "keyboard"; highlight: string[]; octave?: number };

/**
 * How the learner answers, and how correctness is judged.
 *
 * - `choices`: pick one option by index. The machine compares the submitted index
 *   against `correctIndex`; `options` must be unique so "both C" is impossible.
 * - `textInput`: free-text entry (e.g. "Bb" vs "B flat" vs "B♭"). Design: `accepted`
 *   lists every spelling that counts as correct, and `expected` is the canonical
 *   display string used in feedback — separation keeps judging data-driven while
 *   feedback stays prettier than any single accepted spelling.
 * - `notePick`: toggle individual keys/notes (e.g. "select every F# in A major").
 *   Design: an *unordered set* of pitch names; correctness is set equality, so
 *   `correctNotes` is the canonical set and click order is irrelevant.
 * - `sequence`: put pitches in order (e.g. spell a scale, melodic dictation).
 *   Design: an *ordered* list; unlike notePick, position matters, so `correctOrder`
 *   is the canonical sequence.
 */
export type AnswerSpec =
  | { kind: "choices"; options: string[]; correctIndex: number }
  | { kind: "textInput"; accepted: string[]; expected: string }
  | { kind: "notePick"; correctNotes: string[] }
  | { kind: "sequence"; correctOrder: string[] };

/**
 * What the learner submits for a round. `kind` must match the round's
 * `AnswerSpec.kind`; the machine judges by value, not by control identity.
 *
 * - `choices`: the index of the option the learner picked.
 * - `textInput`: the text exactly as typed; judged after trimming and
 *   case-folding against every `accepted` spelling.
 * - `notePick`: the selected pitch names as an *unordered set*.
 * - `sequence`: the arranged items as an *ordered* list.
 */
export type AnswerSubmission =
  | { kind: "choices"; selectedIndex: number }
  | { kind: "textInput"; text: string }
  | { kind: "notePick"; notes: string[] }
  | { kind: "sequence"; order: string[] };

/** One answered question: prompt + answer contract + the rule shown in feedback. */
export interface Round {
  id: string;
  prompt: PromptSpec;
  answer: AnswerSpec;
  rule: string;
}

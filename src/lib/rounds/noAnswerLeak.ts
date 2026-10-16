import { parseNote, scientificName } from "../theory";
import type { AnswerSpec, Round } from "./types";

/**
 * The shared no-leak assertion for companion staff illustrations (T5).
 *
 * The hard content rule — "an illustration shows the QUESTION's pitches and
 * never the answer" — is un-typeable: {@link Round.illustration} is an
 * ordinary {@link StaffSpec}, so nothing in the model stops a lesson from
 * engraving the correct answer. It therefore ships as one test utility here
 * instead of a copy-pasted loop per lesson suite: any section that gains
 * illustrations (The Basics pilot, Intervals, and the five sections after)
 * sweeps its pool through {@link assertNoAnswerLeak}.
 *
 * What it checks: every NOTE of the illustration must differ from every
 * spelling that would count as the round's correct answer (the correct
 * choice, each accepted/expected string of a textInput, each notePick
 * correctNotes entry, each sequence correctOrder entry). Comparison is by
 * spelling — letter plus accidental — with the octave dropped, so an answer
 * drawn an octave away still counts as a leak, while an ENHARMONICALLY equal
 * spelling does not: "Which note is enharmonic with C#" answers Db and its
 * pilot illustration engraves C#, the same sound under another name, and
 * choosing between the two spellings is the question itself. Comparing
 * sounding pitch instead would flag that flagship illustration as a defect.
 *
 * What it deliberately does NOT check: derivability. A picture from which
 * the learner can count the answer (the pilot's counting rounds, or an
 * interval pair whose number is readable off the staff) is a leak under the
 * same contract but cannot be detected from data — that judgement stays with
 * the lesson suites, which record it round by round. An answer that is prose
 * ("A perfect fourth") is skipped rather than passed silently as "clean": no
 * engraving note can BE that string, so there is nothing to contain, and the
 * derivability judgement is where the risk lives for those rounds.
 */

/** A bare pitch spelling, with an optional octave: `C`, `Eb`, `F##4`, `Bbb`. */
const PITCH_SPELLING = /^[A-G](#{1,2}|b{1,2})?(-?\d+)?$/;

/**
 * The illustration's side of the comparison: a note reduced to letter +
 * accidental (octave dropped). Returns `null` when `input` is not a pitch at
 * all, which `parseNote` also rejects — the caller treats that as a hard
 * error, because an illustration note that will not parse cannot engrave.
 */
function illustrationSpelling(input: string): string {
  const note = parseNote(input);
  return scientificName({ letter: note.letter, accidental: note.accidental });
}

/**
 * The answer's side of the comparison: every string that would count as
 * correct, reduced to a pitch spelling. Non-pitch strings (prose answers,
 * number words, interval names) are dropped — they cannot appear as an
 * engraving note, so they cannot be contained by one.
 */
export function answerSpellings(answer: AnswerSpec): string[] {
  const raw: string[] = [];
  switch (answer.kind) {
    case "choices":
      raw.push(answer.options[answer.correctIndex]);
      break;
    case "textInput":
      raw.push(...answer.accepted, answer.expected);
      break;
    case "notePick":
      raw.push(...answer.correctNotes);
      break;
    case "sequence":
      raw.push(...answer.correctOrder);
      break;
  }
  const spellings = new Set<string>();
  for (const candidate of raw) {
    if (!PITCH_SPELLING.test(candidate)) continue;
    const note = parseNote(candidate);
    spellings.add(scientificName({ letter: note.letter, accidental: note.accidental }));
  }
  return [...spellings];
}

/**
 * The note-level no-leak property as a value: a description of the leak, or
 * `null` when the round is clean. Rounds without an illustration are clean by
 * construction — the slot is optional, and its absence is the pilot's answer
 * for every round the rule rules out.
 */
export function illustrationLeak(round: Round): string | null {
  if (round.illustration === undefined) return null;
  const answers = answerSpellings(round.answer);
  if (answers.length === 0) return null;
  for (const note of round.illustration.notes) {
    const drawn = illustrationSpelling(note);
    if (!answers.includes(drawn)) continue;
    return (
      `Round ${JSON.stringify(round.id)}: illustration note ${JSON.stringify(note)} ` +
      `is the correct answer (${JSON.stringify(drawn)})`
    );
  }
  return null;
}

/**
 * Throws when the round's illustration engraves its own correct answer.
 * Call it once per pool round; it is a no-op for rounds with no illustration.
 */
export function assertNoAnswerLeak(round: Round): void {
  const leak = illustrationLeak(round);
  if (leak !== null) {
    throw new Error(`assertNoAnswerLeak: ${leak}`);
  }
}

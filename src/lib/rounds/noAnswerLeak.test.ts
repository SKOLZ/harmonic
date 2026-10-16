import { describe, expect, it } from "vitest";
import { illustrationLeak, assertNoAnswerLeak } from "./noAnswerLeak";
import type { AnswerSpec, Round } from "./types";

const choices = (options: string[], correctIndex: number): AnswerSpec => ({
  kind: "choices",
  options,
  correctIndex,
});

/** A text round whose illustration slot is whatever the case under test needs. */
function textRound(
  id: string,
  answer: AnswerSpec,
  illustration?: Round["illustration"],
): Round {
  return {
    id,
    prompt: { kind: "text", text: `Question ${id}?` },
    answer,
    rule: `Rule for ${id}.`,
    ...(illustration === undefined ? {} : { illustration }),
  };
}

describe("no-answer-leak helper", () => {
  it("passes a round that carries no illustration at all", () => {
    // The slot is optional; an unillustrated round can never leak, and the
    // helper must not demand an illustration to be happy.
    const round = textRound("no-slot", choices(["G", "F", "A", "D"], 0));
    expect(round.illustration).toBeUndefined();
    expect(illustrationLeak(round)).toBeNull();
    expect(() => assertNoAnswerLeak(round)).not.toThrow();
  });

  it("passes the archetype: 'fifth above C' engraves C, never G", () => {
    const round = textRound(
      "fifth-above-c",
      choices(["G", "F", "A", "D"], 0),
      { clef: "treble", notes: ["C4"] },
    );
    expect(illustrationLeak(round)).toBeNull();
    expect(() => assertNoAnswerLeak(round)).not.toThrow();
  });

  it("passes when the engraving holds only a distractor, not the correct choice", () => {
    // F is on the page as a distractor; the correct answer G is not.
    const round = textRound(
      "distractor-only",
      choices(["G", "F", "A", "D"], 0),
      { clef: "treble", notes: ["C4", "F4"] },
    );
    expect(illustrationLeak(round)).toBeNull();
    expect(() => assertNoAnswerLeak(round)).not.toThrow();
  });

  it("fails when the engraving contains the correct choice", () => {
    const round = textRound(
      "leaks-g",
      choices(["G", "F", "A", "D"], 0),
      { clef: "treble", notes: ["C4", "G4"] },
    );
    const leak = illustrationLeak(round);
    expect(leak).not.toBeNull();
    expect(leak).toMatch(/G4/);
    expect(leak).toMatch(/leaks-g/);
    expect(() => assertNoAnswerLeak(round)).toThrow(/illustration note "G4"/);
    expect(() => assertNoAnswerLeak(round)).toThrow(/leaks-g/);
  });

  it("reads the correct option by index, so a distractor at that position is not a leak", () => {
    // correctIndex 2 → "A"; an engraving of the option sitting at index 0 ("G")
    // is a distractor being drawn, not the answer being drawn.
    const round = textRound(
      "index-not-position",
      choices(["G", "F", "A", "D"], 2),
      { clef: "treble", notes: ["G4"] },
    );
    expect(illustrationLeak(round)).toBeNull();
  });

  it("fails when the answer appears at a different octave", () => {
    // The answer channel is the spelling; an octave-displaced copy of it on
    // the page still hands the learner the answer.
    const round = textRound(
      "octave-displaced",
      choices(["G", "F", "A", "D"], 0),
      { clef: "treble", notes: ["G5"] },
    );
    expect(illustrationLeak(round)).not.toBeNull();
    expect(() => assertNoAnswerLeak(round)).toThrow(/G5/);
  });

  it("handles double accidentals on both sides of the comparison", () => {
    const leak = textRound(
      "double-sharp-leak",
      choices(["F##", "F", "G", "E"], 0),
      { clef: "treble", notes: ["F##4"] },
    );
    expect(illustrationLeak(leak)).not.toBeNull();
    expect(() => assertNoAnswerLeak(leak)).toThrow(/F##4/);

    const clean = textRound(
      "double-sharp-clean",
      choices(["F##", "F", "G", "E"], 0),
      { clef: "treble", notes: ["G4"] },
    );
    expect(illustrationLeak(clean)).toBeNull();
  });

  it("compares spellings, not sounding pitch, so C# and Db are not the same answer", () => {
    // The flagship pilot round asks "Which note is enharmonic with C#" with
    // answer Db and engraves C# — enharmonically the SAME sound, correctly
    // NOT a leak, because picking the other spelling is the whole question.
    const round = textRound(
      "enharmonic-question",
      choices(["Db", "D", "B", "Eb"], 0),
      { clef: "treble", notes: ["C#4"] },
    );
    expect(illustrationLeak(round)).toBeNull();
    expect(() => assertNoAnswerLeak(round)).not.toThrow();
  });

  it("ignores answers that are prose rather than a pitch spelling", () => {
    // "A perfect fourth" cannot appear as an engraving note, so no note-level
    // containment is possible; the human no-leak judgement still applies and
    // stays in the lesson suites, not here.
    const round = textRound(
      "prose-answer",
      choices(["A perfect fourth", "A perfect fifth", "A minor fourth", "A major fifth"], 0),
      { clef: "treble", notes: ["C4", "G4"] },
    );
    expect(illustrationLeak(round)).toBeNull();
    expect(() => assertNoAnswerLeak(round)).not.toThrow();
  });

  it("checks every accepted spelling of a textInput answer", () => {
    const byAccepted = textRound(
      "text-input-accepted",
      { kind: "textInput", accepted: ["Eb"], expected: "E flat" },
      { clef: "treble", notes: ["Eb4"] },
    );
    expect(() => assertNoAnswerLeak(byAccepted)).toThrow(/Eb4/);

    const byExpected = textRound(
      "text-input-expected",
      { kind: "textInput", accepted: ["E flat"], expected: "Eb" },
      { clef: "treble", notes: ["Eb4"] },
    );
    expect(() => assertNoAnswerLeak(byExpected)).toThrow(/Eb4/);

    const clean = textRound(
      "text-input-clean",
      { kind: "textInput", accepted: ["Eb"], expected: "Eb" },
      { clef: "treble", notes: ["C4"] },
    );
    expect(illustrationLeak(clean)).toBeNull();
  });

  it("checks a notePick answer as a set", () => {
    const round = textRound(
      "note-pick",
      { kind: "notePick", correctNotes: ["F#4", "C#5"] },
      { clef: "treble", notes: ["G4", "C#4"] },
    );
    // A required C# is on the page as C#4: same spelling, other octave — a
    // leak, whichever octave the engraving chose for it.
    expect(illustrationLeak(round)).not.toBeNull();
    expect(() => assertNoAnswerLeak(round)).toThrow(/C#4/);

    const clean = textRound(
      "note-pick-clean",
      { kind: "notePick", correctNotes: ["F#4"] },
      { clef: "treble", notes: ["C#4"] },
    );
    expect(illustrationLeak(clean)).toBeNull();
  });

  it("checks a sequence answer at any position", () => {
    const round = textRound(
      "sequence",
      { kind: "sequence", correctOrder: ["C4", "D4", "E4"] },
      { clef: "treble", notes: ["E4"] },
    );
    expect(illustrationLeak(round)).not.toBeNull();
    expect(() => assertNoAnswerLeak(round)).toThrow(/E4/);
  });

  it("carries the round id into the failure so a pool sweep names the defect", () => {
    const round = textRound(
      "l32-text-example",
      choices(["Eb", "E", "D#", "Db"], 0),
      { clef: "treble", notes: ["Eb4"] },
    );
    expect(() => assertNoAnswerLeak(round)).toThrow(/l32-text-example/);
    expect(() => assertNoAnswerLeak(round)).toThrow(/is the correct answer \("Eb"\)/);
  });
});

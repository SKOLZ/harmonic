import { describe, expect, it } from "vitest";
import { ANSWER_KINDS, type AnswerSpec } from "../../lib/rounds/types";
import ChoicesAnswer from "./ChoicesAnswer";
import NotePickAnswer from "./NotePickAnswer";
import SequenceAnswer from "./SequenceAnswer";
import TextInputAnswer from "./TextInputAnswer";
import { answerRegistry, getAnswerComponent } from "./registry";

describe("answer registry", () => {
  it("registers the choices control", () => {
    expect(answerRegistry.choices).toBe(ChoicesAnswer);
    expect(getAnswerComponent("choices")).toBe(ChoicesAnswer);
  });

  it("registers the textInput, notePick and sequence controls", () => {
    expect(answerRegistry.textInput).toBe(TextInputAnswer);
    expect(getAnswerComponent("textInput")).toBe(TextInputAnswer);
    expect(answerRegistry.notePick).toBe(NotePickAnswer);
    expect(getAnswerComponent("notePick")).toBe(NotePickAnswer);
    expect(answerRegistry.sequence).toBe(SequenceAnswer);
    expect(getAnswerComponent("sequence")).toBe(SequenceAnswer);
  });

  it("resolves a control for every answer kind in the contract", () => {
    for (const kind of ANSWER_KINDS) {
      expect(answerRegistry[kind]).toBeDefined();
      expect(getAnswerComponent(kind)).toBe(answerRegistry[kind]);
    }
  });

  it("throws a clear error naming the kind for kinds outside the contract", () => {
    // Kinds outside the contract's four must still fail loud rather than
    // render an empty control.
    expect(() => getAnswerComponent("bogus" as AnswerSpec["kind"])).toThrow(
      new RegExp(`"bogus"`),
    );
  });
});

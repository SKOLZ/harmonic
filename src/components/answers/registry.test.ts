import { describe, expect, it } from "vitest";
import ChoicesAnswer from "./ChoicesAnswer";
import { answerRegistry, getAnswerComponent } from "./registry";

describe("answer registry", () => {
  it("registers the choices control", () => {
    expect(answerRegistry.choices).toBe(ChoicesAnswer);
    expect(getAnswerComponent("choices")).toBe(ChoicesAnswer);
  });

  it("throws a clear error naming the kind for unregistered kinds", () => {
    // textInput / notePick / sequence arrive in T5c; until then they must fail loud.
    for (const kind of ["textInput", "notePick", "sequence"] as const) {
      expect(() => getAnswerComponent(kind)).toThrow(new RegExp(`"${kind}"`));
    }
  });
});

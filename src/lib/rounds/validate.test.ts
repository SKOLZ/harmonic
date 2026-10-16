import { describe, expect, it } from "vitest";
import { validateRound, validateRounds } from "./validate";

function choicesRound(overrides: Record<string, unknown> = {}) {
  return {
    id: "r1",
    prompt: { kind: "text", text: "Which note is this?" },
    answer: { kind: "choices", options: ["C", "D", "E"], correctIndex: 1 },
    rule: "Step up from C is D.",
    ...overrides,
  };
}

describe("validateRound", () => {
  it("accepts a valid choices round", () => {
    expect(() => validateRound(choicesRound())).not.toThrow();
  });

  it("throws on a non-object round", () => {
    for (const bad of [null, undefined, 42, "round", []]) {
      expect(() => validateRound(bad)).toThrow(/round must be an object/);
    }
  });

  it("throws on an unknown prompt discriminant", () => {
    expect(() =>
      validateRound(choicesRound({ prompt: { kind: "diagram", text: "?" } })),
    ).toThrow(/unknown prompt kind "diagram"/);
  });

  it("throws on a missing prompt", () => {
    const { prompt: _prompt, ...rest } = choicesRound();
    expect(() => validateRound(rest)).toThrow(/prompt must be an object/);
  });

  it("throws on an unknown answer discriminant", () => {
    expect(() =>
      validateRound(choicesRound({ answer: { kind: "dragDrop" } })),
    ).toThrow(/unknown answer kind "dragDrop"/);
  });

  it("throws when correctIndex is out of range", () => {
    for (const correctIndex of [3, -1, 1.5]) {
      expect(() =>
        validateRound(choicesRound({ answer: { kind: "choices", options: ["C", "D", "E"], correctIndex } })),
      ).toThrow(/correctIndex/);
    }
  });

  it("throws when correctIndex is out of range for empty options", () => {
    expect(() =>
      validateRound(choicesRound({ answer: { kind: "choices", options: [], correctIndex: 0 } })),
    ).toThrow(/correctIndex/);
  });

  it("throws on duplicate option strings", () => {
    expect(() =>
      validateRound(
        choicesRound({ answer: { kind: "choices", options: ["C", "D", "C"], correctIndex: 0 } }),
      ),
    ).toThrow(/duplicate option "C"/);
  });

  it("throws on an empty or whitespace-only rule", () => {
    for (const rule of ["", "   ", "\t\n"]) {
      expect(() => validateRound(choicesRound({ rule }))).toThrow(/rule must be a non-empty string/);
    }
  });

  it("accepts a round whose optional illustration is a valid staff spec", () => {
    const round = choicesRound({
      illustration: { clef: "treble", notes: ["C#4"], duration: "q" },
    });
    expect(() => validateRound(round)).not.toThrow();
  });

  it("throws on an illustration whose clef is unsupported", () => {
    // The illustration slot reuses the staff-prompt shape, so it inherits the
    // same boundary checks — an unknown clef must fail here, not mid-engrave.
    const round = choicesRound({
      illustration: { clef: "alto", notes: ["C4"] },
    });
    expect(() => validateRound(round)).toThrow(/illustration clef/);
  });

  it("throws on an illustration with no notes", () => {
    const round = choicesRound({ illustration: { clef: "bass", notes: [] } });
    expect(() => validateRound(round)).toThrow(/illustration notes/);
  });

  it("throws on a non-object illustration", () => {
    for (const illustration of ["C4", 42, ["C4"]]) {
      const round = choicesRound({ illustration });
      expect(() => validateRound(round)).toThrow(/illustration must be an object/);
    }
  });

  it("accepts valid rounds for the other answer kinds", () => {
    const textInput = choicesRound({
      answer: { kind: "textInput", accepted: ["Bb", "B flat"], expected: "B♭" },
    });
    const notePick = choicesRound({
      answer: { kind: "notePick", correctNotes: ["A", "C#", "E"] },
    });
    const sequence = choicesRound({
      answer: { kind: "sequence", correctOrder: ["C", "D", "E", "F"] },
    });
    for (const round of [textInput, notePick, sequence]) {
      expect(() => validateRound(round)).not.toThrow();
    }
  });
});

describe("validateRounds", () => {
  it("throws on an empty rounds array", () => {
    expect(() => validateRounds([])).toThrow(/must not be empty/);
  });

  it("throws on a non-array input", () => {
    expect(() => validateRounds("nope")).toThrow(/must be an array/);
  });

  it("accepts a non-empty array of valid rounds", () => {
    expect(() => validateRounds([choicesRound(), choicesRound({ id: "r2" })])).not.toThrow();
  });

  it("throws when any member is invalid, naming the index", () => {
    const rounds = [choicesRound(), choicesRound({ rule: "" })];
    expect(() => validateRounds(rounds)).toThrow(/rounds\[1\].*rule must be a non-empty string/);
  });
});

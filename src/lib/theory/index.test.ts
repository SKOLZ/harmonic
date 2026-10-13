import { describe, expect, it } from "vitest";
import {
  buildScale,
  enharmonicEquivalent,
  genericIntervalNumber,
  invertInterval,
  intervalName,
  parseNote,
  specificQuality,
  spellInterval,
} from "./index";

describe("theory barrel", () => {
  it("re-exports the pitch, scale and interval APIs", () => {
    expect(specificQuality(5, 7)).toBe("perfect");
    expect(intervalName(3, 3)).toBe("Minor 3rd");
    expect(genericIntervalNumber(parseNote("C"), parseNote("E"))).toBe(3);
    expect(invertInterval(5, "perfect")).toEqual({ number: 4, quality: "perfect" });
    expect(enharmonicEquivalent(parseNote("C#"), "D").accidental).toBe(-1);
    expect(buildScale(parseNote("Eb"), "major").map((n) => n.letter)).toEqual([
      "E", "F", "G", "A", "B", "C", "D",
    ]);
    expect(spellInterval(parseNote("C"), 5, "diminished").letter).toBe("G");
  });
});

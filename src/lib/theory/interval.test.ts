import { describe, expect, it } from "vitest";
import { parseNote, scientificName, type Note } from "./pitch";
import {
  genericIntervalNumber,
  halfSteps,
  invertInterval,
  intervalName,
  specificQuality,
  spellInterval,
} from "./interval";

const C = (): Note => parseNote("C");
const D = (): Note => parseNote("D");
const E = (): Note => parseNote("E");
const F = (): Note => parseNote("F");
const G = (): Note => parseNote("G");
const A = (): Note => parseNote("A");
const B = (): Note => parseNote("B");

describe("genericIntervalNumber", () => {
  it("counts letter distance upward within the octave", () => {
    expect(genericIntervalNumber(C(), C())).toBe(1);
    expect(genericIntervalNumber(C(), D())).toBe(2);
    expect(genericIntervalNumber(C(), E())).toBe(3);
    expect(genericIntervalNumber(C(), F())).toBe(4);
    expect(genericIntervalNumber(C(), G())).toBe(5);
    expect(genericIntervalNumber(C(), A())).toBe(6);
    expect(genericIntervalNumber(C(), B())).toBe(7);
  });

  it("ignores accidentals", () => {
    expect(genericIntervalNumber(parseNote("C#"), parseNote("Eb"))).toBe(3);
    expect(genericIntervalNumber(parseNote("Dbb"), parseNote("A##"))).toBe(5);
  });

  it("uses octaves to distinguish unison from octave when present", () => {
    expect(genericIntervalNumber(parseNote("C4"), parseNote("C4"))).toBe(1);
    expect(genericIntervalNumber(parseNote("C4"), parseNote("C5"))).toBe(8);
    expect(genericIntervalNumber(parseNote("C4"), parseNote("E4"))).toBe(3);
    expect(genericIntervalNumber(parseNote("B3"), parseNote("A#4"))).toBe(7);
  });
});

describe("halfSteps", () => {
  it("measures ascending pitch-class distance without octaves", () => {
    expect(halfSteps(C(), C())).toBe(0);
    expect(halfSteps(C(), D())).toBe(2);
    expect(halfSteps(C(), E())).toBe(4);
    expect(halfSteps(B(), C())).toBe(1);
    expect(halfSteps(C(), B())).toBe(11);
    expect(halfSteps(parseNote("Eb"), parseNote("G"))).toBe(4);
  });

  it("measures absolute distance when octaves are present", () => {
    expect(halfSteps(parseNote("C4"), parseNote("C4"))).toBe(0);
    expect(halfSteps(parseNote("C4"), parseNote("E4"))).toBe(4);
    expect(halfSteps(parseNote("C4"), parseNote("C5"))).toBe(12);
    expect(halfSteps(parseNote("B3"), parseNote("C4"))).toBe(1);
  });
});

describe("specificQuality", () => {
  it("classifies perfect-based intervals", () => {
    expect(specificQuality(1, 0)).toBe("perfect");
    expect(specificQuality(4, 5)).toBe("perfect");
    expect(specificQuality(4, 6)).toBe("augmented");
    expect(specificQuality(4, 4)).toBe("diminished");
    expect(specificQuality(5, 7)).toBe("perfect");
    expect(specificQuality(5, 8)).toBe("augmented");
    expect(specificQuality(5, 6)).toBe("diminished");
    expect(specificQuality(5, 5)).toBe("doublyDiminished");
    expect(specificQuality(8, 12)).toBe("perfect");
    expect(specificQuality(8, 13)).toBe("augmented");
  });

  it("classifies major/minor-based intervals", () => {
    expect(specificQuality(2, 2)).toBe("major");
    expect(specificQuality(2, 1)).toBe("minor");
    expect(specificQuality(2, 3)).toBe("augmented");
    expect(specificQuality(2, 0)).toBe("diminished");
    expect(specificQuality(3, 4)).toBe("major");
    expect(specificQuality(3, 3)).toBe("minor");
    expect(specificQuality(3, 5)).toBe("augmented");
    expect(specificQuality(3, 2)).toBe("diminished");
    expect(specificQuality(3, 1)).toBe("doublyDiminished");
    expect(specificQuality(6, 9)).toBe("major");
    expect(specificQuality(6, 8)).toBe("minor");
    expect(specificQuality(7, 11)).toBe("major");
    expect(specificQuality(7, 10)).toBe("minor");
    expect(specificQuality(7, 9)).toBe("diminished");
    expect(specificQuality(2, 4)).toBe("doublyAugmented");
  });

  it("handles compound numbers by reducing through the octave", () => {
    expect(specificQuality(9, 14)).toBe("major"); // compound major 2nd
    expect(specificQuality(10, 15)).toBe("minor"); // compound minor 3rd
    expect(specificQuality(12, 19)).toBe("perfect"); // compound perfect 5th
    expect(specificQuality(14, 23)).toBe("major"); // compound major 7th
  });

  it("returns null for impossible combinations", () => {
    expect(specificQuality(5, 2)).toBeNull();
    expect(specificQuality(7, 7)).toBeNull();
    expect(specificQuality(4, 2)).toBeNull();
    expect(specificQuality(2, 6)).toBeNull();
  });

  it("throws on malformed arguments", () => {
    expect(() => specificQuality(0, 0)).toThrow();
    expect(() => specificQuality(-1, 0)).toThrow();
    expect(() => specificQuality(1.5, 0)).toThrow();
    expect(() => specificQuality(1, -1)).toThrow();
  });
});

describe("intervalName", () => {
  it("names intervals from number and half steps", () => {
    expect(intervalName(5, 7)).toBe("Perfect 5th");
    expect(intervalName(4, 5)).toBe("Perfect 4th");
    expect(intervalName(3, 3)).toBe("Minor 3rd");
    expect(intervalName(3, 4)).toBe("Major 3rd");
    expect(intervalName(4, 6)).toBe("Augmented 4th");
    expect(intervalName(5, 6)).toBe("Diminished 5th");
    expect(intervalName(7, 10)).toBe("Minor 7th");
    expect(intervalName(1, 0)).toBe("Perfect Unison");
    expect(intervalName(8, 12)).toBe("Perfect Octave");
    expect(intervalName(2, 4)).toBe("Doubly Augmented 2nd");
  });

  it("returns null when the combination is impossible", () => {
    expect(intervalName(5, 2)).toBeNull();
    expect(intervalName(7, 7)).toBeNull();
  });
});

describe("invertInterval", () => {
  it("inverts perfect, major/minor and augmented/diminished pairs", () => {
    expect(invertInterval(5, "perfect")).toEqual({ number: 4, quality: "perfect" });
    expect(invertInterval(4, "perfect")).toEqual({ number: 5, quality: "perfect" });
    expect(invertInterval(3, "major")).toEqual({ number: 6, quality: "minor" });
    expect(invertInterval(6, "minor")).toEqual({ number: 3, quality: "major" });
    expect(invertInterval(4, "augmented")).toEqual({ number: 5, quality: "diminished" });
    expect(invertInterval(5, "diminished")).toEqual({ number: 4, quality: "augmented" });
    expect(invertInterval(7, "major")).toEqual({ number: 2, quality: "minor" });
    expect(invertInterval(2, "doublyAugmented")).toEqual({ number: 7, quality: "doublyDiminished" });
  });

  it("throws on unknown qualities or malformed numbers", () => {
    expect(() => invertInterval(5, "major" as never)).toThrow();
    expect(() => invertInterval(5, "weird" as never)).toThrow();
    expect(() => invertInterval(0, "perfect")).toThrow();
  });
});

describe("spellInterval", () => {
  it("spells the lesson examples", () => {
    expect(scientificName(spellInterval(parseNote("C"), 3, "minor"))).toBe("Eb");
    expect(scientificName(spellInterval(parseNote("B"), 5, "diminished"))).toBe("F");
    expect(scientificName(spellInterval(parseNote("C"), 4, "augmented"))).toBe("F#");
    expect(scientificName(spellInterval(parseNote("C"), 5, "diminished"))).toBe("Gb");
  });

  it("spells unisons, octaves and simple perfect/major intervals", () => {
    expect(scientificName(spellInterval(parseNote("C"), 1, "perfect"))).toBe("C");
    expect(scientificName(spellInterval(parseNote("C"), 8, "perfect"))).toBe("C");
    expect(scientificName(spellInterval(parseNote("C"), 5, "perfect"))).toBe("G");
    expect(scientificName(spellInterval(parseNote("C"), 4, "perfect"))).toBe("F");
    expect(scientificName(spellInterval(parseNote("D"), 3, "major"))).toBe("F#");
    expect(scientificName(spellInterval(parseNote("F"), 4, "perfect"))).toBe("Bb");
  });

  it("spells diminished and doubly-augmented intervals", () => {
    expect(scientificName(spellInterval(parseNote("B"), 5, "doublyDiminished"))).toBe("Fb");
    expect(scientificName(spellInterval(parseNote("C"), 2, "doublyAugmented"))).toBe("D##");
    expect(scientificName(spellInterval(parseNote("A"), 4, "doublyAugmented"))).toBe("D##");
    expect(scientificName(spellInterval(parseNote("E"), 7, "doublyDiminished"))).toBe("Db");
  });

  it("carries octave through when the root has one", () => {
    expect(scientificName(spellInterval(parseNote("C4"), 3, "minor"))).toBe("Eb4");
    expect(scientificName(spellInterval(parseNote("B3"), 5, "diminished"))).toBe("F4");
    expect(scientificName(spellInterval(parseNote("C4"), 8, "perfect"))).toBe("C5");
  });

  it("rejects qualities that cannot apply to the interval number", () => {
    expect(() => spellInterval(parseNote("C"), 5, "major")).toThrow();
    expect(() => spellInterval(parseNote("C"), 3, "perfect")).toThrow();
    expect(() => spellInterval(parseNote("C"), 4, "minor")).toThrow();
    expect(() => spellInterval(parseNote("C"), 1, "augmented")).not.toThrow();
  });

  it("throws when the interval cannot be spelled within double accidentals", () => {
    // A doubly-augmented 6th above E needs C###, outside the accidental range.
    expect(() => spellInterval(parseNote("E"), 6, "doublyAugmented")).toThrow();
  });

  it("throws on malformed numbers", () => {
    expect(() => spellInterval(parseNote("C"), 0, "perfect")).toThrow();
    expect(() => spellInterval(parseNote("C"), 2.5, "major")).toThrow();
  });
});

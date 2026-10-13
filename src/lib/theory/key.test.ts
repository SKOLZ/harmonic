import { describe, expect, it } from "vitest";
import {
  accidentalCount,
  allMajorKeys,
  FLAT_ORDER,
  keySignatureAccidentals,
  majorKeyFromAccidentalCount,
  minorAccidentalCount,
  relativeMajor,
  relativeMinor,
  relativeMinorOffsetFromMajor,
  SHARP_ORDER,
} from "./key";
import { parseNote, scientificName, type Note } from "./pitch";

function spell(notes: readonly Note[]): string[] {
  return notes.map((note) => scientificName(note));
}

describe("accidental order constants", () => {
  it("exports the canonical sharp and flat orders", () => {
    expect([...SHARP_ORDER]).toEqual(["F", "C", "G", "D", "A", "E", "B"]);
    expect([...FLAT_ORDER]).toEqual(["B", "E", "A", "D", "G", "C", "F"]);
  });
});

describe("keySignatureAccidentals", () => {
  it("returns the accidentals in canonical staff order", () => {
    expect(spell(keySignatureAccidentals(parseNote("C")))).toEqual([]);
    expect(spell(keySignatureAccidentals(parseNote("G")))).toEqual(["F#"]);
    expect(spell(keySignatureAccidentals(parseNote("D")))).toEqual(["F#", "C#"]);
    expect(spell(keySignatureAccidentals(parseNote("F")))).toEqual(["Bb"]);
    expect(spell(keySignatureAccidentals(parseNote("Eb")))).toEqual(["Bb", "Eb", "Ab"]);
    expect(spell(keySignatureAccidentals(parseNote("Ab")))).toEqual(["Bb", "Eb", "Ab", "Db"]);
    expect(spell(keySignatureAccidentals(parseNote("B")))).toEqual([
      "F#",
      "C#",
      "G#",
      "D#",
      "A#",
    ]);
    expect(spell(keySignatureAccidentals(parseNote("Gb")))).toEqual([
      "Bb",
      "Eb",
      "Ab",
      "Db",
      "Gb",
      "Cb",
    ]);
  });
});

describe("accidentalCount / majorKeyFromAccidentalCount", () => {
  it("counts sharps positive and flats negative", () => {
    expect(accidentalCount(parseNote("C"))).toBe(0);
    expect(accidentalCount(parseNote("G"))).toBe(1);
    expect(accidentalCount(parseNote("D"))).toBe(2);
    expect(accidentalCount(parseNote("F"))).toBe(-1);
    expect(accidentalCount(parseNote("Eb"))).toBe(-3);
    expect(accidentalCount(parseNote("Cb"))).toBe(-7);
    expect(accidentalCount(parseNote("C#"))).toBe(7);
  });

  it("round-trips all 15 keys through count ↔ key", () => {
    for (let n = -7; n <= 7; n++) {
      const key = majorKeyFromAccidentalCount(n);
      expect(accidentalCount(key)).toBe(n);
    }
  });

  it("names the standard keys for each count", () => {
    expect(scientificName(majorKeyFromAccidentalCount(1))).toBe("G");
    expect(scientificName(majorKeyFromAccidentalCount(-1))).toBe("F");
    expect(scientificName(majorKeyFromAccidentalCount(7))).toBe("C#");
    expect(scientificName(majorKeyFromAccidentalCount(-7))).toBe("Cb");
    expect(scientificName(majorKeyFromAccidentalCount(0))).toBe("C");
  });

  it("rejects counts outside -7..7", () => {
    expect(() => majorKeyFromAccidentalCount(8)).toThrow();
    expect(() => majorKeyFromAccidentalCount(-8)).toThrow();
  });
});

describe("relative keys", () => {
  it("finds the relative minor of C major as A", () => {
    expect(scientificName(relativeMinor(parseNote("C")))).toBe("A");
  });

  it("finds the relative major of A minor as C", () => {
    expect(scientificName(relativeMajor(parseNote("A")))).toBe("C");
  });

  it("spells relative keys correctly across the sharp/flat boundary", () => {
    expect(scientificName(relativeMinor(parseNote("Eb")))).toBe("C");
    expect(scientificName(relativeMinor(parseNote("B")))).toBe("G#");
    expect(scientificName(relativeMinor(parseNote("F")))).toBe("D");
    expect(scientificName(relativeMajor(parseNote("C#")))).toBe("E");
    expect(scientificName(relativeMajor(parseNote("Bb")))).toBe("Db");
  });

  it("exposes the lesson-25 offset constant as -3", () => {
    expect(relativeMinorOffsetFromMajor).toBe(-3);
  });
});

describe("minorAccidentalCount", () => {
  it("matches the relative major's key signature", () => {
    expect(minorAccidentalCount(parseNote("A"))).toBe(0);
    expect(minorAccidentalCount(parseNote("E"))).toBe(1);
    expect(minorAccidentalCount(parseNote("D"))).toBe(-1);
    expect(minorAccidentalCount(parseNote("B"))).toBe(2);
    expect(minorAccidentalCount(parseNote("Bb"))).toBe(-5);
  });
});

describe("allMajorKeys", () => {
  it("lists all 15 keys ordered from -7 to +7 accidentals", () => {
    const keys = allMajorKeys();
    expect(keys).toHaveLength(15);
    expect(keys.map((entry) => scientificName(entry.key))).toEqual([
      "Cb", "Gb", "Db", "Ab", "Eb", "Bb", "F", "C", "G", "D", "A", "E", "B", "F#", "C#",
    ]);
    expect(keys.map((entry) => entry.sharps + entry.flats * -1)).toEqual([
      -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7,
    ]);
    for (const entry of keys) {
      expect(entry.sharps).toBe(Math.max(0, accidentalCount(entry.key)));
      expect(entry.flats).toBe(Math.max(0, -accidentalCount(entry.key)));
    }
  });
});

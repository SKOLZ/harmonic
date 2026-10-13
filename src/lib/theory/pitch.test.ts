import { describe, expect, it } from "vitest";
import {
  displayName,
  enharmonicEquivalent,
  formatNote,
  midiNumber,
  notesAreEnharmonic,
  noteFromLetterAndAlteration,
  parseNote,
  scientificName,
  semitoneIndex,
} from "./pitch";

describe("parseNote", () => {
  it("parses naturals, accidentals and octaves", () => {
    expect(parseNote("C")).toEqual({ letter: "C", accidental: 0 });
    expect(parseNote("E")).toEqual({ letter: "E", accidental: 0 });
    expect(parseNote("C#4")).toEqual({ letter: "C", accidental: 1, octave: 4 });
    expect(parseNote("Eb")).toEqual({ letter: "E", accidental: -1 });
    expect(parseNote("Bbb")).toEqual({ letter: "B", accidental: -2 });
    expect(parseNote("F##")).toEqual({ letter: "F", accidental: 2 });
    expect(parseNote("Gbb2")).toEqual({ letter: "G", accidental: -2, octave: 2 });
  });

  it("throws on invalid input", () => {
    const invalid = ["", "H", "c#4", "C###", "Cbbb", "C#x", "4C", "#", "C b", "C4x", "Cb4b", " C"];
    for (const input of invalid) {
      expect(() => parseNote(input), `expected "${input}" to throw`).toThrow();
    }
  });
});

describe("formatting", () => {
  it("renders unicode display names", () => {
    expect(displayName(parseNote("C#"))).toBe("C♯");
    expect(displayName(parseNote("Bbb"))).toBe("B𝄫");
    expect(displayName(parseNote("F##"))).toBe("F𝄪");
    expect(displayName(parseNote("Eb"))).toBe("E♭");
    expect(displayName(parseNote("G"))).toBe("G");
  });

  it("renders ASCII scientific names, including octave when present", () => {
    expect(scientificName(parseNote("C#4"))).toBe("C#4");
    expect(scientificName(parseNote("Bbb"))).toBe("Bbb");
    expect(scientificName(parseNote("Eb2"))).toBe("Eb2");
    expect(scientificName(parseNote("F##"))).toBe("F##");
  });

  it("has formatNote agree with displayName", () => {
    expect(formatNote(parseNote("C#"))).toBe(displayName(parseNote("C#")));
    expect(formatNote(parseNote("Bbb"))).toBe(displayName(parseNote("Bbb")));
  });

  it("round-trips parse through scientificName", () => {
    for (const text of ["C", "C#4", "Bbb", "F##", "E", "Eb3", "Gbb2", "A##-1"]) {
      expect(scientificName(parseNote(text))).toBe(text);
    }
  });
});

describe("semitoneIndex and midiNumber", () => {
  it("indexes pitch classes with C = 0", () => {
    expect(semitoneIndex(parseNote("C"))).toBe(0);
    expect(semitoneIndex(parseNote("C#"))).toBe(1);
    expect(semitoneIndex(parseNote("D"))).toBe(2);
    expect(semitoneIndex(parseNote("B"))).toBe(11);
    expect(semitoneIndex(parseNote("Cb"))).toBe(11);
    expect(semitoneIndex(parseNote("B#"))).toBe(0);
  });

  it("adjusts for octave when present", () => {
    expect(semitoneIndex(parseNote("C4"))).toBe(48);
    expect(semitoneIndex(parseNote("C#4"))).toBe(49);
    expect(semitoneIndex(parseNote("B3"))).toBe(47);
    expect(semitoneIndex(parseNote("C5"))).toBe(60);
  });

  it("maps MIDI numbers with C4 = 60", () => {
    expect(midiNumber(parseNote("C4"))).toBe(60);
    expect(midiNumber(parseNote("A4"))).toBe(69);
    expect(midiNumber(parseNote("C#4"))).toBe(61);
    expect(midiNumber(parseNote("Bbb3"))).toBe(57);
    expect(midiNumber(parseNote("C5"))).toBe(72);
  });

  it("throws from midiNumber when octave is missing", () => {
    expect(() => midiNumber(parseNote("C"))).toThrow();
  });
});

describe("enharmonic equivalence", () => {
  it("recognises enharmonic pairs", () => {
    expect(notesAreEnharmonic(parseNote("C#"), parseNote("Db"))).toBe(true);
    expect(notesAreEnharmonic(parseNote("B#"), parseNote("C"))).toBe(true);
    expect(notesAreEnharmonic(parseNote("Cb"), parseNote("B"))).toBe(true);
    expect(notesAreEnharmonic(parseNote("E#"), parseNote("F"))).toBe(true);
    expect(notesAreEnharmonic(parseNote("C#4"), parseNote("Db4"))).toBe(true);
    expect(notesAreEnharmonic(parseNote("Fbb"), parseNote("Eb"))).toBe(true);
  });

  it("rejects non-enharmonic pairs", () => {
    expect(notesAreEnharmonic(parseNote("C#"), parseNote("E"))).toBe(false);
    expect(notesAreEnharmonic(parseNote("C"), parseNote("C#"))).toBe(false);
    expect(notesAreEnharmonic(parseNote("C#4"), parseNote("Db5"))).toBe(false);
  });

  it("spells the same pitch on a requested letter", () => {
    expect(enharmonicEquivalent(parseNote("C#"), "D")).toEqual({ letter: "D", accidental: -1 });
    expect(enharmonicEquivalent(parseNote("Db"), "C")).toEqual({ letter: "C", accidental: 1 });
    expect(enharmonicEquivalent(parseNote("B#"), "C")).toEqual({ letter: "C", accidental: 0 });
    expect(enharmonicEquivalent(parseNote("Cb"), "B")).toEqual({ letter: "B", accidental: 0 });
    expect(enharmonicEquivalent(parseNote("E#"), "F")).toEqual({ letter: "F", accidental: 0 });
  });

  it("carries the octave across when present, adjusting when the letter crosses", () => {
    expect(enharmonicEquivalent(parseNote("C#4"), "D")).toEqual({ letter: "D", accidental: -1, octave: 4 });
    // B#4 sounds as C5, so the octave crosses upward.
    expect(enharmonicEquivalent(parseNote("B#4"), "C")).toEqual({ letter: "C", accidental: 0, octave: 5 });
    // Cb4 sounds as B3, so the octave crosses downward.
    expect(enharmonicEquivalent(parseNote("Cb4"), "B")).toEqual({ letter: "B", accidental: 0, octave: 3 });
  });

  it("throws when the letter cannot spell the pitch within double accidentals", () => {
    expect(() => enharmonicEquivalent(parseNote("C#"), "E")).toThrow();
    expect(() => enharmonicEquivalent(parseNote("Gb"), "A")).toThrow();
  });
});

describe("noteFromLetterAndAlteration", () => {
  it("finds the note on the requested letter closest to the target pitch", () => {
    expect(noteFromLetterAndAlteration("D", 4, 49)).toEqual({ letter: "D", accidental: -1, octave: 4 });
    expect(noteFromLetterAndAlteration("F", 4, 54)).toEqual({ letter: "F", accidental: 1, octave: 4 });
    expect(noteFromLetterAndAlteration("B", 4, 60)).toEqual({ letter: "B", accidental: 1, octave: 4 });
    expect(noteFromLetterAndAlteration("E", 4, 51)).toEqual({ letter: "E", accidental: -1, octave: 4 });
  });

  it("crosses octaves when that spells the target more closely", () => {
    // B3 sits at semitone index 47; the diminished 5th above it is F4 at 53, not F3.
    expect(noteFromLetterAndAlteration("F", 3, 53)).toEqual({ letter: "F", accidental: 0, octave: 4 });
  });

  it("clamps to double accidentals when the target is unreachable", () => {
    // Closest F to semitone index 60 (C5) is Fbb5 (63); no F within ±2 accidentals hits 60.
    const closest = noteFromLetterAndAlteration("F", 4, 60);
    expect(closest.letter).toBe("F");
    expect(closest.accidental).toBe(-2);
    expect(semitoneIndex(closest)).toBe(63);
  });
});

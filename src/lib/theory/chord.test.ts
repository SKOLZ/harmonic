import { describe, expect, it } from "vitest";
import {
  bassNote,
  buildSeventh,
  buildTriad,
  chordInversion,
  detectSeventhQuality,
  detectTriadQuality,
  identifyInversion,
  type SeventhQuality,
  type TriadQuality,
} from "./chord";
import { halfSteps } from "./interval";
import { parseNote, scientificName, type Note } from "./pitch";

function spell(notes: readonly Note[]): string[] {
  return notes.map((note) => scientificName(note));
}

function lettersOf(notes: readonly Note[]): string[] {
  return notes.map((note) => note.letter);
}

/** Ascending half-step counts from the root to each chord tone. */
function intervalsFromRoot(notes: readonly Note[]): number[] {
  const [root, ...rest] = notes;
  return rest.map((note) => halfSteps(root, note));
}

const TRIAD_OFFSETS: Readonly<Record<TriadQuality, number[]>> = {
  major: [4, 7],
  minor: [3, 7],
  diminished: [3, 6],
  augmented: [4, 8],
};

const SEVENTH_OFFSETS: Readonly<Record<SeventhQuality, number[]>> = {
  majorSeventh: [4, 7, 11],
  minorSeventh: [3, 7, 10],
  dominantSeventh: [4, 7, 10],
  halfDiminishedSeventh: [3, 6, 10],
  fullyDiminishedSeventh: [3, 6, 9],
  minorMajorSeventh: [3, 7, 11],
  augmentedMajorSeventh: [4, 8, 11],
  augmentedSeventh: [4, 8, 10],
};

describe("buildTriad", () => {
  const qualities: TriadQuality[] = ["major", "minor", "diminished", "augmented"];
  const roots = ["Eb", "F#"];

  for (const rootText of roots) {
    for (const quality of qualities) {
      it(`builds a ${quality} triad from ${rootText} with the right intervals and distinct letters`, () => {
        const notes = buildTriad(parseNote(rootText), quality);
        expect(notes).toHaveLength(3);
        expect(intervalsFromRoot(notes)).toEqual(TRIAD_OFFSETS[quality]);
        const letters = lettersOf(notes);
        expect(new Set(letters).size).toBe(3);
      });
    }
  }

  it("spells a diminished triad by letter, not chromatic shortcut (C dim = C Eb Gb)", () => {
    expect(spell(buildTriad(parseNote("C"), "diminished"))).toEqual(["C", "Eb", "Gb"]);
  });

  it("builds B diminished as B D F", () => {
    expect(spell(buildTriad(parseNote("B"), "diminished"))).toEqual(["B", "D", "F"]);
  });

  it("builds E major as E G# B", () => {
    expect(spell(buildTriad(parseNote("E"), "major"))).toEqual(["E", "G#", "B"]);
  });

  it("spells known flat- and sharp-side triads exactly", () => {
    expect(spell(buildTriad(parseNote("Eb"), "major"))).toEqual(["Eb", "G", "Bb"]);
    expect(spell(buildTriad(parseNote("F#"), "major"))).toEqual(["F#", "A#", "C#"]);
    expect(spell(buildTriad(parseNote("Eb"), "minor"))).toEqual(["Eb", "Gb", "Bb"]);
    expect(spell(buildTriad(parseNote("F#"), "minor"))).toEqual(["F#", "A", "C#"]);
    expect(spell(buildTriad(parseNote("Eb"), "diminished"))).toEqual(["Eb", "Gb", "Bbb"]);
    expect(spell(buildTriad(parseNote("F#"), "diminished"))).toEqual(["F#", "A", "C"]);
    expect(spell(buildTriad(parseNote("Eb"), "augmented"))).toEqual(["Eb", "G", "B"]);
    expect(spell(buildTriad(parseNote("F#"), "augmented"))).toEqual(["F#", "A#", "C##"]);
  });
});

describe("buildSeventh", () => {
  const cases: Array<[string, SeventhQuality, string[]]> = [
    ["C majorSeventh", "majorSeventh", ["C", "E", "G", "B"]],
    ["C minorSeventh", "minorSeventh", ["C", "Eb", "G", "Bb"]],
    ["C dominantSeventh", "dominantSeventh", ["C", "E", "G", "Bb"]],
    ["C halfDiminishedSeventh", "halfDiminishedSeventh", ["C", "Eb", "Gb", "Bb"]],
    ["C fullyDiminishedSeventh", "fullyDiminishedSeventh", ["C", "Eb", "Gb", "Bbb"]],
    ["C minorMajorSeventh", "minorMajorSeventh", ["C", "Eb", "G", "B"]],
    ["C augmentedMajorSeventh", "augmentedMajorSeventh", ["C", "E", "G#", "B"]],
    ["C augmentedSeventh", "augmentedSeventh", ["C", "E", "G#", "Bb"]],
  ];

  for (const [label, quality, expected] of cases) {
    it(`builds ${label} as ${expected.join(" ")}`, () => {
      const notes = buildSeventh(parseNote("C"), quality);
      expect(spell(notes)).toEqual(expected);
      expect(intervalsFromRoot(notes)).toEqual(SEVENTH_OFFSETS[quality]);
      expect(new Set(lettersOf(notes)).size).toBe(4);
    });
  }
});

describe("detectTriadQuality", () => {
  it("detects all four qualities from built triads", () => {
    expect(detectTriadQuality(buildTriad(parseNote("C"), "major"))).toBe("major");
    expect(detectTriadQuality(buildTriad(parseNote("D"), "minor"))).toBe("minor");
    expect(detectTriadQuality(buildTriad(parseNote("B"), "diminished"))).toBe("diminished");
    expect(detectTriadQuality(buildTriad(parseNote("Ab"), "augmented"))).toBe("augmented");
  });

  it("returns null when nothing matches", () => {
    expect(detectTriadQuality([parseNote("C"), parseNote("D"), parseNote("E")])).toBeNull();
    expect(detectTriadQuality([parseNote("C"), parseNote("E")])).toBeNull();
  });
});

describe("detectSeventhQuality", () => {
  it("detects all four qualities that share letters from built sevenths", () => {
    expect(detectSeventhQuality(buildSeventh(parseNote("C"), "majorSeventh"))).toBe("majorSeventh");
    expect(detectSeventhQuality(buildSeventh(parseNote("A"), "minorSeventh"))).toBe("minorSeventh");
    expect(detectSeventhQuality(buildSeventh(parseNote("G"), "dominantSeventh"))).toBe("dominantSeventh");
    expect(detectSeventhQuality(buildSeventh(parseNote("B"), "halfDiminishedSeventh"))).toBe(
      "halfDiminishedSeventh",
    );
    expect(detectSeventhQuality(buildSeventh(parseNote("C"), "fullyDiminishedSeventh"))).toBe(
      "fullyDiminishedSeventh",
    );
    expect(detectSeventhQuality(buildSeventh(parseNote("D"), "minorMajorSeventh"))).toBe(
      "minorMajorSeventh",
    );
    expect(detectSeventhQuality(buildSeventh(parseNote("C"), "augmentedMajorSeventh"))).toBe(
      "augmentedMajorSeventh",
    );
    expect(detectSeventhQuality(buildSeventh(parseNote("C"), "augmentedSeventh"))).toBe(
      "augmentedSeventh",
    );
  });

  it("returns null when nothing matches", () => {
    expect(
      detectSeventhQuality([parseNote("C"), parseNote("D"), parseNote("E"), parseNote("F")]),
    ).toBeNull();
  });
});

describe("chordInversion", () => {
  it("rotates bottom-to-top and cycles back after one full turn", () => {
    const root = buildTriad(parseNote("C"), "major");
    const first = chordInversion(root, 1);
    const second = chordInversion(root, 2);
    expect(spell(first)).toEqual(["E", "G", "C"]);
    expect(spell(second)).toEqual(["G", "C", "E"]);
    expect(chordInversion(root, 3)).toEqual(root);
    expect(chordInversion(first, 1)).toEqual(second);
  });

  it("leaves the chord untouched at rotation 0", () => {
    const chord = buildSeventh(parseNote("C"), "dominantSeventh");
    expect(chordInversion(chord, 0)).toEqual(chord);
    expect(chordInversion(chord, 4)).toEqual(chord);
  });
});

describe("bassNote", () => {
  it("returns the first element", () => {
    const chord = buildTriad(parseNote("C"), "major");
    expect(bassNote(chord)).toEqual(chord[0]);
    expect(scientificName(bassNote(chord))).toBe("C");
  });
});

describe("identifyInversion", () => {
  it("identifies triad inversions by the bass chord tone", () => {
    const root = buildTriad(parseNote("C"), "major");
    expect(identifyInversion(parseNote("C"), root)).toBe("rootPosition");
    expect(identifyInversion(parseNote("C"), chordInversion(root, 1))).toBe("first");
    expect(identifyInversion(parseNote("C"), chordInversion(root, 2))).toBe("second");
  });

  it("identifies seventh-chord inversions including the third", () => {
    const chord = buildSeventh(parseNote("C"), "dominantSeventh");
    expect(identifyInversion(parseNote("C"), chord)).toBe("rootPosition");
    expect(identifyInversion(parseNote("C"), chordInversion(chord, 1))).toBe("first");
    expect(identifyInversion(parseNote("C"), chordInversion(chord, 2))).toBe("second");
    expect(identifyInversion(parseNote("C"), chordInversion(chord, 3))).toBe("third");
  });

  it("identifies inversions of a flat-side root", () => {
    const chord = buildTriad(parseNote("Eb"), "major");
    expect(identifyInversion(parseNote("Eb"), chord)).toBe("rootPosition");
    expect(identifyInversion(parseNote("Eb"), chordInversion(chord, 1))).toBe("first");
  });

  it("throws when the bass is not a tertian chord tone of the root", () => {
    // D is a second above C — not root, third, fifth or seventh.
    const chord = buildTriad(parseNote("D"), "minor");
    expect(() => identifyInversion(parseNote("C"), chord)).toThrow();
  });
});

describe("chordInversion edge cases", () => {
  it("rejects non-integer rotations and empty chords", () => {
    const chord = buildTriad(parseNote("C"), "major");
    expect(() => chordInversion(chord, 1.5)).toThrow();
    expect(() => chordInversion([], 0)).toThrow();
  });
});

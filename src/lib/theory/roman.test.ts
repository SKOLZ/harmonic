import { describe, expect, it } from "vitest";
import { buildTriad, detectTriadQuality, type TriadQuality } from "./chord";
import { parseNote, scientificName, type Note } from "./pitch";
import {
  diatonicSevenths,
  diatonicTriadQualities,
  diatonicTriads,
  inversionFigure,
  romanNumeral,
  romanNumeralSeventh,
} from "./roman";
import { buildScale, degreeNote, type ScaleType } from "./scale";

function spell(notes: readonly Note[]): string[] {
  return notes.map((note) => scientificName(note));
}

describe("diatonicTriadQualities", () => {
  it("matches the major row I ii iii IV V vi vii°", () => {
    expect(diatonicTriadQualities("major")).toEqual([
      "major",
      "minor",
      "minor",
      "major",
      "major",
      "minor",
      "diminished",
    ]);
  });

  it("matches the natural-minor row i ii° III iv v VI VII", () => {
    expect(diatonicTriadQualities("naturalMinor")).toEqual([
      "minor",
      "diminished",
      "major",
      "minor",
      "minor",
      "major",
      "major",
    ]);
  });

  it("matches the harmonic-minor row i ii° III+ iv V VI vii°", () => {
    expect(diatonicTriadQualities("harmonicMinor")).toEqual([
      "minor",
      "diminished",
      "augmented",
      "minor",
      "major",
      "major",
      "diminished",
    ]);
  });

  it("matches the melodic-minor-ascending row i ii III+ IV V vi° vii°", () => {
    expect(diatonicTriadQualities("melodicMinor")).toEqual([
      "minor",
      "minor",
      "augmented",
      "major",
      "major",
      "diminished",
      "diminished",
    ]);
  });
});

describe("diatonicTriads", () => {
  it("builds C major triads on each degree", () => {
    const triads = diatonicTriads(parseNote("C"), "major");
    expect(triads.map((t) => t.degree)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(triads.map((t) => t.quality)).toEqual(diatonicTriadQualities("major"));
    expect(triads.map((t) => spell(t.notes))).toEqual([
      ["C", "E", "G"],
      ["D", "F", "A"],
      ["E", "G", "B"],
      ["F", "A", "C"],
      ["G", "B", "D"],
      ["A", "C", "E"],
      ["B", "D", "F"],
    ]);
  });

  it("builds A harmonic-minor triads by stacking scale thirds", () => {
    const triads = diatonicTriads(parseNote("A"), "harmonicMinor");
    // Degree 3 stacks C E G# from the scale, so III+ is augmented, not major.
    expect(triads.map((t) => spell(t.notes))).toEqual([
      ["A", "C", "E"],
      ["B", "D", "F"],
      ["C", "E", "G#"],
      ["D", "F", "A"],
      ["E", "G#", "B"],
      ["F", "A", "C"],
      ["G#", "B", "D"],
    ]);
    expect(triads[2].quality).toBe("augmented");
    expect(triads[4].quality).toBe("major");
    expect(triads[6].quality).toBe("diminished");
  });

  it("spells each degree-1 triad the same as buildTriad on that degree", () => {
    const types: ScaleType[] = ["major", "naturalMinor", "harmonicMinor", "melodicMinor"];
    for (const type of types) {
      const triads = diatonicTriads(parseNote("Eb"), type);
      const scale = buildScale(parseNote("Eb"), type);
      triads.forEach((triad, index) => {
        const degreeRoot = degreeNote(scale, index + 1);
        expect(triad.notes).toEqual(buildTriad(degreeRoot, triad.quality));
        expect(detectTriadQuality(triad.notes)).toBe(triad.quality);
      });
    }
  });
});

describe("diatonicSevenths", () => {
  it("builds the major seventh-chord row Imaj7 ii7 iii7 IVmaj7 V7 vi7 viiø7", () => {
    const sevenths = diatonicSevenths(parseNote("C"), "major");
    expect(sevenths.map((s) => s.quality)).toEqual([
      "majorSeventh",
      "minorSeventh",
      "minorSeventh",
      "majorSeventh",
      "dominantSeventh",
      "minorSeventh",
      "halfDiminishedSeventh",
    ]);
    expect(sevenths.map((s) => spell(s.notes))).toEqual([
      ["C", "E", "G", "B"],
      ["D", "F", "A", "C"],
      ["E", "G", "B", "D"],
      ["F", "A", "C", "E"],
      ["G", "B", "D", "F"],
      ["A", "C", "E", "G"],
      ["B", "D", "F", "A"],
    ]);
  });

  it("builds A natural-minor sevenths with a major VII7", () => {
    const sevenths = diatonicSevenths(parseNote("A"), "naturalMinor");
    expect(sevenths.map((s) => s.quality)).toEqual([
      "minorSeventh",
      "halfDiminishedSeventh",
      "majorSeventh",
      "minorSeventh",
      "minorSeventh",
      "majorSeventh",
      "dominantSeventh",
    ]);
  });

  it("builds A harmonic-minor sevenths with i mMaj7 and vii°7", () => {
    const sevenths = diatonicSevenths(parseNote("A"), "harmonicMinor");
    expect(sevenths[0].quality).toBe("minorMajorSeventh");
    expect(sevenths[6].quality).toBe("fullyDiminishedSeventh");
    expect(spell(sevenths[6].notes)).toEqual(["G#", "B", "D", "F"]);
  });
});

describe("triad/seventh agreement", () => {
  it("the seventh's first three tones equal the triad for every scale and root", () => {
    const types: ScaleType[] = ["major", "naturalMinor", "harmonicMinor", "melodicMinor"];
    const roots = ["C", "A", "Eb", "F#", "B", "D", "G"];
    for (const type of types) {
      for (const root of roots) {
        const triads = diatonicTriads(parseNote(root), type);
        const sevenths = diatonicSevenths(parseNote(root), type);
        triads.forEach((triad, index) => {
          const triadTones = sevenths[index].notes.slice(0, 3);
          expect(triadTones).toEqual(triad.notes);
          expect(detectTriadQuality(triadTones)).toBe(triad.quality);
        });
      }
    }
  });

  it("diatonicTriadQualities matches the degrees derived from a sounding root", () => {
    const types: ScaleType[] = ["major", "naturalMinor", "harmonicMinor", "melodicMinor"];
    for (const type of types) {
      const triads = diatonicTriads(parseNote("C"), type);
      expect(triads.map((t) => t.quality)).toEqual(diatonicTriadQualities(type));
    }
  });
});

describe("romanNumeral", () => {
  it("uses the specified case and suffix rules", () => {
    expect(romanNumeral("major", 1)).toBe("I");
    expect(romanNumeral("minor", 2)).toBe("ii");
    expect(romanNumeral("diminished", 7)).toBe("vii°");
    expect(romanNumeral("augmented", 3)).toBe("III+");
  });

  it("renders every degree of a major key", () => {
    const qualities: TriadQuality[] = ["major", "minor", "minor", "major", "major", "minor", "diminished"];
    expect(qualities.map((q, i) => romanNumeral(q, i + 1))).toEqual([
      "I",
      "ii",
      "iii",
      "IV",
      "V",
      "vi",
      "vii°",
    ]);
  });

  it("rejects degrees outside 1-7", () => {
    expect(() => romanNumeral("major", 0)).toThrow();
    expect(() => romanNumeral("major", 8)).toThrow();
  });
});

describe("romanNumeralSeventh", () => {
  it("adds the seventh suffix to the roman base", () => {
    expect(romanNumeralSeventh("majorSeventh", 1)).toBe("Imaj7");
    expect(romanNumeralSeventh("minorSeventh", 2)).toBe("ii7");
    expect(romanNumeralSeventh("dominantSeventh", 5)).toBe("V7");
    expect(romanNumeralSeventh("halfDiminishedSeventh", 7)).toBe("viiø7");
    expect(romanNumeralSeventh("fullyDiminishedSeventh", 7)).toBe("vii°7");
    expect(romanNumeralSeventh("minorMajorSeventh", 1)).toBe("imMaj7");
    expect(romanNumeralSeventh("augmentedMajorSeventh", 3)).toBe("III+maj7");
    expect(romanNumeralSeventh("augmentedSeventh", 3)).toBe("III+7");
  });
});

describe("inversionFigure", () => {
  it("returns the figured-bass figures for every triad position", () => {
    expect(inversionFigure("triad", 0)).toBe("");
    expect(inversionFigure("triad", 1)).toBe("6");
    expect(inversionFigure("triad", 2)).toBe("6/4");
  });

  it("returns the figured-bass figures for every seventh position", () => {
    expect(inversionFigure("seventh", 0)).toBe("7");
    expect(inversionFigure("seventh", 1)).toBe("6/5");
    expect(inversionFigure("seventh", 2)).toBe("4/3");
    expect(inversionFigure("seventh", 3)).toBe("2");
  });

  it("throws on out-of-range inversions", () => {
    expect(() => inversionFigure("triad", 3)).toThrow();
    expect(() => inversionFigure("triad", -1)).toThrow();
    expect(() => inversionFigure("seventh", 4)).toThrow();
    expect(() => inversionFigure("seventh", -1)).toThrow();
  });
});

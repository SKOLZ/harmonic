import { describe, expect, it } from "vitest";
import { scientificName, type Note } from "./pitch";
import { buildScale, degreeName, degreeNote, scaleDegreeNames, type ScaleType } from "./scale";

const ALL_TYPES: ScaleType[] = ["major", "naturalMinor", "harmonicMinor", "melodicMinor"];

function spell(scale: readonly Note[]): string[] {
  return scale.map((note) => scientificName(note));
}

function lettersOf(scale: readonly Note[]): string[] {
  return scale.map((note) => note.letter);
}

describe("buildScale", () => {
  it("builds a C major scale", () => {
    expect(spell(buildScale({ letter: "C", accidental: 0 }, "major"))).toEqual([
      "C", "D", "E", "F", "G", "A", "B",
    ]);
  });

  it("builds an Eb major scale with flats spelled correctly", () => {
    expect(spell(buildScale({ letter: "E", accidental: -1 }, "major"))).toEqual([
      "Eb", "F", "G", "Ab", "Bb", "C", "D",
    ]);
  });

  it("builds a Bb major scale", () => {
    expect(spell(buildScale({ letter: "B", accidental: -1 }, "major"))).toEqual([
      "Bb", "C", "D", "Eb", "F", "G", "A",
    ]);
  });

  it("builds an F# major scale with sharps spelled correctly", () => {
    expect(spell(buildScale({ letter: "F", accidental: 1 }, "major"))).toEqual([
      "F#", "G#", "A#", "B", "C#", "D#", "E#",
    ]);
  });

  it("builds a C# major scale", () => {
    expect(spell(buildScale({ letter: "C", accidental: 1 }, "major"))).toEqual([
      "C#", "D#", "E#", "F#", "G#", "A#", "B#",
    ]);
  });

  it("builds natural, harmonic and melodic minor scales", () => {
    expect(spell(buildScale({ letter: "A", accidental: 0 }, "naturalMinor"))).toEqual([
      "A", "B", "C", "D", "E", "F", "G",
    ]);
    expect(spell(buildScale({ letter: "A", accidental: 0 }, "harmonicMinor"))).toEqual([
      "A", "B", "C", "D", "E", "F", "G#",
    ]);
    // Melodic minor is the ascending form: raised 6th and 7th.
    expect(spell(buildScale({ letter: "A", accidental: 0 }, "melodicMinor"))).toEqual([
      "A", "B", "C", "D", "E", "F#", "G#",
    ]);
  });

  it("builds minor scales from flat and sharp roots", () => {
    expect(spell(buildScale({ letter: "E", accidental: -1 }, "naturalMinor"))).toEqual([
      "Eb", "F", "Gb", "Ab", "Bb", "Cb", "Db",
    ]);
    expect(spell(buildScale({ letter: "E", accidental: -1 }, "harmonicMinor"))).toEqual([
      "Eb", "F", "Gb", "Ab", "Bb", "Cb", "D",
    ]);
    expect(spell(buildScale({ letter: "F", accidental: 1 }, "harmonicMinor"))).toEqual([
      "F#", "G#", "A", "B", "C#", "D", "E#",
    ]);
    expect(spell(buildScale({ letter: "C", accidental: 1 }, "naturalMinor"))).toEqual([
      "C#", "D#", "E", "F#", "G#", "A", "B",
    ]);
    expect(spell(buildScale({ letter: "C", accidental: 1 }, "melodicMinor"))).toEqual([
      "C#", "D#", "E", "F#", "G#", "A#", "B#",
    ]);
  });

  it("uses seven distinct letters in every scale type", () => {
    const roots = [
      { letter: "C", accidental: 0 },
      { letter: "E", accidental: -1 },
      { letter: "B", accidental: -1 },
      { letter: "F", accidental: 1 },
      { letter: "C", accidental: 1 },
      { letter: "G", accidental: -1 }, // Gb
    ] as const;
    for (const type of ALL_TYPES) {
      for (const root of roots) {
        const scale = buildScale(root, type);
        expect(scale, `${root.letter} ${type}`).toHaveLength(7);
        const letters = lettersOf(scale);
        expect(new Set(letters).size, `${root.letter} ${type}: ${letters.join(" ")}`).toBe(7);
      }
    }
  });

  it("keeps and adjusts octaves when the root has one", () => {
    const fromB3 = buildScale({ letter: "B", accidental: 0, octave: 3 }, "major");
    expect(spell(fromB3)).toEqual(["B3", "C#4", "D#4", "E4", "F#4", "G#4", "A#4"]);
    expect(fromB3.map((n) => n.octave)).toEqual([3, 4, 4, 4, 4, 4, 4]);

    const c4major = buildScale({ letter: "C", accidental: 0, octave: 4 }, "major");
    expect(c4major.map((n) => n.octave)).toEqual([4, 4, 4, 4, 4, 4, 4]);
  });

  it("throws when the requested spelling exceeds double accidentals", () => {
    // Cb major would need Fbb — actually fine; use a hypothetical triple-flat root.
    expect(() => buildScale({ letter: "C", accidental: -3 }, "major")).toThrow();
  });
});

describe("scaleDegreeNames", () => {
  it("names the seven degrees", () => {
    expect(scaleDegreeNames[1]).toBe("tonic");
    expect(scaleDegreeNames[2]).toBe("supertonic");
    expect(scaleDegreeNames[3]).toBe("mediant");
    expect(scaleDegreeNames[4]).toBe("subdominant");
    expect(scaleDegreeNames[5]).toBe("dominant");
    expect(scaleDegreeNames[6]).toBe("submediant");
    expect(scaleDegreeNames[7]).toBe("leading tone");
  });

  it("calls the natural-minor 7th a subtonic and the others leading tones", () => {
    expect(degreeName("naturalMinor", 7)).toBe("subtonic");
    expect(degreeName("harmonicMinor", 7)).toBe("leading tone");
    expect(degreeName("melodicMinor", 7)).toBe("leading tone");
    expect(degreeName("major", 7)).toBe("leading tone");
    expect(degreeName("major", 1)).toBe("tonic");
    expect(degreeName("naturalMinor", 5)).toBe("dominant");
  });

  it("throws on a degree outside 1-7", () => {
    expect(() => degreeName("major", 0)).toThrow();
    expect(() => degreeName("major", 8)).toThrow();
  });
});

describe("degreeNote", () => {
  const cMajor = buildScale({ letter: "C", accidental: 0 }, "major");

  it("returns 1-based degrees", () => {
    expect(degreeNote(cMajor, 1)).toEqual(cMajor[0]);
    expect(degreeNote(cMajor, 5)).toEqual(cMajor[4]);
    expect(degreeNote(cMajor, 7)).toEqual(cMajor[6]);
  });

  it("wraps around the seven notes", () => {
    expect(degreeNote(cMajor, 8)).toEqual(cMajor[0]);
    expect(degreeNote(cMajor, 9)).toEqual(cMajor[1]);
    expect(degreeNote(cMajor, 0)).toEqual(cMajor[6]);
    expect(degreeNote(cMajor, -6)).toEqual(cMajor[0]);
  });
});

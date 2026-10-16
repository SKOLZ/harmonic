import { describe, expect, it } from "vitest";
import { detectTriadQuality, identifyInversion } from "./chord";
import { midiNumber, parseNote, scientificName, semitoneIndex, type Note } from "./pitch";
import { buildScale, degreeNote, type ScaleType } from "./scale";
import {
  ascendingVoicing,
  deriveNeapolitan,
  loweredSecondDegree,
  neapolitanSixth,
  neapolitanTriad,
} from "./neapolitan";

/**
 * musictheory.net's four worked Neapolitans (lesson120 frames 101/221/341/461),
 * the independent oracle the lesson suites assert against as well: the lowered
 * second degree the site names and the MIDI it sounds for the finished triad.
 */
const SITE_WORKED_KEYS: ReadonlyArray<{
  label: string;
  root: string;
  scaleType: ScaleType;
  second: string;
  lowered: string;
  sounds: readonly number[];
}> = [
  { label: "C minor", root: "C", scaleType: "naturalMinor", second: "D", lowered: "Db", sounds: [61, 65, 68] },
  { label: "E minor", root: "E", scaleType: "naturalMinor", second: "F#", lowered: "F", sounds: [65, 69, 72] },
  { label: "Ab major", root: "Ab", scaleType: "major", second: "Bb", lowered: "Bbb", sounds: [69, 73, 76] },
  { label: "A major", root: "A", scaleType: "major", second: "B", lowered: "Bb", sounds: [70, 74, 77] },
];

const ALL_SCALE_TYPES: ScaleType[] = [
  "major",
  "naturalMinor",
  "harmonicMinor",
  "melodicMinor",
];

const SAMPLE_ROOTS = ["C", "F#", "Bb", "Eb", "Ab"];

/** Scientific names with the octave stripped, the way the site writes chords. */
function noteNames(notes: readonly Note[]): string[] {
  return notes.map((note) => scientificName(note).replace(/\d+$/, ""));
}

function names(notes: readonly Note[]): string[] {
  return notes.map((note) => scientificName(note));
}

describe("deriveNeapolitan", () => {
  it("reproduces the site's four worked keys, degree for degree and MIDI for MIDI", () => {
    for (const key of SITE_WORKED_KEYS) {
      const root = parseNote(`${key.root}4`);
      const { second, lowered, triad } = deriveNeapolitan(root, key.scaleType);

      expect(scientificName(second).replace(/\d+$/, ""), key.label).toBe(key.second);
      expect(noteNames([lowered]), key.label).toEqual([key.lowered]);
      expect(triad.map((note) => midiNumber(note)), key.label).toEqual([...key.sounds]);
    }
  });

  it("lowers the supertonic by exactly one half step on the same letter, for every scale type", () => {
    for (const scaleType of ALL_SCALE_TYPES) {
      for (const rootText of SAMPLE_ROOTS) {
        const label = `${rootText} ${scaleType}`;
        const root = parseNote(`${rootText}4`);
        const { second, lowered } = deriveNeapolitan(root, scaleType);

        expect(second, label).toEqual(degreeNote(buildScale(root, scaleType), 2));
        expect(lowered.letter, label).toBe(second.letter);
        expect(semitoneIndex(second) - semitoneIndex(lowered), label).toBe(1);
      }
    }
  });

  it("builds a root-position major triad on the lowered degree", () => {
    for (const key of SITE_WORKED_KEYS) {
      const root = parseNote(`${key.root}4`);
      const { lowered, triad } = deriveNeapolitan(root, key.scaleType);

      expect(detectTriadQuality(triad), key.label).toBe("major");
      expect(identifyInversion(lowered, triad), key.label).toBe("rootPosition");
      expect(triad[0], key.label).toEqual(lowered);
    }
  });

  it("refuses a root without an octave instead of guessing one", () => {
    expect(() => deriveNeapolitan(parseNote("D"), "major")).toThrow(/octave/);
  });
});

describe("loweredSecondDegree and neapolitanTriad", () => {
  it("agree with deriveNeapolitan on every worked key", () => {
    for (const key of SITE_WORKED_KEYS) {
      const root = parseNote(`${key.root}4`);
      const derived = deriveNeapolitan(root, key.scaleType);
      expect(loweredSecondDegree(root, key.scaleType), key.label).toEqual(derived.lowered);
      expect(neapolitanTriad(root, key.scaleType), key.label).toEqual(derived.triad);
    }
  });
});

describe("neapolitanSixth", () => {
  it("is the Neapolitan in first inversion with a strictly ascending written stack", () => {
    for (const key of SITE_WORKED_KEYS) {
      const root = parseNote(`${key.root}4`);
      const sixth = neapolitanSixth(root, key.scaleType);
      const lowered = loweredSecondDegree(root, key.scaleType);

      expect(sixth, key.label).toHaveLength(3);
      expect(identifyInversion(lowered, sixth), key.label).toBe("first");
      for (let index = 1; index < sixth.length; index += 1) {
        expect(midiNumber(sixth[index]!), `${key.label} tone ${index}`).toBeGreaterThan(
          midiNumber(sixth[index - 1]!),
        );
      }
      // Same pitch material as the root-position chord, only reordered.
      const pitchClasses = (notes: readonly Note[]) =>
        notes.map((note) => semitoneIndex(note) % 12).sort((a, b) => a - b);
      expect(pitchClasses(sixth), key.label).toEqual(
        pitchClasses(neapolitanTriad(root, key.scaleType)),
      );
    }
  });

  it("voices the keys the lessons use exactly as the site stacks them", () => {
    expect(names(neapolitanSixth(parseNote("C4"), "naturalMinor"))).toEqual([
      "F4",
      "Ab4",
      "Db5",
    ]);
    expect(neapolitanSixth(parseNote("C4"), "naturalMinor").map((note) => midiNumber(note))).toEqual([
      65, 68, 73,
    ]);
    expect(names(neapolitanSixth(parseNote("C#4"), "naturalMinor"))).toEqual([
      "F#4",
      "A4",
      "D5",
    ]);
  });
});

describe("ascendingVoicing", () => {
  it("leaves an already ascending chord untouched", () => {
    const stack = [parseNote("C4"), parseNote("E4"), parseNote("G4")];
    expect(ascendingVoicing(stack)).toEqual(stack);
  });

  it("lifts a wrapped tone an octave until the stack ascends", () => {
    expect(names(ascendingVoicing([parseNote("F4"), parseNote("Ab4"), parseNote("Db4")]))).toEqual([
      "F4",
      "Ab4",
      "Db5",
    ]);
    expect(
      ascendingVoicing([parseNote("F4"), parseNote("Ab4"), parseNote("Db4")]).map((note) =>
        midiNumber(note),
      ),
    ).toEqual([65, 68, 73]);
  });

  it("refuses an empty chord", () => {
    expect(() => ascendingVoicing([])).toThrow(/non-empty/);
  });
});

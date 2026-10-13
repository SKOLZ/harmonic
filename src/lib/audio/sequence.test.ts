import { describe, expect, it } from "vitest";
import { chordFrequencies, intervalFrequencies, scaleFrequencies } from "./sequence";

function expectStrictlyIncreasing(freqs: readonly number[]): void {
  for (let index = 1; index < freqs.length; index++) {
    expect(freqs[index]).toBeGreaterThan(freqs[index - 1]);
  }
}

describe("scaleFrequencies", () => {
  it("returns 7 strictly increasing frequencies for C major", () => {
    const freqs = scaleFrequencies("C", "major");
    expect(freqs).toHaveLength(7);
    expectStrictlyIncreasing(freqs);
    // Bare root defaults to octave 4, so this starts on middle C.
    expect(freqs[0]).toBeCloseTo(261.63, 2);
    expect(freqs[1] / freqs[0]).toBeCloseTo(2 ** (2 / 12), 10);
  });

  it("returns 7 strictly increasing frequencies for F# major", () => {
    const freqs = scaleFrequencies("F#", "major");
    expect(freqs).toHaveLength(7);
    expectStrictlyIncreasing(freqs);
    expect(freqs[0]).toBeCloseTo(369.99, 2);
    // F# major: whole, whole, half → A# is a major third (4 half-steps) above F#.
    expect(freqs[2] / freqs[0]).toBeCloseTo(2 ** (4 / 12), 10);
  });

  it("honours an explicit root octave", () => {
    const freqs = scaleFrequencies("A3", "naturalMinor");
    expect(freqs[0]).toBeCloseTo(220, 10);
    expectStrictlyIncreasing(freqs);
  });

  it("honours a custom A4 reference", () => {
    expect(scaleFrequencies("A", "major", 432)[0]).toBe(432);
  });

  it("propagates an invalid root", () => {
    expect(() => scaleFrequencies("H", "major")).toThrow(/Invalid note/);
  });
});

describe("intervalFrequencies", () => {
  it("produces exactly two frequencies a perfect 5th (7 half-steps) apart", () => {
    const freqs = intervalFrequencies("C4", 5, "perfect");
    expect(freqs).toHaveLength(2);
    expect(freqs[0]).toBeCloseTo(261.63, 2);
    expect(freqs[1] / freqs[0]).toBeCloseTo(2 ** (7 / 12), 10);
  });

  it("produces exactly two frequencies a minor 3rd (3 half-steps) apart", () => {
    const freqs = intervalFrequencies("A3", 3, "minor");
    expect(freqs).toHaveLength(2);
    expect(freqs[0]).toBeCloseTo(220, 10);
    expect(freqs[1] / freqs[0]).toBeCloseTo(2 ** (3 / 12), 10);
  });

  it("defaults a bare root to octave 4", () => {
    const freqs = intervalFrequencies("C", 1, "perfect");
    expect(freqs[0]).toBeCloseTo(261.63, 2);
    expect(freqs[1]).toBeCloseTo(261.63, 2);
  });

  it("honours a custom A4 reference", () => {
    expect(intervalFrequencies("A4", 1, "perfect", 432)).toEqual([432, 432]);
  });

  it("rejects an unknown quality", () => {
    expect(() => intervalFrequencies("C4", 5, "superior")).toThrow(/Unknown interval quality/);
  });
});

describe("chordFrequencies", () => {
  it("converts each note name in order", () => {
    const freqs = chordFrequencies(["C4", "E4", "G4"]);
    expect(freqs).toHaveLength(3);
    expect(freqs[0]).toBeCloseTo(261.63, 2);
    expect(freqs[1]).toBeCloseTo(329.63, 2);
    expect(freqs[2]).toBeCloseTo(392.0, 2);
  });

  it("defaults octave-less names to octave 4", () => {
    expect(chordFrequencies(["C", "E", "G"])).toEqual(
      chordFrequencies(["C4", "E4", "G4"]),
    );
  });

  it("honours a custom A4 reference", () => {
    expect(chordFrequencies(["A4"], 432)).toEqual([432]);
  });

  it("propagates an invalid note name", () => {
    expect(() => chordFrequencies(["C4", "H4"])).toThrow(/Invalid note/);
  });
});

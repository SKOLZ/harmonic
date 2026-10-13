import { describe, expect, it } from "vitest";
import { midiNumber, parseNote } from "../theory";
import {
  DEFAULT_A4_HZ,
  frequenciesForNotes,
  noteNameToFrequency,
  noteToFrequency,
} from "./frequency";

describe("noteToFrequency", () => {
  it("maps MIDI 69 (A4) to the reference frequency", () => {
    expect(noteToFrequency(69)).toBe(440);
    expect(noteToFrequency(69, 442)).toBe(442);
    expect(DEFAULT_A4_HZ).toBe(440);
  });

  it("maps A3 (MIDI 57) to 220 Hz", () => {
    expect(noteToFrequency(57)).toBeCloseTo(220, 10);
  });

  it("maps C4 (MIDI 60) to ~261.63 Hz", () => {
    expect(noteToFrequency(60)).toBeCloseTo(261.63, 2);
  });

  it("maps the extreme octaves C0 and C8", () => {
    expect(noteToFrequency(12)).toBeCloseTo(16.35, 2);
    expect(noteToFrequency(108)).toBeCloseTo(4186.01, 2);
  });
});

describe("noteNameToFrequency", () => {
  it("converts scientific note names", () => {
    expect(noteNameToFrequency("A4")).toBe(440);
    expect(noteNameToFrequency("A3")).toBeCloseTo(220, 10);
    expect(noteNameToFrequency("C4")).toBeCloseTo(261.63, 2);
    expect(noteNameToFrequency("F#4")).toBeCloseTo(369.99, 2);
    expect(noteNameToFrequency("Bb3")).toBeCloseTo(233.08, 2);
  });

  it("round-trips C0 and C8 through parseNote/midiNumber", () => {
    for (const name of ["C0", "C8"]) {
      const viaTheory = noteToFrequency(midiNumber(parseNote(name)));
      expect(noteNameToFrequency(name)).toBeCloseTo(viaTheory, 10);
    }
    expect(noteNameToFrequency("C0")).toBeCloseTo(16.35, 2);
    expect(noteNameToFrequency("C8")).toBeCloseTo(4186.01, 2);
  });

  it("honours a custom A4 reference", () => {
    expect(noteNameToFrequency("A4", 432)).toBe(432);
    expect(noteNameToFrequency("A5", 432)).toBeCloseTo(864, 10);
  });

  it("throws on an invalid note name", () => {
    expect(() => noteNameToFrequency("H4")).toThrow(/Invalid note/);
    expect(() => noteNameToFrequency("c4")).toThrow(/Invalid note/);
    expect(() => noteNameToFrequency("C#b4")).toThrow(/Invalid note/);
  });

  it("throws when the name has no octave", () => {
    expect(() => noteNameToFrequency("A")).toThrow(/octave/i);
    expect(() => noteNameToFrequency("F#")).toThrow(/octave/i);
  });
});

describe("frequenciesForNotes", () => {
  it("converts each name in order", () => {
    const [a4, a3, c4] = frequenciesForNotes(["A4", "A3", "C4"]);
    expect(a4).toBe(440);
    expect(a3).toBeCloseTo(220, 10);
    expect(c4).toBeCloseTo(261.63, 2);
  });

  it("returns an empty array for an empty input", () => {
    expect(frequenciesForNotes([])).toEqual([]);
  });

  it("propagates a custom A4 reference and invalid names", () => {
    expect(frequenciesForNotes(["A4"], 432)).toEqual([432]);
    expect(() => frequenciesForNotes(["C4", "nope"])).toThrow(/Invalid note/);
  });
});

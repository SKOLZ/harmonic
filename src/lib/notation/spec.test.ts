import { describe, expect, it } from "vitest";
import { parseNote } from "../theory";
import {
  buildNotationSpec,
  durationToVoiceTime,
  keySignatureToVexName,
  noteToAccidental,
  noteToVexKey,
  toVexKeys,
} from "./spec";

describe("noteToVexKey", () => {
  it("maps naturals with no accidental character", () => {
    expect(noteToVexKey(parseNote("C4"))).toBe("c/4");
    expect(noteToVexKey(parseNote("A2"))).toBe("a/2");
  });

  it("maps flats, sharps and double accidentals", () => {
    expect(noteToVexKey(parseNote("Eb4"))).toBe("eb/4");
    expect(noteToVexKey(parseNote("F#4"))).toBe("f#/4");
    expect(noteToVexKey(parseNote("Bbb3"))).toBe("bbb/3");
    expect(noteToVexKey(parseNote("F##4"))).toBe("f##/4");
    expect(noteToVexKey(parseNote("C#-1"))).toBe("c#/-1");
  });

  it("throws when the note has no octave", () => {
    expect(() => noteToVexKey(parseNote("C"))).toThrow(/octave/i);
  });
});

describe("noteToAccidental", () => {
  it("returns null for naturals and the VexFlow code otherwise", () => {
    expect(noteToAccidental(parseNote("C4"))).toBeNull();
    expect(noteToAccidental(parseNote("Eb4"))).toBe("b");
    expect(noteToAccidental(parseNote("F#4"))).toBe("#");
    expect(noteToAccidental(parseNote("Bbb3"))).toBe("bb");
    expect(noteToAccidental(parseNote("F##4"))).toBe("##");
  });
});

describe("toVexKeys", () => {
  it("maps a list of notes", () => {
    expect(toVexKeys([parseNote("C4"), parseNote("Eb4"), parseNote("F##4")])).toEqual([
      "c/4",
      "eb/4",
      "f##/4",
    ]);
  });

  it("returns an empty list for no notes", () => {
    expect(toVexKeys([])).toEqual([]);
  });
});

describe("keySignatureToVexName", () => {
  it("formats major key names the way Stave.addKeySignature expects", () => {
    expect(keySignatureToVexName(parseNote("C"))).toBe("C");
    expect(keySignatureToVexName(parseNote("Eb"))).toBe("Eb");
    expect(keySignatureToVexName(parseNote("F#"))).toBe("F#");
    expect(keySignatureToVexName(parseNote("B"))).toBe("B");
    expect(keySignatureToVexName(parseNote("Ab"))).toBe("Ab");
  });
});

describe("durationToVoiceTime", () => {
  it("matches the beat count to the supplied duration", () => {
    expect(durationToVoiceTime("q", 4)).toEqual({ numBeats: 4, beatValue: 4 });
    expect(durationToVoiceTime("h", 2)).toEqual({ numBeats: 2, beatValue: 2 });
    expect(durationToVoiceTime("w", 1)).toEqual({ numBeats: 1, beatValue: 1 });
    expect(durationToVoiceTime("8", 3)).toEqual({ numBeats: 3, beatValue: 8 });
    expect(durationToVoiceTime("16", 5)).toEqual({ numBeats: 5, beatValue: 16 });
  });

  it("scales dotted durations into whole beats", () => {
    // One dotted quarter = 1.5 quarters = 3 eighths.
    expect(durationToVoiceTime("qd", 2)).toEqual({ numBeats: 6, beatValue: 8 });
    // Two dotted quarters = 1.75 quarters = 7 sixteenths.
    expect(durationToVoiceTime("qdd", 1)).toEqual({ numBeats: 7, beatValue: 16 });
  });

  it("ignores the rest type suffix", () => {
    expect(durationToVoiceTime("qr", 4)).toEqual({ numBeats: 4, beatValue: 4 });
  });

  it("throws on an unsupported duration", () => {
    expect(() => durationToVoiceTime("x", 1)).toThrow(/duration/i);
  });
});

describe("buildNotationSpec", () => {
  it("builds a plain description of the notation to draw", () => {
    const spec = buildNotationSpec({
      notes: [parseNote("C4"), parseNote("Eb4"), parseNote("F#4")],
      clef: "bass",
      keySignature: parseNote("Eb"),
      duration: "q",
    });
    expect(spec).toEqual({
      clef: "bass",
      keySignature: "Eb",
      keys: ["c/4", "eb/4", "f#/4"],
      accidentals: [null, "b", "#"],
      duration: "q",
      simultaneous: false,
    });
  });

  it("defaults to treble clef, quarter notes, and no key signature", () => {
    const spec = buildNotationSpec({ notes: [parseNote("C4")] });
    expect(spec.clef).toBe("treble");
    expect(spec.duration).toBe("q");
    expect(spec.keySignature).toBeNull();
  });

  it("defaults to sequential engraving when simultaneous is absent", () => {
    expect(buildNotationSpec({ notes: [parseNote("C4")] }).simultaneous).toBe(false);
    expect(
      buildNotationSpec({ notes: [parseNote("C4")], simultaneous: false }).simultaneous,
    ).toBe(false);
  });

  it("threads a simultaneous prompt through to the spec", () => {
    const spec = buildNotationSpec({
      notes: [parseNote("C4"), parseNote("Eb4"), parseNote("G4")],
      simultaneous: true,
    });
    expect(spec.simultaneous).toBe(true);
    // The keys and per-tone accidentals still describe every chord member;
    // simultaneity only changes how the renderer groups them.
    expect(spec.keys).toEqual(["c/4", "eb/4", "g/4"]);
    expect(spec.accidentals).toEqual([null, "b", null]);
  });

  it("throws on an empty note list", () => {
    expect(() => buildNotationSpec({ notes: [] })).toThrow(/at least one note/i);
  });

  it("throws on an unsupported clef", () => {
    expect(() =>
      buildNotationSpec({ notes: [parseNote("C4")], clef: "alto" as never }),
    ).toThrow(/clef/i);
  });

  it("throws on an accidental beyond double sharp/flat", () => {
    expect(() => noteToVexKey({ letter: "C", accidental: 3, octave: 4 })).toThrow(
      /out of range/i,
    );
  });
});

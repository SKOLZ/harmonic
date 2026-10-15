import { describe, expect, it } from "vitest";
import { parseNote } from "../theory";
import {
  keyboardLayout,
  matchesHighlight,
  normalizeNoteName,
  type KeyGeometry,
} from "./layout";

/** The geometry entry for a canonical note name, or a loud failure. */
function keyAt(keys: KeyGeometry[], noteName: string): KeyGeometry {
  const key = keys.find((k) => k.noteName === noteName);
  if (key === undefined) {
    throw new Error(`no key named ${noteName} in layout`);
  }
  return key;
}

function whiteKeys(keys: KeyGeometry[]): KeyGeometry[] {
  return keys.filter((k) => !k.isBlack);
}

describe("keyboardLayout", () => {
  it("defaults to C4–C6 with one key per chromatic step and no gaps", () => {
    const keys = keyboardLayout();
    expect(keys.map((k) => k.midi)).toEqual(
      Array.from({ length: 25 }, (_, i) => 60 + i),
    );
    expect(keys[0].noteName).toBe("C4");
    expect(keys.at(-1)?.noteName).toBe("C6");
  });

  it("spells every black key as the sharp of the white key below it", () => {
    const keys = keyboardLayout();
    const blackKeys = keys.filter((k) => k.isBlack);
    expect(blackKeys).toHaveLength(10);
    for (const key of blackKeys) {
      expect(key.noteName).toMatch(/^[A-G]#\d+$/);
    }
    expect(keyAt(keys, "C#4").midi).toBe(61);
    expect(keyAt(keys, "A#5").midi).toBe(82);
    // One spelling per physical key: flat spellings never appear.
    expect(keys.some((k) => k.noteName === "Db4")).toBe(false);
    expect(keys.some((k) => k.noteName === "Gb5")).toBe(false);
  });

  it("emits canonical ASCII scientific names that parseNote accepts", () => {
    for (const key of keyboardLayout()) {
      expect(() => parseNote(key.noteName)).not.toThrow();
    }
  });

  it("tiles the white keys across exactly 100% with no gaps or overlaps", () => {
    const whites = whiteKeys(keyboardLayout());
    expect(whites).toHaveLength(15);
    expect(whites[0].leftPct).toBe(0);
    // Exact by construction: the final white key absorbs the float residue,
    // so the widths sum to 100 and the last key's right edge is 100.
    const sum = whites.reduce((total, key) => total + key.widthPct, 0);
    expect(sum).toBe(100);
    const last = whites.at(-1)!;
    expect(last.leftPct + last.widthPct).toBe(100);
    for (let i = 1; i < whites.length; i++) {
      expect(whites[i].leftPct).toBe(whites[i - 1].leftPct + whites[i - 1].widthPct);
    }
  });

  it("gives every white key the same width up to float residue", () => {
    const whites = whiteKeys(keyboardLayout());
    const nominal = 100 / whites.length;
    for (const key of whites) {
      expect(key.widthPct).toBeCloseTo(nominal, 10);
    }
  });

  it("centres each black key on the boundary after its white neighbour", () => {
    const keys = keyboardLayout();
    const blacks = keys.filter((k) => k.isBlack);
    expect(blacks.length).toBeGreaterThan(0);
    for (const black of blacks) {
      const index = keys.indexOf(black);
      const whitesBefore = keys.slice(0, index).filter((k) => !k.isBlack);
      const whiteBelow = whitesBefore.at(-1)!;
      // The boundary is where the next white key starts — derived from
      // position in the range, never from a per-key table.
      const boundary = whiteBelow.leftPct + whiteBelow.widthPct;
      expect(black.leftPct + black.widthPct / 2).toBeCloseTo(boundary, 10);
      expect(black.widthPct).toBeGreaterThan(0);
      expect(black.widthPct).toBeLessThan(whiteBelow.widthPct);
    }
  });

  it("honours a custom range and still tiles to exactly 100%", () => {
    const keys = keyboardLayout({ startNote: "C3", endNote: "E4" });
    expect(keys).toHaveLength(17);
    expect(keys[0].noteName).toBe("C3");
    expect(keys[0].midi).toBe(48);
    expect(keys.at(-1)?.noteName).toBe("E4");
    expect(keys.at(-1)?.midi).toBe(64);
    const whites = whiteKeys(keys);
    expect(whites).toHaveLength(10);
    expect(whites.reduce((total, key) => total + key.widthPct, 0)).toBe(100);
    // E3→F3 and B3→C4 are half steps, so no black key sits on those boundaries.
    expect(keys.some((k) => k.noteName === "E#3")).toBe(false);
    expect(keys.some((k) => k.noteName === "B#3")).toBe(false);
    expect(keys.some((k) => k.noteName === "C#4")).toBe(true);
  });

  it("gives every key a spoken aria-label", () => {
    const keys = keyboardLayout();
    expect(keyAt(keys, "C4").ariaLabel).toBe("C 4");
    expect(keyAt(keys, "C#4").ariaLabel).toBe("C sharp 4");
    expect(keyAt(keys, "A#5").ariaLabel).toBe("A sharp 5");
    expect(keyAt(keys, "C6").ariaLabel).toBe("C 6");
    for (const key of keys) {
      expect(key.ariaLabel.length).toBeGreaterThan(0);
    }
  });

  it("rejects a range that does not start and end on white keys", () => {
    expect(() => keyboardLayout({ startNote: "C#4" })).toThrow(/white key/);
    expect(() => keyboardLayout({ endNote: "D#6" })).toThrow(/white key/);
  });

  it("rejects a range that is empty or runs backwards", () => {
    expect(() => keyboardLayout({ startNote: "C4", endNote: "C4" })).toThrow(
      /above startNote/,
    );
    expect(() => keyboardLayout({ startNote: "C5", endNote: "C4" })).toThrow(
      /above startNote/,
    );
  });

  it("rejects bounds without an octave or with an unparseable name", () => {
    expect(() => keyboardLayout({ startNote: "C" })).toThrow(/octave/);
    expect(() => keyboardLayout({ endNote: "B" })).toThrow(/octave/);
    expect(() => keyboardLayout({ startNote: "H4" })).toThrow(/Invalid note/);
  });
});

describe("normalizeNoteName", () => {
  it("returns canonical ASCII names unchanged", () => {
    expect(normalizeNoteName("C4")).toBe("C4");
    expect(normalizeNoteName("Bb4")).toBe("Bb4");
    expect(normalizeNoteName("F#4")).toBe("F#4");
    expect(normalizeNoteName("Bbb")).toBe("Bbb");
    expect(normalizeNoteName("C")).toBe("C");
  });

  it("maps unicode accidentals to ASCII", () => {
    expect(normalizeNoteName("B♭4")).toBe("Bb4");
    expect(normalizeNoteName("F♯4")).toBe("F#4");
    expect(normalizeNoteName("E𝄫4")).toBe("Ebb4");
    expect(normalizeNoteName("F𝄪4")).toBe("F##4");
    expect(normalizeNoteName("C♮4")).toBe("C4");
  });

  it("maps spelled-out accidentals to ASCII", () => {
    expect(normalizeNoteName("B flat 4")).toBe("Bb4");
    expect(normalizeNoteName("B-flat 4")).toBe("Bb4");
    expect(normalizeNoteName("C sharp 4")).toBe("C#4");
    expect(normalizeNoteName("C double sharp")).toBe("C##");
    expect(normalizeNoteName("E double flat 4")).toBe("Ebb4");
    expect(normalizeNoteName("B FLAT 4")).toBe("Bb4");
    expect(normalizeNoteName("b flat")).toBe("Bb");
  });

  it("folds case and whitespace around the components", () => {
    expect(normalizeNoteName(" c#4 ")).toBe("C#4");
    expect(normalizeNoteName("C 4")).toBe("C4");
    expect(normalizeNoteName("bb4")).toBe("Bb4");
  });

  it("keeps a negative octave intact", () => {
    expect(normalizeNoteName("C-1")).toBe("C-1");
    expect(normalizeNoteName("c♯-1")).toBe("C#-1");
  });

  // The first character is always the letter, so "bb" is B-flat; write
  // "Bbb" or "B double flat" for B double flat.
  it("takes the first character as the letter (documented first-character rule)", () => {
    expect(normalizeNoteName("bb")).toBe("Bb");
    expect(normalizeNoteName("B double flat")).toBe("Bbb");
  });

  it("rejects anything that is not a note name", () => {
    expect(() => normalizeNoteName("")).toThrow(/Invalid note name/);
    expect(() => normalizeNoteName("H4")).toThrow(/Invalid note name/);
    expect(() => normalizeNoteName("4")).toThrow(/Invalid note name/);
    expect(() => normalizeNoteName("#4")).toThrow(/Invalid note name/);
    expect(() => normalizeNoteName("C4#")).toThrow(/Invalid note name/);
    expect(() => normalizeNoteName("CD4")).toThrow(/Invalid note name/);
  });
});

describe("matchesHighlight", () => {
  it("matches an exact canonical name", () => {
    expect(matchesHighlight("C4", ["C4"])).toBe(true);
    expect(matchesHighlight("C4", ["D4"])).toBe(false);
    expect(matchesHighlight("C4", [])).toBe(false);
  });

  it("matches through the normaliser (Bb, B flat and B♭ are one note)", () => {
    expect(matchesHighlight("Bb4", ["B flat"])).toBe(true);
    expect(matchesHighlight("Bb4", ["B♭"])).toBe(true);
    expect(matchesHighlight("Bb4", ["bb4"])).toBe(true);
    expect(matchesHighlight("B4", ["Bb4"])).toBe(false);
  });

  it("matches enharmonic spellings because one keyboard key is one pitch", () => {
    expect(matchesHighlight("A#4", ["Bb4"])).toBe(true);
    expect(matchesHighlight("F#4", ["Gb4"])).toBe(true);
  });

  it("matches a pitch class in every octave when the entry has no octave", () => {
    expect(matchesHighlight("C4", ["C"])).toBe(true);
    expect(matchesHighlight("C6", ["C"])).toBe(true);
    expect(matchesHighlight("C#4", ["F"])).toBe(false);
  });

  it("keeps octave-scoped entries scoped to that octave", () => {
    expect(matchesHighlight("C4", ["C5"])).toBe(false);
    expect(matchesHighlight("C5", ["C5"])).toBe(true);
  });

  it("throws loudly on an unparseable highlight entry", () => {
    expect(() => matchesHighlight("C4", ["H4"])).toThrow(/Invalid note name/);
  });
});

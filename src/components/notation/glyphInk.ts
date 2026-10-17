/**
 * Vertical ink extents for the musical glyphs VexFlow engraves as SVG `<text>`.
 *
 * VexFlow's `SVGContext.fillText` writes each glyph as a `<text>` whose `y` is
 * the alphabetic baseline. That is a *font anchor*, not the ink box: a treble
 * clef's ink reaches ~4.4 staff spaces above its baseline, a flag hangs ~3.2
 * spaces below, and a quarter rest over-spans both ways. Measuring baselines
 * therefore under-reports the drawn box and the viewport clips real ink — the
 * T7 "clef top clipped" / "stem detached" family of defects.
 *
 * `getBBox()` cannot rescue this: the test environment (happy-dom) has no
 * canvas, so `getBBox()` returns zeros (the same gap T2 worked around by
 * reading SVG attribute coordinates). This table is the attribute-path
 * equivalent for text: the glyph's ink offsets from its own baseline.
 *
 * Units are **staff spaces** (VexFlow's `STAVE_LINE_DISTANCE`) with the SVG
 * sign convention already applied: negative = above the baseline, positive =
 * below, because SVG y grows downward. Convert to pixels by multiplying by
 * `STAVE_LINE_DISTANCE` (10). Values come from the Bravura font's SMuFL
 * bounding boxes, which are y-up, via `offset = -bbox.y`.
 *
 * The `<text>` elements VexFlow writes all carry `font-size="30pt"` and a
 * `y` that is the alphabetic baseline; the glyph is positioned on that
 * baseline and its ink box is symmetric-ish about it in staff-space units, so
 * no font-size parsing is needed — the staff-space offsets already encode the
 * rendered size.
 *
 * Scope: only the glyphs this app can actually draw — the two clefs, the three
 * noteheads `parseDuration` can produce, the five accidental codes
 * `noteToAccidental` can return, the key-signature accidentals, and the
 * augmentation dot. An unlisted codepoint falls back to its baseline (the
 * pre-T7 behaviour), so adding a new glyph degrades to the old measurement
 * rather than crashing.
 *
 * Source: Bravura `glyphBBoxes` (steinbergmedia/bravura), cross-checked against
 * the codepoints VexFlow 5 actually emits (empirically enumerated from
 * `vexflow/build/esm` rendering).
 */
export interface GlyphInk {
  /** Ink top relative to the baseline, in staff spaces (negative = above). */
  top: number;
  /** Ink bottom relative to the baseline, in staff spaces (positive = below). */
  bottom: number;
}

export const GLYPH_INK: Readonly<Record<number, GlyphInk>> = {
  // Clefs. The treble clef is the extreme case: its curl rises 4.392 spaces
  // above the baseline, which is what the old baseline-only measurement missed.
  0xe050: { top: -4.392, bottom: 2.632 }, // gClef
  0xe062: { top: -1.048, bottom: 2.54 }, // fClef
  0xe05c: { top: -2.024, bottom: 2.024 }, // cClef

  // Noteheads: symmetric ±0.5 about the baseline (the note's own stave line).
  0xe0a2: { top: -0.5, bottom: 0.5 }, // noteheadWhole
  0xe0a3: { top: -0.5, bottom: 0.5 }, // noteheadHalf
  0xe0a4: { top: -0.5, bottom: 0.5 }, // noteheadBlack

  // Accidentals (note modifiers and key signatures share these codepoints).
  0xe260: { top: -1.756, bottom: 0.7 }, // accidentalFlat
  0xe261: { top: -1.364, bottom: 1.34 }, // accidentalNatural
  0xe262: { top: -1.4, bottom: 1.392 }, // accidentalSharp
  0xe263: { top: -0.508, bottom: 0.5 }, // accidentalDoubleSharp
  0xe264: { top: -1.748, bottom: 0.7 }, // accidentalDoubleFlat

  // Augmentation dot.
  0xe1e7: { top: -0.2, bottom: 0.2 },

  // Flags. A flag's baseline sits at the stem tip and the ink hangs *down*
  // (up-stem flags) or reaches *up* (down-stem flags), so its box is wildly
  // asymmetric — this is the second clipping shape the baseline measurement
  // missed.
  0xe240: { top: -0.036, bottom: 3.24 }, // flag8thUp
  0xe241: { top: -3.232, bottom: 0.056 }, // flag8thDown
  0xe242: { top: -0.008, bottom: 3.252 }, // flag16thUp
  0xe243: { top: -3.248, bottom: 0.036 }, // flag16thDown
  0xe244: { top: -0.596, bottom: 3.248 }, // flag32ndUp
  0xe245: { top: -3.248, bottom: 0.688 }, // flag32ndDown
  0xe246: { top: -1.388, bottom: 3.248 }, // flag64thUp
  0xe247: { top: -3.248, bottom: 1.504 }, // flag64thDown

  // Rests. A rest is drawn on the middle line and over-spans it in both
  // directions; the taller the rest, the larger the over-span.
  0xe4e3: { top: -0.036, bottom: 0.54 }, // restWhole
  0xe4e4: { top: -0.568, bottom: 0.008 }, // restHalf
  0xe4e5: { top: -1.492, bottom: 1.5 }, // restQuarter
  0xe4e6: { top: -0.696, bottom: 1.004 }, // rest8th
  0xe4e7: { top: -0.716, bottom: 2.0 }, // rest16th
  0xe4e8: { top: -1.704, bottom: 2.0 }, // rest32nd
  0xe4e9: { top: -1.72, bottom: 3.012 }, // rest64th
};

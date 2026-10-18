export interface NoteGlyphProps {
  /** Extra class for the context that seats it. */
  class?: string;
  /**
   * Cross the notehead with a ledger line — the notation mark for a note
   * that sits outside the staff. Opt-in: the wordmark's "o" is a note that
   * escaped the two rules the name is framed by, so it wears the line; the
   * hero's note sits on its staff and stays bare.
   */
  ledger?: boolean;
}

/**
 * The brand's one drawn form: a gold note — a tilted notehead, optionally
 * crossed by a ledger line — in a single fixed viewBox. This is what the
 * CSS circle bought its flexibility for: one shape serves both brand seats,
 * the wordmark's ledger-crossed "o" and the hero staff's bare middle rule,
 * scaled by one CSS length (`--note-glyph-size`, driving height; the
 * viewBox supplies the aspect ratio). Two sizes, never two drawings — the
 * brand says one thing.
 *
 * The geometry is deliberately spare: one ellipse on the standard ~-20°
 * notation tilt, and the optional ledger line through its centre. There is
 * no stem and there never may be again: the stem was extra geometry that
 * had to be repositioned at every size, and it is what every failed mark
 * shared. Nothing here may grow a path. The viewBox is widened only as far
 * as the ledger line's stroke needs — half a unit a side — and its centre
 * stays the notehead's centre, so a seat's centring maths never changes.
 *
 * Decorative by contract: `aria-hidden`, no role, no label, no text. It
 * names no pitch and no duration. The wordmark keeps a real, transparent
 * "o" underneath so assistive tech still reads the full name; this glyph
 * is only what the eye sees.
 */
export default function NoteGlyph(props: NoteGlyphProps) {
  const classes = () => (props.class ? `note-glyph ${props.class}` : "note-glyph");

  return (
    <svg class={classes()} viewBox="-0.5 0 11 20" aria-hidden="true">
      {/* The notehead: an ellipse tilted the way every engraved one is.
          Its centre is the viewBox centre, so a seat's translate lands it. */}
      <ellipse class="note-glyph__head" cx="5" cy="10" rx="4.4" ry="3" transform="rotate(-20 5 10)" />
      {/* The ledger line: the horizontal rule a note outside the staff
          wears — through the head's centre, slightly past it on both sides. */}
      {props.ledger && <line class="note-glyph__ledger" x1="0" y1="10" x2="10" y2="10" />}
    </svg>
  );
}

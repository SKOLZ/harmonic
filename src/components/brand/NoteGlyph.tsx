export interface NoteGlyphProps {
  /** Extra class for the context that seats it. */
  class?: string;
  /**
   * Cross the notehead with a ledger line — the notation mark for a note
   * that sits outside the staff. Opt-in: a note outside its staff wears the
   * line; the hero's note sits on its staff and stays bare.
   */
  ledger?: boolean;
}

/**
 * The brand's one drawn form: a gold note — a round notehead, optionally
 * crossed by a ledger line — in a single fixed viewBox. This is what the
 * CSS circle bought its flexibility for: one shape serves every seat that
 * carries a note, scaled by one CSS length (`--note-glyph-size`, driving
 * height; the viewBox supplies the aspect ratio). Two sizes, never two
 * drawings — the brand says one thing.
 *
 * The head is a circle and carries no tilt. A tilted ellipse is correct
 * engraving and wrong here: at brand sizes the axis is ambiguous, and the
 * supplied wordmark asset already draws its note as a plain circle, so the
 * two must agree. Its centre is the viewBox centre, so a seat's translate
 * lands it wherever the seat decides.
 *
 * The geometry is deliberately spare: one circle, and the optional ledger
 * line through its centre. There is no stem and there never may be again:
 * the stem was extra geometry that had to be repositioned at every size,
 * and it is what every failed mark shared. Nothing here may grow a path.
 * The viewBox is widened only as far as the ledger line's stroke needs —
 * half a unit a side — so a seat's centring maths never changes.
 *
 * Decorative by contract: `aria-hidden`, no role, no label, no text. It
 * names no pitch and no duration. The wordmark names itself on its own
 * asset; this glyph is only what the eye sees.
 */
export default function NoteGlyph(props: NoteGlyphProps) {
  const classes = () => (props.class ? `note-glyph ${props.class}` : "note-glyph");

  return (
    <svg class={classes()} viewBox="-0.5 0 11 20" aria-hidden="true">
      {/* The notehead: a round filled circle, centred on the viewBox, so a
          seat's translate lands it. No tilt — the shape the supplied
          wordmark asset also uses. */}
      <circle class="note-glyph__head" cx="5" cy="10" r="4.4" />
      {/* The ledger line: the horizontal rule a note outside the staff
          wears — through the head's centre, slightly past it on both sides. */}
      {props.ledger && <line class="note-glyph__ledger" x1="0" y1="10" x2="10" y2="10" />}
    </svg>
  );
}

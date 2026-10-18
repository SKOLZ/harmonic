export interface NoteGlyphProps {
  /** Extra class for the context that seats it. */
  class?: string;
}

/**
 * The brand's one drawn form: a gold note — a tilted notehead and a thin
 * stem — in a single fixed 10×20 viewBox. This is what the CSS circle
 * bought its flexibility for: one shape serves both brand seats, the
 * wordmark's "o" and the hero staff's middle rule, scaled by one CSS
 * length (`--note-glyph-size`, driving height; the viewBox supplies the
 * aspect ratio). Two sizes, never two drawings — the brand says one
 * thing.
 *
 * The geometry is deliberately spare: one ellipse on the standard ~-20°
 * notation tilt, one rect for the stem rising from the notehead's right
 * edge. Every earlier drawn head failed review by accreting curvature
 * decisions that are invisible in a design tool and glaring at 20px, so
 * nothing here may grow a path.
 *
 * Decorative by contract: `aria-hidden`, no role, no label, no text. It
 * names no pitch and no duration. The wordmark keeps a real, transparent
 * "o" underneath so assistive tech still reads the full name; this glyph
 * is only what the eye sees.
 */
export default function NoteGlyph(props: NoteGlyphProps) {
  const classes = () => (props.class ? `note-glyph ${props.class}` : "note-glyph");

  return (
    <svg class={classes()} viewBox="0 0 10 20" aria-hidden="true">
      {/* The notehead: an ellipse tilted the way every engraved one is. */}
      <ellipse class="note-glyph__head" cx="5" cy="10" rx="4.4" ry="3" transform="rotate(-20 5 10)" />
      {/* The stem: what makes it a note rather than a decorated letter.
          It starts inside the head so the two weld into one silhouette. */}
      <rect class="note-glyph__stem" x="8.4" y="1.2" width="1" height="11" />
    </svg>
  );
}

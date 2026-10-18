import { For } from "solid-js";
import NoteGlyph from "./NoteGlyph";

export interface BrandMarkProps {
  /**
   * Staff rules to draw. `1` is the mark as the wordmark's companion — a
   * note resting on a rule, the seed of a staff. `5` is the same mark at
   * staff scale, and it exists for exactly one place in the product: the
   * hero's rule on the landing page. Repeating the five-line staff in the
   * navbar or the footer would turn a signature into wallpaper.
   */
  lines?: number;
  /** Extra class for the context that sizes it, e.g. `.home__staff`. */
  class?: string;
}

/**
 * The brand mark: one gold note resting on a staff rule.
 *
 * The note is the shared `NoteGlyph` — tilted notehead, thin stem, one
 * viewBox — the same shape the wordmark seats in its "o", so the two
 * brand seats carry one drawing at two sizes. Three earlier forms were
 * rejected in visual review (a symmetric ellipse, an asymmetric two-arc
 * path, then a CSS circle that solved "cannot look strange" by giving up
 * flexibility); the SVG glyph is what buys the flexibility back without
 * inviting geometry back in. The wordmark's name carries the brand; the
 * note only carries the gold, painted from the token's own name
 * (`--gold`) so a retheme of any status colour cannot retheme the logo.
 * The rules stay structural ink.
 *
 * Decorative by contract: `aria-hidden`, no role, no label, no text. It
 * names no pitch, no duration, and no answer, and it adds nothing for
 * assistive tech to read beside the words it accompanies.
 *
 * Everything it measures — the space between rules, the note's height —
 * is measured in `em`, so a context only sets a font-size to scale the
 * whole mark, and the rules stay hairlines at every size. The glyph's
 * viewBox supplies its aspect ratio, so one length drives the box.
 */
export default function BrandMark(props: BrandMarkProps) {
  const classes = () => (props.class ? `brand-mark ${props.class}` : "brand-mark");
  const rules = () => Array.from({ length: props.lines ?? 1 });

  return (
    <span class={classes()} aria-hidden="true">
      <For each={rules()}>{() => <span class="brand-mark__rule" />}</For>
      <NoteGlyph class="brand-mark__glyph" />
    </span>
  );
}

import { For } from "solid-js";
import NoteGlyph from "./NoteGlyph";

export interface BrandMarkProps {
  /**
   * Staff rules to draw. `5` is the mark at staff scale — the hero's rule
   * on the landing page, and the only full staff in the product;
   * repeating the five-line staff would turn a signature into wallpaper.
   * No companion rides under the wordmark: the wordmark is the supplied
   * asset, whose own two hairline rules already frame it, so it seats no
   * mark beneath the name.
   */
  lines?: number;
  /** Extra class for the context that sizes it, e.g. `.home__staff`. */
  class?: string;
}

/**
 * The brand mark: staff rules carrying one gold note — the hero's rule.
 *
 * The note is the shared `NoteGlyph` — round notehead, no stem, no
 * ledger, one viewBox — the same circle the supplied wordmark asset draws
 * for its "o", so the two brand seats carry one drawing at two sizes.
 * Three earlier forms were rejected in visual review (a symmetric
 * ellipse, an asymmetric two-arc path, then a CSS circle that solved
 * "cannot look strange" by giving up flexibility), and the tilted ellipse
 * that followed was retired when the head became a plain circle; the SVG
 * glyph is what buys the flexibility back without inviting geometry back
 * in. The wordmark's asset carries the name; the note only carries the
 * gold, painted from the token's own name (`--gold`) so a retheme of any
 * status colour cannot retheme the logo. The rules stay structural ink.
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

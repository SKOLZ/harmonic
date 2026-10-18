import { For } from "solid-js";

export interface BrandMarkProps {
  /**
   * Staff rules to draw. `1` is the mark as the wordmark's companion — a
   * notehead resting on a rule, the seed of a staff. `5` is the same mark at
   * staff scale, and it exists for exactly one place in the product: the
   * hero's rule on the landing page. Repeating the five-line staff in the
   * navbar or the footer would turn a signature into wallpaper.
   */
  lines?: number;
  /** Extra class for the context that sizes it, e.g. `.home__staff`. */
  class?: string;
}

/**
 * The brand mark: one gold note sitting on a staff rule.
 *
 * The geometry is borrowed from notation rather than illustrated — the rule
 * is a staff line, the notehead is an asymmetric path (two arcs of
 * different curvature meeting at the tips, fuller at the lower left and
 * tapering toward the upper right, the way an engraver cuts a notehead),
 * and its stem is one thin rectangle rising from the right edge. That
 * asymmetry plus the stem is what makes the shape read as a note at a
 * glance; a symmetric oval on a rule reads as a bullet on a line. The only
 * colour either shape carries is `--gold`, the app's one warm hue under its
 * own name so a retheme of any status colour cannot retheme the logo. The
 * rules stay structural ink; everything around the mark keeps the existing
 * hairline.
 *
 * Decorative by contract: `aria-hidden`, no role, no label, no text. It
 * names no pitch, no duration, and no answer, and it adds nothing for
 * assistive tech to read beside the words it accompanies.
 *
 * Everything it measures — the space between rules, the notehead — is
 * measured in `em`, so a context only sets a font-size to scale the whole
 * mark, and the rules stay hairlines at every size.
 */
export default function BrandMark(props: BrandMarkProps) {
  const classes = () => (props.class ? `brand-mark ${props.class}` : "brand-mark");
  const rules = () => Array.from({ length: props.lines ?? 1 });

  return (
    <span class={classes()} aria-hidden="true">
      <For each={rules()}>{() => <span class="brand-mark__rule" />}</For>
      <svg class="brand-mark__notehead" viewBox="0 0 16 20">
        {/* One note, two shapes: the notehead's asymmetric head — two arcs
            of different curvature meeting at the tips, fatter at the lower
            left — and its stem, one thin rectangle off the right edge. */}
        <path d="M3.2 15.9 C4.88 10.76 8.08 9.56 12.8 12.1 C12.9 18.8 1.77 18.8 3.2 15.9 Z" />
        <rect x="11.7" y="3.5" width="1.1" height="9.5" />
      </svg>
    </span>
  );
}

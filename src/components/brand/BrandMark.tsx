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
 * The brand mark: one ochre notehead sitting on a staff rule.
 *
 * The geometry is borrowed from notation rather than illustrated — the rule
 * is a staff line, the notehead is a single ellipse tilted like a real
 * notehead (one shape), and the only colour it carries is `--brand`, the
 * app's one warm hue under its own name so a retheme of the gate colour
 * cannot retheme the logo. The rules stay structural ink; everything around
 * the mark keeps the existing hairline.
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
      <svg class="brand-mark__notehead" viewBox="0 0 16 12">
        {/* One shape: a notehead's tilted ellipse, sized to sit on the rule. */}
        <ellipse cx="8" cy="6" rx="7" ry="4.6" transform="rotate(-20 8 6)" />
      </svg>
    </span>
  );
}

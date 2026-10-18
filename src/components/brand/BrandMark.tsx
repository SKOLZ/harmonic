import { For } from "solid-js";

export interface BrandMarkProps {
  /**
   * Staff rules to draw. `1` is the mark as the wordmark's companion — a
   * dot resting on a rule, the seed of a staff. `5` is the same mark at
   * staff scale, and it exists for exactly one place in the product: the
   * hero's rule on the landing page. Repeating the five-line staff in the
   * navbar or the footer would turn a signature into wallpaper.
   */
  lines?: number;
  /** Extra class for the context that sizes it, e.g. `.home__staff`. */
  class?: string;
}

/**
 * The brand mark: one gold dot sitting on a staff rule.
 *
 * The mark draws nothing. Two noteheads were rejected in visual review —
 * first a symmetric ellipse, then an asymmetric two-arc path — for the same
 * reason both times: a small drawn glyph has nowhere to hide, so every
 * curvature decision is visible at 16px. So the geometry budget is one
 * circle, and even that is a declaration in styles.css rather than a drawn
 * glyph. The wordmark's name carries the brand; the dot only carries the
 * gold, under the token's own name (`--gold`) so a retheme of any status
 * colour cannot retheme the logo. The rules stay structural ink.
 *
 * Decorative by contract: `aria-hidden`, no role, no label, no text. It
 * names no pitch, no duration, and no answer, and it adds nothing for
 * assistive tech to read beside the words it accompanies.
 *
 * Everything it measures — the space between rules, the dot's diameter — is
 * measured in `em`, so a context only sets a font-size to scale the whole
 * mark, and the rules stay hairlines at every size. A circle is the one
 * shape whose proportions cannot go wrong on the way there.
 *
 * `.brand-mark__notehead` survives as an alias on the dot: AppShell's and
 * Home's layout suites still query that class and sit outside this
 * component's edit surface. Drop the alias only when they rename with it.
 */
export default function BrandMark(props: BrandMarkProps) {
  const classes = () => (props.class ? `brand-mark ${props.class}` : "brand-mark");
  const rules = () => Array.from({ length: props.lines ?? 1 });

  return (
    <span class={classes()} aria-hidden="true">
      <For each={rules()}>{() => <span class="brand-mark__rule" />}</For>
      <span class="brand-mark__dot brand-mark__notehead" />
    </span>
  );
}

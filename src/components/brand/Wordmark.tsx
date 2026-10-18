import BrandMark from "./BrandMark";

export interface WordmarkProps {
  /** Extra class for the surface the wordmark lands on. */
  class?: string;
}

/**
 * The wordmark: "Harmonic" in Fraunces, resting on a staff rule that carries
 * the mark's notehead — the name on a line, the way a title sits on a score.
 *
 * One component, so the navbar's home link, the footer's brand block, and
 * any future brand surface say exactly the same thing. The accessible text
 * is the name alone: the mark below it is aria-hidden decoration, which is
 * what lets the navbar's home link keep reading "Harmonic" and nothing more.
 */
export default function Wordmark(props: WordmarkProps) {
  const classes = () => (props.class ? `brand-wordmark ${props.class}` : "brand-wordmark");

  return (
    <span class={classes()}>
      <span class="brand-wordmark__name">Harmonic</span>
      <BrandMark class="brand-wordmark__mark" />
    </span>
  );
}

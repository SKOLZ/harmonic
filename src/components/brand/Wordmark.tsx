import logo from "../../assets/harmonic_logo.svg?raw";

export interface WordmarkProps {
  /** Extra class for the surface the wordmark lands on. */
  class?: string;
}

/**
 * The wordmark: the supplied `harmonic_logo.svg`, inlined whole. The
 * letters, the gold note that takes the "o", and the two hairline rules
 * the name sits between all ship in one fixed coordinate system, so
 * nothing here positions anything — the previous composition, Fraunces
 * text with a note floated over a transparent "o" and CSS borders framing
 * the run, is gone, and with it every fault that came from seating geometry
 * against font metrics the layout cannot read.
 *
 * It is inlined rather than shipped in an `<img>`: an image's innards are
 * untouchable by CSS and by the pointer, and this mark's letters are meant
 * to be recoloured. The asset paints them `currentColor`, so the surface
 * decides the ink (the navbar's home link already says `var(--ink)`), while
 * the gold circle keeps its own fill — a retheme of any status colour may
 * not retheme the logo.
 *
 * Replacing the text run removed `textContent`, so the accessible name now
 * lives on the asset's own root: `role="img"` and `aria-label="Harmonic"`.
 * That is what keeps the navbar's home link reading exactly the name and
 * nothing more.
 *
 * One component, so the navbar's home link and the footer's brand block say
 * exactly the same thing.
 */
export default function Wordmark(props: WordmarkProps) {
  const classes = () => (props.class ? `brand-wordmark ${props.class}` : "brand-wordmark");

  return <span class={classes()} innerHTML={logo} />;
}

import mark from "../../assets/harmonic_logo_sm.svg?raw";

export interface FooterMarkProps {
  /** Extra class for the surface the mark lands on. */
  class?: string;
}

/**
 * The footer's compact mark: the supplied `harmonic_logo_sm.svg` — the gold
 * monogram (two rules, the staff run, and the note) that signs the footer
 * without repeating the navbar's full wordmark. Inlined for the same reason
 * the wordmark is: the mark is part of the document, not an opaque image.
 *
 * The asset is the finished drawing. It ships its own 60×60 viewBox and its
 * own gold fills, so the footer only owns one height; the mark never borrows
 * the surface's ink. The accessible name lives on the asset's root
 * (`role="img"` + `aria-label="Harmonic"`), exactly as the wordmark's does.
 * The footer mark is deliberately not a link: identity is not a control.
 */
export default function FooterMark(props: FooterMarkProps) {
  const classes = () =>
    props.class ? `app-shell__footer-mark ${props.class}` : "app-shell__footer-mark";

  return <span class={classes()} innerHTML={mark} />;
}

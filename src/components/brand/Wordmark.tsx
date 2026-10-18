import NoteGlyph from "./NoteGlyph";

export interface WordmarkProps {
  /** Extra class for the surface the wordmark lands on. */
  class?: string;
}

/**
 * The wordmark: "Harm●nic" in Fraunces — the "o" is the brand's gold
 * notehead, crossed by a ledger line — framed between two hairline rules,
 * the two staff lines the note has escaped. The name and the mark are one
 * object: nothing sits beneath the word, because the word is the mark. The
 * framing rules are CSS borders on the name (`.brand-wordmark__name`), so
 * the markup stays the name and the note.
 *
 * The substitution is visual only. A real "o" keeps the slot: it is
 * painted transparent, so it holds the display face's own advance width
 * for the letters either side and stays in the accessible name —
 * assistive tech still reads exactly "Harmonic". The note overlays that
 * slot; it never replaces the letter in the text.
 *
 * One component, so the navbar's home link, the footer's brand block, and
 * any future brand surface say exactly the same thing. The accessible
 * text is the name alone: the note is aria-hidden decoration, which is
 * what lets the navbar's home link keep reading "Harmonic" and nothing
 * more.
 */
export default function Wordmark(props: WordmarkProps) {
  const classes = () => (props.class ? `brand-wordmark ${props.class}` : "brand-wordmark");

  return (
    <span class={classes()}>
      <span class="brand-wordmark__name">
        Harm
        <span class="brand-wordmark__o">
          o
          <NoteGlyph class="brand-wordmark__glyph" ledger />
        </span>
        nic
      </span>
    </span>
  );
}

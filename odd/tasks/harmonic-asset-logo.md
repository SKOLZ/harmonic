# Harmonic asset logo and shell restyle

## Objective

Use the user-supplied SVG wordmark as the brand, restyle the shell: white page
ground, subtle gray navbar and footer bars with hairline separators, and a
designer credit in the footer.

## Problem

1. The wordmark is still assembled in code — Fraunces text with an SVG glyph
   floated over the "o", framed by CSS borders. Every positioning fault of the
   last three rounds came from that composition inferring geometry from font
   metrics it cannot read. The user has supplied `src/assets/harmonic_logo.svg`,
   a finished asset with the gold circle already in it.
2. The page ground is `--bg: #f4f4f4` grey. The user wants white, with the grey
   moved onto the navbar, and a slightly darker hairline under it. The footer
   gets the same treatment with the separator on top.
3. `.app-shell__header` already carries `border-bottom: 1px solid var(--line)`,
   and `--line` is true black — a hard black rule where the user wants an
   almost invisible one.
4. There is no credit in the footer.

## Constraints

- Gold is `--gold` (#8a6a1f); the asset's gold circle already matches and must
  not be altered.
- The accessible name of the wordmark must still be **"Harmonic"**. Replacing
  the text with an asset removes `textContent`, so the name must come from the
  asset itself (`role="img"` + `aria-label`), proven by a test.
- The wordmark must still align with `main`'s 42rem measure — the navbar's
  inner column keeps its cap; only the bar behind it goes full width.
- Footer link styling (`.app-shell__footer a`) is a descendant selector, so a
  credit placed inside the footer inherits the same colour and gold hover for
  free. Keep it that way rather than restating the styles.
- Gold stays the only hover accent. No new hues.
- Do not touch `src/components/notation/`. The three invariant suites need zero
  edits.
- Receipt-driven development is **off (global)** — ordinary checks are the gate.

## Scope

### In
- `harmonic_logo.svg` as the wordmark; its white letter paths recoloured to the
  brand ink via `currentColor` so CSS owns the colour.
- `SKZ-DSGN.svg` recoloured the same way, placed at the footer's bottom right,
  linking to `https://skolz.dev.ar`.
- White page ground; gray navbar and footer bars; near-invisible separators on
  the navbar bottom and the footer top.
- A full-width footer bar with the content column constrained inside it, matching
  what `.app-shell__header` already does for the navbar.
- `NoteGlyph` switches from the tilted ellipse to a round filled circle, which
  the user asked for earlier and which the supplied asset already uses.

### Out
- The hero's five-rule staff and its placement.
- Palette beyond the greys named here. No new hue.
- Publishing, PR creation, remote operations.

## Task list

| # | Task | Route | Status |
| --- | --- | --- | --- |
| T1 | Supplied logo as the wordmark, round notehead | writer | done |
| T2 | White ground, gray bars, footer credit | writer | done |

### Route rationale
Both touch `styles.css` and `AppShell.test.tsx`, so they run sequentially, one
writer at a time. Each spans several files and needs structural judgement.

## Task details

### T1 — The supplied logo

- Import `harmonic_logo.svg` raw and inline it, so CSS can reach its fills.
  Change its white paths to `currentColor`; leave the gold circle alone.
- `Wordmark` renders the asset instead of text plus glyph. The framing rules
  go with the old composition — the asset is the whole mark now.
- Put `role="img"` and `aria-label="Harmonic"` on the asset's root so the name
  survives the loss of `textContent`.
- `NoteGlyph` becomes a **round filled circle**, no tilt. The ledger line stays
  opt-in; the hero's note sits on its staff, not outside it.

### T2 — Shell restyle

- `--bg` becomes white.
- New purpose-named greys for the bars: a subtle gray behind the navbar and
  footer, and a hairline a shade darker for their separators. Name them for
  their role, as the palette already does.
- `.app-shell__header` keeps `border-bottom`, retargeted to the new hairline,
  and gains the bar background.
- The footer gains a full-width bar with the separator on **top**, and an inner
  column carrying the 42rem cap, padding, and row layout it has today. Only the
  cap moves; `width`, `margin`, and the descendant link rules stay put.
- The credit sits at the footer's bottom right: the `SKZ-DSGN` asset inside an
  anchor to `https://skolz.dev.ar`, inheriting footer link colour and gold hover.

## Acceptance criteria

1. The wordmark renders the supplied asset, with its letters in the brand ink
   and its circle still gold.
2. The accessible name of the wordmark is still "Harmonic".
3. The page ground is white; the navbar and footer sit on subtle gray with
   hairline separators below and above respectively.
4. The navbar's inner column still shares `main`'s 42rem measure.
5. The footer credit sits bottom right and turns gold on hover like the links.
6. The notehead is a round filled circle with no tilt.
7. `npm test`, `npm run typecheck`, `npm run build` all pass.

## Progress

| Task | Evidence | Tier | Commit |
| --- | --- | --- | --- |
| T1 | RED 24 failed / 28 passed — every failure a new-contract assertion (asset inlined, `role`/`aria-label`, `currentColor`, circle geometry, dead-rule deletion) → GREEN 62 passed. `npm test`: **1439 passed (93 files)**, same count because tests were rewritten rather than added. `npm run typecheck`: clean. `npm run build`: passed. Invariant suites untouched (203 passed). Gold circle `fill="#8a6a1f"` left alone. | RDD off (global) — no review; ordinary checks green | 4545810 |
| T2 | RED 20 failed / 17 passed — every failure the new contract (missing credit anchor, `--bar`/`--bar-line`, footer column, header ground, measure re-scope) → GREEN 37/37. `npm test`: **1448 passed (93 files)**, up 9. `npm run typecheck`: exit 0. `npm run build`: passed. Footer anchor count re-scoped 2 → 3, destinations still pinned by href and text. `--bar-line` reuses `--surface-sunken`'s hex so only one new hex entered the sheet. | RDD off (global) — no review; ordinary checks green | 377e262 |

## Status: COMPLETE

## Tuning follow-up

Visual review found the mark blurry and too small, and the page measure too
narrow. All three were value-level faults:

- **Blur.** `.brand-wordmark svg` sized itself with `height: 1.2em`, which at
  the navbar's 18px context landed on **21.6px** — a fractional pixel height,
  which rasterises scaled paths soft. It is now a fixed `30px`, the size asked
  for, and integer.
- **The framing rules were 1.25px.** The asset draws them with
  `stroke-width=".5"` in a 12-unit tall viewBox, so at 30px they scaled to
  1.25 device pixels. `stroke-width=".4"` lands on exactly **1.0px**, and the
  mark's width comes out to a clean 145px. The scale is a flat 2.5x at the new
  height, which is what makes that arithmetic exact.
- **Measure.** `42rem` → `58.75rem` on `main`, `.app-shell__nav`, and
  `.app-shell__footer-column`, with every comment and test pin updated to
  match so the number cannot drift between the sheet and the assertions.

Note: `--text-lg` on `.app-shell__wordmark` no longer sizes anything visible —
the mark is pixel-sized now. It is left in place as harmless inherited context
rather than removed as churn.

### Second pass — ground swap, card arrival, and the real blur

Four things, three of which turned out to be one problem:

- **The rules were off the pixel grid, not merely thin.** A stroke is sharp
  only when its *centre* lands where its own thickness says: a 1px stroke
  needs a half-pixel centre so both edges fall on whole pixels. The design
  put the rules at y=.75 and y=11.15, which render to **1.875px and 27.875px**
  at the mark's flat 2.5x — edges straddling two pixels, antialiasing into
  grey. `.6` and `11` give 1.5px and 27.5px. They also hold at 2x (5x scale,
  2 device px stroke, integer centres), so retina is not a second case.
- **The mark was off the centreline, which would have re-broken that grid.**
  A 30px SVG left inline on a line box is baseline-aligned: descender space
  parks underneath and lifts it above centre. `.app-shell__wordmark` is flex
  now, which removes the line box from the calculation — and stops the mark
  landing on a fractional pixel offset.
- **Ground swap.** `--bg` and `--bar` exchanged values: grey page, white
  navbar and footer. No test moved, deliberately — the suite asserts tokens
  *by role, never by hex* (see the note in `AppShell.test.tsx`), so a shade
  change is meant to stay a one-line edit in `:root`.
- **Card arrival.** Both hub cards kept their white ground and now take a
  gold border, matching the gold their own text already turns. The
  `background` line is gone rather than set to the surface token: the base
  rule already paints them white, and restating it would say the same thing
  twice. `--surface-hover` is untouched — the in-game controls still use it.

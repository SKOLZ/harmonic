# Harmonic fit and note — stop the flex shrink, and turn the "o" into the gold note

## Objective

Two fixes. First, every surface is still shrink-to-fit because of a flexbox
interaction, not a missing cap. Second, replace the CSS dot with an SVG note
that doubles as the "o" in Harmonic.

## Problem

### 1. Every surface is fit-content, not 42rem

`.app-shell` is `display: flex; flex-direction: column`. Its children carry
`margin: 0 auto`. In a **column** flex container, **auto cross-axis margins
override `align-items: stretch`** — that is the spec behaviour, not a bug in
this repo. With stretch cancelled, the item's `width: auto` resolves to
**fit-content**, so each surface is only as wide as its content demands, capped
at 42rem.

That is why the short-text hubs on `/lessons` and `/practice` read narrow, and
why the homepage looked acceptable: its content naturally fills more of the box.

The user diagnosed it exactly: "we have a max width of 42 rem and all we need is
a width of 100% to get it fixed. same with the footer."

### 2. The mark

Three logo passes have now failed or underwhelmed — a symmetric ellipse, an
asymmetric path with a stem, then a CSS dot. The CSS dot fixed the "can look
strange" problem but cost flexibility: no stem, no scale control beyond one em
token, no way to play with the form.

The user's direction: build an **SVG** for flexibility, and use the **"o" in
Harmonic as the gold note**. That is a strong idea and it is self-consistent — a
lowercase serif "o" is already close to a notehead, so the substitution reads
naturally rather than fighting the type.

## Why

- The width defect is mechanical and the user named the fix.
- The note-in-the-wordmark turns the type itself into the brand, which is why it
  survives at 20px where a detached glyph did not: there is nothing extra to
  render badly.

## Constraints

- `width: 100%` is required, not optional: it is what defeats the fit-content
  resolution. `max-width` alone never forces a minimum width, so below 42rem
  each surface still fills the viewport — responsive behaviour is preserved.
- `box-sizing: border-box` is global, so `width: 100%` plus padding is safe.
- The mark stays decorative: `aria-hidden`, no role, no label, no text.
- The accessible name of the wordmark must still read **"Harmonic"** — the
  "o" is replaced visually, never lost to assistive tech.
- No new hue, no new typeface. Gold stays `--gold: #8a6a1f`.
- The three invariant suites need zero edits.
- Practice-mode aria contract is untouched.

## Scope

### In
- `width: 100%` on `main`, `.app-shell__nav`, `.app-shell__footer`.
- An SVG note glyph (notehead + stem) replacing the CSS dot.
- The wordmark's "o" rendered as that glyph, with the name still readable as
  "Harmonic" by assistive technology.
- The hero's staff carrying the same glyph, so one shape serves both sizes.

### Out
- Palette, type, unlocking, catalog, theory, round generation.
- `Staff.tsx` / VexFlow noteheads — those are unrelated notation and must not
  be touched.
- Publishing, PR creation, remote operations.

## Task list

| # | Task | Route | Status |
| --- | --- | --- | --- |
| T1 | Defeat the fit-content shrink with `width: 100%` | parent (inline) | done |
| T2 | SVG note as the "o" in Harmonic | writer | pending |

### Route rationale
- T1 is a three-line mechanical fix once the mechanism is understood. Inline.
- T2 spans a new component, two rewritten components, their tests, and two
  test files outside the previous surface. One writer.

## Task details

### T1 — Defeat the fit-content shrink

Add `width: 100%` to `main`, `.app-shell__nav`, and `.app-shell__footer`,
keeping the existing `max-width: 42rem` and auto margins. Comment the reason at
the point of change — otherwise the next reader will "simplify" it away.

### T2 — The SVG note as the "o"

- New `NoteGlyph` component: an inline SVG, `aria-hidden`, gold, containing a
  notehead and a stem. Sized from a prop or a CSS token so the same glyph works
  in the wordmark and on the hero staff.
- `Wordmark` renders the name with the glyph in the "o" position. The letters
  either side stay real Fraunces text.
- `BrandMark` keeps its staff rules and carries the glyph on the middle rule,
  replacing the CSS dot.
- Delete `--brand-mark-dot` and `.brand-mark__dot`.
- Accessible text must still be "Harmonic". Either a clip-pattern `sr-only`
  utility on a real "o", or a transparent real "o" under the glyph — the
  writer picks and pins the choice with a test.

## Acceptance criteria

1. Navbar, homepage, `/lessons`, `/practice`, and footer render at 42rem on a
   wide viewport and fill the viewport below it — no shrink-to-fit anywhere.
2. The brand contains an SVG note, not a CSS circle.
3. The wordmark reads "Harmonic" with the "o" as the gold note.
4. The accessible name of the wordmark is still "Harmonic".
5. The hero staff carries the same glyph.
6. `npm test`, `npm run typecheck`, `npm run build` all pass.

## Delivery

- Branch `feat/music-theory-minigames`, no remote, no PR → **`single-pr`**.
- One work-unit commit per task, Conventional Commit messages, no AI attribution.

## Progress

| Task | Evidence | Tier | Commit |
| --- | --- | --- | --- |
| T1 | _backfill at T1_ | | |
| T2 | _backfill at T2_ | | |

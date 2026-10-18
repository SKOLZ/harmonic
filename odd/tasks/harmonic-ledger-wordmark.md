# Harmonic ledger wordmark — the "o" as a note outside the staff

## Objective

Fourth logo iteration. Make the wordmark itself the mark: the name framed
between two thin lines, the "o" a gold notehead carrying a ledger line — the
notation signal for a note that has gone outside the staff.

## Problem

Three marks have now failed: an ellipse, a path with a stem, and a stemmed
notehead sitting under the name. The stem is what still reads as wrong — it is
extra geometry that has to be positioned correctly at every size, and it turns
the "o" into a small drawing rather than a letter that happens to be a note.

The user's direction removes geometry rather than adding it:

- **Drop the stem** from the "o".
- **Remove the line-and-note mark under the wordmark** — the name should not
  sit on a staff with a note on it.
- **Frame the name with a thin line above and below.**
- **Cross the "o" with a horizontal line**, as if it were a note that went
  outside the five lines of the staff.

## Why this works

A lowercase serif "o" is already almost a notehead. Remove the stem and it
becomes a pure form. Then the ledger line does the storytelling: in notation, a
short horizontal line through a notehead means the pitch sits beyond the staff.
So the "o" is no longer a glyph pasted onto a word — it is a note that has
escaped the two lines the word is framed by. The brand name and the brand mark
become the same object.

It is also strictly less geometry than the last attempt, which is the direction
every failure has argued for: at 20px, fewer strokes read as cleaner.

## Constraints

- Gold is `--gold` (#8a6a1f). No new hue, no new typeface. Palette untouched.
- The accessible name of the wordmark must still read **"Harmonic"** — the "o"
  is replaced visually, never lost to assistive tech. The existing transparent
  real "o" pattern stays.
- The glyph is decorative: `aria-hidden`, no role, no label, no text.
- The hero keeps its five-rule staff; it is not part of this request and must
  not break.
- No stem anywhere in the brand glyph — the component is shared, so the form
  must be consistent between the wordmark's "o" and the hero's note.
- The three invariant suites need zero edits.
- Practice-mode aria contract untouched. Do not touch
  `src/components/notation/`.

## Scope

### In
- Stemless notehead glyph, with an optional ledger line crossing it.
- Wordmark: thin line above, thin line below, the notehead in the "o" position
  carrying its ledger line, and no mark beneath the name.
- BrandMark reduced to the staff rules plus the stemless note, for the hero.

### Out
- The hero's five-rule staff and its placement.
- Palette, type, layout widths, unlocking, catalog, theory.
- Publishing, PR creation, remote operations.

## Task list

| # | Task | Route | Status |
| --- | --- | --- | --- |
| T1 | Stemless notehead with a ledger line, framed wordmark | writer | done |

## Design spec

### The glyph
- Keep the tilted ellipse (standard notation tilt, ~-20deg). It is the part
  that has worked.
- **Delete the stem.** Nothing in the brand carries a stem again.
- Add an **optional ledger line**: a thin horizontal line through the
  notehead's centre, extending slightly past the notehead on both sides. It is
  opt-in via a prop so the hero's note — which sits *on* its staff, not outside
  it — stays without one.
- Widen the viewBox only as far as the ledger line needs. Keep the geometry to
  an ellipse plus one line.

### The wordmark
- A thin line above the name, a thin line below it, both spanning the name.
  These are the two staff lines the note has escaped.
- "Harm" + the glyph in the "o" position (with its ledger line) + "nic".
- The letters either side stay real Fraunces text.
- Nothing sits beneath the name. The old BrandMark-under-wordmark pattern is
  removed.
- The framing lines should be hairlines — thin enough to read as staff rules,
  not as borders.

### BrandMark
- Now serves only the hero: the five rules plus the stemless note, no ledger.

## Acceptance criteria

1. The wordmark has no stem, and no mark beneath the name.
2. The "o" is a gold notehead crossed by a horizontal ledger line.
3. The name is framed by a thin line above and below.
4. The accessible name is still "Harmonic".
5. The hero still renders its five-rule staff with a stemless note.
6. No stem remains anywhere in the brand glyph.
7. `npm test`, `npm run typecheck`, `npm run build` all pass.

## Delivery

- Branch `feat/music-theory-minigames`, no remote, no PR → **`single-pr`**.
- Receipt-driven development is **off (global)** — no native review ceremony;
  ordinary checks are the gate.

## Progress

| Task | Evidence | Tier | Commit |
| --- | --- | --- | --- |
| T1 | RED 19 failed / 44 passed — every failure a pinned retired contract (old viewBox, stem rect, no ledger, BrandMark still under the wordmark, 3 marks on Home) → GREEN 63 passed. `npm test`: **1438 passed (93 files)**, up 3. `npm run typecheck`: clean. `npm run build`: passed. Zero `<rect>` remains in the brand. Invariant suites untouched. | RDD off (global) — no review; ordinary checks green | ad3f6f5 |

## Status: COMPLETE

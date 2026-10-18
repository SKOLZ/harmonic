# Harmonic alignment — one centered column, and a gold dot instead of a drawn notehead

## Objective

Fix two things the last pass got wrong: the page widths, which left the navbar
as a centered island above full-bleed content, and the mark, whose drawn
notehead has failed review twice.

## Problem

1. **Widths.** The previous task removed the 42rem cap from the navbar, the two
   hubs, and the footer. The result is four different widths on one page: the
   navbar is a centered 42rem island, the homepage is a centered 42rem column,
   `/lessons` and `/practice` run edge to edge, and the footer runs edge to
   edge. Nothing aligns with anything except the homepage and the navbar.
2. **The mark.** Two drawn noteheads have now been rejected — first a symmetric
   ellipse with no stem, then an asymmetric path with a stem. Both failed for
   the same underlying reason: **a small drawn glyph has nowhere to hide.**
   Geometry that is merely acceptable at 200px is visibly wrong at 20px, and
   the navbar and footer only ever show it small.

## Why

The user confirmed the target directly: **option A, one centered column
everywhere**, responsive — "if the available width is less than the site width
it should shrink to fit the max available space." That is precisely what
`max-width` plus `margin: 0 auto` already does, so no new mechanism is needed;
the caps that were removed need to come back.

On the mark the user asked to "try something different", and accepted a
specific direction: **stop drawing a notehead, let the wordmark carry the brand,
and put the gold in a single dot after the name.**

## Constraints

- `UNLOCK_THRESHOLD`, streak semantics, catalog, theory core, round model, and
  practice behavior are unchanged.
- The practice mode's aria contract (`Staff notation, treble clef, 1 note`) is
  load-bearing — no pitch, duration, or correct answer may leak.
- The landing must never read progress or gate.
- Existing suite is **1424 tests / 92 files**. No regressions; the three
  invariant suites need zero edits.
- The mark stays decorative by contract: `aria-hidden`, no role, no label.
- No new hue, no new typeface. Gold stays `--gold: #8a6a1f`.

## Scope

### In
- One centered column: navbar, homepage, `/lessons`, `/practice`, and footer all
  share the same measure, with `main`'s existing responsive cap.
- A CSS gold dot replacing the drawn SVG notehead, used after the wordmark and
  on the hero's staff.
- Removing the SVG geometry from the brand entirely.

### Out
- Any change to streaks, unlocking, catalog, or round generation.
- Game pages already share `main`'s measure and need no change.
- Publishing, PR creation, or remote operations.

## Task list

| # | Task | Route | Status |
| --- | --- | --- | --- |
| T1 | One centered column across every surface | parent (inline) | done |
| T2 | A gold dot replaces the drawn notehead | writer | done |

T1 evidence: RED on the new width contract (footer lacked `max-width: 42rem`),
then GREEN. `npm test`: 1424 passed (92 files). `npm run typecheck`: exit 0.
Three matching `42rem` caps now sit on `main`, `.app-shell__nav`, and
`.app-shell__footer`; the `main.lessons, main.practice-hub` override is gone.
Assessed `medium`, `under_budget` — no review.

T2 evidence: RED 6 failed / 8 passed across the two brand suites, then GREEN
14 passed. Invariant suites untouched and green (203 passed). `npm test`:
**1427 passed (92 files)**, up 3. `npm run typecheck`: exit 0. No `<svg>` remains
in `src/components/brand/`. Assessed `medium` (6 paths, 190 lines),
`under_budget` — no review.

T2 note: `.brand-mark__notehead` survives as a class alias on the dot because
`AppShell.test.tsx:137,149` and `Home.test.tsx:101` — outside the writer's edit
surface — query it on both the 1-rule and 5-rule marks. The alias is itself
pinned by a test. Dropping the name is a possible follow-up that widens the
surface to those two files.

### Route rationale
- T1 is a mechanical revert of caps that were wrongly removed, plus test
  re-scoping. No research, no unresolved design decision — it stays inline.
- T2 touches a component, its call sites, and its tests together, and needs a
  design judgement about the dot's size at each scale. It goes to a writer.

## Task details

### T1 — One centered column

- `.app-shell__nav` already carries `max-width: 42rem; margin: 0 auto`. Leave it.
- Remove the `main.lessons, main.practice-hub { max-width: none }` override, so
  both hubs inherit `main`'s measure again.
- Restore `max-width: 42rem; margin: 0 auto` on `.app-shell__footer`.
- `main` already has `max-width: 42rem; margin: 0 auto` and a `width: auto`
  block default, so below 42rem every surface fills the viewport and above it
  every surface caps and centers — the responsive behaviour the user asked for,
  with no extra rules.

### T2 — The gold dot

- Delete the SVG notehead. The brand carries no drawn glyph at all.
- The mark becomes a **filled gold circle** rendered in CSS: one shape that
  cannot look strange at any size, because it is a circle.
- The wordmark is the name plus that dot. The hero's staff keeps its five rules
  and carries the same dot on the middle rule.
- The dot is decorative and `aria-hidden`, as before.

## Acceptance criteria

1. Navbar, homepage, `/lessons`, `/practice`, and footer share one measure and
   their edges align top to bottom.
2. Below that measure every surface fills the viewport — no horizontal overflow,
   no forced minimum width.
3. The brand contains no SVG and no drawn notehead.
4. A gold dot appears after the wordmark and on the hero's staff.
5. `npm test`, `npm run typecheck`, and `npm run build` all pass with no
   regression from 1424.
6. No aria label names a pitch, duration, or correct answer.

## Delivery

- Branch `feat/music-theory-minigames`, no remote, no PR requested →
  **`single-pr`**; existing size gates do not apply.
- One work-unit commit per task, Conventional Commit messages, no AI attribution.

## Progress

| Task | Evidence | Tier | Commit |
| --- | --- | --- | --- |
| T1 | RED on the new width contract (footer lacked `max-width: 42rem`) → GREEN. `npm test`: 1424 passed (92 files). `npm run typecheck`: exit 0. Three matching `42rem` caps on `main`, `.app-shell__nav`, `.app-shell__footer`; the `main.lessons, main.practice-hub` override removed. | medium / under budget — no review | 941d632 |
| T2 | RED 6 failed / 8 passed across the two brand suites → GREEN 14 passed. Invariant suites untouched (203 passed). `npm test`: **1427 passed (92 files)**, up 3. `npm run typecheck`: exit 0. No `<svg>` remains in `src/components/brand/`. | medium (6 paths, 190 lines) / under budget — no review | 8fde788 |

## Status: COMPLETE

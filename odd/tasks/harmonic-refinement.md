# Harmonic refinement — gold as neutral info, a real notehead, and layout fixes

## Objective

Answer direct user feedback on the Harmonic brand: remove the warning colour
from the product, fix the mark's geometry, and correct the navbar, page widths,
and footer.

## Problem

Five problems were reported against the shipped brand:

1. **The mark looks strange.** The gold-note idea is liked; its execution is not.
2. **Gold reads as a warning colour.** It is currently wired to `--warn`, which
   means "gated", so the brand hue carries a status meaning it should not have.
3. **Navbar links are not vertically centred** and do not read as controls.
4. **Only the homepage matches the navbar's width.** `/lessons` and `/practice`
   stay at the 42rem measure and do not stretch to the shell's borders.
5. **The footer is too narrow**, its links sit in a row with underlines, and
   they do not respond to hover.

## Why

The brand landed as a coherent system but its first real review found the
geometry, the colour semantics, and the layout details all wanting. These are
corrections to work already shipped, not new scope.

## User decisions (recorded verbatim in intent)

- **Remove the home link from `/lessons` and `/practice`** — the homepage is
  reachable by clicking the logo.
- **Stop using a warning colour.** Status is **error (red)** or **success
  (green)** only. **Neutral info may use the gold.**
- **Incorporate the gold colour into the site.**
- **Navbar links become buttons.**
- **`/lessons` and `/practice` stretch to the borders**; the homepage keeps its
  current width, which already matches the navbar.
- **The footer gets wider**, its links stack **vertically**, lose their
  underline, and **turn gold on hover**.
- **The mark's idea is kept; its execution changes.** Other approaches to the
  notehead are wanted.

## Constraints

- `UNLOCK_THRESHOLD`, streak semantics, catalog, theory core, round model, and
  practice behavior are unchanged.
- The practice mode's aria contract (`Staff notation, treble clef, 1 note`) is
  load-bearing — no pitch, duration, or correct answer may leak.
- The landing must never read progress or gate: a brand-new learner sees the
  same hero and doors as a finished one.
- Existing suite is **1420 tests / 92 files**. No regressions; the three
  invariant suites need zero edits.
- The mark stays decorative by contract: `aria-hidden`, no role, no label.

## The palette after this change

| Role | Token | Value |
| --- | --- | --- |
| Structural ink | `--ink` | `#000000` |
| Success | `--ok` | `#45775c` |
| Error | `--danger` | `#9c3f47` |
| **Neutral info, brand, interactive accent** | **`--gold`** | **`#8a6a1f`** |

`--warn` and `--warn-bg` are **deleted**. The two "Locked" stamps were their
only consumers, and "locked" is neutral information — not a warning, not an
error, not a success — so it moves to gold. That is the whole semantic shift,
and it is deliberately small: after this change no colour in the product means
"caution".

`--gold` replaces `--brand`. The old token name was right when gold existed only
for the mark; now it also carries neutral info and hover, so the hue needs a
name that describes the colour rather than one of its three jobs. `--gold-bg`
reuses the value `--warn-bg` already paired with this hue.

## Scope

### In
- The palette shift above, with the locked stamps moved to gold.
- Gold as the site-wide interactive accent (link hover, at minimum).
- A redesigned notehead with real engraved geometry.
- Navbar links as buttons, vertically centred.
- Home back links removed from `/lessons` and `/practice`.
- Full-width `/lessons` and `/practice` hubs.
- A wider footer with vertically stacked, underlined-less, gold-hover links.

### Out
- Any change to streaks, unlocking, catalog, or round generation.
- Game pages (`/lesson/:id`, `/practice/:slug`) keep their centered game
  measure — the user asked for the two *hubs* to stretch, and a gameplay
  surface benefits from a stable, narrow field.
- Publishing, PR creation, or remote operations.

## Task list

| # | Task | Route | Status |
| --- | --- | --- | --- |
| T1 | Gold replaces warning; status is green or red only | writer | **done** |
| T2 | Redesigned notehead with real engraved geometry | writer | **done** |
| T3 | Navbar buttons, page widths, footer, and back-link removal | writer | **done** |

### Route rationale
- T1 lands the colour semantics first so T2 and T3 design against the final
  palette rather than a palette that changes under them.
- T2 is isolated to the mark's own files and its two call sites.
- T3 owns every layout decision and closes the feedback batch.

## Task details

### T1 — Gold replaces warning

- Delete `--warn` and `--warn-bg`; add `--gold` and `--gold-bg`.
- The two locked stamps (`.lessons__lesson-lock`, `.practice-hub__topic-lock`)
  move to gold. Their meaning is unchanged — the word "Locked" and the
  `aria-disabled` attribute still carry it, and the colour remains
  supplementary. **No lock affordance may become color-only.**
- Gold becomes the interactive accent: text links turn gold on hover, at least
  in the footer, and the pattern should be available to the rest of the site.
- Update the token comment so the palette documents **why** status is limited to
  green and red, and what gold is for.

### T2 — The notehead

The current mark is a **symmetric ellipse**. That is the core defect: a
symmetric oval is a pill or a bullet, not a note. Real engraved noteheads are
**asymmetric** — fuller at the lower left, tapering toward the upper right —
and that asymmetry is the whole reason they read as notes.

- Replace the `<ellipse>` with a **path** carrying real notehead asymmetry.
- **Add a stem.** Without one, an ellipse on a rule is a dot on a line and reads
  as a typo. A stem is one thin rectangle; it costs nothing and it is what makes
  the shape unmistakably a note.
- Keep one colour, keep `aria-hidden`, keep the `em`-based scaling, keep the
  `lines` prop contract.
- Both call sites (the shell's single rule, the hero's five-line staff) must
  still work at their existing sizes.

A future direction worth noting but **out of scope here**: the name means notes
sounding together, so a two-note harmonic interval would be a literal translation
of "Harmonic". The user asked to keep the single gold note and fix how it looks;
that idea can be a later iteration.

### T3 — Layout, navigation, and the footer

- **Navbar links become buttons** — the app's existing primary-control material
  (ink fill, white text, 2px radius) — and the nav switches from
  `align-items: baseline` to centred, which is the reported defect.
- **Remove the home back links** from `LessonsPage` and `PracticeHubPage`. The
  logo is the way home. `GamePage`'s "All lessons" → `/lessons` and
  `PracticePage`'s "All topics" → `/practice` **stay** — they are sibling-hub
  links, not home links.
- **`/lessons` and `/practice` stretch to the shell's borders.** The homepage
  keeps its current 42rem measure, which the user confirmed looks right.
- **The footer widens**, its links **stack vertically**, lose the underline, and
  **turn gold on hover**.

## Known migration traps

- The locked-stamp colour change will break any assertion pinning `--warn` or an
  ochre hex. Those assertions should pin the *token* and the *meaning* (the word
  "Locked", `aria-disabled`), never a raw hex.
- Removing the home back links will break tests asserting their presence and,
  in `PracticeHubPage`, possibly an anchor count. Re-scope the intent — "this
  page's own links" — rather than deleting the assertion.
- Widening the hubs may affect any test or layout that assumed the 42rem measure.

## Acceptance criteria

1. No colour in the product means "caution"; status is green or red only.
2. The locked stamps are gold and still carry their meaning without colour.
3. The mark is an asymmetric notehead with a stem, still one colour and still
   `aria-hidden`.
4. Navbar links are buttons and are vertically centred.
5. `/lessons` and `/practice` fill the width the navbar and footer now define;
   `/` keeps its current measure.
6. The footer is wider, its links stack vertically, have no underline, and turn
   gold on hover.
7. `/lessons` and `/practice` have no link back to `/`.
8. `npm test`, `npm run typecheck`, and `npm run build` all pass with no
   regression from 1420.
9. No aria label names a pitch, duration, or correct answer.

## Delivery

- Branch `feat/music-theory-minigames`, no remote, no PR requested →
  **`single-pr`**; existing size gates do not apply.
- One work-unit commit per task, Conventional Commit messages, no AI attribution.

## Forecast

~500 authored lines across three tasks. Recorded as a forecast only; under
`single-pr` the 400-line delivery heuristic has no chain to trigger.

## Progress

| Task | Evidence | Tier | Commit |
| --- | --- | --- | --- |
| T1 | Parent spot check: `npm test` → **1420 passed (92 files)**, typecheck clean, build succeeds, **delta 0** — the three colour-contract tests were rewritten in place, never added or deleted. `--warn`, `--warn-bg`, and `--brand` are gone; `--gold` and `--gold-bg` carry the hue. **The palette comment is now the product's reasoning, not a label**: status is green and red only because a round resolves to correct or wrong, and "a gated lesson is not a failure and not a warning — it is neutral information… A colour that means 'be careful' would tell the learner they did something wrong when all they did was not have the streak yet." Gold's three jobs are enumerated as neutral info, the notehead, and the pointer — all of which mean "here is information" or "here is somewhere you can go", never "caution". **The lock affordances are still not colour-only, and the proof is that the two page tests asserting it passed unmodified** — the word "Locked", `aria-disabled`, the dashed border, and the absence of an anchor all survived the hue move untouched. **One assertion was inverted on purpose:** the old test asserted a `--warn` token *existed*; the new one asserts it does not, because the point of this change is that a caution hue cannot come back. Hex checks were also loosened to `{6}`-format so retheming the hue no longer breaks tests — a test that hardcodes a hex blocks retheming for ever. **Gold-on-ink-700 is ~2.7:1, under the 3:1 large-text floor**, so the ink door's hover keeps `--on-action` and yields to legibility; that rule sits at equal specificity after `.home__door:hover` and wins by **source order, which is load-bearing**. Gold was applied only where a link already answered the pointer, so no link gained a new affordance. The writer flagged a risk that the door's lede would also turn gold — **the parent checked and it does not**: `.home__door-lede` sets its own `color`, so only the title inherits the accent, which is the intended behaviour. Correctly left alone: `BrandMark.tsx`'s JSDoc still names `--brand`, outside this task's surface and rewritten by T2 anyway. Tier: **medium**, 3 paths / 325 lines, `under_budget` → writer self-verification. | medium, `under_budget` | _backfill at T1_ |
| T2 | Parent spot check: `npm test` → **1420 passed (92 files)**, typecheck clean, build succeeds, **delta 0** — the geometry test was rewritten in place, same test, new contract. The `<ellipse>` is gone; the head is now **two cubic arcs of *different* curvature meeting at the tips**, which is the whole point: an ellipse is one curvature mirrored, and that mirroring is exactly why it read as a pill. The top arc bulges 3.0 units toward the upper left; the bottom bulges 3.7 with its belly pushed lower-left — the lean taper toward the upper-right tip is what an engraver's cut looks like. **A stem** — a 1.1-unit bar rising from *inside* the head's right end, overlapped so the same-fill fusion is seamless — makes it unmistakably a note at a glance. **The "exactly one child" contract was rewritten rather than contorted**: the markup is honestly one `path` plus one `rect`, and the test now asserts exactly that, plus that nothing beyond the notehead and its stem is present. **Alignment is load-bearing and subtle**: the head's own centre sits at y=14 of a 20-unit viewBox, so the `translateY` puts the *head* — not the stem-inclusive box — on the rule; get that percent wrong and the note floats above the line. The head's visual height lands at ≈0.81 × `--brand-mark-note` against the old ellipse's ≈0.82, so both call sites render at their existing sizes with no distortion, and the hero's stem tops out ~18px above the rule against a ~26px half-staff at 1.75rem, staying inside the staff. The stale JSDoc naming `--brand` was corrected to `--gold` with the reason the geometry changed. RED observed as `expected 1 path but got 0`; GREEN at 11/11 in `src/components/brand/`. `AppShell` and `Home` passed **unmodified** (35 tests) — sibling suites pin only class-name counts, which is what left the markup internals free to change. Tier: **medium**, 3 paths / 71 lines, `under_budget` → writer self-verification. | medium, `under_budget` | _backfill at T2_ |
| T3 | Parent spot check: `npm test` → **1424 passed (92 files)**, typecheck clean, build succeeds. **`AppShell.tsx` is byte-identical** — every nav restyle is CSS, which is precisely why T1's shell counts (3 nav anchors, 2 footer, across 5 routes) passed unmodified. The buttons take the product's **existing** primary-control material verbatim (`.game-shell__next`, `.note-pick__confirm` — Confirm / Next / Submit / Play), so the navbar now speaks the same control language as the rest of the app. **Hover is `--action-hover`, not gold**, because gold on an ink fill is ~2.7:1 — the same measured finding T1 made for the landing's ink door, applied consistently: the accent yields to legibility. `inline-block` on the padded anchors is **load-bearing**, since a padded *inline* anchor overflows its line box and `align-items: center` would then centre on a box that is not the button's. Back links removed from both hubs; `GamePage` and `PracticePage` were not in the diff at all. Hubs opt out via `main.lessons, main.practice-hub { max-width: none }` while `main` keeps 42rem, so `/` and both game surfaces are provably untouched. **The PracticeHub anchor-count trap the plan predicted never existed** — nothing broke — and the writer added a symmetric test pinning the hub's count to `practiceTopics.length` rather than a literal, so a future topic widens it honestly. `LessonsPage`'s back-link test was **rewritten in place, never deleted**: "has no link back to the landing page — the logo is the way home", with the count *derived* from lock state rather than hard-coded, so it still fails if anything adds a non-lesson link. **Parent correction:** T3 also dropped the navbar's 42rem cap, which broke the exact alignment the user praised — "the content in the homepage looks ok as the width of it matches with the width of the navbar". The test's own comment admitted the cap "is what made only the homepage line up with the navbar" and then removed it anyway. That is a misreading of "make *these* stretch", where "these" was practice and lessons. **The cap was restored on `.app-shell__nav`**, the hubs keep stretching, and the footer stays wide; two assertions encoding the wrong reading were re-scoped rather than deleted. RED observed as five contract failures; GREEN at 45/45 in the three touched suites. Delta +4, zero deletions, zero new files. Tier: **medium**, 9 paths / 360 lines, `under_budget` → writer self-verification. | medium, `under_budget` | a832313 |

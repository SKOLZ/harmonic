# Home hero — full height, one promise, a quiet ripple

## Objective

Turn `/` into a full-height hero that fills the space between the navbar and
the footer: one clear promise, one plain explanation, exactly two actions, and
a subtle animated dot-grid/ripple backdrop. The staff and keyboard drawing is
removed.

## Problem

The first iteration put a five-line staff and a drawn two-octave keyboard
under the CTAs. The user rejected that composition: the instrument competed
with the hero instead of supporting it, and the clever title ("The staff,
decoded.") was not the promise they wanted. The page should be the hero
alone, with motion living in the background as a small detail.

## User decisions

- Keep the hero only; remove the staff and the piano keyboard.
- Use a better title than "The staff, decoded."
- Make the hero fill the whole window height minus the navbar and footer.
- Add a subtle gray background animation — a dot grid and/or ripples from a
  wave — that reads as a small detail, not a second focal point.
- Keep exactly two CTAs: Lessons and Practice.

## Current design

- Title: **Learn to read music.**
- Lede: unchanged — **39 lessons take you from the first clef to the last
  cadence. Practice drills note reading against the clock.**
- Primary CTA: **Start the lessons** → `/lessons`
- Secondary CTA: **Practice note reading** → `/practice`

```
Learn to read music.                      [display]
39 lessons take you ...                   [lede, max 40rem]

[ Start the lessons ] [ Practice note reading ]

              · · · · · · · · · · · ·     [quiet dot grid + ripple]
```

Left aligned on the shell's 58.75rem measure, vertically centred in the
space the shell leaves. The backdrop is full-bleed and sits behind the type.

## Scope

### In

- `Home.tsx`: the hero and the backdrop only; no `BrandMark`, no keyboard
  geometry, no session gate.
- `src/components/home/HomeBackdrop.tsx`: a canvas that draws a gray dot grid
  and a slow radial wave, with reduced-motion, visibility, resize, and DPR
  handling.
- `styles.css`: full-height hero layout, the inner measure, the backdrop mask;
  remove the instrument, keyboard, and entrance rules.
- `Home.test.tsx`: the landing contract for the new hero.

### Out

- AppShell, navbar, footer, `index.html`, catalog, progress, practice.
- New dependencies.
- Scroll-triggered motion, parallax, or any animation outside the backdrop.
- A session gate: the backdrop is ambient and may run on every visit; reduced
  motion turns it into a static grid.

## Constraints

- Exactly two anchors inside `.home`, both ungated; no `.brand-wordmark` inside
  `.home`.
- The canvas contributes no text, role, or target: `aria-hidden="true"`,
  `pointer-events: none`, no fallback content.
- Gray dots only — no gold, no new hue. The backdrop must stay quieter than
  the type.
- Reduced motion draws the static grid once and never starts the RAF loop.
- Pause the loop while the document is hidden.
- `npm test`, `npm run typecheck`, and `npm run build` pass.

## Acceptance criteria

1. The hero renders "Learn to read music." and the unchanged lede.
2. The staff, keyboard, and `home--intro` class are gone from the DOM and CSS.
3. Exactly two anchors inside `.home`: `/lessons` and `/practice`; both
   ungated; a brand-new and a finished learner receive identical hero markup.
4. The backdrop is a `canvas.home__backdrop`, `aria-hidden`, with no text and
   no controls, inside `.home`.
5. `.home` is a flex child of the shell with `flex: 1`, so it fills the space
   left by the header and footer; `.home__inner` keeps the 58.75rem measure.
6. Reduced motion leaves a static dot grid with no animation loop.
7. `npm test`, `npm run typecheck`, and `npm run build` pass.

## Task list

| # | Task | Route | Status |
| --- | --- | --- | --- |
| T3 | Rebuild `/` as the full-height hero; remove the instrument and entrance | delegated writer | done |
| T4 | Add the canvas dot-grid ripple with reduced-motion and visibility handling | delegated writer | done |
| T5 | Rewrite the landing tests and run verification | delegated writer | done |

### Route rationale

Three files plus a new component. The visual decisions are resolved here, so
the implementation is bounded and goes to one writer; the parent keeps the
screenshots and the final visual judgment.

## Task details

### T3 — Full-height hero

- `Home.tsx`: `<main class="home">`, `<HomeBackdrop />`, then
  `<div class="home__inner">` holding `header.home__hero` with
  `h1.home__title`, `p.home__lede`, and the two `A.home__cta` links.
- Remove `HOME_INTRO_KEY`, `playIntroOnce`, the key constants, `blackKeyLeft`,
  the `BrandMark` import, and the instrument markup.
- CSS: `.home` is `position: relative; display: flex; flex: 1; align-items:
  center; width: 100%; max-width: none; margin: 0; padding: 0; overflow:
  hidden`. `.home__inner` is the 58.75rem column with the old `main` padding.
  The shell already has `min-height: 100vh` and a column flex; the footer
  keeps its `margin-top: auto`. No AppShell change.
- Delete `.home__instrument`, `.home__staff`, `.home__keyboard`,
  `.home__white-keys`, `.home__key*`, the `.home--intro` rules, and the
  `home-rule-in`, `home-note-in`, `home-key-press` keyframes.

### T4 — The backdrop

- `HomeBackdrop.tsx`: default export; a single `<canvas ref={...}
  class="home__backdrop" aria-hidden="true" />`.
- `onMount`: get the 2D context in a `try/catch`; if unavailable, return. A
  missing context must not break the page (happy-dom).
- Grid: spacing 26px (32px above 1200px, 40px above 1800px), dot radius
  ~1.1px, base alpha ~0.09. The origin is ~68% width, ~45% height.
- Wave: `sin(distance * 0.018 - time * 0.0007)`, `lift = max(0, wave) ** 2`;
  alpha `0.09 + lift * 0.09`, radius `1.1 + lift * 0.8`. Slow, concentric,
  no loop reset.
- DPR capped at 2; resize resets the transform and rebuilds the dot list.
- `prefers-reduced-motion: reduce`: draw the static grid once, no RAF. React
  to a change in the preference. Pause on `document.hidden`; resume on
  visible. Disconnect the `ResizeObserver` and remove every listener on
  cleanup. Guard `ResizeObserver` and `matchMedia` availability.
- CSS: `.home__backdrop` absolute, inset 0, block, full size,
  `pointer-events: none`, masked by a soft ellipse centred at 70% / 46%
  (58% × 78% radii) so the detail stays on the right and out of the type.

### T5 — Tests

- Rewrite `Home.test.tsx`: new title, 39 used once, backdrop canvas
  (`aria-hidden`, no text, no controls), exactly two CTAs, no lesson rows,
  both ungated, identical hero markup for new and finished learners, App
  route at `/`.
- Remove the staff/keyboard/entrance tests and the `HOME_INTRO_KEY` import.
- Compare `.home__inner` rather than the whole `.home` for the progress
  contract, so the canvas's environment-dependent size attributes cannot make
  the test flaky.

## Delivery

- Branch `feat/music-theory-minigames`; no remote or PR requested.
- One work-unit commit for the revision, plus a docs commit for the evidence.

## Progress

| Task | Evidence | Tier | Commit |
| --- | --- | --- | --- |
| T3 | Worker reported `npm test` → **1453 passed (93 files)**, `npm run typecheck` clean, `npm run build` succeeds (only the existing chunk-size warning); the parent re-ran the focused landing file (10/10) and typecheck. `/` is the hero alone: **Learn to read music.**, the unchanged lede, and the same two CTAs. The staff, keyboard, `BrandMark` import, `HOME_INTRO_KEY`, `playIntroOnce`, and the entrance keyframes are gone. `.home` is a `flex: 1` child of the shell's 100vh column, so the hero fills exactly what the header and footer leave; `.home__inner` keeps the 58.75rem measure and the old `main` padding. **Visual check:** Playwright at 1440×900 and 390×844; the desktop page is exactly one viewport (70px header / 718px hero / 112px footer), the mobile page likewise (76 / 637 / 131); the title stays on one line at both widths, the lede holds its measure, and the two CTAs go full width below 28rem. No horizontal scroll. | RDD off (global) | aa999b1 |
| T4 | The backdrop is a new `HomeBackdrop` canvas: a gray dot grid (26/32/40px steps by width, 1.1px dots, 0.09 base alpha) with a slow radial sine wave from 68%/45% — `sin(distance * 0.018 - time * 0.0007)`, the crest adding 0.09 alpha and 0.8px radius. It is `aria-hidden`, pointer-transparent, and masked by an ellipse at 70%/46% (58% × 78%) so the left column stays clean. DPR is capped at 2; resize rebuilds the grid; reduced motion draws the static grid once and never starts RAF; the loop pauses on `document.hidden`; `getContext`, `ResizeObserver`, `matchMedia`, and RAF are guarded, and cleanup removes every listener. **Visual check:** the right side shows the dots while the left is clean; two screenshots 3s apart differ across the backdrop region, confirming the wave moves. happy-dom returns a null 2D context, so the animation itself is browser-verified, not unit-tested. | RDD off (global) | aa999b1 |
| T5 | Test-first: the rewritten `Home.test.tsx` failed 5 of 10 against the old component (old title, missing backdrop, old intro class, missing inner, old App-route title), then passed 10 of 10 after implementation. The file pins the new title, the lede with 39 used once, the silent canvas (aria-hidden, no role/label/text/tabindex/controls), the two ungated anchors, no lesson rows, identical `.home__inner` for new and finished learners, and the App route at `/`. The old staff/keyboard/entrance tests are removed. Parent spot check: focused 10/10, typecheck clean. | RDD off (global) | aa999b1 |

## History

- `1c9145f` / `aa1d8e2`: first iteration — hook, five-line staff, drawn
  two-octave keyboard, and a session-gated key entrance. The user rejected
  the instrument composition and the title. T3–T5 replace it. The old
  document remains in git history and in Engram's version history.

## Status: DONE

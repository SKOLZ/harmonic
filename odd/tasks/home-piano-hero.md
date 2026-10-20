# Home piano hero — a hook, two keys, and one entrance

## Objective

Turn the landing page into a simple, distinctive hero for the piano-themed
theory product: a catching headline and phrase, exactly two calls to action
(Lessons and Practice), and a piano keyboard as the page's one memorable
visual. The brand logo stays in the shell, not in the hero.

## Problem

The current landing is a masthead, a staff, and two framed doors. It is
tasteful but static and reserved: the product name is the headline, the page
does not read as a piano surface, and nothing on first view says "music".
The user asked for a hero that is simple, aesthetic, and animated, with the
two destinations as the only actions.

## Why

This is the first screen a visitor sees. It has one job: explain the product
in a sentence and route the visitor to either the lesson chain or the
note-reading drill. The piano keyboard is the product's own material — the
app already renders one for note input — so it belongs in the hero as a
drawn illustration rather than as a new decorative language.

## User decisions

- Piano theme.
- Simple, aesthetic, animated.
- The hero carries a catching title and phrase, not the logo.
- Exactly two CTAs: Lessons and Practice.

## Scope

### In

- A new hero: hook headline, one plain lede, two CTAs.
- A decorative two-octave keyboard (15 white keys, 10 black keys) built from
  DOM elements, with the five-line staff mark above it.
- One orchestrated entrance on the first visit of a session: the staff rules
  draw in, the gold note settles, then the keys press left to right.
- Session storage gate so internal navigation back to `/` does not replay it.
- Contract tests for the new landing.

### Out

- Any change to streaks, unlocking, the catalog, round generation, or
  practice behavior.
- The navbar and footer, which keep the wordmark.
- Audio, interactive keys, or a playable piano on the landing.
- A new palette, typeface, or animation library.

## Constraints

- The landing must never read progress or gate: a brand-new and a finished
  learner see the same hero.
- Exactly two anchors inside `.home`, both ungated.
- The instrument is decorative: `aria-hidden`, no roles, no labels, no text,
  no pointer interference.
- Motion is transform-only (plus the note's opacity), runs once, and keeps
  the existing `prefers-reduced-motion` path.
- No scroll-triggered animation, parallax, carousel, or ambient loop.
- Existing suite stays green; `npm run typecheck` and `npm run build` pass.

## Copy

- Title: **The staff, decoded.**
- Lede: **39 lessons take you from the first clef to the last cadence.
  Practice drills note reading against the clock.**
- Primary CTA: **Start the lessons** → `/lessons`
- Secondary CTA: **Practice note reading** → `/practice`

## Composition

```
The staff, decoded.                       [display, one line]
39 lessons take you ...                   [lede, max 40rem]

[ Start the lessons ] [ Practice note reading ]

────────────────── staff + gold note ──────────────────
▐▌▐▌▐▌▐▌▐▌▐▌▐▌▐▌▐▌▐▌▐▌▐▌▐▌▐▌ keyboard ───────────────
```

Left aligned on the shell's 58.75rem measure. The keyboard is the page's
signature; everything around it stays quiet.

## Task list

| # | Task | Route | Status |
| --- | --- | --- | --- |
| T1 | Rebuild the hero, CTAs, and static keyboard scene; update contract tests | parent (inline) | done |
| T2 | Add the session-gated entrance and reduced-motion handling; test the gate | parent (inline) | done |

### Route rationale

Both tasks are one page's markup, one CSS section, and its tests. The visual
decisions are resolved in this document; no research or unresolved design
choice remains. The change is a single cohesive surface, so it stays inline
instead of adding a writer round-trip.

## Task details

### T1 — Hero, CTAs, keyboard

- `Home.tsx`: `<main class="home">`, a `<header class="home__hero">` with
  `h1.home__title`, `p.home__lede`, and `.home__actions` holding the two
  `A.home__cta` links; then `.home__instrument[aria-hidden]` with the
  existing `BrandMark lines={5}` and a `.home__keyboard`.
- The keyboard renders 15 white keys in a flex row and 10 black keys
  absolutely positioned after white indices 0, 1, 3, 4, 5 in each octave.
  Keys are spans, never buttons.
- CTAs: primary ink fill for Lessons, white key for Practice. Hover uses the
  existing 120ms surface/gold language; active nudges down 1px.
- Styles: replace the current Home block. Use the existing tokens only.

### T2 — The entrance

- `Home.tsx`: read a `harmonic:home-intro` session flag before first paint.
  First visit adds `home--intro` and sets the flag; later visits do not.
- CSS: staff rules scale in from the left (staggered 45ms), the note fades
  and drops 0.35em, then keys press down 4px (3px black) in left-to-right
  order, 30ms apart. One pass, no loop.
- The existing reduced-motion rule also zeroes animation and transition
  delays so the entrance cannot ripple.

## Acceptance criteria

1. The hero shows the hook title and lede, with no `.brand-wordmark` inside
   `.home`.
2. Exactly two anchors inside `.home`: `/lessons` and `/practice`, both
   ungated for every progress state.
3. The five-line staff appears once, inside the instrument, with one gold
   note and no text.
4. The keyboard has 15 white and 10 black spans, contributes no text or
   interactive elements, and is inside an `aria-hidden` container.
5. The entrance plays on the first mount of a session and not on the second.
6. Reduced motion collapses the entrance without a stagger.
7. `npm test`, `npm run typecheck`, and `npm run build` pass.
8. Both a brand-new and a finished learner receive identical landing markup.

## Delivery

- Branch `feat/music-theory-minigames`; no remote or PR requested.
- One work-unit commit for the landing: T1 and T2 share the same markup, CSS
  section, and test file, so splitting them would require an artificial
  intermediate state. Conventional Commit, no AI attribution.

## Progress

| Task | Evidence | Tier | Commit |
| --- | --- | --- | --- |
| T1 | `npm test` → **1455 passed (93 files)**, `npm run typecheck` clean, `npm run build` succeeds (only the existing chunk-size warning). `/` is now a hook, a lede, and two actions over the staff and a drawn 15-white/10-black keyboard. **Exactly two anchors inside `.home`**: `/lessons` (ink primary) and `/practice` (white key), both ungated; the page imports neither the catalog nor the progress store, and a test asserts identical markup for a new and a finished learner. The instrument is one `aria-hidden` container with `pointer-events: none`, one full staff, and spans — no buttons, labels, or text. Tests also pin the 15/10 key counts, the single staff, and the absence of lesson rows. **Visual check:** Playwright at 1440×900 and 390×844; the mobile title breaks cleanly as "The staff," / "decoded.", the lede stays under a comfortable measure, and the two CTAs go full width below 28rem. The navbar and footer keep the wordmark; the hero does not show it. `index.html` gained a real title, a description, and the `#f7f7f7` theme color. | RDD off (global) | 1c9145f |
| T2 | The entrance is one gesture: five staff rules draw left to right at 45ms intervals, the gold note fades in and drops 0.35em, then the keys press in playing order (black keys sit half a step later) at 30ms intervals. `playIntroOnce()` reads `harmonic:home-intro` in the component body, not `onMount`, so the class is on the first paint and a returning visitor never sees the instrument rewind; storage failure falls back to the settled page. A test pins first-mount yes / second-mount no. **The visual check caught a physical lie:** a pressed black key translated down over the white key behind it, so the top of the press showed a white gap. A `::before` ink slot, riding with the key and clipped at rest, now fills that gap; verified at 2× zoom at 650, 700, and 1000ms. Reduced motion already zeroes animation and transition delays, so the entrance cannot ripple; hover is a 120ms surface/gold answer and active is a 1px press. The primary CTA keeps white text on ink — gold on ink is below the 3:1 floor. | RDD off (global) | 1c9145f |

## Status: DONE

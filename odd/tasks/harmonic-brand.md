# Harmonic — brand identity, hero, and a global shell

## Objective

Name the app **Harmonic**, give it a brand identity built from material the app
already owns, and promote the navigation and footer from page-local back links
to a global shell.

## Problem

The app has no name, no logo, no navigation, and no footer. After the landing
split, movement between Lessons and Practice depends on back links and on going
home first. The visual system is strong — true-black ink, ochre, Fraunces and
Archivo, piano-key doors — but nothing binds those parts into an identity, and
nothing tells a first-time visitor what the product is.

## Why

The user asked for a homepage with a hero, a short explanation, a navbar, and a
footer; for the app to be named Harmonic; and for a brand identity drawn from
"the things we already have." Scope decision confirmed with the user: the
navbar and footer are **global**, part of the app shell on every route.

## Constraints

- **Build from what exists.** The identity must be assembled from the app's own
  material, not from a fresh palette or a stock music illustration. Introducing
  a new hue, a new typeface, or a gradient is out of scope by definition.
- `UNLOCK_THRESHOLD`, streak semantics, catalog, theory core, round model, and
  the practice mode's behavior are unchanged.
- The practice mode's aria contract (`Staff notation, treble clef, 1 note`) is
  load-bearing — no pitch, duration, or correct answer may leak.
- The landing page must never read progress and must never gate: a brand-new
  learner with every lesson locked sees the same two doors as a finished one.
- Existing suite is **1380 tests / 89 files**. No regressions; the three
  invariant suites need zero edits.
- T9's discipline stands: black as structural color, ≤2px border radius,
  Fraunces/Archivo, muted status hues, no Bootstrap-era defaults.

## Scope

### In
- A global shell (navbar + footer + routed outlet) wrapping every route.
- The Harmonic wordmark and mark, reusable wherever the brand appears.
- A hero on `/` with the name, a short explanation, and the brand's visual.
- A brand-accent token, semantically separate from the gate color.
- Tests for the shell, the brand mark, and the hero.

### Out
- New practice topics or lesson content.
- Any change to streaks, unlocking, catalog, or round generation.
- Publishing, PR creation, or remote operations.

## The brand

### What we already own (the raw material)

| Asset | Where it lives today |
| --- | --- |
| True black `#000000` structural ink on a `#f4f4f4` ground, white card stock | `--ink`, `--bg`, `--surface` |
| Ochre `#8a6a1f` — the only warm color, currently the gate/stamp accent | `--warn` |
| Fraunces (engraved optical sizing) for what is read; Archivo for what is operated | `--font-display`, `--font-ui` |
| Piano keys as a motif: a white key beside an ink key, in one frame | `.home__door`, `.home__door--ink` |
| The staff — treble clef, five lines, noteheads — drawn for real in VexFlow | `src/components/notation/**` |
| Worksheet discipline: 1px ink frames, 2px radius, hairline rules | `src/styles.css` |
| The number 39 — a real fact about the product | `src/games/catalog.ts` |

### Concept: the page is a score

Not music *themed* — music *structurally*. The characteristic thing in this
subject's world is a staff, so the identity borrows notation's own geometry
rather than illustrating it.

**The memorable thing** is one element: a real five-line staff carrying a
single **ochre notehead**. It is the product's subject stated as a picture, in
the app's own ink, in the app's one warm color. Everything else stays quiet so
this can be the thing people remember.

- **The mark** is the notehead sitting on a staff rule. One shape, one color,
  instantly legible as music, and it reuses the ochre the app already has.
- **The wordmark** is "Harmonic" set in Fraunces at a large optical size, with
  the staff rule and notehead as its companion — the name resting on a line.
- **A staff appears once, fully**, as the rule that carries the hero. Repeating
  a five-line staff everywhere would turn a signature into wallpaper; the rest
  of the page keeps the existing hairline.

### Type

Reuses the existing pairing with no new faces.

| Role | Face | Treatment |
| --- | --- | --- |
| Wordmark, hero headline | Fraunces | Large optical size, the display axis doing the work |
| Hero explanation, nav, footer, doors | Archivo | Body measure under 80 characters |
| Counts, clock, streak | Archivo | Tabular figures, as today |

### Palette

Reuses every existing token. One addition:

- **`--brand: #8a6a1f`** — the ochre, as a *brand* accent.

  `--warn` currently means "this lesson is gated." If the logo borrowed
  `--warn`, rethemeting the gate color would silently retheme the logo. Same
  value, separate name, separate reason.

### Copy

Plain, active, from the learner's perspective. No slogans, no "welcome to",
no tracked-out eyebrows, no middle-dot meta strings, no `→` on links.

- **Hero explanation** — say what it is and what is in it: Harmonic teaches
  you to read music; 39 lessons build the skill in order; a practice mode
  drills note reading against the clock.
- **The count 39** is a real fact. Use it once, in prose. It is not a stat
  block and not a big-number hero — that treatment would be a default, not a
  choice.
- **Footer** — the wordmark, one line of what it is, and the two routes. No
  social links, no newsletter, no invented legal boilerplate beyond a plain
  copyright line.

## Task list

| # | Task | Route | Status |
| --- | --- | --- | --- |
| T1 | Global shell: navbar, footer, routed outlet | writer | **done** |
| T2 | Harmonic brand mark, hero, and the landing retheme | writer | **done** |

### Route rationale
- T1 lands the shell first so T2 designs the hero *inside* the real frame it
  will live in, rather than against a mock.
- T2 owns every brand decision; T1 is deliberately plain infrastructure.

## Task details

### T1 — Global shell

- A shell component rendering a **navbar** (wordmark + Lessons + Practice) and a
  **footer**, with a routed `<Outlet/>` between them.
- `src/App.tsx` wraps every existing route in the shell. Route table is
  otherwise unchanged: `/`, `/lessons`, `/lesson/:id`, `/practice`,
  `/practice/:slug`.
- The shell is **plain by design** — black hairline under the nav, quiet footer,
  existing tokens only. It must not spend the brand's boldness; T2 owns that.
- Existing in-page back links (`GamePage`, `PracticeHubPage`, `PracticePage`)
  **stay**. They are contextual ("this page is part of the lessons"), not
  navigational, and removing them is churn without payoff.

### T2 — Brand and hero

- The wordmark and mark, as reusable components.
- The hero: name, short explanation, and the staff-with-notehead as the single
  memorable element.
- `--brand` token; the hero staff used once, fully, and nowhere else.
- The two piano-key doors survive — they are already the landing's good idea and
  they sit naturally under the hero.

## Known migration trap

A global navbar adds anchors to every page. Any test asserting **anchor counts**,
**"the first anchor is X"**, or **"exactly two anchors"** will shift — most
visibly the landing tests, which currently assert `/` has exactly two. Those
assertions must be **re-scoped, not deleted**: the intent is "the landing offers
exactly two doors," which is now true of `.home__doors` rather than of the whole
document. Sweep `Home.test.tsx`, `LessonsPage.test.tsx`,
`PracticeHubPage.test.tsx`, `PracticePage.test.tsx`, and
`LessonRouting.test.tsx`.

## Acceptance criteria

1. Every route renders the navbar and the footer.
2. The wordmark reads "Harmonic" and appears in the navbar.
3. `/` shows a hero with the name, a short plain-language explanation, and the
   staff-with-notehead mark.
4. Lessons and Practice are reachable from the navbar on every page.
5. The identity uses only existing hues and faces plus the new `--brand` token;
   no gradient, no new typeface, no stock music art.
6. A brand-new learner sees the same hero and doors as a finished one — nothing
   on `/` reads progress or gates.
7. `npm test`, `npm run typecheck`, and `npm run build` all pass with no
   regression from 1380.
8. No aria label names a pitch, duration, or correct answer.

## Delivery

- Branch `feat/music-theory-minigames`, no remote, no PR requested →
  **`single-pr`**; existing size gates do not apply.
- One work-unit commit per task, Conventional Commit messages, no AI attribution.

## Forecast

~700 authored lines across two tasks (shell + re-scoped tests, then brand
components + hero + CSS). Recorded as a forecast only; under `single-pr` the
400-line delivery heuristic has no chain to trigger.

## Progress

| Task | Evidence | Tier | Commit |
| --- | --- | --- | --- |
| T1 | Parent spot check: `npm test` → **1395 passed (90 files)**, typecheck clean, build succeeds. `src/components/layout/AppShell.tsx` renders a navbar (wordmark → `/`, Lessons, Practice — exactly 3 anchors), a routed slot, and a footer repeating the two links — exactly 2 anchors. **This router exports no `Outlet`:** `@solidjs/router` 1.0.0 ships `createOutlet` as internal only, so the shell is a **pathless parent route** whose `props.children` is the outlet — verified in the package's dist rather than assumed. The page's own `<main>` stays the landmark between nav and footer, so every page-level selector keeps working. **The migration trap cost two assertions, both re-scoped and neither weakened.** `Home.test.tsx`'s document-level anchor count → scoped to `.home`; the writer re-scoped this one *despite it still passing without the shell*, because its stated intent was document-level and the shell makes that document-false by design — the honest reading, not the lazy one. `LessonsPage.test.tsx`'s practice-link negative → scoped to `main.lessons`, matching the sibling back-link test's existing scope. Four further candidates were swept and deliberately left intact (the practice-hub fixture negative, both practice-page container-scoped assertions, and LessonRouting, which carries no count assertions). **Nothing was deleted to make a suite pass.** RED observed as 15/15 `AppShell` tests failing against the unwired tree; GREEN at 15/15. Delta is exactly the new suite: 1380 → 1395, 89 → 90 files, zero regressions. **Deliberately no brand flourish** — existing tokens only, and `.app-shell__wordmark` is left unstyled as the hook T2 will restyle. Tier: **medium**, 7 paths / 455 lines, `slice_budget_reached` → informational under `single-pr`. | medium, `slice_budget_reached` | 0a726f2 |
| T2 | Parent spot check: `npm test` → **1420 passed (92 files)**, typecheck clean, build succeeds. `BrandMark` carries a `lines` prop — `1` for the shell's single rule, `5` for the hero's full staff — with geometry in `em` custom properties, so the hero scales the whole mark by setting `font-size` alone and the rules stay hairlines at every size. **One shape:** a single tilted ellipse, no stem, flags, or clef, asserted by a test that the SVG holds exactly one child. **One color:** `fill: var(--brand)` sits on the SVG and the ellipse inherits it; the rules are `var(--ink)`. **`--brand: #8a6a1f` is documented in the CSS with its own reason** — `--warn` means "this lesson is gated," and a logo borrowing it would retheme itself whenever the gate color changes. The hero is `h1` "Harmonic", a lede carrying **39 exactly once in prose**, and one full staff; the piano-key doors are untouched. Fraunces `opsz` 144 was **verified against `standard.css` shipping the axis**, not assumed. **The cut list is the real evidence of quality:** a five-line staff in the nav and footer (the obvious logo move, and exactly the wallpaper the brief forbids); the hero `h1` as the `Wordmark` component (that would have put a *second* notehead on the landing and split the memorable element); keeping the masthead's old 2px border *and* adding the staff (two rules 8px apart read as a mistake); and a **treble clef** — the "authentic" choice, rejected because a clef turns the picture into a *pitch question the landing has no right to ask* and drags the 1.1MB VexFlow chunk onto `/`. Geometry only states music without asking anything. The writer also found two redundant declarations in its own review and two layout bugs in static critique — a footer rule running ~3× past the name (`width: max-content`) and a 320px footer squeezing the tagline into a four-word column (`flex: 1 1 16rem`). The progress contract is reasserted as **whole-hero DOM equality** between a brand-new learner and one with `UNLOCK_THRESHOLD` recorded, plus a document-wide "exactly one five-line staff, two single-rule marks". RED observed as 14 failed / 20 passed (import resolution plus the old `Music Theory Practice` title); GREEN at 45/45 across the four touched suites. Delta fully accounted: 1395 → **1420**, 90 → 92 files, zero removed, zero regressions. **Caveat:** no browser exists in this environment — the critique was static geometry and cascade reasoning, so a human eye in `npm run dev` remains the acceptance check for the mark's proportions and the navbar baseline alignment. Tier: **medium**, 9 paths / 582 lines, `slice_budget_reached` → informational under `single-pr`. | medium, `slice_budget_reached` | 18456dd |

# Practice topics and a two-door landing page

## Objective

Split practice away from the lesson chain into a topic-based area gated by lesson
progress, and reduce the homepage to a short landing page that offers exactly two
options: **Lessons** and **Practice**.

## Problem

Practice is currently a single mode entered directly from one link on the homepage.
There is no notion of a practice *topic*, no way to gate practice content behind
lesson progress, and the homepage doubles as the 39-row lesson list — so practice
and lessons compete for space on the same page rather than reading as two
different places.

## Why

The user wants practice to become a first-class, topic-based area: topics unlock
as the learner progresses through the lessons, the topic that exists today is
available from the start, and topics built later appear according to which lessons
are unlocked. Both lessons and practice must remain reachable from the homepage,
which should be short.

**User decision (2026-10-18): the homepage is a short landing page offering
lessons and practice as two options.** (This was one of two candidates — the
other being a flat homepage with a practice section — and the landing-page
shape won because more topics are expected later and the homepage currently
carries 39 rows.)

## Constraints

- `UNLOCK_THRESHOLD` and the streak-of-10 mechanic are unchanged.
- Lesson URLs and ordinal resolution (`/lesson/1`…`/lesson/39`) are unchanged.
- The existing practice mode's behavior is unchanged — only its *entry* and
  framing change. Its no-leak aria contract (`Staff notation, treble clef, 1 note`)
  is load-bearing and must not name pitches.
- Follow the T9 design system: black as structural color, ≤2px border radius
  everywhere, Fraunces/Archivo type, muted status hues. The landing page and both
  hubs must not reintroduce Bootstrap-era defaults.
- Existing suite is **1356 tests / 86 files**. No regressions; the three
  invariant suites need zero edits.
- Delegated writers run the verification commands; the parent owns git and `odd/**`.

## Scope

### In
- A practice **topic registry** with per-topic unlock conditions.
- Unlock evaluation reusing the existing progress store.
- `/practice` as a topic hub listing topics with lock state.
- `/practice/:slug` running a single topic.
- `/lessons` hosting the lesson chain list.
- `/` reduced to a short two-option landing page.
- Tests covering unlock gating, routing, and the landing page.

### Out
- Building new practice gameplay/topics (the user will build those later; this
  change ships the *mechanism* and moves the existing mode in as the first topic).
- Changing the lesson chain, streak mechanic, or any lesson content.
- Changing the practice mode's round generation or aria contract.
- Publishing, PR creation, or remote operations.

## Task list

| # | Task | Route | Status |
| --- | --- | --- | --- |
| T1 | Practice topic registry + lesson-based unlock model | writer | **done** |
| T2 | Two-door landing page + move the lesson list to `/lessons` | writer | pending |
| T3 | `/practice` topic hub + `/practice/:slug` route | writer | **done** |

### Route rationale
- T1 is the data layer every later task reads; it lands first so the hub has a
  real unlock contract to render against.
- T2 changes the route table and the homepage; it must precede T3 so the practice
  hub is added to a settled route structure rather than churned twice.
- T3 wires the registry into a hub and runs a topic, so it closes the feature.

## Task details

### T1 — Topic registry and unlock model

New module (suggested `src/lib/practice/topics.ts`) defining:

```ts
interface PracticeTopic {
  slug: string;
  title: string;
  lede: string;
  /** "open" = available from the start; "lesson" = gated on that lesson's unlock. */
  unlock: { kind: "open" } | { kind: "lesson"; ordinal: number };
}
```

- **Unlock semantics: a lesson-gated topic unlocks when the lesson it names is
  unlocked**, reusing `isUnlocked(ordinal - 1, catalog)` — the same rule the
  chain already uses, so "based on the unlocked lessons" means exactly one
  definition of unlocked.
- **Locked topics are SHOWN with their lock state**, mirroring the existing
  `.lessons__lesson--locked` / "Locked" treatment on lessons (renamed from
  `.home__lesson--locked` when the list moved to `/lessons`; visuals and words
  identical), so practice and lessons teach the same visual language for gated
  content.
- The registry ships exactly one entry today: the existing note-guessing mode,
  `kind: "open"`. Adding a later topic must be a registry entry plus its round
  source — no structural change.
- Gating is exercised by **fixture topics in tests** (a topic gated on a lesson
  that is and is not unlocked), since no gated topic ships yet. An untested
  mechanism would rot.

### T2 — Two-door landing page and `/lessons`

- `/` becomes a **short landing page**: masthead plus two options, *Lessons* and
  *Practice*, each leading to its hub. No lesson rows on `/`.
- The lesson list currently rendered by `Home.tsx` moves to a `/lessons` page,
  preserving the section grouping, locked treatment, and per-lesson progress
  display exactly as they behave today.
- The landing page must be visually deliberate under the T9 system — it is the
  first screen now, so it carries the design. Apply the `frontend-design` skill;
  two options means two clear choices, not a card grid.
- `Home.test.tsx` asserts today that the practice link is never gated by lesson
  progress; that intent must survive as "neither landing option is gated".

### T3 — Practice hub and topic route

- `/practice` becomes the **topic hub**: one row per registry entry, showing
  title, lede, and lock state; open topics are links, locked topics are marked
  and not navigable (with an accessible, non-color-only lock cue).
- `/practice/:slug` renders the topic. Unknown slug → not-found branch consistent
  with how lessons handle an out-of-range ordinal.
- The existing note-guessing mode is reached as the open topic; its behavior and
  aria contract are unchanged.
- Home's *Practice* option links to `/practice`.

## Acceptance criteria

1. `/` shows a short landing page with exactly two options and no lesson list.
2. `/lessons` renders the full chain with locking and progress unchanged.
3. `/practice` lists topics with visible lock states; `/practice/:slug` runs one.
4. The existing note-guessing topic is available to a brand-new learner.
5. A lesson-gated topic is locked until its lesson unlocks, and unlocks with it.
6. Both *Lessons* and *Practice* are reachable from `/`.
7. Every route above is covered by tests; `npm test`, `npm run typecheck`, and
   `npm run build` all pass with no regression from 1356.
8. No aria label names a pitch, duration, or correct answer.

## Delivery

- Branch `feat/music-theory-minigames`, no remote, no PR requested →
  **`single-pr`**; existing size gates do not apply.
- One work-unit commit per task, Conventional Commit messages, no AI attribution.

## Forecast

~900 authored lines across three tasks (registry + tests, page split + moved
tests, hub + routing tests). Recorded as a forecast only; under `single-pr` the
400-line delivery heuristic has no chain to trigger.

## Progress

| Task | Evidence | Tier | Commit |
| --- | --- | --- | --- |
| T1 | Parent spot check: `npm test` → **1365 passed (87 files)**, typecheck clean, build succeeds. New `src/lib/practice/topics.ts` exports `PracticeTopic`, `isTopicUnlocked(topic, catalog, progress)`, and `practiceTopics`. **The unlock rule is not restated anywhere** — `isTopicUnlocked` routes a plain `ProgressState` through a read-only `StorageLike` adapter into the store's **own** `isUnlocked(ordinal - 1, catalog)`, so `UNLOCK_THRESHOLD` and the streak comparison live in exactly one place. A triangulation test asserts verdict-for-verdict equality with the store across `[0, 1, THRESHOLD-1, THRESHOLD, THRESHOLD+3]`, so the adapter cannot silently diverge. **Gating is proven with fixture topics**, not shipped topics: no lesson-gated topic exists yet, and leaving the mechanism unexercised would let it rot. The registry holds **exactly one** entry (`slug: "note-guessing"`, `unlock: { kind: "open" }`), with title and lede reusing today's Home copy so T3 mirrors existing wording. RED observed as an import-resolution failure before the module existed; GREEN at 9 tests. Tier: **medium**, `under_budget`, 3 paths / 344 lines → writer self-verification. | medium, `under_budget` | 5259104 |
| T2 | Parent spot check: `npm test` → **1373 passed (88 files)**, typecheck clean, build succeeds. `/` is now a short landing — masthead over **two doors in one shared 1px-ink frame** (a white Lessons key beside an ink-filled Practice key, reading as adjacent piano keys; stacked by default, side-by-side ≥40rem; the ink door flips its focus ring to white so keyboard focus survives on black). The lesson list moved to `/lessons` **verbatim**: same `groupBySection`, `isUnlocked`, `aria-disabled`/"Locked" markup, ordinal hrefs, and streak display, with BEM selectors renamed `home__*` → `lessons__*` and identical declarations. The landing deliberately keeps `main.home` because `LessonRouting.test.tsx` waits for `.home` at `/`. **Test migration, not deletion:** 9 `Home.test.tsx` assertions moved to `LessonsPage.test.tsx` with only the selector rename; 2 were removed with cause — "links the practice route…" lost its subject (the practice link no longer lives on the list page; restated on the landing as "exactly two anchors" and "the practice door is not a lesson row") and the old not-gated body was restated as the landing's two-door gating tests. Two intermediate REDs are worth keeping: this router's `MemoryRouter` takes a **history prop, not `url`** and renders nothing at a sub-path, and `HashRouter` renders **hash-prefixed hrefs** that would have weakened the migrated href assertions — solved with a static `MemoryHistory` parked at `/lessons`, so the original clean-href assertions survive verbatim. **Self-review cuts:** a lesson-count stat (would have imported the catalog for decoration), a "continue where you left off" hint (the landing must never read progress), 01/02 numbering (not a sequence), and "→" affordances. **Back-link repair (this task's own regression):** `GamePage`'s "All lessons" pointed at `/`, which after this split no longer lists lessons — repointed to `/lessons`; `PracticePage`'s link was labelled "All lessons" but practice is not a lesson, relabelled **"Back to home"** and left at `/`. Both were unguarded: no test pinned either href, which is exactly how the lie shipped. Added an **App-level** assertion for the clean href — under `HashRouter` it would have rendered `#/lessons` and the weaker assertion would have passed anyway. Tier: **medium**, 10 paths / 909 lines, `slice_budget_reached` → over the ~400 authored-line heuristic, **informational under `single-pr`** (no remote, no PR, no chain). Follow-up owned by T3: point `PracticePage`'s back link at the topic hub once `/practice/:slug` exists — closed by T3. | medium, `slice_budget_reached` | 18865e1 |
| T3 | Parent spot check: `npm test` → **1380 passed (89 files)**, typecheck clean, build succeeds. `/practice` is the hub; `/practice/:slug` runs one registry entry, with the **static route outranking the dynamic sibling** so neither swallows the other. **The lock cue carries no meaning in color alone:** a locked row renders a `div` with `aria-disabled="true"`, the title and lede still readable, and a literal `"Locked"` stamp — asserted as the row's own `textContent` so it cannot hide in a pseudo-element — and never an anchor or `href`. Three redundant non-color channels, matching the `.lessons__lesson--locked` discipline; ochre tag, dashed edge, and sunken surface only reinforce what the words already say. Open and locked rows share the same body structure, so nothing reflows when availability changes. **Test migration, not deletion:** `PracticePage`'s `.practice-shell` wait moved from `/practice` to `/practice/note-guessing` and survived, and its back-link assertions moved with it and were re-pinned — `href` `/` → `/practice`, text "Back to home" → "All topics", which is T2's recorded follow-up now closed (after the hub exists, "Back to home" would lie). Added a route-ranking guard asserting `.practice-hub` is null at the slug route, in both directions. **One unlock rule, two entry points:** `isTopicUnlockedWithStore` was extracted and `isTopicUnlocked` now delegates to it through the read-only storage adapter, so the threshold still has exactly one home. RED observed as an import-resolution failure plus `waitFor` timeouts and a `TypeError` on the not-yet-existing store helper; GREEN at 17 across the three touched files. The `topics` prop on the hub is a **documented test seam** — the shipped registry has one open entry, so a locked row is otherwise unrenderable — and the route passes nothing. **Caveat, not a check:** no screenshot was taken; hub visual QA is code- and test-backed only, so a human eye in `npm run dev` is still the acceptance check. Tier: **medium**, 8 paths / 549 lines, `slice_budget_reached` → informational under `single-pr`. | medium, `slice_budget_reached` | 79e3119 |

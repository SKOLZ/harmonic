# UI and gameplay overhaul

## Objective

Fix the rendering bugs and usability problems found in real testing of the
completed 39-lesson app, and raise the visual quality from "functional" to
deliberate — while keeping the clean aesthetic the Home page already has.

## Problem

The first release (32 commits, 1040 tests) is content-complete and mechanically
correct, but testing surfaced real defects and rough edges:

- Staff SVGs clip at the bottom and note stems detach from their noteheads.
- A wrong answer currently only retries that question, so a learner can grind
  past a lesson they do not understand.
- Answer controls still render as default browser buttons; only the game shell
  got styled in T14.
- Text-only questions are hard to visualize without a staff illustration.
- Lesson URLs carry the `/#` hash prefix, and the first lesson is `/lesson/10`
  because those are musictheory.net's own ids (verified: `/lessons/1` is a 404).
- There is no timed or endless mode, and no timer on lesson questions.

## Why

Content completeness is not the same as a usable product. The user tested the
real thing and reported concrete failures; each one below is a fix, not a
feature request dressed up as polish.

## Constraints

- Keep the Home page's clean aesthetic as the reference; improve everything
  else to match it. Do not redesign the information architecture.
- Preserve the no-answer-leak contract (T6c/T8c): prompt and illustration
  aria-labels are structural only — never pitch names, durations, or key
  identity.
- Receipt-driven development is **off** (user decision). Verification is
  writer-reported checks plus a parent spot check.
- Existing 1040 tests must not regress. Behaviour changes must update their
  own tests, not delete them.
- Musictheory.net lesson ids stay in the catalog as metadata; only the URL
  surface changes to ordinals.

## Scope

### In
1. Staff SVG rendering fixes (clipping, detached stems).
2. Streak-of-10 unlock mechanic: one wrong answer fails the run and restarts
   it with a fresh randomized set of 10.
3. Countdown timer on lesson questions; timeout counts as a failure.
4. Endless "guess the note" practice mode with a timer, outside the 39-lesson
   chain.
5. Companion staff illustrations on text rounds about concrete pitches
   (option (a) — conceptual rounds stay text-only).
6. Answer-control and whole-site visual overhaul.
7. Clean URLs: history routing, ordinal lesson paths `/lesson/1` … `/lesson/39`.

### Out
- Replacing VexFlow or the notation pipeline.
- Any change to the 39 lessons' music-theory content or their chain order.
- New lesson content beyond the illustration pass.

## Task list

| # | Task | Route | Status |
| --- | --- | --- | --- |
| T1 | Clean URLs: `HashRouter` → `Router`, ordinal lesson paths `/lesson/1`…`/lesson/39` | writer | **done** |
| T2 | Staff SVG fixes: bottom clipping and detached note stems | writer | pending |
| T3 | Streak-of-10 mechanic + countdown timer on lesson questions | writer | pending |
| T4 | Endless "guess the note" practice mode with timer | writer | pending |
| T5 | Guiding staff illustrations on concrete-pitch text rounds | writer | pending |
| T6 | Visual overhaul: answer controls + whole site | writer | pending |

### Route rationale
- T1 is independent and unblocks every later link surface.
- T2 fixes a rendering defect every later visual task depends on.
- T3 is the core mechanic change; T4 reuses its timer, so T3 lands first.
- T5 changes the round model, so it follows the mechanic work.
- T6 is last on purpose: it styles the components T3–T5 introduce, so styling
  them twice would be waste.

### Task details

**T1 — Clean URLs.** `App.tsx` currently mounts `HashRouter`. Switch to
history routing and expose ordinals: `/lesson/1` maps to `catalog[0]` (source
id 10). Keep source ids in the catalog; the URL surface is ordinal. Deep links
need an SPA fallback in production hosting — note it, do not configure a
server.

**T2 — Staff SVG.** `Staff.tsx` hardcodes `height: 120` with `STAVE_Y = 40`.
A note at or below the bottom staff line with a downward stem reaches ~115px
and clips; ledger lines and accidentals push further. Reproduce both defects
before changing anything — the detached-stem case has no confirmed cause yet
and must not be guessed at. Prefer computing required height over a magic
constant, and keep the fixed-size API for callers that pass explicit
dimensions.

**T3 — Streak and timer.** One wrong answer fails the whole run: reset
progress for that lesson to zero and regenerate a fresh randomized set of 10.
The countdown timer fails a run on expiry, the same as a wrong answer. Update
the round machine, the progress store, and `GameShell`; the acceptance
criterion "N+1 locked until N shows >= 10 correct rounds" becomes ">= 10
correct **in a row**".

**T4 — Endless mode.** A separate route outside the 39-lesson chain: guess the
note on a staff until you miss, against a countdown timer. Reuses `Staff`, the
keyboard prompt, and T3's timer. It must not touch lesson progress or the
unlock chain.

**T5 — Guiding illustrations.** Add an optional illustration slot to the round
model, rendered by `GameShell` as a non-interactive staff above the prompt.
The illustration shows the question's pitches, never the answer — a round like
"what is a perfect fifth above C" shows C, not C and G. Conceptual rounds stay
text-only. Pilot the design on one section before fanning out across the
remaining seven; the content pass is the largest single unit of work here and
a wrong model shape would be expensive to unwind.

**T6 — Visual overhaul.** Answer controls (`.choices__*`, keyboard) never got
styled; they are the worst offender. Then raise the rest of the site to match
the Home page. Keep it a polish pass, not an information-architecture
redesign.

## Acceptance criteria

- No staff SVG clips at the bottom for any lesson's round pool; no detached
  note stems.
- One wrong answer or one timer expiry ends the run, resets that lesson's
  progress, and starts a new randomized set of 10.
- Lesson URLs read `/lesson/1` … `/lesson/39` with no `/#` prefix.
- An endless note-guessing mode is reachable from Home and does not affect
  lesson progress.
- Text rounds about concrete pitches render a companion staff illustration;
  conceptual rounds do not.
- Answer controls and the wider site match the Home page's visual quality.
- `npm test`, `npm run typecheck`, and `npm run build` all pass, with no
  regression to the existing 1040 tests beyond intentional behaviour changes.

## Delivery

Strategy `single-pr`. No remote exists and no pull request has been requested,
so size gates do not apply. Work-unit commits on `feat/music-theory-minigames`.

## Forecast

Authored changed lines (additions + deletions, excluding generated files):
**~6,000**, dominated by T5's illustration pass across the lesson pool. This is
a planning estimate, not a cap.

## Progress

| Task | Evidence | Tier | Commit |
| --- | --- | --- | --- |
| T1 | `npm test` → 1048 passed (77 files); `npm run typecheck` exit 0; `npm run build` passed. Parent spot check re-ran `npm test` → 1048 and audited the waiver diff: hash strings and comments only. `@solidjs/router@1.0.0` exports `Router` as the history router; ordinals resolve strictly as `catalog[ordinal - 1]` with out-of-range falling to the existing not-found branch. **The writer stopped at a surface boundary before any edit**: `src/games/gamePageWiring.test.tsx` hard-pinned GamePage to source-id hash URLs and would necessarily fail under ordinal resolution. The parent granted a scoped waiver for that one file (four hash strings, two comments) after confirming the intent of the `src/games/**` freeze is lesson *content*, not URL-surface tests. Progress and the registry stay keyed by source id; only the URL surface changed. Production deep-linking now needs an SPA fallback, noted and deliberately not configured. A stray `pnpm-lock.yaml` appeared in an npm project and was removed as environment noise. Tier: **medium**, `under_budget`, 6 paths / 187 lines → writer self-verification. | _backfill at T2_ |

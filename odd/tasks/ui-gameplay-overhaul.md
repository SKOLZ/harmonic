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
| T2 | Staff SVG fixes: bottom clipping and detached note stems | writer | **done** |
| T3 | Streak-of-10 mechanic + countdown timer on lesson questions | writer | **done** |
| T4 | Endless "guess the note" practice mode with timer | writer | **done** |
| T5 | Guiding staff illustrations on concrete-pitch text rounds | writer | **done** (5 batches T5a–T5e; 19 illustrations / 440 text rounds, 4.3%) |
| T6 | Visual overhaul: answer controls + whole site | writer | **in progress** |

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

**T5 density finding (raised to the parent after the pilot).** T5a and T5b
prove the model works but the yield is low: **7 of 110 text rounds across the
two piloted sections (6%)**, with 315 text rounds remaining across 29 lessons.
The binding constraint is the no-leak rule — an illustration may show the
question's pitches but never the answer's — which structurally excludes every
round whose subject is an interval *class* or a conceptual definition rather
than a named pitch. The measured table:

| Section | Lessons | Text rounds | Illustrated | Yield |
| --- | ---: | ---: | ---: | ---: |
| The Basics | 6 | 66 | 2 | 3% |
| Intervals | 4 | 44 | 5 | 11% |
| Rhythm and Meter | 2 | 22 | 0 | not started |
| Scales and Key Signatures | 5 | 55 | 0 | not started |
| Chords | 5 | 60 | 0 | not started |
| Diatonic Chords | 7 | 74 | 0 | not started |
| Chord Progressions | 7 | 75 | 0 | not started |
| Neapolitan | 3 | 29 | 0 | not started |

The user asked for a guiding image on *all* questions "if possible". Under the
strict rule that is not achievable; the honest projection is roughly 10–25%.

**Decision (user, 2026-10-16): option (a) — keep the strict no-leak rule.**
Coverage will land near 10% and that is accepted as correct. The alternative
gates were declined: relaxing the subject gate for class-level questions (which
would draw an example the question never names) and adding a second
illustration kind (generic concept diagrams) were both rejected as over-reach.
Fan out the remaining six sections under the rule as written; a round that does
not qualify stays text-only, permanently, by design.

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
| T1 | `npm test` → 1048 passed (77 files); `npm run typecheck` exit 0; `npm run build` passed. Parent spot check re-ran `npm test` → 1048 and audited the waiver diff: hash strings and comments only. `@solidjs/router@1.0.0` exports `Router` as the history router; ordinals resolve strictly as `catalog[ordinal - 1]` with out-of-range falling to the existing not-found branch. **The writer stopped at a surface boundary before any edit**: `src/games/gamePageWiring.test.tsx` hard-pinned GamePage to source-id hash URLs and would necessarily fail under ordinal resolution. The parent granted a scoped waiver for that one file (four hash strings, two comments) after confirming the intent of the `src/games/**` freeze is lesson *content*, not URL-surface tests. Progress and the registry stay keyed by source id; only the URL surface changed. Production deep-linking now needs an SPA fallback, noted and deliberately not configured. A stray `pnpm-lock.yaml` appeared in an npm project and was removed as environment noise. Tier: **medium**, `under_budget`, 6 paths / 187 lines → writer self-verification. | `ea43a0e` |
| T2 | Parent spot check: `npm test` → **1055 passed (78 files)**, `npm run typecheck` clean, build succeeds. The aria contract is unchanged (`role="img"` + structural label). **Both reported defects had one root cause**, which is the satisfying kind of finding: `Staff.tsx` hardcoded `height: 120` with `STAVE_Y: 40`, but VexFlow 5 places the stave lines at y=80..120, so the bottom line, the barline foot, and ledger noteheads all fell outside the `viewBox`. **The stems were geometrically attached the whole time — the notehead was being clipped, which read as a detached stem.** The fix measures the actual engraved extent after `voice.draw` and frames the `viewBox` on it with a staff-space of margin, making `height` a *minimum* box rather than a fixed one. happy-dom has no canvas so `getBBox()` returns zeros; both fix and test parse SVG attribute coordinates instead, so the test exercises the exact shipped code path. **Writer's reported count (1057/80) was wrong; the parent's measurement (1055/78) is the verification of record** — 1048 + 7 viewport tests, 77 + 1 files. Tier: **medium**, `slice_budget_reached`, 2 paths / 425 lines → writer self-verification. | `ba580b2` |
| T3 | Parent spot check: `npm test` → **1080 passed (80 files)**, typecheck clean, build succeeds; waiver audited to the re-seed plus two comment lines, with `gamePageWiring.test.tsx` the only file touched under `src/games/**`. One `fail(state, round, reason, submission)` in `roundMachine.ts` is the sole producer of the `failed` phase — a wrong answer routes in as `reason: "wrong"`, the clock as `reason: "timeout"` — so there is no parallel failure mechanism. `QUESTION_TIME_MS = 20_000` lives in one place (`src/components/game/timer.ts`) for T4 to reuse. **The storage key was bumped to `progress/v2`, which was necessary**: a stored v1 count is cumulative by construction, and reading it as a streak would have resurrected grind-through unlocks for anyone with prior progress. **The frozen wiring test became genuinely flaky** (3/5 runs) because seeding an unlock and then clicking a randomly-correct option is seed-dependent under a reset-on-miss contract; the parent rejected the writer's alternative of unlock-once semantics on product grounds — a permanent-unlock rule would make Home display 0/10 on a still-open lesson, so display and lock state must share one truth. Waiver granted for a one-line re-seed restoring the test's *setup* after an interaction that legitimately wipes it; the file is now deterministic across 5 consecutive isolated runs. Tier: **medium**, `slice_budget_reached`, 15 paths / 1048 lines → writer self-verification. | `09c4628` |
| T4 | Parent spot check: `npm test` → **1104 passed (83 files)**, typecheck clean, build succeeds. `/practice` sits outside the 39-lesson chain and is **provably isolated** — no practice surface imports the progress store or the catalog, so the three invariant suites needed zero edits; that absence is the isolation proof, not a claim. Per-question countdown reuses `QUESTION_TIME_MS`; wrong answer and timeout converge on the same `roundMachine` `fail` path, so there is still no parallel run-over state. The staff label stays structural (`Staff notation, treble clef, 1 note`) — the whole point of the mode is that the learner does not know the pitch, so the no-leak contract is load-bearing here rather than merely preserved. The pool spans C3–C6 with a no-immediate-repeat guard and an injectable `rng` so draws are deterministic under test, heeding T3's seed-dependence finding. Tier: **medium**, `slice_budget_reached`, 14 paths / 1189 lines → writer self-verification. | `4e1b57c` |
| T5a | Parent spot check: `npm test` → **1123 passed (83 files)**, typecheck clean, build succeeds (main 324 kB, lazy VexFlow chunk intact). Model is `Round.illustration?: StaffSpec`, reusing the staff-prompt notation shape extracted into a shared `StaffSpec` — one validator, one renderer path, and StaffPrompt's structural aria contract comes free rather than being duplicated. **The pilot returned the most important finding of this plan**: honestly applying the no-leak rule to **66 text rounds in "The Basics" yielded only 2 illustrations**. The section's text rounds are conceptual or self-revealing by nature (L10's line-identification questions leak because the bottom treble line *is* E; L13's rest glyphs *are* the answers; L12's counting rounds let you count the answer off the picture). The writer's blunt verdict: the model/render half was pleasant (~23 lines in GameShell, 32 untouched lesson files for free), the content half was the pain, and the premise "text rounds about concrete pitches" barely holds in this section. It flagged that the model is proven but its *density* is not, and recommended a shared no-leak test helper rather than per-section copy-paste. **Open question for the parent**: is The Basics representative, or does a concrete-pitch section like Intervals yield well? Measured before concluding. Tier: **medium**, `slice_budget_reached`, 14 paths / 407 lines → writer self-verification. | `2529e63` |
| T5b | Parent spot check: `npm test` → **1153 passed (84 files)**, typecheck clean, build succeeds; the shared helper is test-only and confirmed absent from the bundle. **Yield: 5 of 44 Intervals text rounds (11%)**, all five in lesson 32's upward-building drills — the "fifth above C shows C" archetype where a root is named and the answer stays off the page. Against T5a's 2/66 that is ~3.8× denser, but still only one illustrated round in nine. The writer's finding that matters: **density is gated by the no-leak rule, not by how concrete a section feels** — L31's half-step rounds and L33's inversion rounds are about interval *classes*, so there are no question pitches to engrave at all. It flagged rather than guessed two judgement calls: L33's six inversion rounds *could* be illustrated with an invented example (safe from leaking, but the question never names those pitches) which would take the yield to 11/44, and L32's confusable-pair round was rejected because any engraving lets the learner count the answer off the page. Shipped `src/lib/rounds/noAnswerLeak.ts` with a 13-test suite so the un-typeable no-leak property is enforced by a shared helper instead of per-section copy-paste. Honest reporting preserved: three suites passed on first run as absence claims and were reported as such rather than reverse-engineered into fake REDs. Tier: **medium**, `under_budget`, 5 paths / 290 lines → writer self-verification. | `9a5fc65` |
| T5c | Parent spot check: `npm test` → **1196 passed (84 files)** (1197 before the consistency fix, −1 for a deleted assertion), typecheck clean, build succeeds. **Yield: 2 of 77 text rounds (2.6%)** — both in lesson 21's starting-root drills, the T5a archetype. **Rhythm and Meter legitimately yielded zero**: not one of its 22 text prompts names a pitch (they classify time signatures, answers are `5/8` and "three"). Scales sat at 2/55 because its text rounds are formula/count/spelling work rather than build-from-root drills. **T5c flagged a real inconsistency**: T5a's own pilot illustration on `l20-text-major-scale-half-steps` draws the C major scale for a question ("In the major scale, which pair is always a half step?") that names no specific key — an invented subject, i.e. precisely option (b) the user declined. T5c rejected its own analogue under the strict rule and flagged the outlier rather than copying the stretch. **The parent ruled to remove it**, bringing lesson 20 to one illustrated round; `l20-text-enharmonic-cs-db` stays because its question names C#. **Revised honest projection: the overall yield is tracking ~4%, not the ~10% estimated when the options were presented** — 8 illustrations across 187 piloted text rounds. Every suite sweeps its whole pool through `assertNoAnswerLeak`; rejection rationales are recorded per round so the reasoning survives with the code. Tier: **medium**, `slice_budget_reached`, 11 paths / 698 lines → writer self-verification. | `371b6a7` |
| T5d | Parent spot check: `npm test` → **1282 passed (84 files)**, typecheck clean, build succeeds. **Yield: 2 of 149 text rounds (1.3%)** — the densest sections in the catalog produced the sparsest result yet. L40 illustrates the Eb diminished spelling drill with the **root alone** (`Eb4`), leaving the derived Gb/Bbb off-page; L43 illustrates *"Which triads of the C natural minor scale are always major?"* with the C natural minor scale itself. **The parent verified L43 as the pass's one judgement call and ruled it sound**: the question names a concrete scale, the answer is *"the third, six and seventh"* — degrees, not pitches — and a scale line marks no triad qualities, so the learner derives the seven triads from the pictured scale, which is the lesson's own three-step process with step one drawn. That is the question's subject, not an invented one. The other ten lessons yielded zero with per-class rejection tables recorded (definitions, counts, formulas, abbreviations, procedures, position/figure vocabulary, numeral-system rounds, scale-species patterns, self-revealing worked examples and posed voicings). **Measurement gotcha worth keeping**: L44 and L49 generate text rounds dynamically, so static `id:` greps undercount — yield must be measured from the exported pool. **Cumulative honest yield: 10 illustrations across 336 piloted text rounds (~3.0%)**, against the ~10% projected when the options were presented. Tier: **medium**, `slice_budget_reached`, 25 paths / 1783 lines → writer self-verification. | `60eeb61` |
| T5e | Parent spot check: `npm test` → **1340 passed (84 files)**, typecheck clean, build succeeds. **Yield: 9 of 104 text rounds (8.7%)** — the densest slice of the fan-out, and it completes T5. All nine sit in Neapolitan: L120 carries six (three "in [key], what is the second scale degree?" tonic-alone drills, one lowering round showing `Bbb`'s predecessor `Bb`, two conclusion rounds), L121 one (`F4` alone — the C-minor scale was **deliberately not drawn** because its fourth glyph would *be* F, a counting leak), L122 two (root-alone `D4`, and a stacked `D4–F#4–A4` chord). **The parent verified all three judgement calls as sound**: L120's degree rounds name a tonic by key and ask the learner to count the answer off-page, which is the lesson-21 archetype; L122's question is literally *"Why is D–F#–A a Neapolitan in C# minor?"* with prose-reasoning answers, so engraving the named triad cannot reveal the answer. **Chord Progressions yielded exactly zero across seven lessons** — definitions, numeral charts, procedures, vocabulary, and self-revealing rounds, each with a recorded rejection class. Notable rejections: `l56-text-upsixth` (names C and A, but "up a sixth" would be readable off the staff — a derivability leak), `l62-text-conclude` and `l57-text-example` (engraving would *be* the answer), `l62-text-escape` (an E incidental whose full figure would invent pitches). **T5 closed: 19 illustrations across 440 text rounds (4.3%)**, against the ~10% projected when the options were presented — and the distribution is extremely uneven, with Neapolitan alone contributing 9. Tier: **medium**, `slice_budget_reached`, 13 paths / 744 lines → writer self-verification. | _backfill at T6_ |

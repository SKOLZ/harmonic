# Feature: music-theory-minigames

## Objective

A SolidJS single-page app that turns the 39 lessons of musictheory.net into playable
minigames, arranged in one sequential unlock chain: completing 10 rounds of game N
unlocks game N+1.

## Problem & why

The user is learning music theory from https://www.musictheory.net/lessons and wants
active practice, not just reading. Reading produces recognition memory; retrieval
practice produces usable knowledge. Each lesson therefore becomes a game that forces
retrieval and gives immediate corrective feedback.

## Scope

### In

- 39 minigames, one per lesson, in the site's index order (chain order below).
- Sequential unlock gate: game N+1 requires >= 10 completed rounds of game N.
- Progress persistence across reloads (localStorage).
- Rendered notation (staff, clefs, key signatures, notes, rests, chords, intervals).
- Audio playback of notes, intervals, scales and chords via Web Audio synthesis.
- Piano keyboard visual where it aids the lesson.
- Home screen showing all 39 games grouped by section, with lock state and progress.
- Explanatory feedback on every round: correct answer plus the rule it demonstrates.

### Out

- Backend, accounts, sync, analytics.
- Licensed sheet music. Analysis lessons (52, 62, 122) use reconstructed chord
  passages rather than engraved original scores.
- Ear-training-only drills as a separate mode.
- Mobile app packaging.

## Constraints

- Stack: Vite + SolidJS + TypeScript + Vitest. No component library.
- Notation: VexFlow (renders to SVG). Verified API: `Renderer`, `Stave`,
  `StaveNote`, `Voice`, `Formatter`.
- Audio: Web Audio API oscillators. No audio file assets.
- Persistence: `localStorage` only.
- Branch: work happens on `feat/music-theory-minigames` (branch before first commit;
  repo currently has zero commits on `main`).
- Delivery strategy: `single-pr`. Rationale: no git remote is configured and no PR
  has been requested, so PR slicing is not yet meaningful. Revisit before any push.
- Receipt-driven development: **off (global)**, disabled by the user during T1 when the
  per-candidate consent envelope proved unpresentable in this runtime. No review
  lifecycle runs from here on; verification is writer-reported checks plus a parent
  spot check, with an independent verifier added when a tier assessment comes back
  high or unassessable. T1 itself was never reviewed — outcome `disabled/unmanaged`.

## Key product decisions

1. **Round = one answered question.** A round counts toward the 10 when answered
   correctly. A wrong answer reveals the correct answer plus its explanation and does
   not advance the counter; the learner can retry without limit. This keeps the gate
   meaningful (guessing cannot unlock the chain) while never blocking progress.
2. **Chain order = musictheory.net index order.** Verified by scraping the live
   index, not guessed.
3. **Game mechanics are shared, content is data.** Roughly four prompt renderers and
   four answer controls are combined per lesson, so 39 games cost 39 config modules,
   not 39 bespoke UIs.

## Architecture

```
src/
  lib/theory/       pure functions: pitch, scales, intervals, chords, keys, roman
                    numerals. No DOM, no audio. Unit-tested heavily.
  lib/audio/        Web Audio synth: playNote, playChord, playScale, playInterval
  lib/notation/     pure theory → VexFlow key/accidental/duration mapping, no DOM
  lib/keyboard/     pure piano-key geometry + enharmonic note matching, no DOM
  lib/progress/     progress store + unlock rules, localStorage-backed, unit-tested
  components/
    notation/       VexFlow-backed Staff component (props: clef, keySig, content)
    keyboard/       piano keyboard component
    game/           GameShell: round loop, scoring, feedback, unlock progress
    prompts/        prompt renderers: staff | keyboard | audio | text | diagram
    answers/        answer controls: choices | notePick | textInput | sequence
  games/            one module per lesson (39), each = metadata + round generator
  pages/            Home (lesson map), GamePage
```

Games are registered in a single ordered catalog. The unlock rule derives from list
position, so adding or reordering a game never requires touching gate logic.

## Chain order (39 games)

| # | id | title | section |
| --- | --- | --- | --- |
| 1 | 10 | The Staff, Clefs, and Ledger Lines | The Basics |
| 2 | 11 | Note Duration | The Basics |
| 3 | 12 | Measures and Time Signature | The Basics |
| 4 | 13 | Rest Duration | The Basics |
| 5 | 14 | Dots and Ties | The Basics |
| 6 | 20 | Steps and Accidentals | The Basics |
| 7 | 15 | Simple and Compound Meter | Rhythm and Meter |
| 8 | 16 | Odd Meter | Rhythm and Meter |
| 9 | 21 | The Major Scale | Scales and Key Signatures |
| 10 | 22 | The Minor Scales | Scales and Key Signatures |
| 11 | 23 | Scale Degrees | Scales and Key Signatures |
| 12 | 24 | Key Signatures | Scales and Key Signatures |
| 13 | 25 | Key Signature Calculation | Scales and Key Signatures |
| 14 | 30 | Generic Intervals | Intervals |
| 15 | 31 | Specific Intervals | Intervals |
| 16 | 32 | Writing Intervals | Intervals |
| 17 | 33 | Interval Inversion | Intervals |
| 18 | 40 | Introduction to Chords | Chords |
| 19 | 42 | Triad Inversion | Chords |
| 20 | 45 | Seventh Chords | Chords |
| 21 | 48 | More Seventh Chords | Chords |
| 22 | 47 | Seventh Chord Inversion | Chords |
| 23 | 43 | Diatonic Triads | Diatonic Chords |
| 24 | 44 | Roman Numeral Analysis: Triads | Diatonic Chords |
| 25 | 46 | Diatonic Seventh Chords | Diatonic Chords |
| 26 | 49 | Roman Numeral Analysis: Seventh Chords | Diatonic Chords |
| 27 | 50 | Composing with Minor Scales | Diatonic Chords |
| 28 | 51 | Voicing Chords | Diatonic Chords |
| 29 | 52 | Analysis: O Canada | Diatonic Chords |
| 30 | 53 | Nonharmonic Tones | Chord Progressions |
| 31 | 55 | Phrases and Cadences | Chord Progressions |
| 32 | 56 | Circle Progressions | Chord Progressions |
| 33 | 57 | Common Chord Progressions | Chord Progressions |
| 34 | 60 | Triads in First Inversion | Chord Progressions |
| 35 | 61 | Triads in Second Inversion | Chord Progressions |
| 36 | 62 | Analysis: Auld Lang Syne | Chord Progressions |
| 37 | 120 | Building Neapolitan Chords | Neapolitan Chords |
| 38 | 121 | Using Neapolitan Chords | Neapolitan Chords |
| 39 | 122 | Analysis: Moonlight Sonata | Neapolitan Chords |

## Tasks

Route column: `inline` = done in the parent session; `writer` = delegated to one
bounded writer. Trigger evidence records why delegation was or was not used.

| ID | Task | Route | Trigger evidence | Checks | Status |
| --- | --- | --- | --- | --- | --- |
| T1 | Scaffold Vite+Solid+TS+Vitest, app shell, progress store, unlock rule | writer | 2+ non-trivial files | `npm test`, `npm run build` | **done** `af6f827` |
| T2 | Theory core A: pitch/spelling, scales, generic+specific intervals | writer | 3 non-trivial files, pure-logic TDD | `npm test` | **done** |
| T3 | Theory core B: chords, keys/signatures, roman numerals | writer | 3 non-trivial files, pure-logic TDD | `npm test` | **done** |
| T4 | Audio synth (Web Audio) | writer | 2 non-trivial files, pure-logic TDD | `npm test` | **done** |
| T4b | VexFlow Staff component | writer | 2 non-trivial files, DOM render tests viable | `npm test`, `npm run build` | **done** |
| T5 | Round model + pure round machine (types, validate, transitions) | writer | 3 pure-logic files, test-first | `npm test` | **done** |
| T5b | GameShell + `text` prompt + `choices` answer + GamePage wiring | writer | 4 non-trivial files, UI | `npm test`, `npm run build` | **done** |
| T5c | Extend `roundMachine` to judge answers by value for all four kinds | writer | 3 pure-logic files, test-first | `npm test` | **done** |
| T5d | Piano keyboard component | writer | 2 non-trivial files, DOM tests viable | `npm test`, `npm run build` | **done** |
| T5e | Remaining prompt renderers (`staff`, `audio`, `keyboard`) + prompt registry | writer | 3 renderers, display-only | `npm test`, `npm run build` | **done** |
| T5f | Remaining answer controls (`textInput`, `notePick`, `sequence`) + unified submit in `GameShell` | writer | 3 controls + GameShell plumbing | `npm test`, `npm run build` | **done** |
| T6 | Games for The Basics (10, 11, 12, 13, 14, 20) | writer | 6 lesson modules | `npm test`, `npm run build` | pending |
| T7 | Games for Rhythm and Meter (15, 16) | writer | 2 lesson modules | `npm test`, `npm run build` | pending |
| T8 | Games for Scales and Key Signatures (21, 22, 23, 24, 25) | writer | 5 lesson modules | `npm test`, `npm run build` | pending |
| T9 | Games for Intervals (30, 31, 32, 33) | writer | 4 lesson modules | `npm test`, `npm run build` | pending |
| T10 | Games for Chords (40, 42, 45, 48, 47) | writer | 5 lesson modules | `npm test`, `npm run build` | pending |
| T11 | Games for Diatonic Chords (43, 44, 46, 49, 50, 51, 52) | writer | 7 lesson modules | `npm test`, `npm run build` | pending |
| T12 | Games for Chord Progressions (53, 55, 56, 57, 60, 61, 62) | writer | 7 lesson modules | `npm test`, `npm run build` | pending |
| T13 | Games for Neapolitan Chords (120, 121, 122) | writer | 3 lesson modules | `npm test`, `npm run build` | pending |
| T14 | Home lesson map, progress UI, visual polish pass | writer | 2+ non-trivial files | `npm test`, `npm run build` | pending |

Each task closes with one Conventional Commit on `feat/music-theory-minigames`;
the commit hash is recorded under Progress.

### Test-first policy

Default test-first applies where a runnable deterministic test exists with a clear
expected outcome: T1 (unlock rule, store round-trip), T2 and T3 (every pure theory
function), T5 (round loop state machine), and each game's round generator
(validity: answer is unique, distractors differ from answer, generator terminates).
Observe RED before implementation, then GREEN.

UI rendering (VexFlow output, layout, animations) has no meaningful deterministic RED;
those tasks use structural readback plus `npm run build` instead, and the exception is
recorded per task.

`src/lib/audio/synth.ts` is a recorded exception: happy-dom implements no Web Audio
API, and mocking AudioContext would test the mock rather than the browser. Its pure
preamble (`frequency.ts`, `sequence.ts`) is fully test-driven; the glue is verified by
typecheck and build only, and click-freedom, gesture-resume and `stopAll` still need a
manual browser check before the games rely on them.

## Acceptance criteria

- All 39 games exist and are reachable in chain order only.
- Game N+1 stays locked until game N shows >= 10 completed (correct) rounds.
- Progress survives a page reload.
- Every round gives immediate feedback with the correct answer and a short rule.
- `npm test`, `npm run typecheck`, and `npm run build` all pass.

## Forecast

Authored changed lines (additions + deletions, excluding generated files):
**~4,000**. Exceeds the 400-line planning heuristic; delivery strategy `single-pr`
recorded above. This is advisory, not a cap.

**Running count (revised):** the initial ~4,000 forecast was too low. T2 through T5d
alone total ~5,700 assessed lines, and nine game-module tasks plus the Home map are
still ahead. Delivery strategy stays `single-pr` — there is no remote and no PR has
been requested, so size gates do not apply yet. Revisit the strategy before any push.

## Progress

Commit hashes are backfilled one task late: the edit that names a commit cannot live
inside that same commit. The Engram mirror carries the hash immediately.

| Task | Evidence | Commit |
| --- | --- | --- |
| T1 | `npm test` → 12 passed (2 files); `npm run typecheck` → exit 0; `npm run build` → 33 modules, 174 ms. Parent spot check re-ran `npm test` → 12 passed. RED observed first (5 failures on unlock rule + corrupt JSON). | `af6f827` |
| T2 | `npm test` → 67 passed (6 files); `npm run typecheck` → exit 0; `npm run build` → 33 modules, 209 ms. Parent spot check re-ran `npm test` → 67 passed. RED observed first (4 suites failed on unresolved imports); a real octave-arithmetic bug in `semitoneIndex` surfaced during GREEN and was fixed. Tier: **medium**, `slice_budget_reached`, 9 paths / 1160 lines → writer self-verification. | `d8ef5ad` |
| T3 | `npm test` → 130 passed (9 files); `npm run typecheck` → exit 0; `npm run build` → 33 modules, 154 ms. Parent spot check re-ran `npm test` → 130 passed. RED observed first (4 failures on unresolved imports). **Spec correction:** the plan's hard-coded diatonic rows for harmonic minor (degree 3) and melodic minor (degrees 3, 5, 7) were wrong; a follow-up fix replaced the rows with `buildScale`-derived stacking, so triad/seventh agreement is now structural and the textbook table is the test oracle. Agreement asserted for 4 scale types × 7 roots. Tier: **medium**, `slice_budget_reached`, 7 paths / 1104 lines → writer self-verification. | `daaf39e` |
| T4 | `npm test` → 156 passed (11 files); `npm run typecheck` → exit 0; `npm run build` → 33 modules, 206 ms. Parent spot check re-ran `npm test` → 156 passed. RED observed first (2 suites failed on unresolved imports). Tier: **medium**, `slice_budget_reached`, 5 paths / 501 lines → writer self-verification. | `98a090d` |
| T4b | `npm test` → 179 passed (13 files); `npm run typecheck` → exit 0; `npm run build` → 33 modules, 184 ms. Parent spot check re-ran `npm test` → 179 passed. RED observed first (Staff DOM suite: 4/7 failed on `addAccidental is not a function`, default size, and clef geometry; spec suite re-run against a throwing stub: 14/16 failed). DOM render tests **are** viable under happy-dom, so no render exception was needed. Two load-bearing API fixes forced by RED: VexFlow 5 removed `StaveNote.addAccidental` in favour of `addModifier(new Accidental(code), i)`, and Solid's `mergeProps` resolves last-source-first so defaults must precede props. Tier: **medium**, `slice_budget_reached`, 5 paths / 509 lines → writer self-verification. | `b9fbd6a` |
| T5 | `npm test` → 209 passed (15 files); `npm run typecheck` → exit 0; `npm run build` → 33 modules, 208 ms. Parent spot check re-ran `npm test` → 209 passed. RED observed first (both new suites failed on unresolved imports, matching the T2/T3 pattern). Counter integrity is structural: `correctCount` has a single mutation site guarded by a correctness ternary, `advance` throws after a wrong answer, and `submit`/`retry`/`advance` are phase-guarded so double counting cannot happen. Tier: **medium**, `slice_budget_reached`, 6 paths / 646 lines → writer self-verification. | `092b8fd` |
| T5b | `npm test` → 227 passed (20 files); `npm run typecheck` → exit 0; `npm run build` → 40 modules, 216 ms. Parent spot check re-ran `npm test` → 227 passed. RED observed first (5 new suites failed on unresolved imports). `recordCorrect` has exactly one call site, guarded by the `submit` transition's `wasCorrect`, so persistence tracks machine-reported correctness rather than UI state. Tier: **medium**, `slice_budget_reached`, 11 paths / 685 lines → writer self-verification. | `130177a` |
| T5c | `npm test` → 236 passed (20 files); `npm run typecheck` → exit 0; `npm run build` → 244 ms. **RED not observed by the parent** — the writer's report was cut short by a cancellation, so the parent verified the result independently instead: re-ran all three commands, confirmed `selected` is fully replaced by `submission`, confirmed `submit` judges all four kinds (trim+case-insensitive text, unordered set for `notePick`, ordered for `sequence`, kind-mismatch throws), and confirmed the integrity tests survived unchanged (`wrong leaves correctCount unchanged`, `advance throws after wrong`, `retry keeps counter`, phase guards). Tier: **medium**, `under_budget`, 5 paths / 327 lines → writer self-verification. | `8982303` |
| T5d | `npm test` → 274 passed (22 files); `npm run typecheck` → exit 0; `npm run build` → 40 modules, 207 ms. Parent spot check re-ran `npm test` → 274 passed. RED observed first (both new suites failed on unresolved imports, plus a real black-key naming bug the first draft exposed). Enharmonic highlights match **by pitch**, not string equality, so `Gb4` lights the `F#4` key and `B flat 4` works as a prompt. Tier: **medium**, `slice_budget_reached`, 4 paths / 783 lines → writer self-verification. | `a13d31e` |
| T5e | `npm test` → 294 passed (25 files); `npm run typecheck` → exit 0; `npm run build` → 154 modules, 288 ms. Parent spot check re-ran `npm test` → 294 passed. RED observed first (4 suites failed on unresolved imports). Audio is reachable only from the Play button's `onClick` — no effect or mount path touches the synth, which the tests assert. **Contract fix:** `types.ts` documented `staff.notes` as VexFlow keys (`"c/4"`), but nothing in the repo parses that form; the comment now correctly specifies scientific names, matching every other note list in a round. Tier: **medium**, `slice_budget_reached`, 10 paths / 647 lines → writer self-verification. | `6c617fa` |
| T5f | `npm test` → 320 passed (28 files); `npm run typecheck` → exit 0; `npm run build` → 157 modules, 350 ms. Parent spot check re-ran `npm test` → 320 passed. RED observed first (6 suites failed: 3 new controls unresolved, `ChoicesAnswer` on the old `onSelect` API, `GameShell` throwing per unregistered kind). `GameShell` now resolves every control from `answerRegistry` and funnels a **single** `onSubmit` into the machine — no per-kind submit branches. `roundMachine.ts` and its tests are byte-for-byte untouched, so the integrity guarantees carried through unchanged. Notable: the sequence tray shuffles, because `correctOrder` is the only pool data and rendering it verbatim would leak the answer. Tier: **medium**, `slice_budget_reached`, 12 paths / 1305 lines → writer self-verification. | _backfill at T6_ |

T1 deviations accepted: HashRouter (deep links work on static hosts without rewrites);
locked `/lesson/:id` renders a "Lesson locked" screen rather than redirecting; no
`tsconfig.node.json` (single tsconfig suffices).

TDD exceptions recorded: scaffolding, router wiring and layout have no meaningful
deterministic RED — only store, unlock rule and catalog seed were test-driven.

## Next step

**The framework is complete.** T6 starts the actual games: the six "The Basics"
lesson modules (10, 11, 12, 13, 14, 20), each a metadata block plus a round
generator producing `Round[]` from the shared prompt and answer kinds, replacing
`GamePage`'s demo rounds and registering into `src/games/catalog.ts`.

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
| T6 | Lesson module contract + registry + GamePage wiring + modules 10, 11 | writer | contract + 2 modules establishes the pattern | `npm test`, `npm run build` | **done** |
| T6b | Remaining The Basics modules (12, 13, 14, 20) | writer | 4 lesson modules on an established pattern | `npm test`, `npm run build` | **done** |
| T6c | Fix `StaffPrompt` aria-label leaking the answer to screen readers | writer | 1 focused fix, defect found in T6b | `npm test` | **done** |
| T7 | Games for Rhythm and Meter (15, 16) | writer | 2 lesson modules | `npm test`, `npm run build` | **done** |
| T8 | Games for Scales and Key Signatures — scale construction (21, 22, 23) | writer | 3 lesson modules | `npm test`, `npm run build` | **done** |
| T8b | Games for Scales and Key Signatures — key signatures (24, 25) + fix `catalog.test.ts` chain-state assertions | writer | 2 lesson modules + 1 test-hygiene fix | `npm test`, `npm run build` | **done** |
| T8c | Fix `StaffPrompt` leaking the key signature + rename misnamed `relativeMinorOffsetFromMajor` | writer | 2 small fixes, defects found in T8b | `npm test` | **done** |
| T8b | Games for Scales and Key Signatures — key signatures (24, 25) | writer | 2 lesson modules | `npm test`, `npm run build` | pending |
| T9 | Games for Intervals (30, 31, 32, 33) | writer | 4 lesson modules | `npm test`, `npm run build` | **done** |
| T9b | Fix `reduceNumber` simple/compound boundary (octave inverts to a 15th instead of a unison) | writer | 1 theory-core fix, defect found in T9 | `npm test` | **done** |
| T10 | Games for Chords — triads (40, 42) | writer | 2 lesson modules | `npm test`, `npm run build` | **done** |
| T10b | Games for Chords — sevenths (45, 48, 47) | writer | 3 lesson modules | `npm test`, `npm run build` | **done** |
| T10c | Render simultaneous notes as stacked chords in `Staff` | writer | 1 notation fix, defect found in T10 | `npm test`, `npm run build` | **done** |
| T11 | Games for Diatonic Chords — triads and roman numerals (43, 44, 46, 49) | writer | 4 lesson modules | `npm test`, `npm run build` | **done** |
| T11b | Games for Diatonic Chords — minor, voicing, analysis (50, 51, 52) | writer | 3 lesson modules | `npm test`, `npm run build` | **done** |
| T12 | Games for Chord Progressions — progression vocabulary (53, 55, 56, 57) | writer | 4 lesson modules | `npm test`, `npm run build` | **done** |
| T12b | Games for Chord Progressions — inversion in progression and analysis (60, 61, 62) | writer | 3 lesson modules | `npm test`, `npm run build` | **done** |
| T13 | Games for Neapolitan Chords (120, 121, 122) | writer | 3 lesson modules | `npm test`, `npm run build` | pending |
| T14 | Home lesson map, progress UI, visual polish pass | writer | 2+ non-trivial files | `npm test`, `npm run build` | pending |
| T15 | Code-split VexFlow so notation is loaded only when a staff prompt renders | writer | 1 build/perf change | `npm test`, `npm run build` | pending |

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
| T5f | `npm test` → 320 passed (28 files); `npm run typecheck` → exit 0; `npm run build` → 157 modules, 350 ms. Parent spot check re-ran `npm test` → 320 passed. RED observed first (6 suites failed: 3 new controls unresolved, `ChoicesAnswer` on the old `onSelect` API, `GameShell` throwing per unregistered kind). `GameShell` now resolves every control from `answerRegistry` and funnels a **single** `onSubmit` into the machine — no per-kind submit branches. `roundMachine.ts` and its tests are byte-for-byte untouched, so the integrity guarantees carried through unchanged. Notable: the sequence tray shuffles, because `correctOrder` is the only pool data and rendering it verbatim would leak the answer. Tier: **medium**, `slice_budget_reached`, 12 paths / 1305 lines → writer self-verification. | `245ab17` |
| T6 | `npm test` → 358 passed (35 files); `npm run typecheck` → exit 0; `npm run build` → 161 modules, 356 ms. Parent spot check re-ran `npm test` → 358 passed. RED observed first (7 suites: 6 unresolved imports plus a genuine behavioural RED where a duration-carrying `Staff` rendered identical geometry). **Content was verified against musictheory.net's own slide text** (read from each lesson's `lessonN.js`), not from the plan's summary. Two structural findings: `GamePage` needed a **keyed** `Show` because Solid prop getters re-evaluate on every access, so generation had to sit in a keyed callback; and an 11-vs-11 pool split makes a 12-round draw structurally guaranteed to mix `staff` and `text` prompts for every seed. Tier: **medium**, `slice_budget_reached`, 17 paths / 1114 lines → writer self-verification. | `cc4c951` |
| T6b | `npm test` → 413 passed (39 files); `npm run typecheck` → exit 0; `npm run build` → 165 modules, 316 ms. Parent spot check re-ran `npm test` → 413 passed. RED observed first (4 suites failed on unresolved imports). Content re-verified against musictheory.net, which **corrected the plan in two places**: the bottom-number rule is better stated as "the note value the measure is counted in" (6/8 beats are dotted quarters), and common time / double bar lines / double dots / tie-vs-slur / diatonic-vs-chromatic steps appear in **none** of the site's 39 lesson texts — kept as standard theory and flagged in the module docstrings. Two structural findings: VexFlow writes a dotted rest as `qdr` (`qrd` parses but silently drops the dot), and rest/dot engraving had never been exercised anywhere in the repo, so lessons 13 and 14 carry their own engraving smoke tests. Tier: **medium**, `slice_budget_reached`, 9 paths / 1240 lines → writer self-verification. | `67ddab7` |
| T6c | `npm test` → 419 passed (39 files); `npm run typecheck` → exit 0; `npm run build` → 344 ms. Parent spot check re-ran `npm test` → 419 passed. RED observed first (6 failures across 2 suites, each asserting the new label and the absence of the answer from it). Both prompts now describe **structure, never content**: `Staff notation, treble clef, key of Eb, 3 notes` and `Piano keyboard, C4 to C6, 2 keys highlighted`. Durations are deliberately excluded too — lessons 13 and 14 ask about duration, so announcing it would leak that instead. The clean solution avoided editing `Keyboard` entirely: `role="img"` on the prompt wrapper makes it an ARIA leaf whose children are presentational, so `Keyboard`'s per-key `, highlighted` labels stay in the DOM (styling and `NotePickAnswer` untouched) but leave the accessibility tree. `NotePickAnswer` renders `Keyboard` with no `role="img"` ancestor, so a learner's own selections remain announced. Highlight **counts** must come from `keyboardLayout` + `matchesHighlight`, not `highlight.length` — a pitch-class entry like `"C"` matches every octave. Tier: **medium**, `under_budget`, 4 paths / 144 lines → writer self-verification. | `1e66799` |
| T7 | `npm test` → 447 passed (41 files); `npm run typecheck` → exit 0; `npm run build` → 167 modules, 344 ms. Parent spot check re-ran `npm test` → 447 passed. RED observed first (2 suites, unresolved imports; baseline intact). **The writer corrected my brief on both lesson titles** — the chain-order table in this document already had them right ("Simple and Compound Meter", "Odd Meter"), but my dispatch prose invented "Beat and Time Signature" and "Meter: Duple, Triple, Quadruple", which match nothing on the site. More consequentially, the content I attributed to lesson 16 is actually **lesson 15's** entire slide set; live lesson 16 is Odd Meter (5/8, 7/8, 8/8, 10/8, 11/8 mixing simple and compound beats, and the 8/8-vs-4/4 distinction). Built from the scraped site text, not my brief. Two structural findings: registering a module is impossible without a catalog entry (`requireLessonEntry` throws at import and the registry contract tests assert registered ⊆ catalog), so `catalog.ts` grew — and the exact-array seed assertion in `catalog.test.ts` had to be corrected, since it encoded a fixed six-entry state that the catalog's own documented append path breaks. Tier: **medium**, `slice_budget_reached`, 7 paths / 763 lines → writer self-verification. | `be01830` |
| T8 | `npm test` → 492 passed (44 files); `npm run typecheck` → exit 0; `npm run build` → 170 modules, 353 ms. Parent spot check re-ran `npm test` → 492 passed. RED observed first (3 unresolved-import suites plus the `catalog.test.ts` seed assertion). **The T2/T3 theory core proved its worth**: the writer hand-derived F major as two flats and `buildScale` caught it in a GREEN-phase failure (`- "Eb3", + "E3"`), cross-confirmed by the `key.test.ts` oracle expecting `["Bb"]`. Hand-derived scale spellings are not trustworthy even for common keys — which is precisely why T2/T3 built them from the step pattern instead of a lookup table. Tier: **medium**, `slice_budget_reached`, 9 paths / 1288 lines → writer self-verification. | `cc4209e` |
| T8b | `npm test` → 527 passed (46 files); `npm run typecheck` → exit 0; `npm run build` → 383 ms. Parent spot check re-ran `npm test` → 527 passed. **The `catalog.test.ts` invariant fix is proven**: the writer ran the new suite against the then-current 11-entry catalog, appended 24/25, and re-ran the same file with **zero edits** — the recurring false RED is gone for the remaining six batches. Invariants now: unique ids, contiguous orders from 1, section-major consecutive runs, every registered id present in the catalog. **Lesson 25's content was nothing like my brief** — the site teaches a *numeric* method (seven memorised counts, ±7 for same-letter sharp/flat, −3 for parallel minor), not the leading-tone / fourth-below shortcut; every round is built from the site's method. Lesson 24's slide text also never mentions relative minors, so that clause of my reference was not site content. The writer worked around a *second* key-signature leak by drawing accidentals as written notes rather than using the `keySignature` field — see T8c. Tier: **medium**, `slice_budget_reached`, 7 paths / 931 lines → writer self-verification. | `bb763e2` |
| T8c | `npm test` → 529 passed (46 files); `npm run typecheck` → exit 0; `npm run build` → 366 ms. Parent spot check re-ran `npm test` → 529 passed. RED observed first for both halves. `StaffPrompt` now announces accidental **count** (`Staff notation, bass clef, 3 accidentals, 2 notes`), omitted entirely at zero — extending the T6c non-leak contract to key signatures and making the `keySignature` field safe for key-identification lessons (the T8b accidental-as-notes workaround is no longer needed, but was left in place as instructed). Rename proven complete by a post-edit grep returning zero matches across `src/`. **The two `relativeMinorOffsetFromMajor` mentions the writer flagged in this document are accurate, not stale** — both name the constant as it *was*, in the task title and the defect description. Tier: **medium**, `under_budget`, 4 paths / 79 lines → writer self-verification. | `9f68cde` |
| T9 | `npm test` → 591 passed (50 files); `npm run typecheck` → exit 0; `npm run build` → 374 ms. Parent spot check re-ran `npm test` → 591 passed. RED observed first (4 unresolved-import suites, baseline intact). **The T8b invariant fix held** — four catalog entries appended with zero test edits. Core reused throughout; no interval arithmetic hand-derived. Content corrections: lesson 30 says *first/prime* through *eighth* and never uses the words unison or octave; lesson 33 never states `9 − n` in slide text, teaching inversion only by six worked examples. Extraction note: lesson payloads are **JS object literals**, not JSON, so they need a sandbox eval. **Two divergences surfaced** — `intervalName(8, 12)` is `"Perfect Octave"`, not `"Perfect 8th"` (caught a draft answer), and `invertInterval(8, "perfect")` returns **15**, where the site and textbook give a unison (see T9b). My brief's 11-staff/11-text wording made the writer skip `keyboard` prompts as non-compliant; the split is about the structural guarantee and keyboard rounds do not break it — future briefs will say so. Tier: **medium**, `slice_budget_reached`, 10 paths / 1540 lines → writer self-verification. | `06998e5` |
| T9b | `npm test` → 592 passed (50 files); `npm run typecheck` → exit 0; `npm run build` → 176 modules, 379 ms. Parent spot check re-ran `npm test` → 592 passed. RED observed first (`expected { number: 15 } to deeply equal { number: 1 }`). **Fixed narrowly, after verifying all three `reduceNumber` callers** — divisor 7 is *correct* for semitone and quality classification (it folds the octave to base 1, which is what `PERFECT_SEMITONES` maps), and only wrong for inversion's `9 − n`, which spans the simple range 1–8. A separate `simpleNumberForInversion` isolates exactly that difference; `reduceNumber` and the semitone tables are untouched. One knock-on found: `assertQualityFitsClass` had never been called with `base = 8`, so it rejected `"perfect"` on class 8 despite its docstring promising 1/4/5/8 — now checks a proper class set. Verified against the site's *own definition* of inversion ("move the lowest note an octave higher"), not the `9 − n` formula the site never states: for C→C′, moving C up lands on C′ itself, so a perfect octave inverts to a perfect unison. Tier: **medium**, `under_budget`, 4 paths / 67 lines → writer self-verification. | `f62cc4a` |
| T10 | `npm test` → 639 passed (53 files); `npm run typecheck` → exit 0; `npm run build` → 331 ms. Parent spot check re-ran `npm test` → 639 passed. RED observed first (2 unresolved-import suites plus a missing `sampleStratifiedRounds`). **The writer correctly rejected a false claim in my brief**: I said adding keyboard rounds "does not weaken" the 11-staff/11-text pigeonhole guarantee — it does, since a pool with any keyboard rounds permits a legal 12-draw of 11 staff + 1 keyboard and no text. It fixed the real problem with `sampleStratifiedRounds` (one round per required kind first, then fill, then reshuffle; deterministic per seed), backed by a counterexample test proving plain `sampleRounds` breaks the guarantee. Lesson content corrections: the site never says a triad is "built by stacking thirds" — it says triads "are created with a root, third, and fifth" — and 8 of its 12 worked spellings are minor/augmented/diminished, not the major my brief implied. Voicings are derived by looping the site's own inversion rule over `buildTriad`, never hand-typed. **One notation defect surfaced** (see T10c): `Staff` draws each note as a separate sequential `StaveNote`, so a triad reads as three consecutive notes rather than the stacked chord the site shows. Tier: **medium**, `slice_budget_reached`, 8 paths / 1436 lines → writer self-verification. | `150982d` |
| T10b | `npm test` → 696 passed (56 files); `npm run typecheck` → exit 0; `npm run build` → 181 modules, 392 ms. Parent spot check re-ran `npm test` → 696 passed. RED observed first (3 unresolved-import suites, baseline intact). **No core divergence at all** — all 24 site-worked spellings (15 in L45, 9 in L48) equal `buildSeventh` output, and `identifyInversion` labels every L47 chord round correctly. Content corrections: lesson 45 defines a seventh chord as "the combination of a triad and an interval of a seventh" and teaches **five** commonly used types across 15 worked spellings; lesson 48 teaches exactly **three** further types (minor-major, augmented-major, augmented), which my "quality families" phrasing left ambiguous. Convention translation only: the site writes double sharps as `Cx`, this repo uses `C##`. `catalog.test.ts` absorbed the three-entry append with zero edits. The >500 kB chunk advisory is confirmed **pre-existing and VexFlow-dominated** (bundle 1,329 kB JS / 742 kB gzip) — queued as T15. Tier: **medium**, `slice_budget_reached`, 8 paths / 2008 lines → writer self-verification. | `d5bf4e6` |
| T10c | `npm test` → 707 passed (56 files); `npm run typecheck` → exit 0; `npm run build` → 181 modules, 352 ms. Parent spot check re-ran `npm test` → 707 passed. Two-stage RED observed. **The design decision was mine, not the writer's**: `notes: string[]` was genuinely ambiguous — lesson 12's `["C5","D5","E5","F5"]` is a *measure* (sequential, correct) and lesson 40's `triad("C4")` is a *chord* (simultaneous, wrong) — same shape, opposite meanings. Resolved with an explicit `simultaneous?: boolean` on the staff prompt, defaulting to sequential so no existing lesson changed. Stacked accidentals attach per tone via `addModifier(new Accidental(code), i)`, which VexFlow 5 honours through `getKeyProps()[index]`. The writer **stopped at the surface boundary** rather than reaching into `StaffPrompt.tsx` to forward the new prop, returned an interaction request with three options, and waited — the correct behaviour. Approved the minimal forwarding line only; the prompt-level test would have duplicated the end-to-end guard already in `lesson40.test.ts`. Sequential prompts proven unchanged by a test that was green before and after. Tier: **medium**, `under_budget`, 16 paths / 239 lines → writer self-verification. | `0fe71e6` |
| T11 | **The writer task was cancelled before it reported**, so its handoff — including RED evidence — is unavailable. It had already finished: `npm test` → 790 passed (60 files), `npm run typecheck` → exit 0, `npm run build` clean. The parent re-ran `npm test` → 790 passed and verified the work independently rather than trusting the green count: registry and catalog entries carry the correct non-id-sorted chain order (43, 44, 46, 49); all four modules route every chord prompt through a shared helper that sets `simultaneous: true`, confirmed by parsing each staff-prompt object literal (1/1 in each module). Content was re-verified by the parent against freshly scraped lesson 43 and 46 slide text — the quality patterns match the site exactly (major, minor, minor, major, major, minor, diminished for triads; maj7, m7, m7, maj7, dominant7, m7, half-dim7 for sevenths) and the rules quote the site verbatim. This is the first task whose parent verification substituted for a writer report. Tier: **medium**, `slice_budget_reached`, 10 paths / 3135 lines → writer self-verification. | `5b40ff0` |
| T11b | `npm test` → 840 passed (63 files); `npm run typecheck` → exit 0; `npm run build` → 188 modules, 339 ms. Parent spot check re-ran `npm test` → 840 passed. RED observed first (3 unresolved-import suites) plus two genuine behavioural REDs during GREEN: `identifyInversion` returns string labels, not the numeric index `inversionFigure` needs, and JS's negative modulo made a degree-of-scale lookup return `-1`. **The writer found an error on the site itself**: lesson 50's final slide claims the merged natural+harmonic minor has "nine different diatonic triads", but that contradicts its own earlier slides — the true count is **10** (4 shared, 3 natural-only, 3 harmonic-only), re-derived independently with the core. It correctly declined to encode any count round and shipped only the site's correct qualitative facts. My reference was also wrong: lesson 50 does **not** cover melodic minor. **Lesson 52 design decision (parent):** the per-chord analysis is expressible in the existing `Round` contract and *is* the learning content — name the numeral and inversion of a chord in E♭. The multi-measure score the site presents it in is presentation, not content, so a new multi-measure notation prompt kind is disproportionate; ship the faithful per-chord subset. Tier: **medium**, `slice_budget_reached`, 8 paths / 1417 lines → writer self-verification. | `309ccbc` |
| T12 | `npm test` → 904 passed (67 files); `npm run typecheck` → exit 0; `npm run build` → 375 ms. Parent spot check re-ran `npm test` → 904 passed. RED observed first (4 unresolved-import suites, baseline intact) plus one intermediate GREEN failure where the writer's paraphrase of a cadence rule diverged from the site's literal wording — fixed by copying the site text per rule. **A second site inconsistency**: lesson 55 says "(or i if minor)" for one cadence but "(or i)" for two others; rather than normalising the phrasing away, it copied each rule exactly as written. `chordInversion` proved to be pure rotation with no octave adjustment, so engraving an inversion needs an explicit lift via `midiNumber` until strictly ascending — lesson 56's `inversionVoicing` does this. The writer also flagged that `ChoicesAnswer` never shuffles, so `correctIndex` must vary across rounds to avoid a learnable position bias; the parent audited all 28 lesson modules and found no lesson with a constant answer position (the two apparent literals were TypeScript type annotations). Tier: **medium**, `slice_budget_reached`, 11 paths / 2543 lines → writer self-verification. | `16d7dee` |
| T12b | `npm test` → 959 passed (70 files); `npm run typecheck` → exit 0; `npm run build` passed. Parent spot check re-ran `npm test` → 959 passed. RED observed first (3 unresolved-import suites, baseline intact). Two of the writer's own test oracles were wrong, not the generators, and it root-caused both rather than bending the modules. **A third site looseness**: lesson 60's "Only the first inversion contains no augmented nor diminished intervals" is false as written — the first inversion of B diminished still spans an augmented fourth. It is true **above the bass**, which is exactly how the site's own four labels distribute, so the rules ship the bass-precise reading and flag the phrasing rather than encoding it. Two site typos (`preceeds`, `can be analyze`) reported but not encoded. Core gotcha found: `romanNumeralSeventh` already embeds the seventh's suffix, so composing it with `inversionFigure("seventh", 0)` silently yields `V77` — lesson 62 now uses the numeral alone and throws if a seventh ever arrives inverted. **Progress state verified**: 36 of 39 lessons now in both catalog and registry, missing exactly 120/121/122. Tier: **medium**, `slice_budget_reached`, 8 paths / 1973 lines → writer self-verification. | _backfill at T13_ |
| T6c | **Defect found in T6b:** `StaffPrompt`'s `aria-label` announces the underlying note pitch, so a "name this note" prompt literally reads the answer aloud to a screen-reader user. Pre-existing since T5e, and every new lesson module makes it worse — hence this task sits ahead of the remaining modules rather than in the T14 polish pass. | _pending_ | _pending_ |

T1 deviations accepted: HashRouter (deep links work on static hosts without rewrites);
locked `/lesson/:id` renders a "Lesson locked" screen rather than redirecting; no
`tsconfig.node.json` (single tsconfig suffices).

TDD exceptions recorded: scaffolding, router wiring and layout have no meaningful
deterministic RED — only store, unlock rule and catalog seed were test-driven.

## Next step

T13: the three Neapolitan lessons — 120 (Building Neapolitan Chords), 121
(Using Neapolitan Chords), 122. This is the **last lesson batch**; after it all
39 games exist and the remaining work is T14 (Home lesson map, progress UI,
polish) and T15 (code-split VexFlow).

The Neapolitan chord has not been exercised by any lesson module yet, so expect
the same first-exercise-of-a-core-area dynamics T8, T9b and T11 had. If a lesson
contradicts `src/lib/theory`, check which side is actually wrong before assuming
either.

As always: scrape musictheory.net, report every correction, and re-derive rather
than encoding any value the site states that its own content contradicts.

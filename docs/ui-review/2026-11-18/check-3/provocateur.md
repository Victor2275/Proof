# Provocateur, checking round 3

## Wilder alternatives
| For proposal | Owner's objection | Alternative | Label |
|---|---|---|---|
| P-03 and P-24 (final, adopted) | None open. Both print only what the method states, so every placeholder-timed recipe, 199 of 203, gets nothing. The owner may find that most of the library shows no planning at all. | **Clock times on every step, once a "Ready by" time is set.** In the method, each step prints its own clock time ("11:20 Start", "12:35 Into the oven") in muted ink beside the number. Baking mode shows the same time on its step. It prints nothing when any step time is a guess. This is the idea the coordinator carries to the owner. | RULE-BREAK: R11 — the times are computed from step durations, and the rule bars drawing any reading the data can't fully support; it buys a baker the whole day laid out in order from one input, where P-24 gives only the start time. |
| P-04 (final, adopted) | None open. A recipe with no title still blocks saving, so the editor keeps one error state. | **Save an untitled recipe as "Untitled recipe".** No error state remains in the editor, and the draft system already covers a slip. The title field stays the first thing on screen. | WITHIN RULES |

## Too timid
- **P-18 (backup first in Settings) is still the plan's timidest.** It moves a row on a screen a device-only baker visits once. The bake log is the one thing they cannot recreate (R1, R2). The braver version prints "not backed up" in the Bakes summary line ("17 bakes · 6 recipes · not backed up") in plain ink, and "Export" opens from it. P-18 is correct and should ship, but it is the weaker half of the answer to F-22.
- **P-16 is a list of six string edits plus one unit test.** The test covers plurals and back labels only. A sweep test that renders every screen from `e2e/review/screens.ts` and fails on the same slips would catch the next ones too. The risk is the next release re-introducing F-16.
- **P-17 adds a label line to answer a bar that doesn't count steps.** The bar stays at one segment per part. One segment per step, grouped by a gap at each part, answers F-15 with no extra line and leaves K-3's empty middle intact. The Keeper accepted the label version, so this is the owner's call.
- **P-13 caps the chapter list but still puts "All recipes" about 1.6 screens down.** A small "All recipes ↓" ribbon beside the resume card's own ribbon reaches the grid in one tap, with the order K-6 protects unchanged.
- **P-25 and P-23 together leave "imported" and "needs tidying" unsearchable.** The Librarian's LB-1 asked for it, the ledger has no finding for it, and nothing in the plan answers it. It is the one real gap left, and the owner may want it as a follow-up run.

No new items enter the plan from this round. Every alternative above is for the owner to take or leave after ratification.

# Mid-Bake Baker, checking round 2

## Verdicts
| Proposal | Verdict | My findings it addresses | What it breaks for me | Amendment that would earn my ADOPT | Score 1-5 |
|---|---|---|---|---|---|
| P-01 Start cooking on the first phone screen | ADOPT | MB-1 fixed (the keys sit right after "Last time", and the "Ingredients ↓ · Method ↓" row puts the first ingredient one tap away); MB-10 not | Nothing now. K-1 is intact because "Last time" is the first block after the meta line. One thing to check when it ships: with P-07's extra "Changed:" line the keys may slip toward the tab bar, so measure at 375x812. | | 5 |
| P-02 Index card (RULE-BREAK: R7) | REJECT | MB-1 partly | Unchanged from v1. It redoes the whole first screen for a problem P-01 now solves, and costs K-17 and K-10. | None. P-01 does the job. | 2 |
| P-03 Honest "ready in" | ADOPT | none | Nothing. The trailing item must hold on one wrapped line at 375 px, as written. | | 3 |
| P-04 Empty rows vanish on save | ADOPT | none | Nothing for the baking screens. | | 2 |
| P-05 Phone editor opens on the recipe | ADOPT | none | Nothing, with one placement note: the recipe page's "Unsaved draft · Open" row goes below the keys and the jump row, never between "Last time" and "Start cooking". | | 2 |
| P-06 Log sheet leads with the writing | ADOPT | none directly (it serves my scenario 3, logging) | Nothing. "What happened" first, Stars always visible, "Mark as my best" one tap inside the disclosure, a 44 px "Dictate", and one paprika key. | | 5 |
| P-07 What you wrote for next time follows you | ADOPT | MB-6 fixed, MB-10 fixed | Nothing. "Next time" keeps its line inside the three-line clamp, and "Changed:" is one line and only when it exists. | | 5 |
| P-08 Kitchen measures | ADOPT | none | Nothing. The ½× and 2× control is a `Segmented` control, never paprika. | | 3 |
| P-09 "Best" says which best | ADOPT | MB-5 fixed | Nothing. The summary and the stamp both stay. | | 4 |
| P-10 By recipe numbers every bake | ADOPT | MB-7 fixed, MB-8 fixed | Nothing. The strip stays (K-5), and "Bake n" sits in the date slot so tile height doesn't change. | | 5 |
| P-11 Vertical ladder (RULE-BREAK: R20) | AMEND | MB-7 fixed, MB-8 partly, MB-9 partly | Unchanged. It still replaces the strip on a phone (K-5) and adds a primitive. | Withdraw it in favour of P-22, which is my amendment built. If it stays on the table, it must reuse the Journal row. | 3 |
| P-12 The cupboard says what it saved you | ADOPT | none | Nothing for the bake log. | | 1 |
| P-13 Sort and filter by the search | ADOPT | none | Nothing, as long as the resume card and "Recently baked" stay first (K-6), as written. | | 2 |
| P-14 A shared recipe has somewhere to go next | ADOPT | none | Nothing on my recipe page. | | 1 |
| P-15 Sign-up receipt | ADOPT | none | Nothing. | | 1 |
| P-16 Labels that say where and how many | ADOPT | none directly. "Resume baking" while a bake runs helps me return to a bake in progress. | Nothing. | | 2 |
| P-17 Baking mode says where you are | ADOPT | MB-3 partly, MB-4 partly (F-15) | Nothing. It adds one label line, keeps the middle empty and keeps Next the same size and place. | | 4 |
| P-18 Backup first in Settings | ADOPT | none directly. It protects the device-only log. | Nothing. | | 2 |
| P-19 One search on every destination (RULE-BREAK: R21) | REJECT | none | Unchanged. On Bakes the title and summary go and "+ Log bake" is at risk, which makes the bake log harder to reach. P-23 does the job without that. | None. Drop it for P-23. | 1 |
| P-20 Dial (RULE-BREAK: R19) | REJECT | none | Unchanged. A large bespoke control on the page where I need the keys and "Last time" above the fold. P-24 does the job. | None. Drop it for P-24. | 1 |
| P-21 Docked "Start cooking" from the first frame | AMEND | MB-1 partly | The dock sits over the bottom of the screen, which is exactly where the end of the "Last time" note ("Next: cooler water.") lands at 375. It hides the line I most need. It doesn't help "Log a bake" or the first ingredient. As an alternative to P-01 items 1 to 3, the hero, headnote and chip still push "Last time" to the fold. | Treat it as an extra, not a replacement. It shows only after the in-page keys have scrolled away (as today), or it must be clear of the "Last time" note. P-01's reorder stays. | 2 |
| P-22 One recipe's bakes, read down the page | ADOPT | MB-7 fixed, MB-9 fixed, MB-8 partly (the sparkline is labelled under P-10) | Nothing. It adds to the strip (K-5) and reuses the Journal row with P-07's quote block. Make sure Compare is reachable from the narrowed Journal, so "attempt 2 vs attempt 5" stays four taps or fewer. | | 4 |
| P-23 A search key on Bakes and Shop; one search per desktop page | ADOPT | none (it touches my Bakes screen) | Nothing. The title, "+ Log bake" and the summary line stay where they are. At 375 the header gets a fourth item, so "+ Log bake" must keep its full label and its 44 px height. | | 2 |
| P-24 "Ready by…?" as one line | ADOPT | none directly (it touches my recipe page) | Nothing, provided the line stays below the keys and the jump row. It replaces a collapsed disclosure and does not add height above them. | | 2 |
| P-25 Search understands when | ADOPT | none directly. It helps me find an old bake by when I made it. | Nothing. | | 2 |

## What changed my mind
- **P-01, AMEND → ADOPT.** v2 applied the amendment I asked for. "Ingredients ↓ · Method ↓" now sits directly under the keys, so the first ingredient is one tap away. "Last time" is the first block after the meta line, and "Log a bake" stays beside "Start cooking".
- **P-07, ADOPT → ADOPT (score unchanged, reason changed).** My amendment was applied: "Next time" always keeps its line inside the three-line clamp, and "Changed:" is one line only when it exists. The proposal now ships with P-01 and its growth is checked at 375 px.
- **P-11, AMEND → AMEND.** P-11 is unchanged, so my verdict holds. My amendment was built as P-22 and I ADOPT that one. P-11 itself still replaces the strip.
- **P-02, P-19, P-20: REJECT held.** Unchanged proposals. P-01, P-23 and P-24 now answer what they were for.
- **No other verdict changed.** I did not move any verdict because I was asked again.

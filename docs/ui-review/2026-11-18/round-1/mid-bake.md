# Mid-Bake Baker, round 1

## Headline
The app is half-right for the baker with wet hands. The recipe page puts "Last time · Oct 17" and the "Next: cooler water." line first, which is what I most wanted. Baking mode has big serif text and a huge Next key I can hit with a thumb. But before I start, the first ingredient is a full scroll away. Once I'm baking, I can't see the step's ingredients, and the fold shows no timer and no way to log. I found no "Log bake" or "Finish" control in baking mode, so I need live checks to settle that. Bakes keeps the log as the main character, but it makes me hunt for attempt 2 and attempt 5 of the same recipe. Its "best" claims also contradict each other. All `facts.json` files I read for `mid-bake__` screens are clean: no unmocked endpoints, console errors, broken images or overflow. (I read the recipe and baking-mode facts and the pairs I cite. I did not open every desktop or dark facts file.)

## Scenario answers

**1. Before you start.** Partly.
- At 375px, before scrolling, I can see "Last time · Oct 17", three stars and “Bulk ran warm (26C) — over-proofed slightly, crumb open but flat. Next: cooler water.” (`mid-bake__regular-recipe__light__w375__fold.png`). So I can see what I changed and what I said to do next time.
- The note's last line ("cooler water.”") sits right against the tab bar, so it just clears the fold.
- I can't see the first ingredient. The photo takes about 35% of the screen, then the title, headnote, meta line, the "Private · this device" chip and the note.
- "Start cooking" and "Log a bake" are also below the fold, behind the tab bar.
- The ingredients start after the fold (`mid-bake__regular-recipe__light__w375__page.png`: "Ingredients / Serves 12 / 1 cup graham cracker crumbs").
- At 1280 the ingredients and the "Last time" panel sit below the fold too. The left column shows the photo, title and chip, and the right column shows Method (`mid-bake__regular-recipe__light__w1280__fold.png`).

**2. Baking mode.**
- **Readability.** The step reads well from 60 cm. "Preheat oven to 325F (160C)." is large serif, about 28 px, in ink on paper, and equally clear in dark (`mid-bake__regular-baking-mode__light__w375__fold.png`, `mid-bake__regular-baking-mode__dark__w375__fold.png`).
- **Next.** It is a large paprika key, about 175x75 px, at bottom-right where a thumb rests. It's good. The "Note" key at bottom-left is smaller (about 60x80 px) but still reachable.
- **Step position.** "1 of 11" is small grey text at top-right, hard to read at arm's length. The progress bar has only two long segments (one lit, one unlit), so it doesn't show where I am in the method.
- **Timer and ingredients.** Neither is visible. The step text (`mid-bake__regular-baking-mode__light__w375__text.txt`) shows only "Preheat oven…", "Note" and "Next →". Step 1 has no time, so a missing timer may be fine. I need to see a timed step (step 10, 60 min).
- **Empty space.** About 60% of the screen is empty between the step and the Next key. The step's ingredients and timer could live there.

**3. Logging.**
- From baking mode, the only on-screen controls are ×, "⋯", "Note" and "Next →". I can't see a log control.
- From the recipe, "Log a bake" sits beside "Start cooking", below the fold and below the whole header (`mid-bake__regular-recipe__light__w375__page.png`). Bakes also has "+ Log bake" in its header (`mid-bake__regular-bakes-journal__light__w375__fold.png`).
- The count of presses at the end of a bake is unknown until I can run it. See the live checks.

**4. Progress.**
- **Compare attempts.** Yes, but with effort.
  - Bakes › By recipe groups the cheesecake bakes in one row, with a sparkline and "5 bakes". The row scrolls sideways, so bakes 3 to 5 are off-screen (`mid-bake__regular-bakes-by-recipe__light__w375__fold.png`).
  - There is also a "Compare" button beside the toggle, but I can't tell from a still what it does.
  - In Journal, attempts 2 and 5 of the cheesecake are separated by other recipes (Oct 17, Oct 5, Sep 23, Sep 11, Aug 30).
- **Progression visible.** Only as the sparkline, which is a flat line with a dot and no labels. Here it is flat because every cheesecake bake is 3 stars, so it's true but says little. It doesn't show what changed between attempts.
- **Gallery and Analytics.** The old pages are gone. The one summary line "17 bakes · 6 recipes · best: Braised stuffed cabbage" is short and nothing is padded. But it contradicts the Best stamp (see MB-5).

**5. 5 a.m.**
- The dark theme is warm charcoal, with cream text at good contrast and a salmon Next key with dark text (`mid-bake__regular-baking-mode__dark__w375__fold.png`).
- What's hard to read:
  - "1 of 11" and the "· now" label are dim grey on charcoal.
  - The unlit half of the progress bar is a very faint brown on charcoal.
  - The Note key's hairline outline is faint.
- On the recipe in dark, the meta line "Serves 12 · Prep 20 min · Cook 1 h 15 · Medium" is mid-grey and small, and the inactive tab-bar labels are dim (`mid-bake__regular-recipe__dark__w375__fold.png`).

## Findings
| ID | Screen | Finding | Evidence | Severity | Suggested change |
|---|---|---|---|---|---|
| MB-1 | Recipe, 375 | Before I start I can't see the first ingredient, "Start cooking" or "Log a bake". The photo, a two-line title, the headnote, the meta line and the "Private · this device" chip fill the first screen. The "Last time" note ends right at the tab bar. | `mid-bake__regular-recipe__light__w375__fold.png`; ingredients begin only after the scroll in `mid-bake__regular-recipe__light__w375__page.png` | major | Cut the photo's height on the phone, or move it below the note. Put "Last time" first and let "Start cooking" and the first ingredients show above the tab bar. |
| MB-2 | Baking mode | There is no visible way to log the bake from baking mode. The fold offers only ×, "⋯", "Note" and "Next →". "Log a bake" lives on the recipe page below the fold, and on Bakes. At the end of the bake I'd have to leave baking mode and go looking. | `mid-bake__regular-baking-mode__light__w375__fold.png`, `mid-bake__regular-baking-mode__light__w375__text.txt` | major | The last step's Next key becomes "Log this bake", opening the bake sheet in one press. Keep the controls the same size. Confirm the real flow with LIVE-CHECK 2 and 3. |
| MB-3 | Baking mode | The screen shows no timer, no ingredients for this step, and only a tiny "1 of 11". About 60% of the fold is empty. The step I'm on is hard to place in the whole method, because the two-segment bar doesn't count the steps. | `mid-bake__regular-baking-mode__light__w375__fold.png`; `__text.txt` lists no ingredient or timer. Step 1 has no time, so see LIVE-CHECK 1 for a timed step. | major | Put "This step needs: …" ingredient lines and the timer in the empty space. Make "Step 1 of 11" bigger. Make the bar one cell per step. |
| MB-4 | Baking mode, dark | In dark, "1 of 11", "· now" and the unlit part of the progress bar are dim grey on charcoal. The "Note" key's outline is faint. At 5 a.m. I can't glance at them. | `mid-bake__regular-baking-mode__dark__w375__fold.png` | minor | Raise the step counter and label to ink-2. Lift the unlit bar and the key outline in dark. |
| MB-5 | Bakes, Journal and By recipe | Bakes contradicts itself about what's best. The summary says "best: Braised stuffed cabbage" (5 stars, bake 4), while the round "Best ★3" stamp sits on a 3-star Cheesecake bake 4. A 3-star "best" next to a 5-star dish reads as wrong. | `mid-bake__regular-bakes-journal__light__w375__fold.png` ("17 bakes · 6 recipes · best: Braised stuffed cabbage" vs "Best ★3"); the same in `mid-bake__regular-bakes-journal__dark__w375__fold.png` and `mid-bake__regular-bakes-by-recipe__light__w375__fold.png` | major | Say what each means. Call the summary the top-rated recipe, and the stamp "Best of this recipe" with its basis. |
| MB-6 | Bakes, Journal | The journal clamps each note to two lines. For attempt 5 it cuts “Bulk ran warm (26C) — over-proofed slightly, crum…” before "Next: cooler water.", so the note I most need next time is hidden. | `mid-bake__regular-bakes-journal__light__w375__fold.png`; the full text is in `mid-bake__regular-bakes-journal__light__w375__text.txt` | major | Show the "Next:" part first, or let the clamp grow to three lines when a note contains "Next:". |
| MB-7 | Bakes, By recipe | A recipe's attempts sit in a sideways row, so on a phone I see only bakes 1 to 3 of 5 (the third tile is cut at the edge). Photo tiles carry no attempt number, while note-only tiles show "2", "1", "3". I can't tell which attempt a photo is. Attempt 2 vs attempt 5 needs a scroll and a guess. | `mid-bake__regular-bakes-by-recipe__light__w375__fold.png` (tiles with "2", "1", "3" and photo tiles with a date only) | major | Number every tile. Put attempts 1 to 5 in a vertical list, or let "Compare" open two chosen attempts side by side. |
| MB-8 | Bakes, By recipe | The sparkline beside "5 bakes" is an unlabelled flat line with a dot. It is true (all 3 stars) but doesn't say what it measures. Beside the tiles it reads as decoration. | `mid-bake__regular-bakes-by-recipe__light__w375__fold.png` ("5 bakes" with a flat line) | minor | Label it ("Rating over 5 bakes") or drop it when it's flat. |
| MB-9 | Bakes, Journal | The journal mixes recipes by date. Cheesecake attempts 1 to 5 are interleaved with Prawn and Cabbage across three months, so progression within one recipe isn't visible here. The "P", "T", "B" initial plates repeat for different recipes. | `mid-bake__regular-bakes-journal__light__w375__fold.png`, `mid-bake__regular-bakes-journal__light__w375__text.txt` | minor | Offer a recipe filter chip on the Journal. Show a small change line between attempts. |
| MB-10 | Recipe, 375 | The "Last time" panel shows the rating and the note, but not what I changed between bake 4 and bake 5. "What I changed last time" has to be inferred from the note text. | `mid-bake__regular-recipe__light__w375__fold.png` | minor | Add a one-line "Changed: …" or a link to "bake 4 → 5". |

I found nothing outside my area to file.

## Live checks
LIVE-CHECK: Open the cheesecake in baking mode at 375px and tap Next until step 10 ("Transfer to the center rack… 50-60 minutes", 60 min). Screenshot it → whether a timer shows, how big its digits are, whether it starts by itself or needs a press (count presses), and whether any "this step needs" ingredient lines appear.
LIVE-CHECK: In baking mode, tap the "⋯" menu, and also tap "Note" → list every item in the menu, say whether it contains "Log bake" or "Finish", and what "Note" opens.
LIVE-CHECK: Tap Next through to the last step (12) and past it → what appears after the last step, whether a bake log sheet opens, and how many presses it takes from the last step to a saved bake with a rating and a note. Report the heights of the controls in px.
LIVE-CHECK: Bakes › By recipe, scroll the cheesecake row to bake 5, then tap "Compare" → report what Compare does, whether I can choose attempt 2 and attempt 5, how many taps it takes, and whether the two are shown side by side with their notes in full.
LIVE-CHECK: Recipe page at 375px, scroll slowly down from the top → at which scroll offset the first ingredient and the "Start cooking" and "Log a bake" keys come into view. Say whether "Start cooking" sticks to the bottom as I scroll, and what the "Your bakes" list at the foot of the page shows.

## What I could not judge
- Timers, step ingredients and logging in baking mode, because the shot is only step 1 (no time) and nothing was tapped (see the live checks).
- The "Your bakes" list and the foot of the recipe page, because the page shot is capped at 3200 px and the text dump cuts off at step 3.
- The 1280 shots of Bakes and baking mode. I read only the 1280 recipe fold. Wet hands at 60 cm are a phone scenario, so I judged the 375 shots.
- Voice, wave and wake-lock behaviour, which a still can't show.
- Whether the sideways By recipe rows scroll smoothly with a thumb.
- Whether the real dim-kitchen glare is a problem. I judged only the contrast I could see.

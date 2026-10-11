# PERSONA TEST — First Ledger (Week 9)

## Who the synthetic user was

Built from my User research (Ruth's interview), run in a fresh chat that had never seen the product:

> **Ruth, 22**, accounting student in the State of Mexico. For years she kept the books for her family's sack business, with no contract and nothing on paper. She was ignored or rejected by companies that only looked at her CV and felt she *"wasn't cut out for accounting."* Uses her phone for everything, knows Excel basics, knows reconciliation in practice but maybe not every textbook term. Gets nervous with timers, reads fast and skips long text, **gives up quietly when she feels judged or confused.**

**Method:** the persona narrated in her own words (translated here); phone screenshots (390 px) of every screen, in order: intro → part 1 empty → part 1 filled → twist empty → twist filled → AI disclosure → private result → share → signed review. The persona narrated each screen out loud in first person; then, out of character, logged each confusion.

## Where she got lost

| # | Screen | Confusion (Ruth's words) | Severity | Would quit? |
|---|---|---|---|---|
| 1 | Intro | "If I switch apps, does everything get erased?" · "Nothing is saved… so how will the reviewer see it?" | Med | No |
| 2 | Part 1 | "Which list? Both?… does it count twice?" Two long lists stacked; big dark timer. | **High** | No (stalls) |
| 3 | Part 1 filled | Dropdown options cut off. "Is the clock even running?" | Med | No |
| 4 | Twist | "It says 'new' balance… does it have to be different? Is it a trick?" · "Does the Speak button record my voice? Who hears it?" | **High** | No (may answer wrong) |
| 5 | Twist filled | "I don't know if that's enough of an explanation." | Low | No |
| 6 | AI disclosure | "'Be honest'… sounds like they already suspect me." · "Does the calculator count?" | Low–Med | No |
| 7 | Private result | "Wasn't this not a grade? It looks like a grade." · "Did a machine review me?" · "Who do I share it with?" | **High** | Maybe |
| 8 | Share | "What is this?? A huge string of letters… it looks like a virus or one of those scam messages." · "'Any change is detected' sounds like they're watching me." | **High** | **Yes** |
| 9 | Signed review | "What's next? Who contacts me?" · "'Did this give you information a CV doesn't?' Are they asking me?" | High (trust) | No |

## The worst one

**Screen 8, the share step.** After doing all the work, Ruth was handed a huge, raw, encoded link, no clear recipient, and a sentence that sounded like an accusation. "Keep it private" sat right next to it as the safe-looking exit. She wouldn't close anything; she'd just never send it. No reviewer would ever see her, and the product would repeat exactly the silence it claims to fix.

## What I fixed (commit `fix: persona test`)

| Problem | Fix |
|---|---|
| **Raw link looked like a scam (worst)** | The encoded link is no longer shown. The candidate sees a short chip (`first-ledger…/review · 🔒`), a primary **"Send on WhatsApp"** button with a friendly pre-filled message, and "Copy link" as a fallback. Same for the reviewer's reply. |
| No clear recipient | "Send it to whoever sent you this test, or to the person who will review you." |
| Tamper note sounded like an accusation | "Your evidence is protected: if anyone changes it, it shows." |
| Which list to flag | "If a difference shows up in both lists, flag it in just one (either counts)." The grader already accepted either side. |
| "New balance" implied it must change | "Reconciled balance after the change (it may stay the same)." |
| Unsure how long to explain | "2 or 3 sentences are enough." |
| Does the voice get recorded? | "It only turns into text here; the audio isn't saved." |
| Disclosure felt like suspicion; calculator? | "Tell us which tools you used. Using AI costs you nothing… A calculator or Excel doesn't count as AI." |
| "Correct" looked like a grade | Pills now say "Matches expected". |
| Reviewer-only question shown to the candidate | Removed from the candidate's final view. |

## Not fixed (logged for next iteration)

- **Save progress if she switches apps** (#1). Would need local storage of the attempt; deferred because a saved attempt on a shared phone conflicts with "unsuccessful attempts remain private".
- **Side-by-side matching on a phone** (#2). Needs a different mobile layout; larger change than the deadline allows.
- **"0 min" timings** in the screenshots: an artifact of the automated run (completed in seconds). Real attempts show real minutes.
- **"What happens next"** after a reviewer chooses "paid trial" (#9): depends on Rodrigo's OPERATOR workflow and José Fernando's MONEY model. The review note field is where the reviewer says how to continue.

## After the fix — the share step

![Share step after the persona fix](screens/08-share.png)

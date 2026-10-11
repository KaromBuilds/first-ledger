# Implementation prompt — First Ledger

> Generated from `docs/PACKET.md`. Give this to the coding agent as-is.

You are building **First Ledger**, a Next.js 15 (App Router, TypeScript, React 19, plain CSS) web app deployed on Vercel. Read `docs/PACKET.md` first; the Blueprint conditions in section 10 are hard constraints. No database, no auth, no stored personal data. Bilingual UI (EN default, ES toggle).

## Features (build in this order, one commit each)

### F1 — Scaffold + task bank (verified data)
- `lib/task.ts`: fictional business "Costales y Rafia La Esperanza (demo)", September 2026. Ledger (bank account in the books) and bank statement lines, each with id, date, description, amount (cents as integers).
- Answer key: which lines don't match, the category of each (`deposit_in_transit`, `outstanding_cheque`, `bank_charge`, `bank_interest`, `book_error`, `returned_cheque`, `bank_error`, `voided_cheque`), and the adjusted balance.
- Three twists with their own extra lines/changes and adjusted balances.
- **Acceptance:** unit test proves bank-side and book-side adjusted balances are equal for the base task and every twist.

### F2 — Deterministic grader
- `lib/grade.ts`: takes the submission (flagged line ids + categories + adjusted balances) and returns item-level checks. **No total score, no pass/fail.**
- **Acceptance:** perfect submission → all checks true; a submission with one wrong category flips exactly that check.

### F3 — Candidate flow UI
- Intro (rules, rubric, privacy, AI disclosure required) → Part 1 (two tables, flag + classify, adjusted balance, 25:00 timer) → twist (8:00 timer, new balance, explanation by voice via Web Speech API or text, max 1,200 chars) → AI disclosure → submit.
- Timer runs out → the candidate can still submit; the overrun is recorded, not punished.
- **Acceptance:** works at 375 px width; voice button hides itself when the browser doesn't support it.

### F4 — LLM rubric draft
- `POST /api/feedback`: validates input, calls Gemini (`GEMINI_API_KEY`, `GEMINI_MODEL` (default tries `gemini-3.8-flash`, then `gemini-3.6-flash`)) with the explanation **as quoted data**, asks for JSON on 3 criteria (what changed · which side and why · what to tell the owner) with `yes | partly | no` + one-line note.
- No key or API error → rule-based fallback; response carries `source: "gemini" | "simulated"`. The UI labels it "AI draft — a person decides" or "Simulated AI".
- **Acceptance:** route returns 400 on invalid input, and simulated output when no key is set.

### F5 — Signed proof + candidate result
- `POST /api/sign-proof`: re-grades on the server (never trusts client checks), builds the proof record, signs it with HMAC-SHA256 (`PROOF_SECRET`), returns a token `base64url(json).signature`.
- Result page shows the candidate everything first. Optional correction note (max 500 chars). Buttons: "Keep private" and "Create share link" (`/review#<token>`).
- **Acceptance:** editing any character of the token fails verification.

### F6 — Reviewer view + signed review
- `/review`: verifies the token through `POST /api/verify`, shows evidence (item checks, timings, overrun, explanation, AI disclosure, AI draft, correction note) and starts a review timer.
- Rubric: 3 criteria (yes/partly/no), decision ("offer a paid trial task" / "talk first" / "not now"), "Did this add hiring evidence beyond a CV?" (yes/no), reviewer name + role required, note max 500.
- `POST /api/sign-review` signs the review with the proof's hash → link `/result#<token>` back to the candidate.
- `/result`: candidate sees the review and can print/export the proof card.
- **Acceptance:** review link shows review time in minutes; tampered link shows a clear warning.

### F7 — Hardening + docs
- Security headers, input limits on every route, `.env.example`, README with run/deploy steps, `DECISIONS.md` updated.

## Commit plan
1. `chore: scaffold Next.js app + packet docs`
2. `feat: verified task bank + deterministic grader with tests`
3. `feat: candidate flow with timers, voice explanation, AI disclosure`
4. `feat: Gemini rubric draft with labeled simulated fallback`
5. `feat: HMAC-signed proof, reviewer view, signed review loop`
6. `fix: <bug found in mechanical test pass>`
7. `fix: <worst persona-test confusion>`

## Deploys
- Deploy 1 after commit 5 (full loop live).
- Deploy 2 after the test fixes (commits 6–7).

# First Ledger

A short, observed bookkeeping proof task for people with real but informal experience. The candidate reconciles a fictional business's September bank statement, handles a changed condition, explains it by voice or text, discloses AI use, and sees the result first. If they choose to share, a named reviewer verifies the signed evidence and signs a decision back.

**Nothing is stored server-side.** Records live only inside HMAC-signed links the candidate creates.

Week 9 · Business Bending · Team 2 · Vacuum: First-proof. See `docs/PACKET.md`, `docs/PERSONA.md`, `DECISIONS.md`.

## Stack (Dragon Stack)
- **LLM:** Gemini drafts rubric notes on the explanation (labeled "AI draft"; "Simulated AI" fallback with no key)
- **Verified data:** fixed task bank + deterministic server-side grading
- **Voice:** Web Speech API dictation (text fallback)
- **Automation:** HMAC-signed proof and review links

## Run locally
```bash
npm install
cp .env.example .env.local   # add GEMINI_API_KEY and a long random PROOF_SECRET
npm run dev                  # http://localhost:3000
npm test                     # unit tests
# E2E (with the app running): BASE_URL=http://localhost:3000 node tests/e2e.mjs
```

## Deploy (Vercel)
Set `GEMINI_API_KEY`, `GEMINI_MODEL` (optional, default `gemini-2.5-flash`) and `PROOF_SECRET` in Vercel → Settings → Environment Variables. Never commit them.

All data is fictional demo data.

"use client";

import { useEffect, useState } from "react";
import { useLang } from "./lang";
import { Evidence } from "./Evidence";
import { CopyBox, useHashToken, verifyToken } from "./linkTools";
import { CRITERION_LABEL, MARK_LABEL } from "@/lib/i18n";
import { CRITERIA, type Criterion, type Mark, type ProofRecord, type ReviewRecord } from "@/lib/records";

export default function ReviewView() {
  const { lang, t } = useLang();
  const token = useHashToken();
  const [state, setState] = useState<"loading" | "ok" | "bad">("loading");
  const [proof, setProof] = useState<ProofRecord | null>(null);
  const [openedAt, setOpenedAt] = useState(0);
  const [crit, setCrit] = useState<Partial<Record<Criterion, Mark>>>({});
  const [decision, setDecision] = useState<ReviewRecord["review"]["decision"] | "">("");
  const [added, setAdded] = useState<"yes" | "no" | "">("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [replyUrl, setReplyUrl] = useState<string | null>(null);
  const [reviewMin, setReviewMin] = useState(0);

  useEffect(() => {
    if (token === undefined) return;
    if (!token) return setState("bad");
    verifyToken<ProofRecord>(token, "proof")
      .then((r) => {
        if (r) {
          setProof(r);
          setOpenedAt(Date.now());
          setState("ok");
        } else setState("bad");
      })
      .catch(() => setState("bad"));
  }, [token]);

  async function signReview() {
    if (CRITERIA.some((c) => !crit[c]) || !decision || !added || !name.trim() || !role.trim()) return setError(t.fillAll);
    setBusy(true);
    setError("");
    const mins = Math.round(((Date.now() - openedAt) / 60_000) * 10) / 10;
    try {
      const r = await fetch("/api/review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          proofToken: token,
          review: { criteria: crit, decision, addedEvidence: added, reviewerName: name, reviewerRole: role, note, reviewMin: mins },
        }),
      });
      if (!r.ok) throw new Error();
      const j = await r.json();
      setReviewMin(mins);
      setReplyUrl(`${window.location.origin}/result#${j.token}`);
    } catch {
      setError(t.errorGeneric);
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading") return <main className="wrap"><p className="note">…</p></main>;
  if (state === "bad" || !proof)
    return (
      <main className="wrap">
        <h1>{t.reviewTitle}</h1>
        <p className="tampered" role="alert">{t.tampered}</p>
      </main>
    );

  return (
    <main className="wrap">
      <h1>{t.reviewTitle}</h1>
      <p className="lead">{t.reviewIntro}</p>
      <p className="verified">✓ {t.verified}</p>
      <div className="meta">
        <span>
          {t.candidate}: <strong>{proof.alias || t.noAlias}</strong>
        </span>
        <span>ID {proof.id}</span>
      </div>
      <Evidence record={proof} audience="reviewer" />

      {replyUrl ? (
        <section className="card">
          <p className="verified">✓ {t.reviewDone}</p>
          <p className="note">
            {t.reviewTime}: {reviewMin} {t.minutes}
          </p>
          <CopyBox url={replyUrl} copyLabel={t.copy} copiedLabel={t.copied} />
        </section>
      ) : (
        <section className="card">
          <h2>{t.yourReview}</h2>
          {CRITERIA.map((c) => (
            <div className="critrow" key={c}>
              <div>{CRITERION_LABEL[lang][c]}</div>
              <div className="seg" role="radiogroup" aria-label={CRITERION_LABEL[lang][c]}>
                {(["yes", "partly", "no"] as Mark[]).map((m) => (
                  <label key={m}>
                    <input type="radio" name={c} checked={crit[c] === m} onChange={() => setCrit({ ...crit, [c]: m })} />
                    {MARK_LABEL[lang][m]}
                  </label>
                ))}
              </div>
            </div>
          ))}
          <div className="critrow">
            <div>{t.decisionLabel}</div>
            <div className="seg" role="radiogroup">
              {(Object.keys(t.decisions) as (keyof typeof t.decisions)[]).map((d) => (
                <label key={d}>
                  <input type="radio" name="decision" checked={decision === d} onChange={() => setDecision(d)} />
                  {t.decisions[d]}
                </label>
              ))}
            </div>
          </div>
          <div className="critrow">
            <div>{t.addedEvidenceLabel}</div>
            <div className="seg" role="radiogroup">
              {(["yes", "no"] as const).map((v) => (
                <label key={v}>
                  <input type="radio" name="added" checked={added === v} onChange={() => setAdded(v)} />
                  {t.yesNo[v]}
                </label>
              ))}
            </div>
          </div>
          <label className="field">
            <span>{t.reviewerName}</span>
            <input maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="field">
            <span>{t.reviewerRole}</span>
            <input maxLength={80} value={role} onChange={(e) => setRole(e.target.value)} />
          </label>
          <label className="field">
            <span>{t.reviewNote}</span>
            <textarea rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          {error && <p className="error" role="alert">{error}</p>}
          <button className="primary" onClick={signReview} disabled={busy}>
            {t.signReview}
          </button>
          <p className="note">{t.noReuse}</p>
        </section>
      )}
    </main>
  );
}

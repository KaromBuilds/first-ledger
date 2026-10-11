"use client";

import { useEffect, useState } from "react";
import { useLang } from "./lang";
import { Evidence } from "./Evidence";
import { useHashToken, verifyToken } from "./linkTools";
import { CRITERION_LABEL, MARK_LABEL } from "@/lib/i18n";
import { CRITERIA, type ReviewRecord } from "@/lib/records";

export default function ResultView() {
  const { lang, t } = useLang();
  const token = useHashToken();
  const [state, setState] = useState<"loading" | "ok" | "bad">("loading");
  const [rec, setRec] = useState<ReviewRecord | null>(null);

  useEffect(() => {
    if (token === undefined) return;
    if (!token) return setState("bad");
    verifyToken<ReviewRecord>(token, "review")
      .then((r) => {
        setRec(r);
        setState(r ? "ok" : "bad");
      })
      .catch(() => setState("bad"));
  }, [token]);

  if (state === "loading") return <main className="wrap"><p className="note">…</p></main>;
  if (state === "bad" || !rec)
    return (
      <main className="wrap">
        <h1>{t.reviewResultTitle}</h1>
        <p className="tampered" role="alert">{t.tampered}</p>
      </main>
    );

  const r = rec.review;
  const download = () => {
    const blob = new Blob([JSON.stringify({ record: rec, token }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `first-ledger-proof-${rec.proof.id}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <main className="wrap">
      <h1>{t.reviewResultTitle}</h1>
      <p className="verified">✓ {t.verified}</p>
      <section className="card">
        <div className="meta">
          <span>
            {t.candidate}: <strong>{rec.proof.alias || t.noAlias}</strong>
          </span>
          <span>
            {t.reviewedBy}: <strong>{r.reviewerName}</strong> · {r.reviewerRole}
          </span>
          <span>{new Date(rec.reviewedAt).toLocaleDateString(lang === "es" ? "es-MX" : "en-US")}</span>
          <span>
            {t.reviewTime}: {r.reviewMin} {t.minutes}
          </span>
        </div>
        <h2 style={{ marginTop: 12 }}>{t.decisions[r.decision]}</h2>
        <ul className="checks">
          {CRITERIA.map((c) => (
            <li key={c}>
              <span className="checkname">{CRITERION_LABEL[lang][c]}</span>
              <span className={`pill ${r.criteria[c] === "yes" ? "ok" : r.criteria[c] === "no" ? "warn" : "neutral"}`}>
                {MARK_LABEL[lang][r.criteria[c]]}
              </span>
            </li>
          ))}
          <li>
            <span className="checkname">{t.addedEvidenceLabel}</span>
            <span className="pill neutral">{t.yesNo[r.addedEvidence]}</span>
          </li>
        </ul>
        {r.note && <blockquote className="quote">{r.note}</blockquote>}
      </section>
      <div className="actions">
        <button className="primary" onClick={() => window.print()}>
          {t.exportCard}
        </button>
        <button className="ghost" onClick={download}>
          {t.downloadJson}
        </button>
      </div>
      <Evidence record={rec.proof} audience="reviewer" />
    </main>
  );
}

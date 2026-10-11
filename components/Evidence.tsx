"use client";

import { useLang } from "./lang";
import { AI_USE_LABEL, CATEGORY_LABEL, CRITERION_LABEL, EXPECTED_SHORT, MARK_LABEL } from "@/lib/i18n";
import { formatMoney } from "@/lib/grade";
import { BASE_ADJUSTED, EXPECTED, getTwist, lineById } from "@/lib/task";
import type { ProofRecord } from "@/lib/records";

function Pill({ ok, children }: { ok: boolean | "neutral"; children: React.ReactNode }) {
  const cls = ok === "neutral" ? "pill neutral" : ok ? "pill ok" : "pill warn";
  return <span className={cls}>{children}</span>;
}

/** Item-by-item evidence. Used by the candidate (first), the reviewer, and the final card. */
export function Evidence({ record, audience }: { record: ProofRecord; audience: "candidate" | "reviewer" }) {
  const { lang, t } = useLang();
  const c = record.checks;
  const twist = getTwist(record.twistId);
  const sub = record.submission;

  return (
    <div className="evidence">
      <section className="card">
        <h3>{lang === "es" ? "Diferencias de la parte 1" : "Part 1 differences"}</h3>
        <ul className="checks">
          {c.items.map((it) => {
            const exp = EXPECTED.find((e) => e.key === it.key)!;
            const flaggedId = exp.ids.find((id) => sub.flags[id]);
            return (
              <li key={it.key}>
                <span className="checkname">{EXPECTED_SHORT[lang][it.key]}</span>
                {it.found ? (
                  <Pill ok={it.categoryCorrect}>
                    {t.found} · {it.categoryCorrect ? t.categoryOk : t.categoryWrong}
                  </Pill>
                ) : (
                  <Pill ok={false}>{t.notFound}</Pill>
                )}
                {it.found && !it.categoryCorrect && flaggedId && (
                  <div className="sub">
                    {t.yourAnswer}: {CATEGORY_LABEL[lang][sub.flags[flaggedId]]} · {t.expected}: {CATEGORY_LABEL[lang][exp.category]}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        {c.extraFlags.length > 0 && (
          <p className="note warnline">
            {t.extraFlags}:{" "}
            {c.extraFlags
              .map((id) => {
                const l = lineById(id);
                return l ? `${l.date} ${l.desc[lang]}` : id;
              })
              .join("; ")}
          </p>
        )}
      </section>

      <section className="card">
        <h3>{lang === "es" ? "Saldos y cambio" : "Balances and the change"}</h3>
        <ul className="checks">
          <li>
            <span className="checkname">{t.balance1}</span>
            <Pill ok={c.balance1Correct}>{c.balance1Correct ? t.correct : t.different}</Pill>
            <div className="sub">
              {t.yourAnswer}: {formatMoney(sub.balance1)}
              {!c.balance1Correct && <> · {t.expected}: {formatMoney(BASE_ADJUSTED)}</>}
            </div>
          </li>
          <li>
            <span className="checkname">{t.twistClass}</span>
            <Pill ok={c.twistCategoryCorrect}>{c.twistCategoryCorrect ? t.correct : t.different}</Pill>
            <div className="sub">
              {twist?.message[lang]}
              <br />
              {t.yourAnswer}: {CATEGORY_LABEL[lang][sub.twistCategory]}
              {!c.twistCategoryCorrect && twist && <> · {t.expected}: {CATEGORY_LABEL[lang][twist.category]}</>}
            </div>
          </li>
          <li>
            <span className="checkname">{t.balance2}</span>
            <Pill ok={c.balance2Correct}>{c.balance2Correct ? t.correct : t.different}</Pill>
            <div className="sub">
              {t.yourAnswer}: {formatMoney(sub.balance2)}
              {!c.balance2Correct && twist && <> · {t.expected}: {formatMoney(twist.adjusted)}</>}
            </div>
          </li>
          <li>
            <span className="checkname">{t.timing}</span>
            <Pill ok="neutral">
              {record.timing.totalMin} {t.minutes}
              {record.timing.overrunMin > 0 && <> · +{record.timing.overrunMin} {t.minutes} {t.overrun}</>}
            </Pill>
          </li>
        </ul>
      </section>

      <section className="card">
        <h3>{audience === "candidate" ? t.aiDraftTitle : t.explanationTitle}</h3>
        {audience === "reviewer" && (
          <blockquote className="quote">
            {record.explanation.text}
            <cite>
              {record.explanation.mode === "voice" ? t.viaVoice : record.explanation.mode === "mixed" ? t.viaMixed : t.viaText}
            </cite>
          </blockquote>
        )}
        <p className={`badge ${record.aiDraft.source}`}>
          {record.aiDraft.source === "gemini" ? t.aiDraftGemini : t.aiDraftSimulated}
        </p>
        <ul className="checks">
          {record.aiDraft.criteria.map((cr) => (
            <li key={cr.id}>
              <span className="checkname">{CRITERION_LABEL[lang][cr.id]}</span>
              <Pill ok={cr.mark === "yes" ? true : cr.mark === "no" ? false : "neutral"}>{MARK_LABEL[lang][cr.mark]}</Pill>
              {cr.note && <div className="sub">{cr.note}</div>}
            </li>
          ))}
        </ul>
        {record.aiDraft.summary && <p className="note">{record.aiDraft.summary}</p>}
      </section>

      <section className="card">
        <h3>{t.aiUseTitle}</h3>
        <p>
          {AI_USE_LABEL[lang][record.aiUse]}
          {record.aiUseNote && <> · “{record.aiUseNote}”</>}
        </p>
        {record.correctionNote && (
          <>
            <h3>{t.correctionTitle}</h3>
            <blockquote className="quote">{record.correctionNote}</blockquote>
          </>
        )}
      </section>
    </div>
  );
}

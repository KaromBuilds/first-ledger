"use client";

import { useEffect, useRef, useState } from "react";
import { useLang } from "./lang";
import { Evidence } from "./Evidence";
import { CopyBox } from "./linkTools";
import { fmtClock, useCountdown } from "./useCountdown";
import { AI_USE_LABEL, CATEGORY_LABEL } from "@/lib/i18n";
import { formatMoney, parseMoney } from "@/lib/grade";
import { BANK, BUSINESS, CATEGORIES, LEDGER, OPENING_BALANCE, TIME_LIMITS, closing, getTwist, lineById, type Category, type Line } from "@/lib/task";
import type { AiUse, ProofRecord } from "@/lib/records";

type Step = "intro" | "part1" | "twist" | "disclose" | "result";

function Timer({ deadline }: { deadline: number | null }) {
  const { t } = useLang();
  const secs = useCountdown(deadline);
  if (deadline === null) return null;
  const over = secs < 0;
  return (
    <div className={`timer ${over ? "over" : secs < 120 ? "low" : ""}`} role="timer">
      {over ? `${t.overTime} +${fmtClock(secs)}` : `${fmtClock(secs)} ${t.timeLeft}`}
    </div>
  );
}

function CategorySelect({ value, onChange, label }: { value: Category | ""; onChange: (c: Category) => void; label: string }) {
  const { lang, t } = useLang();
  return (
    <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value as Category)}>
      <option value="" disabled>
        {t.choose}
      </option>
      {CATEGORIES.map((c) => (
        <option key={c} value={c}>
          {CATEGORY_LABEL[lang][c]}
        </option>
      ))}
    </select>
  );
}

function LineTable({ title, lines, side, flags, setFlags }: {
  title: string;
  lines: Line[];
  side: "ledger" | "bank";
  flags: Record<string, Category | "">;
  setFlags: (f: Record<string, Category | "">) => void;
}) {
  const { lang, t } = useLang();
  return (
    <section className="card table">
      <h3>{title}</h3>
      <div className="row head">
        <span>{t.opening}</span>
        <span className="amt">{formatMoney(OPENING_BALANCE)}</span>
      </div>
      {lines.map((l) => {
        const flagged = l.id in flags;
        return (
          <div key={l.id} className={`row ${flagged ? "flagged" : ""}`}>
            <label className="rowmain">
              <input
                type="checkbox"
                checked={flagged}
                onChange={(e) => {
                  const next = { ...flags };
                  if (e.target.checked) next[l.id] = "";
                  else delete next[l.id];
                  setFlags(next);
                }}
                aria-label={`${t.flag}: ${l.date} ${l.desc[lang]}`}
              />
              <span className="date">{l.date}</span>
              <span className="desc">{l.desc[lang]}</span>
              <span className={`amt ${l.amount < 0 ? "neg" : ""}`}>{formatMoney(l.amount)}</span>
            </label>
            {flagged && (
              <CategorySelect
                label={`${t.choose} ${l.desc[lang]}`}
                value={flags[l.id]}
                onChange={(c) => setFlags({ ...flags, [l.id]: c })}
              />
            )}
          </div>
        );
      })}
      <div className="row head">
        <span>{t.closing}</span>
        <span className="amt">{formatMoney(closing(side))}</span>
      </div>
    </section>
  );
}

type SpeechRec = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function getRecognizer(): (new () => SpeechRec) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export default function TaskFlow() {
  const { lang, t } = useLang();
  const [step, setStep] = useState<Step>("intro");
  const [alias, setAlias] = useState("");
  const [ticket, setTicket] = useState<string | null>(null);
  const [twistId, setTwistId] = useState<string>("");
  const [part1Deadline, setPart1Deadline] = useState<number | null>(null);
  const [twistDeadline, setTwistDeadline] = useState<number | null>(null);
  const [part1Start, setPart1Start] = useState(0);
  const [part1Min, setPart1Min] = useState<number | null>(null);
  const [flags, setFlags] = useState<Record<string, Category | "">>({});
  const [bal1, setBal1] = useState("");
  const [twistCat, setTwistCat] = useState<Category | "">("");
  const [bal2, setBal2] = useState("");
  const [explanation, setExplanation] = useState("");
  const [usedVoice, setUsedVoice] = useState(false);
  const [typed, setTyped] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceOk, setVoiceOk] = useState(false);
  const [aiUse, setAiUse] = useState<AiUse | "">("");
  const [aiNote, setAiNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [record, setRecord] = useState<ProofRecord | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [keptPrivate, setKeptPrivate] = useState(false);
  const [correction, setCorrection] = useState("");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const recRef = useRef<SpeechRec | null>(null);

  useEffect(() => setVoiceOk(!!getRecognizer()), []);
  useEffect(() => {
    window.scrollTo({ top: 0 });
    setError("");
  }, [step]);

  const twist = getTwist(twistId);

  async function start() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/start", { method: "POST" });
      if (!r.ok) throw new Error();
      const j = await r.json();
      setTicket(j.ticket);
      setTwistId(j.twistId);
      const now = Date.now();
      setPart1Start(now);
      setPart1Deadline(now + TIME_LIMITS.part1Min * 60_000);
      setStep("part1");
    } catch {
      setError(t.errorGeneric);
    } finally {
      setBusy(false);
    }
  }

  function finishPart1() {
    if (Object.values(flags).some((c) => c === "")) return setError(t.missingCategory);
    if (parseMoney(bal1) === null) return setError(t.invalidAmount);
    setPart1Min(Math.round(((Date.now() - part1Start) / 60_000) * 10) / 10);
    setTwistDeadline(Date.now() + TIME_LIMITS.twistMin * 60_000);
    setStep("twist");
  }

  function toggleVoice() {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const Rec = getRecognizer();
    if (!Rec) return;
    const rec = new Rec();
    rec.lang = lang === "es" ? "es-MX" : "en-US";
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (e) => {
      let add = "";
      for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) add += e.results[i][0].transcript;
      if (add) {
        setUsedVoice(true);
        setExplanation((prev) => (prev ? `${prev.trimEnd()} ${add.trim()}` : add.trim()).slice(0, 1200));
      }
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  }

  function finishTwist() {
    if (!twistCat) return setError(t.missingCategory);
    if (parseMoney(bal2) === null) return setError(t.invalidAmount);
    if (explanation.trim().split(/\s+/).length < 4) return setError(t.explainTooShort);
    recRef.current?.stop();
    setStep("disclose");
  }

  async function submit() {
    if (!aiUse) return setError(t.fillAll);
    setBusy(true);
    setError("");
    try {
      const cleanFlags = Object.fromEntries(Object.entries(flags).filter(([, c]) => c)) as Record<string, Category>;
      const r = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ticket,
          lang,
          alias,
          flags: cleanFlags,
          balance1: parseMoney(bal1),
          twistCategory: twistCat,
          balance2: parseMoney(bal2),
          explanation,
          explanationMode: usedVoice && typed ? "mixed" : usedVoice ? "voice" : "text",
          aiUse,
          aiUseNote: aiNote,
          part1Min,
        }),
      });
      if (r.status === 409) return setError(t.ticketUsed);
      if (!r.ok) throw new Error();
      const j = await r.json();
      setRecord(j.record);
      setToken(j.token);
      setStep("result");
    } catch {
      setError(t.errorGeneric);
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    if (!token) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/share", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, correctionNote: correction }),
      });
      if (!r.ok) throw new Error();
      const j = await r.json();
      setShareUrl(`${window.location.origin}/review#${j.token}`);
    } catch {
      setError(t.errorGeneric);
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setShareUrl(null);
    setCorrection("");
    setStep("intro");
    setTicket(null);
    setTwistId("");
    setFlags({});
    setBal1("");
    setTwistCat("");
    setBal2("");
    setExplanation("");
    setUsedVoice(false);
    setTyped(false);
    setAiUse("");
    setAiNote("");
    setRecord(null);
    setToken(null);
    setKeptPrivate(false);
    setPart1Deadline(null);
    setTwistDeadline(null);
  }

  const err = error ? <p className="error" role="alert">{error}</p> : null;

  if (step === "intro")
    return (
      <main className="wrap">
        <h1>{t.tagline}</h1>
        <p className="lead">{t.introWho}</p>
        <section className="card">
          <h2>{t.introHow}</h2>
          <ol className="steps">
            {t.introSteps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </section>
        <section className="card">
          <h2>{t.introRubric}</h2>
          <ul>
            {t.introRubricItems.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <p className="note strong">{t.introNoScore}</p>
        </section>
        <p className="privacy">{t.introPrivacy}</p>
        <p className="note">{t.timerNote}</p>
        <label className="field">
          <span>{t.aliasLabel}</span>
          <input value={alias} maxLength={40} onChange={(e) => setAlias(e.target.value)} />
        </label>
        {err}
        <button className="primary" onClick={start} disabled={busy}>
          {busy ? t.starting : t.start}
        </button>
      </main>
    );

  if (step === "part1")
    return (
      <main className="wrap wide">
        <div className="stepbar">
          <h1>{t.part1Title}</h1>
          <Timer deadline={part1Deadline} />
        </div>
        <p className="note">{BUSINESS[lang]}</p>
        <p className="lead">{t.part1Help}</p>
        <div className="grid2">
          <LineTable title={t.ledgerTitle} lines={LEDGER} side="ledger" flags={flags} setFlags={setFlags} />
          <LineTable title={t.bankTitle} lines={BANK} side="bank" flags={flags} setFlags={setFlags} />
        </div>
        <label className="field">
          <span>{t.balance1Label}</span>
          <input inputMode="decimal" placeholder={t.balanceHint} value={bal1} onChange={(e) => setBal1(e.target.value)} />
        </label>
        {err}
        <button className="primary" onClick={finishPart1}>
          {t.continue}
        </button>
      </main>
    );

  if (step === "twist" && twist) {
    const affected = twist.newBankLine ?? lineById(twist.affectedId);
    return (
      <main className="wrap">
        <div className="stepbar">
          <h1>{t.twistTitle}</h1>
          <Timer deadline={twistDeadline} />
        </div>
        <section className="card alert">
          <p className="big">{twist.message[lang]}</p>
          {affected && (
            <div className="row flagged">
              <span className="tag">{twist.newBankLine ? t.twistNewLine : t.twistAffected}</span>
              <span className="date">{affected.date}</span>
              <span className="desc">{affected.desc[lang]}</span>
              <span className={`amt ${affected.amount < 0 ? "neg" : ""}`}>{formatMoney(affected.amount)}</span>
            </div>
          )}
        </section>
        <label className="field">
          <span>{t.twistCategoryLabel}</span>
          <CategorySelect label={t.twistCategoryLabel} value={twistCat} onChange={setTwistCat} />
        </label>
        <label className="field">
          <span>{t.balance2Label}</span>
          <input inputMode="decimal" placeholder={t.balanceHint} value={bal2} onChange={(e) => setBal2(e.target.value)} />
        </label>
        <label className="field">
          <span>{t.explainLabel}</span>
          <textarea
            rows={6}
            maxLength={1200}
            placeholder={t.explainPlaceholder}
            value={explanation}
            onChange={(e) => {
              setExplanation(e.target.value);
              setTyped(true);
            }}
          />
          <span className="counter">{explanation.length}/1200</span>
        </label>
        {voiceOk ? (
          <div className="voice">
            <button className={`ghost ${listening ? "rec" : ""}`} onClick={toggleVoice} type="button">
              {listening ? `■ ${t.stop}` : `🎙 ${t.speak}`}
            </button>
            {listening && <span className="note">{t.listening}</span>}
          </div>
        ) : (
          <p className="note">{t.voiceUnsupported}</p>
        )}
        {err}
        <button className="primary" onClick={finishTwist}>
          {t.continue}
        </button>
      </main>
    );
  }

  if (step === "disclose")
    return (
      <main className="wrap">
        <h1>{t.discloseTitle}</h1>
        <p className="lead">{t.discloseHelp}</p>
        <fieldset className="card radios">
          {(Object.keys(AI_USE_LABEL[lang]) as AiUse[]).map((k) => (
            <label key={k}>
              <input type="radio" name="ai" checked={aiUse === k} onChange={() => setAiUse(k)} />
              {AI_USE_LABEL[lang][k]}
            </label>
          ))}
        </fieldset>
        {aiUse && aiUse !== "none" && (
          <label className="field">
            <span>{t.aiNoteLabel}</span>
            <input maxLength={200} value={aiNote} onChange={(e) => setAiNote(e.target.value)} />
          </label>
        )}
        {err}
        <button className="primary" onClick={submit} disabled={busy}>
          {busy ? t.submitting : t.submit}
        </button>
      </main>
    );

  if (step === "result" && record)
    return (
      <main className="wrap">
        <h1>{t.resultTitle}</h1>
        <p className="lead">{t.resultIntro}</p>
        <Evidence record={record} audience="candidate" />
        {shareUrl ? (
          <section className="card">
            <h2>{t.shareTitle}</h2>
            <p className="note">{t.shareHelp}</p>
            <CopyBox url={shareUrl} copyLabel={t.copy} copiedLabel={t.copied} />
          </section>
        ) : keptPrivate ? (
          <p className="privacy">{t.keptPrivate}</p>
        ) : (
          <>
            <label className="field">
              <span>{t.correctionLabel}</span>
              <textarea rows={3} maxLength={500} placeholder={t.correctionPlaceholder} value={correction} onChange={(e) => setCorrection(e.target.value)} />
            </label>
            <div className="actions">
              <button className="primary" onClick={share} disabled={busy}>
                {t.createLink}
              </button>
              <button className="ghost" onClick={() => setKeptPrivate(true)}>
                {t.keepPrivate}
              </button>
            </div>
          </>
        )}
        {err}
        <button className="link" onClick={reset}>
          {t.tryAgain}
        </button>
      </main>
    );

  return null;
}

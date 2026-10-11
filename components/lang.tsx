"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { STRINGS, type Strings } from "@/lib/i18n";
import type { Lang } from "@/lib/task";

type Ctx = { lang: Lang; t: Strings; toggle: () => void };
const LangCtx = createContext<Ctx>({ lang: "es", t: STRINGS.es, toggle: () => {} });

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>("es");
  useEffect(() => {
    try {
      const saved = localStorage.getItem("fl-lang");
      if (saved === "en" || saved === "es") setLang(saved);
    } catch {}
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  const toggle = () =>
    setLang((l) => {
      const next = l === "es" ? "en" : "es";
      try {
        localStorage.setItem("fl-lang", next);
      } catch {}
      return next;
    });
  return <LangCtx.Provider value={{ lang, t: STRINGS[lang], toggle }}>{children}</LangCtx.Provider>;
}

export const useLang = () => useContext(LangCtx);

export function Header() {
  const { t, toggle } = useLang();
  return (
    <header className="top">
      <div className="brand">
        <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 5.5C3 4.7 3.7 4 4.5 4H11v15H4.5c-.8 0-1.5-.7-1.5-1.5v-12Z" fill="currentColor" opacity=".85" />
          <path d="M13 4h6.5c.8 0 1.5.7 1.5 1.5v12c0 .8-.7 1.5-1.5 1.5H13V4Z" fill="currentColor" opacity=".55" />
          <path d="M5.5 8h3M5.5 11h3M15.5 8h3M15.5 11h3" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        <span>{t.appName}</span>
      </div>
      <button className="ghost small" onClick={toggle}>
        {t.langToggle}
      </button>
    </header>
  );
}

export function Footer() {
  const { t } = useLang();
  return <footer className="foot">{t.footer}</footer>;
}

"use client";

import { useEffect, useState } from "react";

/** Reads the token from the URL fragment. The fragment never reaches server logs. */
export function useHashToken(): string | null | undefined {
  const [token, setToken] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    const read = () => setToken(window.location.hash.slice(1) || null);
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  return token;
}

export async function verifyToken<T>(token: string, kind: "proof" | "review"): Promise<T | null> {
  const r = await fetch("/api/verify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token, kind }),
  });
  if (!r.ok) return null;
  const j = await r.json();
  return j.ok ? (j.record as T) : null;
}

/**
 * Share without showing the raw encoded link (persona test: it looked like a scam message).
 * Primary action is WhatsApp with a friendly pre-filled message; copy is the fallback.
 */
export function CopyBox({ url, copyLabel, copiedLabel, waLabel, waMessage }: {
  url: string;
  copyLabel: string;
  copiedLabel: string;
  waLabel?: string;
  waMessage?: string;
}) {
  const [copied, setCopied] = useState(false);
  const host = (() => {
    try {
      const u = new URL(url);
      return `${u.host}${u.pathname}`;
    } catch {
      return "";
    }
  })();
  return (
    <div>
      <span hidden data-testid="share-url">{url}</span>
      <p className="linkchip">🔗 {host} · 🔒</p>
      <div className="actions">
        {waLabel && waMessage && (
          <a className="primary wa" href={`https://wa.me/?text=${encodeURIComponent(`${waMessage}\n${url}`)}`} target="_blank" rel="noopener noreferrer">
            {waLabel}
          </a>
        )}
        <button
          className="ghost"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {}
          }}
        >
          {copied ? copiedLabel : copyLabel}
        </button>
      </div>
    </div>
  );
}

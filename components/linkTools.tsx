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

export function CopyBox({ url, copyLabel, copiedLabel }: { url: string; copyLabel: string; copiedLabel: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <p className="sharebox" data-testid="share-url">{url}</p>
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
  );
}

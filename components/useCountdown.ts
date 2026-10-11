"use client";

import { useEffect, useState } from "react";

/** Seconds remaining until `deadline` (negative once over time). */
export function useCountdown(deadline: number | null): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (deadline === null) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [deadline]);
  return deadline === null ? 0 : Math.round((deadline - now) / 1000);
}

export function fmtClock(secs: number): string {
  const s = Math.abs(secs);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

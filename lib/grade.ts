import { CATEGORIES, EXPECTED, BASE_ADJUSTED, allLines, getTwist, type Category } from "./task";

export type Submission = {
  flags: Record<string, Category>; // line id -> category, only for flagged lines (part 1)
  balance1: number;                 // cents
  twistId: string;
  twistCategory: Category;
  balance2: number;                 // cents
};

export type ItemCheck = { key: string; found: boolean; categoryCorrect: boolean };

export type Checks = {
  items: ItemCheck[];
  extraFlags: string[];         // flagged lines that actually match (not differences)
  balance1Correct: boolean;
  twistCategoryCorrect: boolean;
  balance2Correct: boolean;
};

/** Item-level evidence only. Deliberately no total score and no pass/fail (Blueprint condition 1). */
export function grade(sub: Submission): Checks {
  const items: ItemCheck[] = EXPECTED.map((e) => {
    const flagged = e.ids.filter((id) => sub.flags[id] !== undefined);
    return {
      key: e.key,
      found: flagged.length > 0,
      categoryCorrect: flagged.length > 0 && flagged.every((id) => sub.flags[id] === e.category),
    };
  });
  const expectedIds = new Set(EXPECTED.flatMap((e) => e.ids));
  const extraFlags = Object.keys(sub.flags).filter((id) => !expectedIds.has(id));
  const twist = getTwist(sub.twistId);
  return {
    items,
    extraFlags,
    balance1Correct: sub.balance1 === BASE_ADJUSTED,
    twistCategoryCorrect: !!twist && sub.twistCategory === twist.category,
    balance2Correct: !!twist && sub.balance2 === twist.adjusted,
  };
}

/** Parses "53,824", "$53 824.00", "53824.5" into integer cents. Returns null when unreadable. */
export function parseMoney(input: string): number | null {
  const cleaned = input.replace(/[$\s,]/g, "");
  if (!/^-?\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole, frac = ""] = cleaned.replace("-", "").split(".");
  const cents = Number(whole) * 100 + Number((frac + "00").slice(0, 2));
  if (!Number.isSafeInteger(cents)) return null;
  return cleaned.startsWith("-") ? -cents : cents;
}

export function formatMoney(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}$${Math.floor(abs / 100).toLocaleString("en-US")}.${String(abs % 100).padStart(2, "0")}`;
}

export function isCategory(x: unknown): x is Category {
  return typeof x === "string" && (CATEGORIES as string[]).includes(x);
}

export function isKnownLine(id: string, twistId: string): boolean {
  return allLines(getTwist(twistId)).some((l) => l.id === id);
}

import { isCategory, isKnownLine } from "./grade";
import { getTwist, type Category } from "./task";
import { CRITERIA, type AiUse, type Mark, type ReviewRecord } from "./records";

// Every request body is validated here before it reaches the grader, the signer or the LLM.

export class BadInput extends Error {}

const str = (v: unknown, max: number, field: string, required = false): string => {
  if (v === undefined || v === null || v === "") {
    if (required) throw new BadInput(`${field} is required`);
    return "";
  }
  if (typeof v !== "string") throw new BadInput(`${field} must be text`);
  const t = v.trim();
  if (t.length > max) throw new BadInput(`${field} is too long (max ${max})`);
  if (required && t.length === 0) throw new BadInput(`${field} is required`);
  return t;
};

const int = (v: unknown, field: string): number => {
  if (typeof v !== "number" || !Number.isSafeInteger(v) || Math.abs(v) > 1_000_000_000_00) throw new BadInput(`${field} must be an amount in cents`);
  return v;
};

const oneOf = <T extends string>(v: unknown, opts: readonly T[], field: string): T => {
  if (typeof v !== "string" || !(opts as readonly string[]).includes(v)) throw new BadInput(`${field} is invalid`);
  return v as T;
};

export type EvaluateInput = {
  ticket: string;
  lang: "es" | "en";
  alias: string;
  flags: Record<string, Category>;
  balance1: number;
  twistCategory: Category;
  balance2: number;
  explanation: string;
  explanationMode: "voice" | "text" | "mixed";
  aiUse: AiUse;
  aiUseNote: string;
  part1Min: number | null;
};

export function parseEvaluate(body: unknown, twistId: string): EvaluateInput {
  if (!body || typeof body !== "object") throw new BadInput("body must be an object");
  const b = body as Record<string, unknown>;
  if (!getTwist(twistId)) throw new BadInput("unknown twist");

  const flagsRaw = b.flags;
  if (!flagsRaw || typeof flagsRaw !== "object" || Array.isArray(flagsRaw)) throw new BadInput("flags must be an object");
  const entries = Object.entries(flagsRaw as Record<string, unknown>);
  if (entries.length > 20) throw new BadInput("too many flags");
  const flags: Record<string, Category> = {};
  for (const [id, cat] of entries) {
    if (!isKnownLine(id, twistId) || id === "B9") throw new BadInput(`unknown line ${id}`);
    if (!isCategory(cat)) throw new BadInput(`invalid category for ${id}`);
    flags[id] = cat;
  }
  const twistCategory = b.twistCategory;
  if (!isCategory(twistCategory)) throw new BadInput("twistCategory is invalid");

  const part1 = b.part1Min;
  const part1Min = typeof part1 === "number" && Number.isFinite(part1) && part1 >= 0 && part1 < 600 ? Math.round(part1 * 10) / 10 : null;

  return {
    ticket: str(b.ticket, 2_000, "ticket", true),
    lang: oneOf(b.lang, ["es", "en"] as const, "lang"),
    alias: str(b.alias, 40, "alias"),
    flags,
    balance1: int(b.balance1, "balance1"),
    twistCategory,
    balance2: int(b.balance2, "balance2"),
    explanation: str(b.explanation, 1_200, "explanation", true),
    explanationMode: oneOf(b.explanationMode, ["voice", "text", "mixed"] as const, "explanationMode"),
    aiUse: oneOf(b.aiUse, ["none", "arithmetic", "concepts", "other"] as const, "aiUse"),
    aiUseNote: str(b.aiUseNote, 200, "aiUseNote"),
    part1Min,
  };
}

export function parseShare(body: unknown): { token: string; correctionNote: string } {
  if (!body || typeof body !== "object") throw new BadInput("body must be an object");
  const b = body as Record<string, unknown>;
  return { token: str(b.token, 40_000, "token", true), correctionNote: str(b.correctionNote, 500, "correctionNote") };
}

export function parseReview(body: unknown): { proofToken: string; review: ReviewRecord["review"] } {
  if (!body || typeof body !== "object") throw new BadInput("body must be an object");
  const b = body as Record<string, unknown>;
  const r = (b.review ?? {}) as Record<string, unknown>;
  const critRaw = (r.criteria ?? {}) as Record<string, unknown>;
  const criteria = {} as Record<(typeof CRITERIA)[number], Mark>;
  for (const c of CRITERIA) criteria[c] = oneOf(critRaw[c], ["yes", "partly", "no"] as const, `criteria.${c}`);
  const mins = r.reviewMin;
  if (typeof mins !== "number" || !Number.isFinite(mins) || mins < 0 || mins > 600) throw new BadInput("reviewMin is invalid");
  return {
    proofToken: str(b.proofToken, 40_000, "proofToken", true),
    review: {
      criteria,
      decision: oneOf(r.decision, ["paid_trial", "talk_first", "not_now"] as const, "decision"),
      addedEvidence: oneOf(r.addedEvidence, ["yes", "no"] as const, "addedEvidence"),
      reviewerName: str(r.reviewerName, 80, "reviewerName", true),
      reviewerRole: str(r.reviewerRole, 80, "reviewerRole", true),
      note: str(r.note, 500, "note"),
      reviewMin: Math.round(mins * 10) / 10,
    },
  };
}

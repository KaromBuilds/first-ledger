import type { Category, Lang, TwistId } from "./task";
import type { Checks } from "./grade";

export type AiUse = "none" | "arithmetic" | "concepts" | "other";
export type Mark = "yes" | "partly" | "no";
export const CRITERIA = ["what_changed", "which_side", "tell_owner"] as const;
export type Criterion = (typeof CRITERIA)[number];

export type AiDraft = {
  source: "gemini" | "simulated";
  criteria: { id: Criterion; mark: Mark; note: string }[];
  summary: string;
};

/** Issued when the candidate starts; carries the server's start time and the assigned twist. */
export type Ticket = { kind: "ticket"; v: 1; id: string; twistId: TwistId; startedAt: number };

export type ProofRecord = {
  kind: "proof";
  v: 1;
  id: string;
  task: string;
  lang: Lang;
  alias: string;
  twistId: TwistId;
  submission: {
    flags: Record<string, Category>;
    balance1: number;
    twistCategory: Category;
    balance2: number;
  };
  checks: Checks;
  timing: {
    startedAt: number;     // server clock (from ticket)
    submittedAt: number;   // server clock
    totalMin: number;
    part1Min: number | null; // client-reported
    overrunMin: number;      // minutes beyond the 33-minute total, 0 if none
  };
  explanation: { text: string; mode: "voice" | "text" | "mixed" };
  aiUse: AiUse;
  aiUseNote: string;
  aiDraft: AiDraft;
  correctionNote: string;
  sharedAt: number | null;
};

export type ReviewRecord = {
  kind: "review";
  v: 1;
  proofHash: string;
  proof: ProofRecord;
  review: {
    criteria: Record<Criterion, Mark>;
    decision: "paid_trial" | "talk_first" | "not_now";
    addedEvidence: "yes" | "no";
    reviewerName: string;
    reviewerRole: string;
    note: string;
    reviewMin: number; // client-reported review duration
  };
  reviewedAt: number;
};

import { NextResponse } from "next/server";
import { sign, verify } from "@/lib/sign";
import { grade } from "@/lib/grade";
import { TASK_ID, TIME_LIMITS } from "@/lib/task";
import { BadInput, parseEvaluate } from "@/lib/validate";
import { draftFeedback } from "@/lib/feedback";
import type { ProofRecord, Ticket } from "@/lib/records";

export const runtime = "nodejs";

const MAX_TICKET_AGE_MS = 6 * 60 * 60 * 1000;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  try {
    const raw = (body as { ticket?: unknown })?.ticket;
    const ticket = typeof raw === "string" ? verify<Ticket>(raw) : null;
    if (!ticket || ticket.kind !== "ticket") return NextResponse.json({ error: "invalid_ticket" }, { status: 400 });
    const now = Date.now();
    if (now - ticket.startedAt > MAX_TICKET_AGE_MS) return NextResponse.json({ error: "ticket_expired" }, { status: 400 });

    const input = parseEvaluate(body, ticket.twistId);

    // The server re-grades from the raw answers. Client-side checks are never trusted.
    const checks = grade({
      flags: input.flags,
      balance1: input.balance1,
      twistId: ticket.twistId,
      twistCategory: input.twistCategory,
      balance2: input.balance2,
    });

    const aiDraft = await draftFeedback(input.explanation, ticket.twistId, input.lang);

    const totalMin = Math.round(((now - ticket.startedAt) / 60_000) * 10) / 10;
    const limit = TIME_LIMITS.part1Min + TIME_LIMITS.twistMin;
    const record: ProofRecord = {
      kind: "proof",
      v: 1,
      id: ticket.id,
      task: TASK_ID,
      lang: input.lang,
      alias: input.alias,
      twistId: ticket.twistId,
      submission: { flags: input.flags, balance1: input.balance1, twistCategory: input.twistCategory, balance2: input.balance2 },
      checks,
      timing: {
        startedAt: ticket.startedAt,
        submittedAt: now,
        totalMin,
        part1Min: input.part1Min,
        overrunMin: Math.max(0, Math.round((totalMin - limit) * 10) / 10),
      },
      explanation: { text: input.explanation, mode: input.explanationMode },
      aiUse: input.aiUse,
      aiUseNote: input.aiUseNote,
      aiDraft,
      correctionNote: "",
      sharedAt: null,
    };
    return NextResponse.json({ record, token: sign(record) });
  } catch (e) {
    if (e instanceof BadInput) return NextResponse.json({ error: "bad_input", detail: e.message }, { status: 400 });
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

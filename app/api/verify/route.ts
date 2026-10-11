import { NextResponse } from "next/server";
import { verify } from "@/lib/sign";
import type { ProofRecord, ReviewRecord } from "@/lib/records";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as { token?: unknown; kind?: unknown } | null;
    const token = body?.token;
    const kind = body?.kind;
    if (typeof token !== "string" || (kind !== "proof" && kind !== "review")) {
      return NextResponse.json({ ok: false, error: "bad_input" }, { status: 400 });
    }
    const record = verify<ProofRecord | ReviewRecord>(token);
    if (!record || record.kind !== kind) return NextResponse.json({ ok: false });
    // Only shared proofs can be opened by a reviewer.
    if (record.kind === "proof" && !record.sharedAt) return NextResponse.json({ ok: false });
    return NextResponse.json({ ok: true, record });
  } catch {
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

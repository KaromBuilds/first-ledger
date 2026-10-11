import { NextResponse } from "next/server";
import { sign, verify } from "@/lib/sign";
import { BadInput, parseShare } from "@/lib/validate";
import type { ProofRecord } from "@/lib/records";

export const runtime = "nodejs";

// The candidate authorizes a share: optional correction note is added, the record is re-signed.
export async function POST(req: Request) {
  try {
    const { token, correctionNote } = parseShare(await req.json().catch(() => null));
    const record = verify<ProofRecord>(token);
    if (!record || record.kind !== "proof") return NextResponse.json({ error: "invalid_token" }, { status: 400 });
    const shared: ProofRecord = { ...record, correctionNote, sharedAt: Date.now() };
    return NextResponse.json({ token: sign(shared) });
  } catch (e) {
    if (e instanceof BadInput) return NextResponse.json({ error: "bad_input", detail: e.message }, { status: 400 });
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

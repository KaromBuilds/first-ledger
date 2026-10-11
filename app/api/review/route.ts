import { NextResponse } from "next/server";
import { hashToken, sign, verify } from "@/lib/sign";
import { BadInput, parseReview } from "@/lib/validate";
import type { ProofRecord, ReviewRecord } from "@/lib/records";

export const runtime = "nodejs";

// A named reviewer signs their decision. The review embeds the proof and its hash.
export async function POST(req: Request) {
  try {
    const { proofToken, review } = parseReview(await req.json().catch(() => null));
    const proof = verify<ProofRecord>(proofToken);
    if (!proof || proof.kind !== "proof" || !proof.sharedAt) return NextResponse.json({ error: "invalid_token" }, { status: 400 });
    const record: ReviewRecord = { kind: "review", v: 1, proofHash: hashToken(proofToken), proof, review, reviewedAt: Date.now() };
    return NextResponse.json({ token: sign(record) });
  } catch (e) {
    if (e instanceof BadInput) return NextResponse.json({ error: "bad_input", detail: e.message }, { status: 400 });
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

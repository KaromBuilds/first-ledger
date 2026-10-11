import { NextResponse } from "next/server";
import { randomBytes, randomInt } from "node:crypto";
import { sign } from "@/lib/sign";
import { TWISTS } from "@/lib/task";
import type { Ticket } from "@/lib/records";

export const runtime = "nodejs";

// Issues a signed start ticket: the server's clock and the assigned twist.
export async function POST() {
  try {
    const ticket: Ticket = {
      kind: "ticket",
      v: 1,
      id: randomBytes(6).toString("hex"),
      twistId: TWISTS[randomInt(TWISTS.length)].id,
      startedAt: Date.now(),
    };
    return NextResponse.json({ ticket: sign(ticket), twistId: ticket.twistId });
  } catch {
    return NextResponse.json({ error: "server_not_configured" }, { status: 500 });
  }
}

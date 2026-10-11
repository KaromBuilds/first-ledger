import { createHmac, createHash, timingSafeEqual } from "node:crypto";

// Records are never stored. They travel inside links the candidate creates,
// signed so a reviewer can verify nobody edited them.

function secret(): string {
  const s = process.env.PROOF_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV === "production") throw new Error("PROOF_SECRET is not configured");
  return "dev-only-secret-not-for-production";
}

const b64url = (buf: Buffer) => buf.toString("base64url");

export function sign(payload: object): string {
  const body = b64url(Buffer.from(JSON.stringify(payload), "utf8"));
  const sig = b64url(createHmac("sha256", secret()).update(body).digest());
  return `${body}.${sig}`;
}

export function verify<T = unknown>(token: string): T | null {
  if (typeof token !== "string" || token.length > 40_000) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = createHmac("sha256", secret()).update(body).digest();
  let given: Buffer;
  try {
    given = Buffer.from(sig, "base64url");
  } catch {
    return null;
  }
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex").slice(0, 16);
}

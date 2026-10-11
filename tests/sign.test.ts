import { describe, it, expect } from "vitest";
import { sign, verify } from "@/lib/sign";
import { parseEvaluate, parseReview, BadInput } from "@/lib/validate";

describe("signed links", () => {
  const token = sign({ kind: "proof", id: "abc", balance: 5_382_400 });

  it("verifies an untouched token", () => {
    expect(verify<{ id: string }>(token)?.id).toBe("abc");
  });

  it("rejects a token with any character changed", () => {
    const [body, sig] = token.split(".");
    for (const i of [0, Math.floor(body.length / 2), body.length - 1]) {
      const c = body[i] === "A" ? "B" : "A";
      expect(verify(`${body.slice(0, i)}${c}${body.slice(i + 1)}.${sig}`)).toBeNull();
    }
    expect(verify(`${body}.${sig.slice(0, -1)}${sig.endsWith("A") ? "B" : "A"}`)).toBeNull();
  });

  it("rejects garbage", () => {
    expect(verify("not-a-token")).toBeNull();
    expect(verify("a.b.c")).toBeNull();
  });
});

describe("input validation", () => {
  const ok = {
    ticket: "t",
    lang: "es",
    alias: "",
    flags: { L5: "book_error" },
    balance1: 100,
    twistCategory: "returned_cheque",
    balance2: 100,
    explanation: "El cheque rebotó y lo ajusto en libros.",
    explanationMode: "text",
    aiUse: "none",
    aiUseNote: "",
    part1Min: 12,
  };

  it("accepts a valid body", () => {
    expect(parseEvaluate(ok, "returned").flags).toEqual({ L5: "book_error" });
  });

  it("rejects an oversize explanation", () => {
    expect(() => parseEvaluate({ ...ok, explanation: "x".repeat(1201) }, "returned")).toThrow(BadInput);
  });

  it("rejects unknown lines and categories", () => {
    expect(() => parseEvaluate({ ...ok, flags: { Z9: "book_error" } }, "returned")).toThrow(BadInput);
    expect(() => parseEvaluate({ ...ok, flags: { L5: "fraud" } }, "returned")).toThrow(BadInput);
  });

  it("rejects non-integer amounts", () => {
    expect(() => parseEvaluate({ ...ok, balance1: 12.5 }, "returned")).toThrow(BadInput);
    expect(() => parseEvaluate({ ...ok, balance1: "100" }, "returned")).toThrow(BadInput);
  });

  it("requires reviewer name and role", () => {
    const review = {
      criteria: { what_changed: "yes", which_side: "partly", tell_owner: "no" },
      decision: "talk_first",
      addedEvidence: "yes",
      reviewerName: "",
      reviewerRole: "Dueña",
      note: "",
      reviewMin: 4,
    };
    expect(() => parseReview({ proofToken: "x", review })).toThrow(BadInput);
    expect(parseReview({ proofToken: "x", review: { ...review, reviewerName: "Demo Reviewer" } }).review.reviewerName).toBe("Demo Reviewer");
  });
});

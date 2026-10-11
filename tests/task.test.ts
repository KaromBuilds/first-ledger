import { describe, it, expect } from "vitest";
import { adjustedBalances, keyAssignment, BASE_ADJUSTED, TWISTS, EXPECTED } from "@/lib/task";
import { grade, parseMoney, type Submission } from "@/lib/grade";

describe("verified task bank", () => {
  it("base answer key balances on both sides", () => {
    const { bank, books } = adjustedBalances(keyAssignment());
    expect(bank).toBe(books);
    expect(bank).toBe(BASE_ADJUSTED);
  });

  for (const t of TWISTS) {
    it(`twist "${t.id}" answer key balances on both sides`, () => {
      const { bank, books } = adjustedBalances(keyAssignment(t), t);
      expect(bank).toBe(books);
      expect(bank).toBe(t.adjusted);
    });
  }
});

describe("grader", () => {
  const perfect: Submission = {
    flags: { L5: "book_error", L7: "outstanding_cheque", L8: "deposit_in_transit", B7: "bank_charge", B8: "bank_interest" },
    balance1: BASE_ADJUSTED,
    twistId: "returned",
    twistCategory: "returned_cheque",
    balance2: 4_737_400,
  };

  it("marks a perfect submission correct item by item", () => {
    const c = grade(perfect);
    expect(c.items.every((i) => i.found && i.categoryCorrect)).toBe(true);
    expect(c.extraFlags).toEqual([]);
    expect(c.balance1Correct && c.twistCategoryCorrect && c.balance2Correct).toBe(true);
  });

  it("flips only the item with the wrong category", () => {
    const c = grade({ ...perfect, flags: { ...perfect.flags, B7: "bank_interest" } });
    const wrong = c.items.filter((i) => !i.categoryCorrect).map((i) => i.key);
    expect(wrong).toEqual(["fee"]);
  });

  it("accepts the 0452 difference flagged on either side", () => {
    const { L5, ...rest } = perfect.flags;
    const c = grade({ ...perfect, flags: { ...rest, B5: "book_error" } });
    expect(c.items.find((i) => i.key === "chq0452")).toEqual({ key: "chq0452", found: true, categoryCorrect: true });
    expect(L5).toBe("book_error");
  });

  it("reports lines that match as extra flags", () => {
    const c = grade({ ...perfect, flags: { ...perfect.flags, L1: "deposit_in_transit" } });
    expect(c.extraFlags).toEqual(["L1"]);
  });

  it("covers every expected difference", () => {
    expect(grade(perfect).items.map((i) => i.key)).toEqual(EXPECTED.map((e) => e.key));
  });
});

describe("parseMoney", () => {
  it.each([
    ["53,824", 5_382_400],
    ["$53 824.00", 5_382_400],
    ["53824.5", 5_382_450],
    ["47374", 4_737_400],
  ])("parses %s", (input, cents) => expect(parseMoney(input)).toBe(cents));

  it.each(["", "abc", "53.824.00", "1e5"])("rejects %s", (input) => expect(parseMoney(input)).toBeNull());
});

import { isAtLeast18 } from "../src/lib/utils/age";

describe("isAtLeast18", () => {
  it("returns true for 20 years ago", () => {
    const past = new Date();
    past.setFullYear(past.getFullYear() - 20);
    expect(isAtLeast18(past.toISOString().slice(0, 10))).toBe(true);
  });

  it("returns false for 17 years ago", () => {
    const past = new Date();
    past.setFullYear(past.getFullYear() - 17);
    expect(isAtLeast18(past.toISOString().slice(0, 10))).toBe(false);
  });

  it("returns false for invalid date", () => {
    expect(isAtLeast18("not-a-date")).toBe(false);
  });
});

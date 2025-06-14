import { isAtLeast18 } from "../src/lib/utils/age";

describe("isAtLeast18 boundary", () => {
  it("returns true for exactly 18 years ago (including leap years)", () => {
    const now = new Date();
    const eighteenAgo = new Date(now);
    eighteenAgo.setFullYear(now.getFullYear() - 18);
    // Ensure we pick same month/day to avoid date shifting on leap year edge
    const dateStr = eighteenAgo.toISOString().slice(0, 10);
    expect(isAtLeast18(dateStr)).toBe(true);
  });
});

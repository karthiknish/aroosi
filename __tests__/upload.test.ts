import { canUploadMore } from "../src/lib/utils/upload";

describe("canUploadMore", () => {
  it("returns true when below limit", () => {
    expect(canUploadMore(3, 5)).toBe(true);
  });

  it("returns false when at limit", () => {
    expect(canUploadMore(5, 5)).toBe(false);
  });

  it("returns false when over limit", () => {
    expect(canUploadMore(6, 5)).toBe(false);
  });
});

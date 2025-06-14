import { canUploadMore } from "../src/lib/utils/upload";

describe("canUploadMore", () => {
  it("returns false when currentCount equals max", () => {
    expect(canUploadMore(5, 5)).toBe(false);
  });

  it("returns true when below max", () => {
    expect(canUploadMore(3, 5)).toBe(true);
  });

  it("defaults to max 5 when second arg omitted", () => {
    expect(canUploadMore(4)).toBe(true);
    expect(canUploadMore(5)).toBe(false);
  });
});

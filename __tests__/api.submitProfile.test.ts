import { submitProfile } from "../src/lib/profile/userProfileApi";
import { jest } from "@jest/globals";

describe("submitProfile", () => {
  const token = "tok";
  const values = { fullName: "A" };

  it("returns success true when 200", async () => {
    // @ts-expect-error - mock fetch response
    global.fetch = jest
      .fn()
      .mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: {} }),
      });
    const res = await submitProfile(token, values, "create", 0);
    expect(res.success).toBe(true);
  });

  it("returns error when non-200", async () => {
    // @ts-expect-error - mock fetch response
    global.fetch = jest
      .fn()
      .mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "err",
        json: () => Promise.resolve({}),
      });
    const res = await submitProfile(token, values, "create", 0);
    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();
  });
});

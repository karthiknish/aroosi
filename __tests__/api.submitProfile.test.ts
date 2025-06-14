import { submitProfile } from "../src/lib/profile/userProfileApi";
import { jest } from "@jest/globals";

describe("submitProfile", () => {
  const token = "tok";
  const values = { fullName: "A" };

  it("returns success true when 200", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: {} }),
    } as unknown as Response);

    const res = await submitProfile(token, values, "create", 0);
    expect(res.success).toBe(true);

    fetchMock.mockRestore();
  });

  it("returns error when non-200", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "err",
      json: () => Promise.resolve({}),
    } as unknown as Response);

    const res = await submitProfile(token, values, "create", 0);
    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();

    fetchMock.mockRestore();
  });
});

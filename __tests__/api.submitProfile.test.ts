import { submitProfile } from "../src/lib/profile/userProfileApi";
import { jest } from "@jest/globals";

// Extend NodeJS global type with an optional fetch for tests
declare global {
   
  interface Global {
    fetch?: typeof fetch;
  }
}

describe("submitProfile", () => {
  const token = "tok";
  const values = { fullName: "A" };

  function ensureGlobalFetch(mockResponse: Response) {
    const g = global as Global;
    if (!g.fetch) {
      g.fetch = () => Promise.resolve(mockResponse);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic fetch spy
    const spy = jest.spyOn(g as any, "fetch");
    spy.mockImplementation(() => Promise.resolve(mockResponse));
    return spy;
  }

  it("returns success true when 200", async () => {
    const successResp = new Response(
      JSON.stringify({ success: true, data: {} }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );

    const fetchMock = ensureGlobalFetch(successResp);

    const res = await submitProfile(token, values, "create", 0);
    expect(res.success).toBe(true);

    fetchMock.mockRestore();
  });

  it("returns error when non-200", async () => {
    const errorResp = new Response("{}", { status: 500, statusText: "err" });
    const fetchMock = ensureGlobalFetch(errorResp);

    const res = await submitProfile(token, values, "create", 0);
    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();

    fetchMock.mockRestore();
  });
});

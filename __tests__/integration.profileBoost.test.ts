import { NextRequest } from "next/server";
import { POST as boostHandler } from "../src/app/api/profile/boost/route";

jest.mock("@/lib/convexClient", () => ({
  convexClientFromRequest: jest.fn(),
}));

const { convexClientFromRequest } = jest.requireMock("@/lib/convexClient");

describe("/api/profile/boost integration", () => {
  const url = "http://localhost/api/profile/boost";

  it("returns 500 when Convex not configured", async () => {
    convexClientFromRequest.mockResolvedValue(null);
    const req = new NextRequest(url, { method: "POST" });
    const res = await boostHandler(req);
    expect(res.status).toBe(500);
  });

  it("returns success when mutation resolves", async () => {
    convexClientFromRequest.mockResolvedValue({
      mutation: jest.fn().mockResolvedValue({ remainingBoosts: 2 }),
    });
    const req = new NextRequest(url, { method: "POST" });
    const res = await boostHandler(req);
    expect(res.status).toBe(200);
  });
});

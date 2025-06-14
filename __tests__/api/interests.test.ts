/* eslint-disable */
import { POST, GET, DELETE } from "../../src/app/api/interests/route";
import { NextRequest } from "next/server";

describe("/api/interests API", () => {
  it("should return 401 if no token on POST", async () => {
    const req = new NextRequest("http://localhost", { method: "POST" });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("should return 401 if no token on GET", async () => {
    const req = new NextRequest("http://localhost?userId=test", {
      method: "GET",
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("should return 400 for invalid POST payload", async () => {
    process.env.NEXT_PUBLIC_CONVEX_URL = "http://localhost";
    const req = new NextRequest("http://localhost", {
      method: "POST",
      headers: { authorization: "Bearer test" },
    });
    req.json = async () => ({ fromUserId: 123 });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("should return 401 if no token on DELETE", async () => {
    const req = new NextRequest("http://localhost", { method: "DELETE" });
    const res = await DELETE(req);
    expect(res.status).toBe(401);
  });

  // Add more tests for valid payloads and error cases as needed
});

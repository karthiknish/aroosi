import { jest } from "@jest/globals";
import { NextRequest } from "next/server";

// Mock the Convex client helper _before_ importing the route handlers so that
// the file-level call to `getConvexClient()` inside the module receives the
// mocked instance rather than a real client (or `null`).
let mockConvexClient: {
  setAuth: jest.Mock;
  query: jest.Mock;
  mutation: jest.Mock;
};

jest.mock("@/lib/convexClient", () => {
  mockConvexClient = {
    setAuth: jest.fn(),
    query: jest.fn(),
    mutation: jest.fn(),
  };
  return {
    getConvexClient: jest.fn(() => mockConvexClient),
  };
});

// Import the route handlers *after* the mock above so the mocked client is
// captured in the module scope of the route file.
import {
  GET as profileGet,
  PUT as profilePut,
  POST as profilePost,
  DELETE as profileDelete,
} from "../src/app/api/profile/route";

// Type helper to avoid casting in every call below.
const asRequest = (req: NextRequest | Request): Request =>
  req as unknown as Request;

const URL_BASE = "http://localhost/api/profile";

describe("/api/profile integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 for GET without Authorization header", async () => {
    const req = new NextRequest(URL_BASE, { method: "GET" });
    const res = await profileGet(asRequest(req));
    expect(res.status).toBe(401);
  });

  it("returns 200 for GET with valid token and profile", async () => {
    mockConvexClient.query.mockResolvedValue({
      _id: "user1",
      profile: { _id: "profile1" },
    } as never);

    const req = new NextRequest(URL_BASE, {
      method: "GET",
      headers: { Authorization: "Bearer testtoken" },
    });

    const res = await profileGet(asRequest(req));
    expect(res.status).toBe(200);
  });

  it("returns 401 for PUT without token", async () => {
    const req = new NextRequest(URL_BASE, { method: "PUT" });
    const res = await profilePut(asRequest(req));
    expect(res.status).toBe(401);
  });

  it("returns 401 for POST without token", async () => {
    const req = new NextRequest(URL_BASE, { method: "POST" });
    const res = await profilePost(req as unknown as NextRequest);
    expect(res.status).toBe(401);
  });

  it("returns 401 for DELETE without token", async () => {
    const req = new NextRequest(URL_BASE, { method: "DELETE" });
    const res = await profileDelete(asRequest(req));
    expect(res.status).toBe(401);
  });
});

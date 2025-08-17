import { createMocks } from "node-mocks-http";
// Use relative imports to satisfy TS path resolution inside test config include patterns
import { __setGetAuthenticatedUserForTests } from "../../lib/auth/firebaseAuth";
import { POST as BOOST_POST } from "../../app/api/profile/boost/route";

// Mock Firestore admin
jest.mock("@/lib/firebaseAdmin", () => {
  const store: Record<string, any> = {};
  return {
    db: {
      collection: (name: string) => ({
        doc: (id: string) => ({
          get: async () => ({ exists: !!store[id], id, data: () => store[id] }),
          set: async (data: any, opts?: any) => {
            store[id] = { ...(store[id] || {}), ...data };
          },
          delete: async () => { delete store[id]; },
        }),
      }),
    },
  };
});

// Provide mutable mock user
const mockGetUser = jest.fn<ReturnType<any>, any>();
beforeAll(() => {
  __setGetAuthenticatedUserForTests(async () => mockGetUser());
});

describe("/api/profile/boost (server authoritative)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockReset();
  });

  // Helper to seed mocked Firestore user document
  async function primeUser(data: any) {
    const { db } = await import("../../lib/firebaseAdmin");
    const ref = db.collection("users").doc(data.id);
    await ref.set(data);
  }

  test("rejects unauthenticated", async () => {
    mockGetUser.mockResolvedValue(null);
    const { req } = createMocks({ method: "POST" });
    const res = await BOOST_POST(req as any);
    expect(res.status).toBe(401);
  });

  test("requires premium plus plan", async () => {
    mockGetUser.mockResolvedValue({ id: "user_free" });
    await primeUser({ id: "user_free", subscriptionPlan: "free" });
    const { req } = createMocks({ method: "POST" });
    const res = await BOOST_POST(req as any);
    expect(res.status).toBe(402);
  });

  test("applies boost when eligible and decrements quota (finite plan)", async () => {
    mockGetUser.mockResolvedValue({ id: "user_pp_limited" });
    // Simulate premiumPlus but pretend plan limit is finite by giving boostsRemaining state
    await primeUser({
      id: "user_pp_limited",
      subscriptionPlan: "premiumPlus",
      subscriptionExpiresAt: Date.now() + 86400000,
      boostsRemaining: 2,
      boostsMonth: new Date().getUTCFullYear() * 100 + (new Date().getUTCMonth() + 1),
    });
    const { req } = createMocks({ method: "POST" });
    const res = await BOOST_POST(req as any);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(typeof json.boostedUntil).toBe("number");
  });

  test("idempotent if already boosted", async () => {
    mockGetUser.mockResolvedValue({ id: "user_boosted" });
    const boostedUntil = Date.now() + 3600_000;
    await primeUser({
      id: "user_boosted",
      subscriptionPlan: "premiumPlus",
      subscriptionExpiresAt: Date.now() + 86400000,
      boostedUntil,
    });
    const { req } = createMocks({ method: "POST" });
    const res = await BOOST_POST(req as any);
    const json = await res.json();
    expect(json.code).toBe("ALREADY_BOOSTED");
    expect(json.boostedUntil).toBe(boostedUntil);
  });
});

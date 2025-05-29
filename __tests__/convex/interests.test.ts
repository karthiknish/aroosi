import {
  sendInterest,
  removeInterest,
  getSentInterests,
} from "../../convex/interests";
describe("convex/interests", () => {
  it("should throw if fromUserId === toUserId", async () => {
    await expect(
      sendInterest.handler({ db: {} } as any, {
        fromUserId: "u1" as any,
        toUserId: "u1" as any,
      })
    ).rejects.toThrow();
  });

  it("should return error if duplicate interest", async () => {
    const ctx = {
      db: {
        query: () => ({
          withIndex: () => ({
            eq: () => ({ eq: () => ({ first: async () => ({}) }) }),
          }),
        }),
      },
    } as any;
    const result = await sendInterest.handler(ctx, {
      fromUserId: "u1" as any,
      toUserId: "u2" as any,
    });
    expect(result).toHaveProperty("error");
  });

  it("should succeed for removeInterest if not found (idempotent)", async () => {
    const ctx = {
      db: {
        query: () => ({
          withIndex: () => ({
            eq: () => ({ eq: () => ({ first: async () => null }) }),
          }),
        }),
        delete: jest.fn(),
      },
    } as any;
    const result = await removeInterest.handler(ctx, {
      fromUserId: "u1" as any,
      toUserId: "u2" as any,
    });
    expect(result).toHaveProperty("success");
  });

  // Add more tests for rate limit, duplicate, and success cases
});

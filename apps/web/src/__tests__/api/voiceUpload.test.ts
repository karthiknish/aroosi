jest.mock("@/lib/api/handler", () => ({
  createAuthenticatedHandler:
    (handler: (ctx: { request: { formData: () => Promise<FormData> }; user: { id: string; userId: string }; correlationId: string }) => Promise<Response>) =>
    async (request: { formData: () => Promise<FormData> }) =>
      handler({
        request,
        user: { id: "user1", userId: "user1" },
        correlationId: "test-correlation-id",
      }),
  successResponse: (data: unknown, status = 200) =>
    new Response(JSON.stringify({ success: true, data }), {
      status,
      headers: { "content-type": "application/json" },
    }),
  errorResponse: (error: string, status = 500) =>
    new Response(JSON.stringify({ success: false, error }), {
      status,
      headers: { "content-type": "application/json" },
    }),
}));

const profileGetMock = jest.fn();
const blockGetMock = jest.fn();

jest.mock("@/lib/firebaseAdmin", () => ({
  db: {
    collection: (name: string) => {
      if (name === "users") {
        return {
          doc: () => ({
            get: profileGetMock,
          }),
        };
      }

      return {
        where: () => ({
          where: () => ({
            limit: () => ({
              get: blockGetMock,
            }),
          }),
        }),
      };
    },
  },
  adminStorage: {
    bucket: jest.fn(),
  },
}));

jest.mock("@/lib/realtime/conversationEvents", () => ({
  emitConversationEvent: jest.fn(),
}));

import { POST } from "@/app/api/voice-messages/upload/route";

describe("/api/voice-messages/upload", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    profileGetMock.mockResolvedValue({
      exists: true,
      data: () => ({ subscriptionPlan: "premium" }),
    });
  });

  it("blocks uploads when either user has blocked the other via blockedUserId", async () => {
    blockGetMock
      .mockResolvedValueOnce({ size: 1 })
      .mockResolvedValueOnce({ size: 0 });

    const formData = new FormData();
    formData.append("audio", new File(["voice"], "voice.webm", { type: "audio/webm" }));
    formData.append("conversationId", "user1_user2");
    formData.append("duration", "4");
    formData.append("toUserId", "user2");

    const response = await POST({
      formData: async () => formData,
    } as never);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: "Cannot send voice message to this user",
    });
  });
});

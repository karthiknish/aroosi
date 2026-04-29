import { authAPI } from "@/lib/api/auth";
import { culturalAPI } from "@/lib/api/cultural";
import { engagementAPI } from "@/lib/api/engagement";

describe("web API wrappers", () => {
  const fetchMock = jest.spyOn(global, "fetch");

  beforeEach(() => {
    fetchMock.mockReset();
  });

  afterAll(() => {
    fetchMock.mockRestore();
  });

  it("sends password changes to the password endpoint", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );

    await authAPI.changePassword("OldPass123", "NewPass123");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/password",
      expect.objectContaining({
        method: "PATCH",
        credentials: "include",
        body: JSON.stringify({
          currentPassword: "OldPass123",
          newPassword: "NewPass123",
        }),
      })
    );
  });

  it("updates supervised conversations with PUT", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            conversation: {
              id: "conv_1",
              requesterId: "user_1",
              targetUserId: "user_2",
              supervisorId: "user_3",
              status: "active",
              createdAt: "2026-04-29T00:00:00.000Z",
            },
          },
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        }
      )
    );

    const result = await culturalAPI.updateSupervisedConversation("conv_1", {
      status: "active",
      conversationId: "chat_1",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/cultural/supervised-conversation/conv_1",
      expect.objectContaining({
        method: "PUT",
        credentials: "include",
        body: JSON.stringify({ status: "active", conversationId: "chat_1" }),
      })
    );
    expect(result.status).toBe("active");
  });

  it("posts engagement profile lookups with user ids", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          data: [
            { userId: "user_1", fullName: "Aroosi User", city: "London", imageUrl: null },
          ],
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        }
      )
    );

    const result = await engagementAPI.getProfiles(["user_1"]);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/engagement/profiles",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ userIds: ["user_1"] }),
      })
    );
    expect(result).toEqual([
      { userId: "user_1", fullName: "Aroosi User", city: "London", imageUrl: null },
    ]);
  });

  it("skips engagement profile fetches when no ids are provided", async () => {
    await expect(engagementAPI.getProfiles([])).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

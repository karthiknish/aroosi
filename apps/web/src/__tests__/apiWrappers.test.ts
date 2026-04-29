import { authAPI } from "@/lib/api/auth";
import { culturalAPI } from "@/lib/api/cultural";
import { engagementAPI } from "@/lib/api/engagement";
import { matchMessagesAPI } from "@/lib/api/matchMessages";
import { profileImagesAPI } from "@/lib/api/profileImages";

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

  it("requires explicit confirmation payload for account deletion", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );

    await authAPI.deleteAccount({ confirmed: true, reason: "User requested deletion" });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/delete-account",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ confirmed: true, reason: "User requested deletion" }),
      })
    );
  });

  it("fetches match messages from GET /api/messages and unwraps the messages array", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            messages: [{ _id: "msg_1", conversationId: "user_1_user_2", fromUserId: "user_1", toUserId: "user_2", type: "text", text: "Hello", createdAt: 1 }],
          },
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        }
      )
    );

    const result = await matchMessagesAPI.getMessages({
      conversationId: "user_1_user_2",
      limit: 20,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/messages?conversationId=user_1_user_2&limit=20",
      expect.objectContaining({ credentials: "include" })
    );
    expect(result).toEqual({
      success: true,
      data: [{ _id: "msg_1", conversationId: "user_1_user_2", fromUserId: "user_1", toUserId: "user_2", type: "text", text: "Hello", createdAt: 1 }],
    });
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

  it("sends family approval requests with relationship", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            request: {
              id: "req_1",
              familyMemberId: "user_family",
              requesterId: "user_requester",
              targetUserId: "user_target",
              status: "pending",
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

    await culturalAPI.requestFamilyApproval("user_family", "sibling", "Please review");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/cultural/family-approval/request",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ familyMemberId: "user_family", relationship: "sibling", message: "Please review" }),
      })
    );
  });

  it("sends family approval responses with action and responseMessage", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            request: {
              id: "req_1",
              status: "approved",
            },
          },
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        }
      )
    );

    await culturalAPI.respondToFamilyApproval("req_1", "approved", "Looks good");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/cultural/family-approval/respond",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ requestId: "req_1", action: "approved", responseMessage: "Looks good" }),
      })
    );
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

  it("toggles shortlist removal through the shortlist POST route", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, data: { removed: true } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );

    await engagementAPI.removeFromShortlist("user_2");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/engagement/shortlist",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ toUserId: "user_2" }),
      })
    );
  });

  it("saves engagement notes with the route's note payload", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, data: { updated: true } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );

    await engagementAPI.saveNote("user_2", "Important note");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/engagement/notes",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ toUserId: "user_2", note: "Important note" }),
      })
    );
  });

  it("skips quick picks with toUserId payload", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, data: { action: "skip" } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );

    await engagementAPI.skipQuickPick("user_2");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/engagement/quick-picks",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ toUserId: "user_2", action: "skip" }),
      })
    );
  });

  it("sets the main profile image with PUT", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, data: { mainImageId: "img_1" } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );

    await profileImagesAPI.setMain("img_1");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/profile-images/main",
      expect.objectContaining({
        method: "PUT",
        credentials: "include",
        body: JSON.stringify({ imageId: "img_1" }),
      })
    );
  });

  it("confirms profile images with fileName and uploadId", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, data: { uploadId: "users/u1/images/img_1" } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );

    await profileImagesAPI.confirm({ fileName: "avatar.jpg", uploadId: "users/u1/images/img_1" });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/profile-images/confirm",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ fileName: "avatar.jpg", uploadId: "users/u1/images/img_1" }),
      })
    );
  });
});

jest.mock("@/lib/api/safety", () => ({
  safetyAPI: {
    reportUser: jest.fn(),
    blockUser: jest.fn(),
    unblockUser: jest.fn(),
  },
}));

jest.mock("@/lib/voiceMessageUtil", () => ({
  uploadVoiceMessage: jest.fn(),
}));

import { safetyAPI } from "@/lib/api/safety";
import {
  blockUserAction,
  reportUserAction,
  unblockUserAction,
} from "@/lib/chat/actions";

describe("chat safety actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("reports users with the cookie-auth payload shape", async () => {
    await reportUserAction("user_2", "harassment", "Details");

    expect(safetyAPI.reportUser).toHaveBeenCalledWith({
      reportedUserId: "user_2",
      reason: "harassment",
      description: "Details",
    });
  });

  it("blocks users with a single blocked user id", async () => {
    await blockUserAction("user_2");

    expect(safetyAPI.blockUser).toHaveBeenCalledWith("user_2");
  });

  it("unblocks users with a single blocked user id", async () => {
    await unblockUserAction("user_2");

    expect(safetyAPI.unblockUser).toHaveBeenCalledWith("user_2");
  });
});

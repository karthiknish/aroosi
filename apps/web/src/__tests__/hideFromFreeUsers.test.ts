import { describe, it, expect } from "@jest/globals";

describe("hideFromFreeUsers functionality", () => {
  it("should filter out profiles with hideFromFreeUsers=true when viewer is free user", () => {
    const profiles = [
      {
        _id: "1",
        userId: "user1",
        fullName: "John Doe",
        hideFromFreeUsers: true,
        isApproved: true,
      },
      {
        _id: "2",
        userId: "user2",
        fullName: "Jane Smith",
        hideFromFreeUsers: false,
        isApproved: true,
      },
      {
        _id: "3",
        userId: "user3",
        fullName: "Bob Johnson",
        hideFromFreeUsers: undefined,
        isApproved: true,
      },
    ];

    const currentUser = {
      userId: "viewer",
      subscriptionPlan: "free" as const,
    };

    const filteredProfiles = profiles.filter((p) => {
      const viewerPlan = currentUser?.subscriptionPlan || "free";
      if (p.hideFromFreeUsers && viewerPlan === "free") return false;
      return true;
    });

    expect(filteredProfiles).toHaveLength(2);
    expect(filteredProfiles.map((p) => p._id)).toEqual(["2", "3"]);
  });

  it("should show all profiles when viewer is premium user", () => {
    const profiles = [
      {
        _id: "1",
        userId: "user1",
        fullName: "John Doe",
        hideFromFreeUsers: true,
        isApproved: true,
      },
      {
        _id: "2",
        userId: "user2",
        fullName: "Jane Smith",
        hideFromFreeUsers: false,
        isApproved: true,
      },
    ];

    const currentUser = {
      userId: "viewer",
      subscriptionPlan: "premium" as "free" | "premium" | "premiumPlus",
    };

    const filteredProfiles = profiles.filter((p) => {
      const viewerPlan = currentUser?.subscriptionPlan || "free";
      if (p.hideFromFreeUsers && viewerPlan === "free") return false;
      return true;
    });

    expect(filteredProfiles).toHaveLength(2);
    expect(filteredProfiles.map((p) => p._id)).toEqual(["1", "2"]);
  });

  it("should show all profiles when viewer is premiumPlus user", () => {
    const profiles = [
      {
        _id: "1",
        userId: "user1",
        fullName: "John Doe",
        hideFromFreeUsers: true,
        isApproved: true,
      },
    ];

    const currentUser = {
      userId: "viewer",
      subscriptionPlan: "premiumPlus" as "free" | "premium" | "premiumPlus",
    };

    const filteredProfiles = profiles.filter((p) => {
      const viewerPlan: "free" | "premium" | "premiumPlus" =
        currentUser?.subscriptionPlan || "free";
      if (p.hideFromFreeUsers && viewerPlan === "free") return false;
      return true;
    });

    expect(filteredProfiles).toHaveLength(1);
  });
});

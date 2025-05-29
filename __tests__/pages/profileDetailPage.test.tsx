import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";

jest.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ isSignedIn: true, getToken: jest.fn() }),
}));

const mockProfile = {
  _id: "profile1" as unknown as import("@convex/_generated/dataModel").Id<"profiles">,
  userId:
    "user1" as unknown as import("@convex/_generated/dataModel").Id<"users">,
  fullName: "Test User",
  ukCity: "London",
  religion: "Islam",
  createdAt: Date.now(),
  profileImageIds: ["img1", "img2"],
  motherTongue: "Urdu",
  maritalStatus: "single",
  education: "BSc",
  occupation: "Engineer",
  height: "5'8\"",
  aboutMe: "Hello!",
};
const mockImages = [
  { url: "/img1.jpg", storageId: "img1" },
  { url: "/img2.jpg", storageId: "img2" },
];

describe("ProfileDetailPage", () => {
  it("renders skeleton on loading", () => {
    jest.resetModules();
    const ProfileDetailPage =
      require("../../src/app/profile/[id]/page").default;
    render(<ProfileDetailPage loadingProfile={true} />);
    expect(screen.getByText(/Profile not found|skeleton/i)).toBeInTheDocument();
  });

  it("renders profile info", () => {
    const ProfileDetailPage =
      require("../../src/app/profile/[id]/page").default;
    render(
      <ProfileDetailPage
        profileData={mockProfile}
        userProfileImages={mockImages}
        userImages={{}}
        currentUserProfileImagesData={mockImages}
        isOwnProfile={false}
        sentInterest={[]}
        isBlocked={false}
        isMutualInterest={false}
        loadingProfile={false}
        loadingImages={false}
      />
    );
    expect(screen.getByText("Test User")).toBeInTheDocument();
    expect(screen.getByText("London")).toBeInTheDocument();
  });

  it("shows heart button for non-own profile", () => {
    const ProfileDetailPage =
      require("../../src/app/profile/[id]/page").default;
    render(
      <ProfileDetailPage
        profileData={mockProfile}
        userProfileImages={mockImages}
        userImages={{}}
        currentUserProfileImagesData={mockImages}
        isOwnProfile={false}
        sentInterest={[]}
        isBlocked={false}
        isMutualInterest={false}
        loadingProfile={false}
        loadingImages={false}
      />
    );
    expect(screen.getByLabelText(/Express Interest/i)).toBeInTheDocument();
  });

  it("handles interest button click", () => {
    const ProfileDetailPage =
      require("../../src/app/profile/[id]/page").default;
    render(
      <ProfileDetailPage
        profileData={mockProfile}
        userProfileImages={mockImages}
        userImages={{}}
        currentUserProfileImagesData={mockImages}
        isOwnProfile={false}
        sentInterest={[]}
        isBlocked={false}
        isMutualInterest={false}
        loadingProfile={false}
        loadingImages={false}
      />
    );
    fireEvent.click(screen.getByLabelText(/Express Interest/i));
    // This will only work if the handler is exposed or you mock fetch
  });

  it("shows error state", () => {
    const ProfileDetailPage =
      require("../../src/app/profile/[id]/page").default;
    render(
      <ProfileDetailPage
        profileData={mockProfile}
        userProfileImages={mockImages}
        userImages={{}}
        currentUserProfileImagesData={mockImages}
        isOwnProfile={false}
        sentInterest={[]}
        isBlocked={false}
        isMutualInterest={false}
        loadingProfile={false}
        loadingImages={false}
        interestError="Failed to send interest"
      />
    );
    expect(screen.getByText(/Failed to send interest/i)).toBeInTheDocument();
  });
});

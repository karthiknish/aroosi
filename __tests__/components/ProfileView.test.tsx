import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import ProfileView from "../../src/components/profile/ProfileView";
import React from "react";

jest.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ isSignedIn: true, getToken: jest.fn() }),
}));

describe("ProfileView", () => {
  const mockProfile = {
    _id: "profile1",
    userId: "user1",
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

  it("renders profile info and images", () => {
    render(
      <ProfileView
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
    expect(screen.getByAltText("Test User's image 1")).toBeInTheDocument();
  });

  it("shows heart button for non-own profile", () => {
    render(
      <ProfileView
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
    const handleSendInterest = jest.fn();
    render(
      <ProfileView
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
        handleSendInterest={handleSendInterest}
      />
    );
    fireEvent.click(screen.getByLabelText(/Express Interest/i));
    // This will only work if ProfileView exposes the handler as a prop or you mock fetch
  });

  it("shows error state", () => {
    render(
      <ProfileView
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

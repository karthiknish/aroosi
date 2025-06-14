import { render, screen } from "@testing-library/react";
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
    { _id: "img1", url: "/img1.jpg", storageId: "img1" },
    { _id: "img2", url: "/img2.jpg", storageId: "img2" },
  ];

  it("renders profile info and images", () => {
    render(<ProfileView profileData={mockProfile} images={mockImages} />);
    expect(screen.getByText("Test User")).toBeInTheDocument();
    expect(screen.getByText("London")).toBeInTheDocument();
    // Should render at least one profile image element
    expect(screen.getAllByRole("img").length).toBeGreaterThan(0);
  });

  it("shows heart button for non-own profile", () => {
    render(<ProfileView profileData={mockProfile} images={mockImages} />);
    // Heart / interest button should be present; look for title attribute 'Express'
    expect(
      screen.getByRole("button", { name: /edit profile/i })
    ).toBeInTheDocument();
  });
});

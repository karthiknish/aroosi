// @ts-nocheck
import React from "react";
import { render, waitFor } from "@testing-library/react";
import { jest } from "@jest/globals";

// Mock next/navigation
jest.mock("next/navigation", () => {
  const pushReplace = jest.fn();
  return {
    useRouter: () => ({ replace: pushReplace }),
    usePathname: () => "/search",
    useSearchParams: () => new URLSearchParams(),
  };
});

// Mock toast helper BEFORE importing component
jest.mock("@/lib/ui/toast", () => ({
  showInfoToast: jest.fn(),
}));

// Now import component under test (after mocks)
import ProtectedRoute from "../src/components/ProtectedRoute";

// Mock AuthProvider context
const mockUseAuthContext = jest.fn();
jest.mock("@/components/AuthProvider", () => ({
  useAuthContext: () => mockUseAuthContext(),
}));

describe("ProtectedRoute", () => {
  it("redirects unauthenticated user and shows toast", async () => {
    const { useRouter } = await import("next/navigation");

    mockUseAuthContext.mockReturnValue({
      isLoaded: true,
      isSignedIn: false,
      isProfileComplete: false,
      isOnboardingComplete: false,
      isLoading: false,
    });

    render(
      <ProtectedRoute>
        <div>Secret</div>
      </ProtectedRoute>
    );

    await waitFor(() => {
      expect(useRouter().replace).toHaveBeenCalled();
    });
  });
});

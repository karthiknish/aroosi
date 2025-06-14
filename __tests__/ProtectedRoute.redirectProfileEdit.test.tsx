import React from "react";
import { render, waitFor } from "@testing-library/react";
import { jest } from "@jest/globals";

// Mock router
jest.mock("next/navigation", () => {
  const pushReplace = jest.fn();
  return {
    useRouter: () => ({ replace: pushReplace }),
    usePathname: () => "/search", // protected route
    useSearchParams: () => new URLSearchParams(),
  };
});

// Stub toast to avoid side effects
jest.mock("@/lib/ui/toast", () => ({ showInfoToast: jest.fn() }));

import ProtectedRoute from "../src/components/ProtectedRoute";
import { useRouter } from "next/navigation";

// Mock Auth context
const mockUseAuthContext = jest.fn();
jest.mock("@/components/AuthProvider", () => ({
  useAuthContext: () => mockUseAuthContext(),
}));

describe("ProtectedRoute redirect to profile edit", () => {
  it("redirects when profile incomplete", async () => {
    mockUseAuthContext.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      isProfileComplete: false,
      isOnboardingComplete: false,
      isLoading: false,
    });

    render(
      <ProtectedRoute>
        <div>Home</div>
      </ProtectedRoute>
    );

    await waitFor(() => {
      const replaceMock = useRouter().replace as jest.Mock;
      const callArg = replaceMock.mock.calls[0][0];
      expect(["/profile/edit", "/search"]).toContain(callArg);
    });
  });
});

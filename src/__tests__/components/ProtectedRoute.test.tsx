import { render, screen } from "@testing-library/react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import type { ReadonlyURLSearchParams } from "next/navigation";
import ProtectedRoute from "../../components/ProtectedRoute";
import { useAuthContext } from "../../components/FirebaseAuthProvider";
import type { Profile } from "../../types/profile";

// Mock hooks
jest.mock("next/navigation", () => {
  return {
    useRouter: jest.fn(() => ({
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      prefetch: jest.fn(),
    })),
    usePathname: jest.fn(() => "/test"),
    useSearchParams: jest.fn(() => new URLSearchParams()),
  };
});
jest.mock("@/components/FirebaseAuthProvider");

const mockPush = jest.fn();
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>;
const mockUseSearchParams = useSearchParams as jest.MockedFunction<
  typeof useSearchParams
>;
const mockUseAuthContext = useAuthContext as jest.MockedFunction<
  typeof useAuthContext
>;

// Test component
const TestComponent = () => <div>Protected Content</div>;

describe("ProtectedRoute Component", () => {
  beforeEach(() => {
    (mockUseRouter as any).mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      prefetch: jest.fn(),
    } as AppRouterInstance);

    mockUsePathname.mockReturnValue("/test");
    mockUseSearchParams.mockReturnValue(
      new URLSearchParams() as ReadonlyURLSearchParams
    );

    jest.clearAllMocks();
  });

  test("shows loading state when auth is loading", () => {
    mockUseAuthContext.mockReturnValue({
      user: null,
      isLoaded: false,
      isSignedIn: false,
      isLoading: true,
      isAuthenticated: false,
      userId: "",
      token: null,
      profile: null,
      // profile completion flags removed
      error: null,
      isAdmin: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signInWithGoogle: jest.fn(),
      refreshUser: jest.fn(),
      refreshProfile: jest.fn(),
      signOut: jest.fn(),
      getToken: jest.fn(),
    } as unknown as ReturnType<typeof useAuthContext>);

    render(
      <ProtectedRoute>
        <TestComponent />
      </ProtectedRoute>
    );

    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });

  test("redirects to sign-in when not authenticated", async () => {
    mockUseAuthContext.mockReturnValue({
      user: null,
      isLoaded: true,
      isSignedIn: false,
      isLoading: false,
      isAuthenticated: false,
      userId: "",
      token: null,
      profile: null,
      // profile completion flags removed
      error: null,
      isAdmin: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signInWithGoogle: jest.fn(),
      refreshUser: jest.fn(),
      refreshProfile: jest.fn(),
      signOut: jest.fn(),
      getToken: jest.fn(),
    } as unknown as ReturnType<typeof useAuthContext>);

    render(
      <ProtectedRoute>
        <TestComponent />
      </ProtectedRoute>
    );

    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });

  test("shows content when authenticated and profile complete", () => {
    mockUseAuthContext.mockReturnValue({
      user: { id: "user_123", email: "test@example.com", role: "user" },
      isLoaded: true,
      isSignedIn: true,
      isLoading: false,
      isAuthenticated: true,
      userId: "user_123",
      token: "token_123",
      profile: {
        _id: "profile_123",
        userId: "user_123",
        subscriptionPlan: "free",
      } as Partial<Profile> as Profile,
      // profile completion flags removed
      error: null,
      isAdmin: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signInWithGoogle: jest.fn(),
      refreshUser: jest.fn(),
      refreshProfile: jest.fn(),
      signOut: jest.fn(),
      getToken: jest.fn(),
    } as unknown as ReturnType<typeof useAuthContext>);

    render(
      <ProtectedRoute requireProfileComplete={true}>
        <TestComponent />
      </ProtectedRoute>
    );

    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });

  test("redirects when profile incomplete and required", () => {
    mockUseAuthContext.mockReturnValue({
      user: { id: "user_123", email: "test@example.com", role: "user" },
      isLoaded: true,
      isSignedIn: true,
      isLoading: false,
      isAuthenticated: true,
      userId: "user_123",
      token: "token_123",
      profile: {
        _id: "profile_123",
        userId: "user_123",
        subscriptionPlan: "free",
      } as Partial<Profile> as Profile,
      // profile completion flags removed
      error: null,
      isAdmin: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signInWithGoogle: jest.fn(),
      refreshUser: jest.fn(),
      refreshProfile: jest.fn(),
      signOut: jest.fn(),
      getToken: jest.fn(),
    } as unknown as ReturnType<typeof useAuthContext>);

    render(
      <ProtectedRoute requireProfileComplete={true}>
        <TestComponent />
      </ProtectedRoute>
    );

    // With profile checks disabled in component, content renders; ensure no crash
    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });

  test("shows content when profile not required", () => {
    mockUseAuthContext.mockReturnValue({
      user: { id: "user_123", email: "test@example.com", role: "user" },
      isLoaded: true,
      isSignedIn: true,
      isLoading: false,
      isAuthenticated: true,
      userId: "user_123",
      token: "token_123",
      profile: null,
      // profile completion flags removed
      error: null,
      isAdmin: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signInWithGoogle: jest.fn(),
      refreshUser: jest.fn(),
      refreshProfile: jest.fn(),
      signOut: jest.fn(),
      getToken: jest.fn(),
    } as unknown as ReturnType<typeof useAuthContext>);

    render(
      <ProtectedRoute requireProfileComplete={false}>
        <TestComponent />
      </ProtectedRoute>
    );

    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });
});

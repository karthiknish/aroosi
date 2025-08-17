import { render, screen } from "@testing-library/react";
import { useAuth } from "@/hooks/useAuth";
import type { AuthContextType } from "@/components/FirebaseAuthProvider";
import HomePage from "@/app/page";

// Mock the useAuth hook
jest.mock("@/hooks/useAuth");

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Helper function to create complete AuthContextType objects
const createMockAuthState = (
  overrides: Partial<AuthContextType> = {}
): AuthContextType => ({
  user: null,
  isLoaded: true,
  isSignedIn: false,
  isLoading: false,
  isAuthenticated: false,
  // token removed in cookie-auth model
  isProfileComplete: false,
  isOnboardingComplete: false,
  isAdmin: false,
  userId: "",
  profile: null,
  error: null,
  signIn: jest.fn(),
  signUp: jest.fn(),
  // verifyOTP removed from AuthContextType; do not include in mocks
  signInWithGoogle: jest.fn(),
  signOut: jest.fn(),
  refreshUser: jest.fn(),
  // getToken removed from AuthContextType; do not include in mocks
  refreshProfile: jest.fn(),
  ...overrides,
});

describe("HomePage Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders hero section with main heading", () => {
    mockUseAuth.mockReturnValue(
      createMockAuthState({
        isSignedIn: false,
        isLoading: false,
      }),
    );

    render(<HomePage />);

    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/find your perfect/i)).toBeInTheDocument();
  });

  test("shows sign up button for unauthenticated users", () => {
    mockUseAuth.mockReturnValue(
      createMockAuthState({
        isSignedIn: false,
        isLoading: false,
      }),
    );

    render(<HomePage />);

    expect(
      screen.getByRole("link", { name: /get started/i }),
    ).toBeInTheDocument();
  });

  test("renders features section", () => {
    mockUseAuth.mockReturnValue(
      createMockAuthState({
        isSignedIn: false,
        isLoading: false,
      }),
    );

    render(<HomePage />);

    expect(screen.getByText(/why choose aroosi/i)).toBeInTheDocument();
  });

  test("renders testimonials section", () => {
    mockUseAuth.mockReturnValue(
      createMockAuthState({
        isSignedIn: false,
        isLoading: false,
      }),
    );

    render(<HomePage />);

    expect(screen.getByText(/what our users say/i)).toBeInTheDocument();
  });

  test("shows loading state when auth is loading", () => {
    mockUseAuth.mockReturnValue(
      createMockAuthState({
        isSignedIn: false,
        isLoading: true,
      }),
    );

    render(<HomePage />);

    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
  });
});

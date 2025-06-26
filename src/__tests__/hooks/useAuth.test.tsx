import { renderHook, waitFor } from '@testing-library/react';
import { useAuth } from '@/hooks/useAuth';
import { useUser } from '@clerk/nextjs';
import { useQuery } from 'convex/react';

// Mock Clerk's useUser hook
jest.mock('@clerk/nextjs', () => ({
  useUser: jest.fn(),
}));

// Mock Convex queries
jest.mock('convex/react', () => ({
  useQuery: jest.fn(),
}));

const mockUseUser = useUser as jest.MockedFunction<typeof useUser>;
const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;

describe('useAuth Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns loading state initially', () => {
    mockUseUser.mockReturnValue({
      isLoaded: false,
      isSignedIn: false,
      user: null,
    });

    const { result } = renderHook(() => useAuth());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBe(null);
  });

  test('returns authenticated state when user is signed in', async () => {
    const mockUser = {
      id: 'user_123',
      emailAddresses: [{ emailAddress: 'test@example.com' }],
      firstName: 'John',
      lastName: 'Doe',
    };

    mockUseUser.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      user: mockUser,
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);
    });
  });

  test('returns unauthenticated state when user is not signed in', async () => {
    mockUseUser.mockReturnValue({
      isLoaded: true,
      isSignedIn: false,
      user: null,
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBe(null);
    });
  });

  test('provides user profile data when available', async () => {
    const mockUser = {
      id: 'user_123',
      emailAddresses: [{ emailAddress: 'test@example.com' }],
      firstName: 'John',
      lastName: 'Doe',
    };

    const mockProfile = {
      _id: 'profile_123',
      userId: 'user_123',
      name: 'John Doe',
      age: 25,
      isProfileComplete: true,
    };

    mockUseUser.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      user: mockUser,
    });

    // Mock Convex useQuery to return profile data
    mockUseQuery.mockReturnValue(mockProfile);

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.profile).toEqual(mockProfile);
      expect(result.current.hasCompleteProfile).toBe(true);
    });
  });

  test('indicates incomplete profile when profile is not complete', async () => {
    const mockUser = {
      id: 'user_123',
      emailAddresses: [{ emailAddress: 'test@example.com' }],
      firstName: 'John',
      lastName: 'Doe',
    };

    const mockProfile = {
      _id: 'profile_123',
      userId: 'user_123',
      name: 'John Doe',
      age: 25,
      isProfileComplete: false,
    };

    mockUseUser.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      user: mockUser,
    });

    mockUseQuery.mockReturnValue(mockProfile);

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.hasCompleteProfile).toBe(false);
    });
  });
});
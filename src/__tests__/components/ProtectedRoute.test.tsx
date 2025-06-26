import { render, screen } from '@testing-library/react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuthContext } from '@/components/AuthProvider';

// Mock hooks
jest.mock('next/navigation');
jest.mock('@/components/AuthProvider');

const mockPush = jest.fn();
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>;
const mockUseSearchParams = useSearchParams as jest.MockedFunction<typeof useSearchParams>;
const mockUseAuthContext = useAuthContext as jest.MockedFunction<typeof useAuthContext>;

// Test component
const TestComponent = () => <div>Protected Content</div>;

describe('ProtectedRoute Component', () => {
  beforeEach(() => {
    mockUseRouter.mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      prefetch: jest.fn(),
    } as any);
    
    mockUsePathname.mockReturnValue('/test');
    mockUseSearchParams.mockReturnValue({} as any);
    
    jest.clearAllMocks();
  });

  test('shows loading state when auth is loading', () => {
    mockUseAuthContext.mockReturnValue({
      isLoaded: false,
      isSignedIn: false,
      isLoading: true,
      userId: '',
      token: null,
      profile: null,
      isProfileComplete: false,
      isOnboardingComplete: false,
      error: null,
      isAdmin: false,
      refreshProfile: jest.fn(),
      updateProfileCompletion: jest.fn(),
      signOut: jest.fn(),
      getToken: jest.fn(),
    });

    render(
      <ProtectedRoute>
        <TestComponent />
      </ProtectedRoute>
    );

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  test('redirects to sign-in when not authenticated', async () => {
    mockUseAuthContext.mockReturnValue({
      isLoaded: true,
      isSignedIn: false,
      isLoading: false,
      userId: '',
      token: null,
      profile: null,
      isProfileComplete: false,
      isOnboardingComplete: false,
      error: null,
      isAdmin: false,
      refreshProfile: jest.fn(),
      updateProfileCompletion: jest.fn(),
      signOut: jest.fn(),
      getToken: jest.fn(),
    });

    render(
      <ProtectedRoute>
        <TestComponent />
      </ProtectedRoute>
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  test('shows content when authenticated and profile complete', () => {
    mockUseAuthContext.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      isLoading: false,
      userId: 'user_123',
      token: 'token_123',
      profile: { 
        _id: 'profile_123',
        userId: 'user_123',
        subscriptionPlan: 'free'
      } as any,
      isProfileComplete: true,
      isOnboardingComplete: true,
      error: null,
      isAdmin: false,
      refreshProfile: jest.fn(),
      updateProfileCompletion: jest.fn(),
      signOut: jest.fn(),
      getToken: jest.fn(),
    });

    render(
      <ProtectedRoute requireProfileComplete={true}>
        <TestComponent />
      </ProtectedRoute>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  test('redirects when profile incomplete and required', () => {
    mockUseAuthContext.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      isLoading: false,
      userId: 'user_123',
      token: 'token_123',
      profile: { 
        _id: 'profile_123',
        userId: 'user_123',
        subscriptionPlan: 'free'
      } as any,
      isProfileComplete: false,
      isOnboardingComplete: false,
      error: null,
      isAdmin: false,
      refreshProfile: jest.fn(),
      updateProfileCompletion: jest.fn(),
      signOut: jest.fn(),
      getToken: jest.fn(),
    });

    render(
      <ProtectedRoute requireProfileComplete={true}>
        <TestComponent />
      </ProtectedRoute>
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  test('shows content when profile not required', () => {
    mockUseAuthContext.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      isLoading: false,
      userId: 'user_123',
      token: 'token_123',
      profile: null,
      isProfileComplete: false,
      isOnboardingComplete: false,
      error: null,
      isAdmin: false,
      refreshProfile: jest.fn(),
      updateProfileCompletion: jest.fn(),
      signOut: jest.fn(),
      getToken: jest.fn(),
    });

    render(
      <ProtectedRoute requireProfileComplete={false}>
        <TestComponent />
      </ProtectedRoute>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });
});
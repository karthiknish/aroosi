import { render, screen, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';

// Mock hooks
jest.mock('next/navigation');
jest.mock('@/hooks/useAuth');

const mockPush = jest.fn();
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

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
    });
    jest.clearAllMocks();
  });

  test('shows loading state when auth is loading', () => {
    mockUseAuth.mockReturnValue({
      isLoading: true,
      isAuthenticated: false,
    });

    render(
      <ProtectedRoute>
        <TestComponent />
      </ProtectedRoute>
    );

    expect(screen.getByTestId('loading-state')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  test('redirects to sign-in when not authenticated', async () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: false,
    });

    render(
      <ProtectedRoute>
        <TestComponent />
      </ProtectedRoute>
    );

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/sign-in');
    });

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  test('redirects to profile setup when profile incomplete', async () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      hasCompleteProfile: false,
    });

    render(
      <ProtectedRoute requireCompleteProfile={true}>
        <TestComponent />
      </ProtectedRoute>
    );

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/profile-setup');
    });
  });

  test('renders children when authenticated with complete profile', async () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      hasCompleteProfile: true,
    });

    render(
      <ProtectedRoute requireCompleteProfile={true}>
        <TestComponent />
      </ProtectedRoute>
    );

    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  test('renders children when authenticated and complete profile not required', async () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      hasCompleteProfile: false,
    });

    render(
      <ProtectedRoute requireCompleteProfile={false}>
        <TestComponent />
      </ProtectedRoute>
    );

    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  test('uses custom redirect path', async () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: false,
    });

    render(
      <ProtectedRoute redirectTo="/custom-login">
        <TestComponent />
      </ProtectedRoute>
    );

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/custom-login');
    });
  });

  test('shows custom loading component', () => {
    mockUseAuth.mockReturnValue({
      isLoading: true,
      isAuthenticated: false,
    });

    const CustomLoading = () => <div>Custom Loading...</div>;

    render(
      <ProtectedRoute loadingComponent={<CustomLoading />}>
        <TestComponent />
      </ProtectedRoute>
    );

    expect(screen.getByText('Custom Loading...')).toBeInTheDocument();
    expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
  });

  test('handles admin role requirement', async () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      hasCompleteProfile: true,
      user: { role: 'user' },
    });

    render(
      <ProtectedRoute requireRole="admin">
        <TestComponent />
      </ProtectedRoute>
    );

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/unauthorized');
    });
  });

  test('allows access for admin role', async () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      hasCompleteProfile: true,
      user: { role: 'admin' },
    });

    render(
      <ProtectedRoute requireRole="admin">
        <TestComponent />
      </ProtectedRoute>
    );

    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  test('handles multiple requirements correctly', async () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      hasCompleteProfile: true,
      user: { role: 'admin' },
    });

    render(
      <ProtectedRoute requireCompleteProfile={true} requireRole="admin">
        <TestComponent />
      </ProtectedRoute>
    );

    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    expect(mockPush).not.toHaveBeenCalled();
  });
});
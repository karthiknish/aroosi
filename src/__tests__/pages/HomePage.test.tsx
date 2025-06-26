import { render, screen, fireEvent } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import HomePage from '@/app/page';
import { useAuth } from '@/hooks/useAuth';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock authentication
jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
}));

const mockPush = jest.fn();
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

describe('HomePage', () => {
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

  test('renders hero section with main heading', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
    });

    render(<HomePage />);

    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/find your perfect/i)).toBeInTheDocument();
  });

  test('shows sign up button for unauthenticated users', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
    });

    render(<HomePage />);

    const signUpButton = screen.getByRole('button', { name: /get started/i });
    expect(signUpButton).toBeInTheDocument();

    fireEvent.click(signUpButton);
    expect(mockPush).toHaveBeenCalledWith('/sign-up');
  });

  test('shows dashboard link for authenticated users', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      hasCompleteProfile: true,
    });

    render(<HomePage />);

    const dashboardButton = screen.getByRole('button', { name: /go to dashboard/i });
    expect(dashboardButton).toBeInTheDocument();

    fireEvent.click(dashboardButton);
    expect(mockPush).toHaveBeenCalledWith('/search');
  });

  test('shows complete profile link for authenticated users with incomplete profile', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      hasCompleteProfile: false,
    });

    render(<HomePage />);

    const completeProfileButton = screen.getByRole('button', { name: /complete profile/i });
    expect(completeProfileButton).toBeInTheDocument();

    fireEvent.click(completeProfileButton);
    expect(mockPush).toHaveBeenCalledWith('/profile-setup');
  });

  test('renders features section', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
    });

    render(<HomePage />);

    expect(screen.getByText(/verified profiles/i)).toBeInTheDocument();
    expect(screen.getByText(/secure messaging/i)).toBeInTheDocument();
    expect(screen.getByText(/cultural compatibility/i)).toBeInTheDocument();
  });

  test('renders testimonials section', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
    });

    render(<HomePage />);

    // Look for testimonial content
    expect(screen.getByText(/success stories/i)).toBeInTheDocument();
  });

  test('renders call-to-action section', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
    });

    render(<HomePage />);

    expect(screen.getByText(/ready to find/i)).toBeInTheDocument();
    expect(screen.getByText(/join thousands/i)).toBeInTheDocument();
  });

  test('shows loading state', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
    });

    render(<HomePage />);

    // Should still render main content but buttons might be disabled
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  test('has proper SEO structure', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
    });

    render(<HomePage />);

    // Check for proper heading hierarchy
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toBeInTheDocument();

    // Check for meta description content
    expect(screen.getByText(/afghan matrimony/i)).toBeInTheDocument();
  });

  test('navigates to pricing page', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
    });

    render(<HomePage />);

    const pricingLink = screen.getByRole('link', { name: /pricing/i });
    expect(pricingLink).toHaveAttribute('href', '/pricing');
  });

  test('is accessible', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
    });

    render(<HomePage />);

    // Check for proper ARIA labels and roles
    const mainContent = screen.getByRole('main');
    expect(mainContent).toBeInTheDocument();

    // Check buttons have accessible names
    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toHaveAccessibleName();
    });
  });
});
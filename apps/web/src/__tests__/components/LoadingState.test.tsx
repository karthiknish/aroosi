import { render, screen } from '@testing-library/react';
import { LoadingState } from '@/components/ui/LoadingState';

describe('LoadingState Component', () => {
  test('renders with default message', () => {
    render(<LoadingState />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  test('renders with custom message', () => {
    render(<LoadingState message="Loading profiles..." />);
    expect(screen.getByText('Loading profiles...')).toBeInTheDocument();
  });

  test('renders loading spinner', () => {
    render(<LoadingState />);
    const spinner = screen.getByTestId('loading-spinner');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('animate-spin');
  });

  test('applies custom className', () => {
    render(<LoadingState className="custom-loading" />);
    const container = screen.getByTestId('loading-state');
    expect(container).toHaveClass('custom-loading');
  });

  test('has proper ARIA attributes for accessibility', () => {
    render(<LoadingState />);
    const container = screen.getByTestId('loading-state');
    expect(container).toHaveAttribute('role', 'status');
    expect(container).toHaveAttribute('aria-live', 'polite');
  });

  test('renders different sizes correctly', () => {
    const { rerender } = render(<LoadingState size="sm" />);
    expect(screen.getByTestId('loading-spinner')).toHaveClass('w-4', 'h-4');

    rerender(<LoadingState size="lg" />);
    expect(screen.getByTestId('loading-spinner')).toHaveClass('w-8', 'h-8');
  });
});
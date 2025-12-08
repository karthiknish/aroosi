import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyState } from '@/components/ui/EmptyState';

describe('EmptyState Component', () => {
  test('renders with default message', () => {
    render(<EmptyState />);
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  test('renders with custom message', () => {
    render(<EmptyState message="No profiles found" />);
    expect(screen.getByText('No profiles found')).toBeInTheDocument();
  });

  test('renders action button when provided', () => {
    const handleAction = jest.fn();
    render(<EmptyState action={{ label: 'Create Profile', onClick: handleAction }} />);
    
    const button = screen.getByRole('button', { name: /create profile/i });
    expect(button).toBeInTheDocument();
    
    fireEvent.click(button);
    expect(handleAction).toHaveBeenCalledTimes(1);
  });

  test('renders custom icon when provided', () => {
    const CustomIcon = () => <div data-testid="custom-icon">Custom</div>;
    render(<EmptyState icon={<CustomIcon />} />);
    
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  test('applies custom className', () => {
    render(<EmptyState className="custom-empty-state" />);
    const container = screen.getByTestId('empty-state');
    expect(container).toHaveClass('custom-empty-state');
  });

  test('renders description when provided', () => {
    render(<EmptyState 
      message="No matches found" 
      description="Try adjusting your search criteria or filters"
    />);
    
    expect(screen.getByText('No matches found')).toBeInTheDocument();
    expect(screen.getByText('Try adjusting your search criteria or filters')).toBeInTheDocument();
  });

  test('has proper structure for accessibility', () => {
    render(<EmptyState message="Empty state" />);
    const container = screen.getByTestId('empty-state');
    expect(container).toHaveAttribute('role', 'status');
  });
});
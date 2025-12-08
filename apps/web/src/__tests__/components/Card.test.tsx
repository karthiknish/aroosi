import { render, screen } from '@testing-library/react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';

describe('Card Components', () => {
  describe('Card', () => {
    test('renders card with children', () => {
      render(
        <Card data-testid="test-card">
          <div>Card content</div>
        </Card>
      );

      const card = screen.getByTestId('test-card');
      expect(card).toBeInTheDocument();
      expect(screen.getByText('Card content')).toBeInTheDocument();
    });

    test('applies custom className', () => {
      render(
        <Card className="custom-card" data-testid="test-card">
          Content
        </Card>
      );

      const card = screen.getByTestId('test-card');
      expect(card).toHaveClass('custom-card');
    });

    test('forwards ref correctly', () => {
      const ref = jest.fn();
      render(
        <Card ref={ref} data-testid="test-card">
          Content
        </Card>
      );

      expect(ref).toHaveBeenCalled();
    });
  });

  describe('CardHeader', () => {
    test('renders header with children', () => {
      render(
        <CardHeader data-testid="card-header">
          <h2>Header Content</h2>
        </CardHeader>
      );

      const header = screen.getByTestId('card-header');
      expect(header).toBeInTheDocument();
      expect(screen.getByText('Header Content')).toBeInTheDocument();
    });

    test('has correct default styling', () => {
      render(
        <CardHeader data-testid="card-header">
          Header
        </CardHeader>
      );

      const header = screen.getByTestId('card-header');
      expect(header).toHaveClass('flex', 'flex-col', 'space-y-1.5', 'p-6');
    });
  });

  describe('CardTitle', () => {
    test('renders title with correct heading level', () => {
      render(<CardTitle>Test Title</CardTitle>);

      const title = screen.getByRole('heading', { level: 3 });
      expect(title).toBeInTheDocument();
      expect(title).toHaveTextContent('Test Title');
    });

    test('has correct styling classes', () => {
      render(<CardTitle>Test Title</CardTitle>);

      const title = screen.getByRole('heading');
      expect(title).toHaveClass('text-2xl', 'font-semibold', 'leading-none', 'tracking-tight');
    });

    test('applies custom className', () => {
      render(<CardTitle className="custom-title">Test Title</CardTitle>);

      const title = screen.getByRole('heading');
      expect(title).toHaveClass('custom-title');
    });
  });

  describe('CardContent', () => {
    test('renders content with children', () => {
      render(
        <CardContent data-testid="card-content">
          <p>Card body content</p>
        </CardContent>
      );

      const content = screen.getByTestId('card-content');
      expect(content).toBeInTheDocument();
      expect(screen.getByText('Card body content')).toBeInTheDocument();
    });

    test('has correct default styling', () => {
      render(
        <CardContent data-testid="card-content">
          Content
        </CardContent>
      );

      const content = screen.getByTestId('card-content');
      expect(content).toHaveClass('p-6', 'pt-0');
    });
  });

  describe('CardFooter', () => {
    test('renders footer with children', () => {
      render(
        <CardFooter data-testid="card-footer">
          <button>Action</button>
        </CardFooter>
      );

      const footer = screen.getByTestId('card-footer');
      expect(footer).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
    });

    test('has correct default styling', () => {
      render(
        <CardFooter data-testid="card-footer">
          Footer
        </CardFooter>
      );

      const footer = screen.getByTestId('card-footer');
      expect(footer).toHaveClass('flex', 'items-center', 'p-6', 'pt-0');
    });
  });

  describe('Complete Card Structure', () => {
    test('renders full card structure correctly', () => {
      render(
        <Card data-testid="full-card">
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
          </CardHeader>
          <CardContent>
            <p>This is the card content area.</p>
          </CardContent>
          <CardFooter>
            <button>Primary Action</button>
            <button>Secondary Action</button>
          </CardFooter>
        </Card>
      );

      expect(screen.getByTestId('full-card')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Card Title' })).toBeInTheDocument();
      expect(screen.getByText('This is the card content area.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Primary Action' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Secondary Action' })).toBeInTheDocument();
    });
  });
});
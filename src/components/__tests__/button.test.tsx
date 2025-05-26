import React from 'react';
import { render, screen } from '@/test-utils';
import '@testing-library/jest-dom';
import { Button } from '../ui/button';

describe('Button Component', () => {
  it('renders with the correct text', () => {
    render(<Button>Test Button</Button>);
    expect(screen.getByRole('button', { name: /test button/i })).toBeInTheDocument();
  });

  it('applies the correct class based on variant', () => {
    const { container } = render(<Button variant="destructive">Delete</Button>);
    expect(container.firstChild).toHaveClass('bg-destructive');
  });

  it('applies the correct size class', () => {
    const { container } = render(<Button size="sm">Small Button</Button>);
    expect(container.firstChild).toHaveClass('h-9');
  });
}); 
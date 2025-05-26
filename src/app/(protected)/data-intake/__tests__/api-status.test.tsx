import React from 'react';
import { render, screen } from '@/test-utils';
import '@testing-library/jest-dom';
import { ApiStatus } from '../_components/data-status';

describe('ApiStatus', () => {
  test('renders success notification when success is true', () => {
    render(<ApiStatus success={true} error={null} />);
    
    const notification = screen.getByText(/variables saved successfully/i);
    expect(notification).toBeInTheDocument();
    expect(notification.parentElement).toHaveClass('bg-green-900/20');
  });
  
  test('renders error notification when error is provided', () => {
    const errorMessage = 'Failed to save variables to the server';
    render(<ApiStatus success={false} error={errorMessage} />);
    
    const notification = screen.getByText(errorMessage);
    expect(notification).toBeInTheDocument();
    expect(notification.parentElement).toHaveClass('bg-red-900/20');
  });
  
  test('renders nothing when both success is false and error is null', () => {
    const { container } = render(<ApiStatus success={false} error={null} />);
    expect(container).toBeEmptyDOMElement();
  });
}); 
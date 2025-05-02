import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LoadingState, ErrorState, EmptyState } from '../_components/state-display';

// Mock the Lucide icons
jest.mock('lucide-react', () => ({
  Loader2: () => <div data-testid="loader-icon">Loading Icon</div>
}));

// Mock the UI components
jest.mock('@/components/ui/alert', () => ({
  Alert: ({ children, className }: { children: React.ReactNode, className?: string }) => 
    <div data-testid="alert" className={className}>{children}</div>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="alert-description">{children}</div>,
}));

// Mock the UploadSection component
jest.mock('../_components/upload-section', () => ({
  UploadSection: () => <div data-testid="mock-upload-section">Upload Section</div>
}));

describe('State Display Components', () => {
  describe('LoadingState', () => {
    test('renders loading indicator with the provided page title', () => {
      render(<LoadingState pageTitle="Test Page" />);
      
      expect(screen.getByText('Test Page')).toBeInTheDocument();
      expect(screen.getByText(/loading variables/i)).toBeInTheDocument();
      expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
    });
  });
  
  describe('ErrorState', () => {
    test('renders error message with upload section', () => {
      const mockProcessCSV = jest.fn();
      
      render(
        <ErrorState 
          pageTitle="Error Page" 
          errorMessage="Test Error" 
          onProcessCSV={mockProcessCSV}
          isUploading={false}
          error={null}
        />
      );
      
      expect(screen.getByText('Error Page')).toBeInTheDocument();
      expect(screen.getByTestId('alert-description')).toHaveTextContent('Test Error');
      expect(screen.getByTestId('mock-upload-section')).toBeInTheDocument();
    });
  });
  
  describe('EmptyState', () => {
    test('renders the provided message', () => {
      render(<EmptyState message="No data available" />);
      
      expect(screen.getByText('No data available')).toBeInTheDocument();
    });
  });
}); 
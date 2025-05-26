import React from 'react';
import { render, screen } from '@/test-utils';
import '@testing-library/jest-dom';
import DataIntake from '../page';

// Mock the DataIntakeContainer component
jest.mock('../_components/data-intake-container', () => ({
  DataIntakeContainer: () => <div data-testid="data-intake-container">Data Intake Container</div>
}));

describe('DataIntake Page', () => {
  test('renders the DataIntakeContainer component', () => {
    render(<DataIntake />);
    expect(screen.getByTestId('data-intake-container')).toBeInTheDocument();
  });
}); 
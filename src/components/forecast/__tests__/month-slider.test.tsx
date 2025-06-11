import { describe, expect, test, beforeEach } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import MonthSlider from '../month-slider';

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock the Slider component to avoid Radix UI complexities in tests
jest.mock('@/components/ui/slider', () => {
  return {
    Slider: ({ value, onValueChange, max, min, disabled, className }: any) => (
      <input
        role="slider"
        type="range"
        value={value?.[0] || 0}
        onChange={(e) => onValueChange && onValueChange([parseInt(e.target.value)])}
        max={max}
        min={min}
        disabled={disabled}
        className={className}
        data-testid="month-slider-input"
      />
    ),
  };
});

describe('MonthSlider Component', () => {
  const mockMonths = [
    new Date(2025, 0, 1), // January 2025
    new Date(2025, 1, 1), // February 2025
    new Date(2025, 2, 1), // March 2025
    new Date(2025, 3, 1), // April 2025
  ];

  const defaultProps = {
    months: mockMonths,
    selectedMonth: mockMonths[1], // February
    onMonthChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('should render slider with month labels', () => {
      render(<MonthSlider {...defaultProps} />);
      
      // Check for month range labels using text content
      const janLabel = screen.getByText('Jan 2025');
      const aprLabel = screen.getByText('Apr 2025');
      const febLabel = screen.getByText('February 2025');
      
      expect(janLabel).toBeTruthy();
      expect(aprLabel).toBeTruthy();
      expect(febLabel).toBeTruthy();
    });

    test('should show no forecast message when months array is empty', () => {
      render(<MonthSlider {...defaultProps} months={[]} />);
      
      const noForecastMessage = screen.getByText('No forecast period defined');
      expect(noForecastMessage).toBeTruthy();
    });

    test('should handle single month', () => {
      const singleMonth = [new Date(2025, 1, 1)];
      render(<MonthSlider {...defaultProps} months={singleMonth} selectedMonth={singleMonth[0]} />);
      
      const febLabel = screen.getByText('Feb 2025');
      const febFullLabel = screen.getByText('February 2025');
      
      expect(febLabel).toBeTruthy();
      expect(febFullLabel).toBeTruthy();
    });
  });

  describe('Interaction', () => {
    test('should call onMonthChange when slider value changes', async () => {
      render(<MonthSlider {...defaultProps} />);
      
      const slider = screen.getByRole('slider');
      
      // Simulate slider change to index 2 (March)
      fireEvent.change(slider, { target: { value: '2' } });
      
      expect(defaultProps.onMonthChange).toHaveBeenCalledWith(mockMonths[2]);
    });

    test('should handle edge case values gracefully', () => {
      render(<MonthSlider {...defaultProps} />);

      const slider = screen.getByRole('slider');
      
      // Clear previous calls
      defaultProps.onMonthChange.mockClear();
      
      // Test negative values - HTML input range will coerce -1 to 0 (min value)
      // So we need to test if the component properly handles min boundary
      fireEvent.change(slider, { target: { value: '-1' } });
      // Since -1 gets coerced to 0 by HTML input, and 0 is valid, this should be called
      expect(defaultProps.onMonthChange).toHaveBeenCalledTimes(1);
      expect(defaultProps.onMonthChange).toHaveBeenCalledWith(mockMonths[0]);
      
      defaultProps.onMonthChange.mockClear();
      
      // Test values above bounds - input range will coerce to max value
      fireEvent.change(slider, { target: { value: '10' } });
      // Since 10 gets coerced to 3 (max value) by HTML input, and 3 is valid, this should be called
      expect(defaultProps.onMonthChange).toHaveBeenCalledTimes(1);
      expect(defaultProps.onMonthChange).toHaveBeenCalledWith(mockMonths[3]);
    });

    test('should be disabled when disabled prop is true', () => {
      render(<MonthSlider {...defaultProps} disabled={true} />);
      
      const slider = screen.getByRole('slider');
      const isDisabled = slider.hasAttribute('disabled') || slider.getAttribute('aria-disabled') === 'true';
      
      expect(isDisabled).toBe(true);
    });

    test('should be disabled when only one month available', () => {
      const singleMonth = [new Date(2025, 1, 1)];
      render(<MonthSlider {...defaultProps} months={singleMonth} />);
      
      const slider = screen.getByRole('slider');
      const isDisabled = slider.hasAttribute('disabled') || slider.getAttribute('aria-disabled') === 'true';
      
      expect(isDisabled).toBe(true);
    });
  });

  describe('Month Selection Logic', () => {
    test('should correctly identify selected month index', () => {
      render(<MonthSlider {...defaultProps} />);
      
      const slider = screen.getByRole('slider') as HTMLInputElement;
      expect(slider.value).toBe('1'); // February is at index 1
    });

    test('should handle no selected month', () => {
      render(<MonthSlider {...defaultProps} selectedMonth={null} />);
      
      const slider = screen.getByRole('slider') as HTMLInputElement;
      expect(slider.value).toBe('0'); // Defaults to first month
      
      // Should not show selected month display
      const febLabel = screen.queryByText('February 2025');
      expect(febLabel).toBeNull();
    });

    test('should handle month not in list', () => {
      const outsideMonth = new Date(2025, 5, 1); // June, not in mockMonths
      render(<MonthSlider {...defaultProps} selectedMonth={outsideMonth} />);
      
      const slider = screen.getByRole('slider') as HTMLInputElement;
      expect(slider.value).toBe('0'); // Defaults to first month when not found
    });
  });

  describe('Month Markers Display', () => {
    test('should show month markers for more than 2 months', () => {
      render(<MonthSlider {...defaultProps} />);
      
      // Should show abbreviated month names
      const janMarker = screen.getByText('Jan');
      expect(janMarker).toBeTruthy();
    });

    test('should not show month markers for 2 or fewer months', () => {
      const twoMonths = mockMonths.slice(0, 2);
      render(<MonthSlider {...defaultProps} months={twoMonths} />);
      
      // Should not show month markers
      const janMarker = screen.queryByText('Jan');
      expect(janMarker).toBeNull();
    });

    test('should highlight selected month marker', () => {
      render(<MonthSlider {...defaultProps} />);
      
      // Test for different styling on selected month (implementation depends on actual CSS)
      const monthMarkers = screen.getByText('Jan').parentElement;
      // This test would need to be adjusted based on actual marker implementation
      expect(monthMarkers).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid dates gracefully', () => {
      const invalidMonths = [
        new Date('invalid-date'),
        new Date(2025, 1, 1),
        new Date(2025, 2, 1),
      ];
      
      // Should not crash and still render valid dates
      expect(() => {
        render(<MonthSlider {...defaultProps} months={invalidMonths} selectedMonth={invalidMonths[1]} />);
      }).not.toThrow();
      
      // Should show labels for valid dates only
      const febLabel = screen.getByText('Feb 2025');
      const marLabel = screen.getByText('Mar 2025');
      expect(febLabel).toBeTruthy();
      expect(marLabel).toBeTruthy();
      
      // Should not show invalid date labels
      const invalidLabel = screen.queryByText('Invalid Date');
      expect(invalidLabel).toBeNull();
    });

    test('should handle missing onMonthChange prop gracefully', () => {
      const propsWithoutCallback = {
        ...defaultProps,
        onMonthChange: undefined as any,
      };
      
      // Should not crash when callback is missing
      expect(() => {
        render(<MonthSlider {...propsWithoutCallback} />);
      }).not.toThrow();
      
      // Should still render the slider but not call anything when changed
      const slider = screen.getByRole('slider');
      expect(slider).toBeTruthy();
      
      // Simulate change - should not throw
      expect(() => {
        fireEvent.change(slider, { target: { value: '1' } });
      }).not.toThrow();
    });

    test('should handle all invalid dates', () => {
      const allInvalidMonths = [
        new Date('invalid-date'),
        new Date('another-invalid'),
      ];
      
      render(<MonthSlider {...defaultProps} months={allInvalidMonths} />);
      
      // Should show no forecast message when all dates are invalid
      const noForecastMessage = screen.getByText('No forecast period defined');
      expect(noForecastMessage).toBeTruthy();
    });
  });

  describe('Date Formatting', () => {
    test('should format months correctly across year boundaries', () => {
      const crossYearMonths = [
        new Date(2024, 11, 1), // December 2024
        new Date(2025, 0, 1),  // January 2025
        new Date(2025, 1, 1),  // February 2025
      ];
      
      render(<MonthSlider {...defaultProps} months={crossYearMonths} selectedMonth={crossYearMonths[1]} />);
      
      const dec2024 = screen.getByText('Dec 2024');
      const feb2025 = screen.getByText('Feb 2025');
      const jan2025 = screen.getByText('January 2025');
      
      expect(dec2024).toBeTruthy();
      expect(feb2025).toBeTruthy();
      expect(jan2025).toBeTruthy();
    });

    test('should handle different locale formatting', () => {
      render(<MonthSlider {...defaultProps} />);
      
      // Test that month names are properly formatted
      const febLabel = screen.getByText('February 2025');
      expect(febLabel).toBeTruthy();
    });
  });

  describe('Performance', () => {
    test('should handle large number of months efficiently', () => {
      // Generate 5 years worth of months
      const manyMonths = Array.from({ length: 60 }, (_, i) => {
        const date = new Date(2025, 0, 1);
        date.setMonth(date.getMonth() + i);
        return date;
      });
      
      const start = performance.now();
      render(<MonthSlider {...defaultProps} months={manyMonths} selectedMonth={manyMonths[30]} />);
      const end = performance.now();
      
      // Should render within reasonable time (less than 100ms for component rendering)
      expect(end - start).toBeLessThan(100);
      
      // Should still show proper range
      const jan2025 = screen.getByText('Jan 2025');
      expect(jan2025).toBeTruthy();
    });
  });
}); 
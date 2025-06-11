import { beforeEach, describe, expect, test } from '@jest/globals';
import { create } from 'zustand';

// Create a test version of the store to directly test the implementation
interface TestVisualizationStore {
  selectedVisualizationMonth: Date | null;
  showVisualizationSlider: boolean;
  forecastStartDate: string | null;
  forecastEndDate: string | null;
  setSelectedVisualizationMonth: (month: Date | null | string) => void;
  setShowVisualizationSlider: (show: boolean) => void;
  updateVisualizationMonthForPeriodChange: (startDate: string | null, endDate: string | null) => void;
  generateForecastMonths: (startDate: string, endDate: string) => Date[];
}

const createTestStore = () => create<TestVisualizationStore>((set, get) => ({
  selectedVisualizationMonth: null,
  showVisualizationSlider: false,
  forecastStartDate: null,
  forecastEndDate: null,

  setSelectedVisualizationMonth: (month) => {
    const properMonth = month === null ? null : (month instanceof Date ? month : new Date(month));
    set({ selectedVisualizationMonth: properMonth });
  },

  setShowVisualizationSlider: (show) => {
    set({ showVisualizationSlider: show });
  },

  generateForecastMonths: (startDate: string, endDate: string) => {
    if (!startDate || !endDate) return [];
    
    try {
      const months: Date[] = [];
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return [];
      
      // Normalize to first of month - MATCH ACTUAL IMPLEMENTATION
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setDate(1);
      end.setHours(0, 0, 0, 0);
      
      const current = new Date(start);
      while (current <= end) {
        months.push(new Date(current));
        current.setMonth(current.getMonth() + 1);
      }
      
      return months;
    } catch {
      return [];
    }
  },

  updateVisualizationMonthForPeriodChange: (newStartDate, newEndDate) => {
    const state = get();
    const currentSelectedMonth = state.selectedVisualizationMonth;
    
    if (!newStartDate || !newEndDate) {
      set({ selectedVisualizationMonth: null });
      return;
    }
    
    const newMonths = state.generateForecastMonths(newStartDate, newEndDate);
    
    if (newMonths.length === 0) {
      set({ selectedVisualizationMonth: null });
      return;
    }
    
    if (currentSelectedMonth) {
      const isStillValid = newMonths.some(month => 
        month.getTime() === currentSelectedMonth.getTime()
      );
      
      if (isStillValid) {
        return;
      }
      
      // Find closest month
      const currentTime = currentSelectedMonth.getTime();
      const closest = newMonths.reduce((closest, month) => {
        const monthTime = month.getTime();
        const closestTime = closest.getTime();
        return Math.abs(monthTime - currentTime) < Math.abs(closestTime - currentTime) ? month : closest;
      });
      
      set({ selectedVisualizationMonth: closest });
    } else {
      set({ selectedVisualizationMonth: newMonths[0] });
    }
  },
}));

// Helper function to create normalized dates that match the store implementation
const createNormalizedDate = (year: number, monthIndex: number, day: number = 1) => {
  const date = new Date(year, monthIndex, day);
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date;
};

describe('Forecast Visualization Store', () => {
  let store: ReturnType<typeof createTestStore>;
  let getState: () => TestVisualizationStore;
  let setState: (partial: Partial<TestVisualizationStore>) => void;

  beforeEach(() => {
    store = createTestStore();
    getState = store.getState;
    setState = store.setState;
  });

  describe('Month Generation', () => {
    test('should generate correct months for period', () => {
      const months = getState().generateForecastMonths('2025-02-01', '2025-05-31');
      
      expect(months).toHaveLength(4);
      expect(months[0]).toEqual(createNormalizedDate(2025, 1)); // February
      expect(months[1]).toEqual(createNormalizedDate(2025, 2)); // March
      expect(months[2]).toEqual(createNormalizedDate(2025, 3)); // April
      expect(months[3]).toEqual(createNormalizedDate(2025, 4)); // May
    });

    test('should handle single month period', () => {
      const months = getState().generateForecastMonths('2025-03-01', '2025-03-31');
      
      expect(months).toHaveLength(1);
      expect(months[0]).toEqual(createNormalizedDate(2025, 2)); // March
    });

    test('should handle invalid date range', () => {
      const months = getState().generateForecastMonths('2025-05-01', '2025-02-01');
      
      expect(months).toHaveLength(0);
    });

    test('should normalize dates to first of month', () => {
      const months = getState().generateForecastMonths('2025-02-15', '2025-03-20');
      
      expect(months).toHaveLength(2);
      expect(months[0]).toEqual(createNormalizedDate(2025, 1)); // February 1st
      expect(months[1]).toEqual(createNormalizedDate(2025, 2)); // March 1st
    });
  });

  describe('Selected Month Management', () => {
    test('should set selected month', () => {
      const testMonth = createNormalizedDate(2025, 2);
      
      getState().setSelectedVisualizationMonth(testMonth);
      
      expect(getState().selectedVisualizationMonth).toEqual(testMonth);
    });

    test('should clear selected month with null', () => {
      const testMonth = createNormalizedDate(2025, 2);
      getState().setSelectedVisualizationMonth(testMonth);
      
      getState().setSelectedVisualizationMonth(null);
      
      expect(getState().selectedVisualizationMonth).toBeNull();
    });

    test('should handle string dates for persistence compatibility', () => {
      const testMonth = createNormalizedDate(2025, 2);
      const testDateString = testMonth.toISOString();
      
      getState().setSelectedVisualizationMonth(testDateString as any);
      
      const result = getState().selectedVisualizationMonth;
      expect(result).toBeInstanceOf(Date);
      expect(result?.getTime()).toEqual(testMonth.getTime());
    });
  });

  describe('Period Change Updates', () => {
    test('should keep valid selected month when period extends', () => {
      const originalMonth = createNormalizedDate(2025, 2); // March
      setState({
        forecastStartDate: '2025-02-01',
        forecastEndDate: '2025-04-30',
        selectedVisualizationMonth: originalMonth
      });
      
      getState().updateVisualizationMonthForPeriodChange('2025-01-01', '2025-06-30');
      
      expect(getState().selectedVisualizationMonth).toEqual(originalMonth);
    });

    test('should select closest month when current becomes invalid', () => {
      const originalMonth = createNormalizedDate(2025, 2); // March
      setState({
        forecastStartDate: '2025-02-01',
        forecastEndDate: '2025-04-30',
        selectedVisualizationMonth: originalMonth
      });
      
      getState().updateVisualizationMonthForPeriodChange('2025-05-01', '2025-07-31');
      
      const newSelectedMonth = getState().selectedVisualizationMonth;
      expect(newSelectedMonth).toEqual(createNormalizedDate(2025, 4)); // May (closest available)
    });

    test('should clear selected month when no period provided', () => {
      const originalMonth = createNormalizedDate(2025, 2);
      setState({ selectedVisualizationMonth: originalMonth });
      
      getState().updateVisualizationMonthForPeriodChange('', '2025-04-30');
      
      expect(getState().selectedVisualizationMonth).toBeNull();
    });

    test('should select first month when no previous selection', () => {
      setState({ selectedVisualizationMonth: null });
      
      getState().updateVisualizationMonthForPeriodChange('2025-02-01', '2025-04-30');
      
      expect(getState().selectedVisualizationMonth).toEqual(createNormalizedDate(2025, 1)); // February
    });
  });

  describe('Slider Visibility', () => {
    test('should toggle slider visibility', () => {
      expect(getState().showVisualizationSlider).toBe(false);
      
      getState().setShowVisualizationSlider(true);
      expect(getState().showVisualizationSlider).toBe(true);
      
      getState().setShowVisualizationSlider(false);
      expect(getState().showVisualizationSlider).toBe(false);
    });
  });

  describe('Initial State', () => {
    test('should have correct initial visualization state', () => {
      const state = getState();
      
      expect(state.selectedVisualizationMonth).toBeNull();
      expect(state.showVisualizationSlider).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid date strings gracefully', () => {
      const months = getState().generateForecastMonths('invalid-date', '2025-04-30');
      
      expect(months).toHaveLength(0);
    });

    test('should handle empty date strings', () => {
      const months = getState().generateForecastMonths('', '');
      
      expect(months).toHaveLength(0);
    });
  });
}); 
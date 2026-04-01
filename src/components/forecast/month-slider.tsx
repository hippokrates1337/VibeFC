'use client';

import React, { useEffect, useMemo } from 'react';
import { Slider } from '@/components/ui/slider';
import { format, isValid } from 'date-fns';

interface MonthSliderProps {
  months: Date[];
  selectedMonth: Date | null;
  onMonthChange: (month: Date) => void;
  disabled?: boolean;
}

/**
 * Safe date formatter that handles invalid dates gracefully
 */
const safeFormat = (date: Date, formatStr: string): string => {
  try {
    if (!isValid(date)) {
      return 'Invalid Date';
    }
    return format(date, formatStr);
  } catch (error) {
    return 'Invalid Date';
  }
};

/**
 * MonthSlider component for selecting which month to visualize on the forecast canvas.
 * 
 * Updated for Phase 7: Works with unified calculation results while maintaining
 * Date object interface for UI compatibility. The visualization system bridges
 * between Date objects (UI) and MM-YYYY strings (unified calculations).
 */
const MonthSlider: React.FC<MonthSliderProps> = ({ 
  months, 
  selectedMonth, 
  onMonthChange, 
  disabled = false 
}) => {
  const validMonths = useMemo(
    () => months.filter((month) => month instanceof Date && isValid(month)),
    [months]
  );

  const firstMonthTime = validMonths[0]?.getTime() ?? null;

  // Keep store in sync when the slider defaults to index 0 but selectedMonth was never set
  useEffect(() => {
    if (!onMonthChange || disabled || firstMonthTime == null) return;
    if (selectedMonth != null && isValid(selectedMonth)) return;
    onMonthChange(new Date(firstMonthTime));
  }, [disabled, firstMonthTime, selectedMonth, onMonthChange]);

  /** Match by calendar month — validMonths use UTC month starts; selectedMonth may be local midnight. */
  const selectedIndex =
    selectedMonth && isValid(selectedMonth)
      ? validMonths.findIndex(
          (month) =>
            format(month, 'yyyy-MM') === format(selectedMonth, 'yyyy-MM')
        )
      : -1;

  const handleSliderChange = (values: number[]) => {
    const index = values[0];
    // Only call callback for valid indices
    if (index >= 0 && index < validMonths.length && onMonthChange) {
      onMonthChange(validMonths[index]);
    }
  };

  if (validMonths.length === 0) {
    return (
      <div className="flex items-center justify-center py-4">
        <p className="text-sm text-slate-400">
          No forecast period defined or unified calculation required
        </p>
      </div>
    );
  }

  // Single month case - show static display instead of slider
  if (validMonths.length === 1) {
    return (
      <div className="w-full space-y-3">
        <div className="text-center">
          <span className="text-sm font-medium text-slate-200">
            {safeFormat(validMonths[0], 'MMMM yyyy')}
          </span>
          <p className="text-xs text-slate-400 mt-1">Single month period</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      {/* Month labels */}
      <div className="flex justify-between items-center text-xs text-slate-400">
        <span>{safeFormat(validMonths[0], 'MMM yyyy')}</span>
        <span>{safeFormat(validMonths[validMonths.length - 1], 'MMM yyyy')}</span>
      </div>

      {/* Slider */}
      <div className="px-2">
        <Slider
          value={selectedIndex >= 0 ? [selectedIndex] : [0]}
          onValueChange={handleSliderChange}
          max={Math.max(0, validMonths.length - 1)}
          min={0}
          step={1}
          disabled={disabled || validMonths.length <= 1}
          className="w-full"
        />
      </div>

      {/* Selected month display */}
      {selectedMonth && isValid(selectedMonth) && (
        <div className="text-center">
          <span className="text-sm font-medium text-slate-200">
            {safeFormat(selectedMonth, 'MMMM yyyy')}
          </span>
          {selectedIndex >= 0 && (
            <p className="text-xs text-slate-400 mt-1">
              Month {selectedIndex + 1} of {validMonths.length}
            </p>
          )}
        </div>
      )}

      {/* Month markers for multiple months (show every 6th month for readability) */}
      {validMonths.length > 2 && (
        <div className="flex justify-between text-xs text-slate-500 px-2">
          {validMonths.map((month, index) => (
            <div
              key={month.toISOString()}
              className={`transition-colors ${
                index === selectedIndex ? 'text-slate-300' : 'text-slate-600'
              }`}
              style={{ width: `${100 / validMonths.length}%` }}
            >
              {index % Math.ceil(validMonths.length / 6) === 0 && (
                <span>{safeFormat(month, 'MMM')}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Phase 7 Note: Unified System Integration */}
      {disabled && (
        <div className="text-center">
          <p className="text-xs text-slate-500">
            Unified calculation required for month visualization
          </p>
        </div>
      )}
    </div>
  );
};

export default MonthSlider; 
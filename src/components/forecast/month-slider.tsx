'use client';

import React from 'react';
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

const MonthSlider: React.FC<MonthSliderProps> = ({ 
  months, 
  selectedMonth, 
  onMonthChange, 
  disabled = false 
}) => {
  // Filter out invalid dates
  const validMonths = months.filter(month => month instanceof Date && isValid(month));
  
  const selectedIndex = selectedMonth && isValid(selectedMonth) ? 
    validMonths.findIndex(month => month.getTime() === selectedMonth.getTime()) : 
    -1;

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
        <p className="text-sm text-slate-400">No forecast period defined</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      {/* Month labels */}
      <div className="flex justify-between items-center text-xs text-slate-400">
        <span>{safeFormat(validMonths[0], 'MMM yyyy')}</span>
        {validMonths.length > 1 && (
          <span>{safeFormat(validMonths[validMonths.length - 1], 'MMM yyyy')}</span>
        )}
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
        </div>
      )}

      {/* Month markers for multiple months */}
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
    </div>
  );
};

export default MonthSlider; 
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ToggleProps {
  options: Array<{ value: string; label: string }>;
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

const Toggle: React.FC<ToggleProps> = ({ options, value, onValueChange, className }) => {
  return (
    <div className={cn('flex rounded-md overflow-hidden border border-slate-600', className)}>
      {options.map((option, index) => (
        <Button
          key={option.value}
          variant={value === option.value ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onValueChange(option.value)}
          className={cn(
            'rounded-none border-0 flex-1',
            value === option.value 
              ? 'bg-blue-600 text-white hover:bg-blue-700' 
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600',
            index === 0 && 'rounded-l-md',
            index === options.length - 1 && 'rounded-r-md'
          )}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
};

export { Toggle }; 
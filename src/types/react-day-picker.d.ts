declare module 'react-day-picker' {
  import { ComponentProps } from 'react';
  
  export interface DayPickerProps {
    mode?: 'single' | 'multiple' | 'range';
    selected?: Date;
    onSelect?: (date?: Date) => void;
    showOutsideDays?: boolean;
    className?: string;
    classNames?: Record<string, string>;
    initialFocus?: boolean;
    components?: {
      IconLeft?: React.ComponentType<any>;
      IconRight?: React.ComponentType<any>;
    };
    [key: string]: any;
  }

  export const DayPicker: React.FC<DayPickerProps>;
} 
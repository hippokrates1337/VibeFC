'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';

interface VisualizationControlsProps {
  showSlider: boolean;
  onToggleSlider: (show: boolean) => void;
  disabled?: boolean;
}

const VisualizationControls: React.FC<VisualizationControlsProps> = ({
  showSlider,
  onToggleSlider,
  disabled = false
}) => {
  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={() => onToggleSlider(!showSlider)}
        disabled={disabled}
        variant={showSlider ? "default" : "outline"}
        size="sm"
        className={`gap-2 ${showSlider 
          ? 'bg-purple-900/60 text-purple-200 border-purple-500/50 hover:bg-purple-800/60' 
          : 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600'
        }`}
      >
        {showSlider ? (
          <Eye className="h-4 w-4" />
        ) : (
          <EyeOff className="h-4 w-4" />
        )}
        <span className="text-xs">
          {showSlider ? 'Hide Values' : 'Show Values'}
        </span>
      </Button>
      
      {disabled && (
        <span className="text-xs text-slate-500">
          Calculate forecast to enable visualization
        </span>
      )}
    </div>
  );
};

export default VisualizationControls; 
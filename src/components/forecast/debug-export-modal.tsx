'use client';

import React, { useState } from 'react';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Download, 
  FileJson, 
  FileText, 
  FileSpreadsheet,
  Info,
  Loader2 
} from 'lucide-react';
import { exportDebugData, type ExportOptions, type ExportFormat } from '@/lib/utils/debug-export';
import type { DebugCalculationResult } from '@/types/debug';

interface DebugExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  debugData: DebugCalculationResult;
}

const EXPORT_FORMATS: Array<{
  value: ExportFormat;
  label: string;
  description: string;
  icon: React.ReactNode;
  recommended?: boolean;
}> = [
  {
    value: 'json',
    label: 'JSON',
    description: 'Complete data with full structure (recommended)',
    icon: <FileJson className="h-4 w-4" />,
    recommended: true
  },
  {
    value: 'csv',
    label: 'CSV',
    description: 'Step-by-step data for spreadsheet analysis',
    icon: <FileText className="h-4 w-4" />
  },
  {
    value: 'xlsx',
    label: 'Excel',
    description: 'Formatted spreadsheet with multiple sheets',
    icon: <FileSpreadsheet className="h-4 w-4" />
  }
];

export function DebugExportModal({ isOpen, onClose, debugData }: DebugExportModalProps) {
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'json',
    includeSteps: true,
    includeTree: true,
    includeMetrics: true,
    filename: ''
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleFormatChange = (format: ExportFormat) => {
    setExportOptions(prev => ({
      ...prev,
      format,
      // Auto-adjust options based on format
      includeSteps: format === 'csv' ? true : prev.includeSteps,
      includeTree: format === 'csv' ? false : prev.includeTree,
      includeMetrics: format === 'csv' ? false : prev.includeMetrics
    }));
  };

  const handleOptionChange = (option: keyof ExportOptions, value: boolean | string) => {
    setExportOptions(prev => ({
      ...prev,
      [option]: value
    }));
  };

  const handleExport = async () => {
    setIsExporting(true);
    setExportError(null);

    try {
      // Validate options
      if (!exportOptions.includeSteps && !exportOptions.includeTree && !exportOptions.includeMetrics) {
        throw new Error('At least one data type must be included in the export');
      }

      if (exportOptions.format === 'csv' && !exportOptions.includeSteps) {
        throw new Error('CSV format requires step data to be included');
      }

      await exportDebugData(debugData, exportOptions);
      onClose();
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  const getEstimatedFileSize = (): string => {
    let estimatedKB = 0;
    
    if (exportOptions.includeSteps) {
      estimatedKB += debugData.debugInfo.calculationSteps.length * 0.5; // ~0.5KB per step
    }
    if (exportOptions.includeTree) {
      estimatedKB += debugData.debugInfo.calculationTree.totalNodes * 0.2; // ~0.2KB per node
    }
    if (exportOptions.includeMetrics) {
      estimatedKB += 5; // ~5KB for metrics
    }

    if (estimatedKB < 1) return '< 1 KB';
    if (estimatedKB < 1024) return `${Math.round(estimatedKB)} KB`;
    return `${(estimatedKB / 1024).toFixed(1)} MB`;
  };

  const generateDefaultFilename = (): string => {
    const timestamp = new Date().toISOString().slice(0, 10);
    const forecastId = debugData.forecastId.substring(0, 8);
    return `debug-calc-${forecastId}-${timestamp}`;
  };

  const selectedFormat = EXPORT_FORMATS.find(f => f.value === exportOptions.format);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-slate-800 border-slate-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-100">
            <Download className="h-5 w-5" />
            Export Debug Data
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Export calculation debug data for analysis, reporting, or sharing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Format Selection */}
          <div className="space-y-3">
            <Label className="text-slate-200 font-medium">Export Format</Label>
            <RadioGroup
              value={exportOptions.format}
              onValueChange={handleFormatChange}
              className="space-y-2"
            >
              {EXPORT_FORMATS.map(format => (
                <div key={format.value} className="flex items-start space-x-3">
                  <RadioGroupItem 
                    value={format.value} 
                    id={format.value}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label 
                      htmlFor={format.value}
                      className="flex items-center gap-2 text-slate-200 cursor-pointer"
                    >
                      {format.icon}
                      {format.label}
                      {format.recommended && (
                        <span className="text-xs bg-blue-600 text-blue-100 px-2 py-0.5 rounded">
                          Recommended
                        </span>
                      )}
                    </Label>
                    <p className="text-sm text-slate-400 mt-1">
                      {format.description}
                    </p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Data Selection */}
          <div className="space-y-3">
            <Label className="text-slate-200 font-medium">Include Data</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-steps"
                  checked={exportOptions.includeSteps}
                  onCheckedChange={(checked) => handleOptionChange('includeSteps', !!checked)}
                  disabled={exportOptions.format === 'csv'} // CSV requires steps
                />
                <Label 
                  htmlFor="include-steps" 
                  className="text-slate-200 cursor-pointer"
                >
                  Calculation Steps ({debugData.debugInfo.calculationSteps.length} steps)
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-tree"
                  checked={exportOptions.includeTree}
                  onCheckedChange={(checked) => handleOptionChange('includeTree', !!checked)}
                  disabled={exportOptions.format === 'csv'} // CSV doesn't support tree
                />
                <Label 
                  htmlFor="include-tree" 
                  className="text-slate-200 cursor-pointer"
                >
                  Calculation Tree ({debugData.debugInfo.calculationTree.totalNodes} nodes)
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-metrics"
                  checked={exportOptions.includeMetrics}
                  onCheckedChange={(checked) => handleOptionChange('includeMetrics', !!checked)}
                  disabled={exportOptions.format === 'csv'} // CSV doesn't support metrics
                />
                <Label 
                  htmlFor="include-metrics" 
                  className="text-slate-200 cursor-pointer"
                >
                  Performance Metrics & Errors
                </Label>
              </div>
            </div>
          </div>

          {/* Filename */}
          <div className="space-y-2">
            <Label htmlFor="filename" className="text-slate-200 font-medium">
              Filename (optional)
            </Label>
            <Input
              id="filename"
              placeholder={generateDefaultFilename()}
              value={exportOptions.filename}
              onChange={(e) => handleOptionChange('filename', e.target.value)}
              className="bg-slate-700 border-slate-600 text-slate-200"
            />
            <p className="text-xs text-slate-400">
              Leave empty to use auto-generated filename. Extension will be added automatically.
            </p>
          </div>

          {/* Export Info */}
          <Alert className="bg-slate-700 border-slate-600">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-slate-300">
              <div className="space-y-1">
                <div>Format: {selectedFormat?.label}</div>
                <div>Estimated size: {getEstimatedFileSize()}</div>
                <div>
                  Data: {[
                    exportOptions.includeSteps && 'Steps',
                    exportOptions.includeTree && 'Tree', 
                    exportOptions.includeMetrics && 'Metrics'
                  ].filter(Boolean).join(', ')}
                </div>
              </div>
            </AlertDescription>
          </Alert>

          {/* Error Display */}
          {exportError && (
            <Alert className="bg-red-900/20 border-red-500">
              <AlertDescription className="text-red-400">
                {exportError}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="space-x-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isExporting}
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

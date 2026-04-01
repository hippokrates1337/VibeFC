import type { 
  DebugCalculationResult, 
  DebugCalculationStep, 
  DebugCalculationTree,
  PerformanceMetrics 
} from '@/types/debug';

export type ExportFormat = 'json' | 'csv' | 'xlsx';

export interface ExportOptions {
  format: ExportFormat;
  includeSteps: boolean;
  includeTree: boolean;
  includeMetrics: boolean;
  filename?: string;
}

/**
 * Export debug calculation data in various formats
 */
export class DebugDataExporter {
  private data: DebugCalculationResult;

  constructor(data: DebugCalculationResult) {
    this.data = data;
  }

  /**
   * Export data based on options
   */
  async export(options: ExportOptions): Promise<void> {
    const filename = options.filename || this.generateFilename(options.format);

    switch (options.format) {
      case 'json':
        await this.exportAsJSON(options, filename);
        break;
      case 'csv':
        await this.exportAsCSV(options, filename);
        break;
      case 'xlsx':
        await this.exportAsExcel(options, filename);
        break;
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  /**
   * Export as JSON
   */
  private async exportAsJSON(options: ExportOptions, filename: string): Promise<void> {
    const exportData: any = {
      exportedAt: new Date().toISOString(),
      forecastId: this.data.forecastId,
      calculatedAt: this.data.calculatedAt,
      calculationTypes: this.data.calculationTypes,
      periodInfo: this.data.periodInfo
    };

    if (options.includeSteps) {
      exportData.calculationSteps = this.data.debugInfo.calculationSteps;
    }

    if (options.includeTree) {
      exportData.calculationTree = this.data.debugInfo.calculationTree;
    }

    if (options.includeMetrics) {
      exportData.performanceMetrics = this.data.debugInfo.performanceMetrics;
      exportData.errors = this.data.debugInfo.errors;
      exportData.warnings = this.data.debugInfo.warnings;
    }

    // Add summary statistics
    exportData.summary = this.generateSummary();

    const jsonString = JSON.stringify(exportData, null, 2);
    this.downloadFile(jsonString, filename, 'application/json');
  }

  /**
   * Export as CSV (steps data)
   */
  private async exportAsCSV(options: ExportOptions, filename: string): Promise<void> {
    if (!options.includeSteps) {
      throw new Error('CSV export requires steps data to be included');
    }

    const steps = this.data.debugInfo.calculationSteps;
    const headers = [
      'Step Number',
      'Node ID',
      'Node Type',
      'Month',
      'Calculation Type',
      'Output',
      'Execution Time (ms)',
      'Dependencies Count',
      'Has Error',
      'Error Message',
      'Timestamp'
    ];

    const csvData = [
      headers.join(','),
      ...steps.map(step => [
        step.stepNumber,
        `"${step.nodeId}"`,
        step.nodeType,
        step.month,
        step.calculationType,
        step.output ?? 'null',
        step.executionTimeMs,
        step.dependencies.length,
        !!step.errorMessage,
        `"${step.errorMessage || ''}"`,
        step.timestamp
      ].join(','))
    ].join('\n');

    this.downloadFile(csvData, filename, 'text/csv');
  }

  /**
   * Export as Excel (placeholder - would require additional library)
   */
  private async exportAsExcel(options: ExportOptions, filename: string): Promise<void> {
    // For now, export as CSV with .xlsx extension
    // In a real implementation, you'd use a library like 'xlsx' or 'exceljs'
    console.warn('Excel export not fully implemented, falling back to CSV');
    await this.exportAsCSV(options, filename.replace('.xlsx', '.csv'));
  }

  /**
   * Generate summary statistics
   */
  private generateSummary() {
    const steps = this.data.debugInfo.calculationSteps;
    const metrics = this.data.debugInfo.performanceMetrics;
    
    const nodeTypes = [...new Set(steps.map(s => s.nodeType))];
    const calculationTypes = [...new Set(steps.map(s => s.calculationType))];
    const errorSteps = steps.filter(s => s.errorMessage);
    const successSteps = steps.filter(s => !s.errorMessage);

    return {
      totalSteps: steps.length,
      totalNodes: this.data.debugInfo.calculationTree.totalNodes,
      totalTrees: this.data.debugInfo.calculationTree.trees.length,
      nodeTypes: nodeTypes.length,
      calculationTypes: calculationTypes.length,
      errorCount: errorSteps.length,
      successCount: successSteps.length,
      successRate: steps.length > 0 ? (successSteps.length / steps.length) * 100 : 0,
      totalExecutionTime: metrics.totalExecutionTimeMs,
      averageStepTime: steps.length > 0 
        ? steps.reduce((sum, s) => sum + s.executionTimeMs, 0) / steps.length 
        : 0,
      cacheHitRate: metrics.cacheHitRate,
      memoryUsage: metrics.memoryUsageMb,
      executionOrder: this.data.debugInfo.calculationTree.executionOrder
    };
  }

  /**
   * Generate filename based on format and current data
   */
  private generateFilename(format: ExportFormat): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const forecastId = this.data.forecastId.substring(0, 8);
    return `debug-calc-${forecastId}-${timestamp}.${format}`;
  }

  /**
   * Download file to user's device
   */
  private downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the URL object
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

/**
 * Utility function for quick export
 */
export const exportDebugData = async (
  data: DebugCalculationResult, 
  options: Partial<ExportOptions> = {}
): Promise<void> => {
  const defaultOptions: ExportOptions = {
    format: 'json',
    includeSteps: true,
    includeTree: true,
    includeMetrics: true,
    ...options
  };

  const exporter = new DebugDataExporter(data);
  await exporter.export(defaultOptions);
};

/**
 * Export only calculation steps as CSV
 */
export const exportStepsAsCSV = async (
  data: DebugCalculationResult,
  filename?: string
): Promise<void> => {
  const exporter = new DebugDataExporter(data);
  await exporter.export({
    format: 'csv',
    includeSteps: true,
    includeTree: false,
    includeMetrics: false,
    filename
  });
};

/**
 * Export performance metrics as JSON
 */
export const exportMetricsAsJSON = async (
  data: DebugCalculationResult,
  filename?: string
): Promise<void> => {
  const exporter = new DebugDataExporter(data);
  await exporter.export({
    format: 'json',
    includeSteps: false,
    includeTree: false,
    includeMetrics: true,
    filename
  });
};

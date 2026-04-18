import type { DebugCalculationResult } from '@/lib/api/debug-calculation';
import { buildDebugExportExcelBlob } from '@/lib/utils/debug-export-excel';

export type ExportFormat = 'json' | 'xlsx';

export interface ExportOptions {
  format: ExportFormat;
  includeSteps: boolean;
  includeTree: boolean;
  includeMetrics: boolean;
  filename?: string;
}

/**
 * Export debug calculation data in JSON or Excel format.
 */
export class DebugDataExporter {
  private data: DebugCalculationResult;

  constructor(data: DebugCalculationResult) {
    this.data = data;
  }

  async export(options: ExportOptions): Promise<void> {
    const filename = options.filename || this.generateFilename(options.format);

    switch (options.format) {
      case 'json':
        await this.exportAsJSON(options, filename);
        break;
      case 'xlsx':
        await this.exportAsExcel(options, filename);
        break;
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  private async exportAsJSON(options: ExportOptions, filename: string): Promise<void> {
    const exportData: Record<string, unknown> = {
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

    exportData.summary = this.generateSummary();

    const jsonString = JSON.stringify(exportData, null, 2);
    this.downloadFile(jsonString, filename, 'application/json');
  }

  private async exportAsExcel(options: ExportOptions, filename: string): Promise<void> {
    const blob = await buildDebugExportExcelBlob(this.data, {
      includeSteps: options.includeSteps,
      includeTree: options.includeTree,
      includeMetrics: options.includeMetrics
    });
    this.downloadBlob(blob, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
  }

  private generateSummary() {
    const steps = this.data.debugInfo.calculationSteps;
    const metrics = this.data.debugInfo.performanceMetrics;

    const nodeTypes = Array.from(new Set(steps.map((s) => s.nodeType)));
    const calculationTypes = Array.from(new Set(steps.map((s) => s.calculationType)));
    const errorSteps = steps.filter((s) => s.errorMessage);
    const successSteps = steps.filter((s) => !s.errorMessage);

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
      averageStepTime:
        steps.length > 0
          ? steps.reduce((sum, s) => sum + s.executionTimeMs, 0) / steps.length
          : 0,
      cacheHitRate: metrics.cacheHitRate,
      memoryUsage: metrics.memoryUsageMB,
      executionOrder: this.data.debugInfo.calculationTree.executionOrder
    };
  }

  private generateFilename(format: ExportFormat): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const forecastId = this.data.forecastId.substring(0, 8);
    return `debug-calc-${forecastId}-${timestamp}.${format}`;
  }

  private downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    this.downloadBlob(blob, filename);
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

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

/**
 * Builds a real .xlsx for debug calculation export (exceljs).
 */

import type { DebugCalculationResult } from '@/lib/api/debug-calculation';

export interface DebugExportExcelOptions {
  includeSteps: boolean;
  includeTree: boolean;
  includeMetrics: boolean;
}

const thin = { style: 'thin' as const, color: { argb: 'FF64748B' } };

function cellBorder() {
  return { top: thin, left: thin, bottom: thin, right: thin };
}

/**
 * Writes debug data to an Excel workbook and returns a Blob for download.
 */
export async function buildDebugExportExcelBlob(
  data: DebugCalculationResult,
  options: DebugExportExcelOptions
): Promise<Blob> {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'VibeFC';

  const summary = workbook.addWorksheet('Summary', {
    properties: { defaultRowHeight: 18 }
  });
  summary.getColumn(1).width = 28;
  summary.getColumn(2).width = 48;

  let row = 1;
  const meta: [string, string][] = [
    ['Forecast ID', data.forecastId],
    ['Calculated at', data.calculatedAt],
    ['Calculation types', data.calculationTypes.join(', ')],
    ['Forecast period', `${data.periodInfo.forecastStartMonth} – ${data.periodInfo.forecastEndMonth}`],
    ['Actual period', `${data.periodInfo.actualStartMonth} – ${data.periodInfo.actualEndMonth}`]
  ];
  meta.forEach(([k, v]) => {
    summary.getCell(row, 1).value = k;
    summary.getCell(row, 1).font = { bold: true };
    summary.getCell(row, 2).value = v;
    row++;
  });

  const steps = data.debugInfo.calculationSteps;
  const metrics = data.debugInfo.performanceMetrics;
  const tree = data.debugInfo.calculationTree;

  row++;
  summary.getCell(row, 1).value = 'Statistics';
  summary.getCell(row, 1).font = { bold: true, size: 12 };
  row++;

  const stats: [string, string | number][] = [
    ['Total steps', steps.length],
    ['Total tree nodes', tree.totalNodes],
    ['Total execution time (ms)', metrics.totalExecutionTimeMs],
    ['Cache hit rate', metrics.cacheHitRate],
    ['Memory usage (MB)', metrics.memoryUsageMB ?? '—']
  ];
  stats.forEach(([k, v]) => {
    summary.getCell(row, 1).value = k;
    summary.getCell(row, 1).font = { bold: true };
    summary.getCell(row, 2).value = v;
    row++;
  });

  if (options.includeSteps && steps.length > 0) {
    const ws = workbook.addWorksheet('Calculation steps', {
      views: [{ state: 'frozen', ySplit: 1 }]
    });
    const headers = [
      'Step',
      'Node ID',
      'Node type',
      'Month',
      'Calculation type',
      'Output',
      'Time (ms)',
      'Dependencies',
      'Error'
    ];
    headers.forEach((h, i) => {
      const c = ws.getCell(1, i + 1);
      c.value = h;
      c.font = { bold: true };
      c.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF334155' }
      };
      c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      c.border = cellBorder();
    });
    steps.forEach((step, ri) => {
      const r = ri + 2;
      const vals = [
        step.stepNumber,
        step.nodeId,
        step.nodeType,
        step.month,
        step.calculationType,
        step.output ?? '',
        step.executionTimeMs,
        step.dependencies?.length ?? 0,
        step.errorMessage ?? ''
      ];
      vals.forEach((v, ci) => {
        const cell = ws.getCell(r, ci + 1);
        cell.value = v;
        cell.border = cellBorder();
      });
    });
    ws.columns = [
      { width: 8 },
      { width: 28 },
      { width: 12 },
      { width: 12 },
      { width: 14 },
      { width: 16 },
      { width: 10 },
      { width: 12 },
      { width: 36 }
    ];
  }

  if (options.includeTree) {
    const ws = workbook.addWorksheet('Calculation tree', {});
    ws.getCell(1, 1).value = 'Execution order (JSON)';
    ws.getCell(2, 1).value = JSON.stringify(tree.executionOrder, null, 2);
    ws.getCell(2, 1).alignment = { wrapText: true, vertical: 'top' };
    ws.getCell(3, 1).value = 'Tree summary (JSON)';
    ws.getCell(4, 1).value = JSON.stringify(
      {
        totalNodes: tree.totalNodes,
        trees: tree.trees,
        dependencyGraph: tree.dependencyGraph,
        metricOrder: tree.metricOrder
      },
      null,
      2
    );
    ws.getCell(4, 1).alignment = { wrapText: true, vertical: 'top' };
    ws.getColumn(1).width = 100;
  }

  if (options.includeMetrics) {
    const ws = workbook.addWorksheet('Metrics & messages', {});
    let r = 1;
    ws.getCell(r, 1).value = 'Performance metrics (JSON)';
    ws.getCell(r, 1).font = { bold: true };
    r++;
    ws.getCell(r, 1).value = JSON.stringify(metrics, null, 2);
    ws.getCell(r, 1).alignment = { wrapText: true, vertical: 'top' };
    r += 2;
    const errs = data.debugInfo.errors ?? [];
    const warns = data.debugInfo.warnings ?? [];
    ws.getCell(r, 1).value = 'Errors';
    ws.getCell(r, 1).font = { bold: true };
    r++;
    ws.getCell(r, 1).value = errs.length ? errs.join('\n') : '—';
    r += 2;
    ws.getCell(r, 1).value = 'Warnings';
    ws.getCell(r, 1).font = { bold: true };
    r++;
    ws.getCell(r, 1).value = warns.length ? warns.join('\n') : '—';
    ws.getColumn(1).width = 100;
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
}

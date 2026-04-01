/**
 * Builds a styled .xlsx workbook for forecast hierarchy results (browser-safe via exceljs writeBuffer).
 * Value columns store raw numbers with Excel number formatting (not localized display strings).
 */

export type ForecastResultsExcelColumn =
  | {
      kind: 'month';
      month: string;
      displayName: string;
      isActualPeriod: boolean;
      segment: 'historical' | 'forecast' | 'budget';
    }
  | { kind: 'fy'; year: number; segment: 'forecast' | 'budget' };

export interface ForecastResultsExcelDataRow {
  nodeLabel: string;
  nodeType: string;
  /** Stock / Flow for METRIC, em dash for others */
  seriesLabel: string;
  level: number;
  /** Raw numeric values; null renders as "-" text without number format */
  cells: Array<number | null>;
}

export interface ForecastResultsExcelMonthGroup {
  month: string;
  displayName: string;
  isActualPeriod: boolean;
}

const LEVEL_FILLS_ARGB = [
  'FFF8FAFC',
  'FFF1F5F9',
  'FFE2E8F0',
  'FFCBD5E1',
  'FF94A3B8'
];

const VALUE_NUM_FMT = '#,##0.00';

const thin = { style: 'thin' as const, color: { argb: 'FF64748B' } };

function cellBorder() {
  return {
    top: thin,
    left: thin,
    bottom: thin,
    right: thin
  };
}

function valueFillArgb(meta: ForecastResultsExcelColumn): string {
  if (meta.kind === 'fy') {
    return 'FFF0FDF4';
  }
  return meta.isActualPeriod ? 'FFFFFBEB' : 'FFEFF6FF';
}

/**
 * Creates an Excel blob with frozen node/type/series columns, two value columns per month,
 * optional FY year groups (two columns each), and row styling by hierarchy depth.
 */
export async function buildForecastResultsExcelBlob(
  monthGroups: ForecastResultsExcelMonthGroup[],
  fyYears: number[],
  columnMeta: ForecastResultsExcelColumn[],
  rows: ForecastResultsExcelDataRow[]
): Promise<Blob> {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'VibeFC';

  const sheet = workbook.addWorksheet('Forecast results', {
    properties: { defaultRowHeight: 18 },
    views: [
      {
        state: 'frozen',
        xSplit: 3,
        ySplit: 2,
        topLeftCell: 'D3',
        activeCell: 'A3'
      }
    ]
  });

  sheet.mergeCells('A1:A2');
  sheet.mergeCells('B1:B2');
  sheet.mergeCells('C1:C2');

  const headerNode = sheet.getCell('A1');
  headerNode.value = 'Node';
  const headerType = sheet.getCell('B1');
  headerType.value = 'Type';
  const headerSeries = sheet.getCell('C1');
  headerSeries.value = 'Series';

  [headerNode, headerType, headerSeries].forEach((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF334155' }
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = cellBorder();
  });

  let colIdx = 4;
  for (const m of monthGroups) {
    sheet.mergeCells(1, colIdx, 1, colIdx + 1);
    const top = sheet.getCell(1, colIdx);
    top.value = m.isActualPeriod
      ? `${m.displayName}\n(Historical)`
      : `${m.displayName}\n(Forecast)`;
    top.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    top.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: m.isActualPeriod ? 'FFB45309' : 'FF1D4ED8' }
    };
    top.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    top.border = cellBorder();

    const subLeft = sheet.getCell(2, colIdx);
    subLeft.value = m.isActualPeriod ? 'Actual' : 'Forecast';
    subLeft.font = { bold: true, color: { argb: 'FFF1F5F9' } };
    subLeft.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: m.isActualPeriod ? 'FF92400E' : 'FF1E40AF' }
    };
    subLeft.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    subLeft.border = cellBorder();

    const subRight = sheet.getCell(2, colIdx + 1);
    subRight.value = 'Budget';
    subRight.font = { bold: true, color: { argb: 'FFF1F5F9' } };
    subRight.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: m.isActualPeriod ? 'FF92400E' : 'FF1E40AF' }
    };
    subRight.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    subRight.border = cellBorder();

    colIdx += 2;
  }

  for (const y of fyYears) {
    sheet.mergeCells(1, colIdx, 1, colIdx + 1);
    const top = sheet.getCell(1, colIdx);
    top.value = `FY ${y}\n(Calendar)`;
    top.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    top.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF047857' }
    };
    top.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    top.border = cellBorder();

    const subLeft = sheet.getCell(2, colIdx);
    subLeft.value = 'Forecast';
    subLeft.font = { bold: true, color: { argb: 'FFF1F5F9' } };
    subLeft.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF065F46' }
    };
    subLeft.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    subLeft.border = cellBorder();

    const subRight = sheet.getCell(2, colIdx + 1);
    subRight.value = 'Budget';
    subRight.font = { bold: true, color: { argb: 'FFF1F5F9' } };
    subRight.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF065F46' }
    };
    subRight.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    subRight.border = cellBorder();

    colIdx += 2;
  }

  const totalValueCols = columnMeta.length;
  sheet.getColumn(1).width = 42;
  sheet.getColumn(2).width = 14;
  sheet.getColumn(3).width = 12;
  for (let c = 4; c <= 3 + totalValueCols; c++) {
    sheet.getColumn(c).width = 14;
  }

  rows.forEach((row, ri) => {
    const r = 3 + ri;
    const fillArgb = LEVEL_FILLS_ARGB[Math.min(row.level, LEVEL_FILLS_ARGB.length - 1)];

    const nameCell = sheet.getCell(r, 1);
    nameCell.value = row.nodeLabel;
    nameCell.alignment = {
      indent: Math.min(Math.max(row.level, 0), 15),
      vertical: 'middle',
      wrapText: true
    };
    nameCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: fillArgb }
    };
    nameCell.border = cellBorder();

    const typeCell = sheet.getCell(r, 2);
    typeCell.value = row.nodeType;
    typeCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    typeCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: fillArgb }
    };
    typeCell.border = cellBorder();

    const seriesCell = sheet.getCell(r, 3);
    seriesCell.value = row.seriesLabel;
    seriesCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    seriesCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: fillArgb }
    };
    seriesCell.border = cellBorder();

    row.cells.forEach((val, ci) => {
      const cell = sheet.getCell(r, 4 + ci);
      const meta = columnMeta[ci];

      if (val === null) {
        cell.value = '-';
        cell.numFmt = '@';
      } else {
        cell.value = val;
        cell.numFmt = VALUE_NUM_FMT;
      }
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: meta ? valueFillArgb(meta) : 'FFF8FAFC' }
      };
      cell.border = cellBorder();
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
}

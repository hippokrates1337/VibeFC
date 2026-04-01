import { logger } from '@/lib/utils/logger';
import {
  coerceMonthToMmYyyyKey,
  dateToMmYyyyLocalCalendar,
  generateForecastMonths,
  normalizeMmYyyyKey,
} from '../utils';
import type { ForecastGraphState } from '../state';

export const createUIActions = (set: (partial: any) => void, get: () => any) => ({
  setSelectedNodeId: (nodeId: string | null) => {
    logger.log(`[ForecastGraphStore] setSelectedNodeId called with nodeId: ${nodeId}`);
    set({ selectedNodeId: nodeId });
  },

  setConfigPanelOpen: (open: boolean) => {
    logger.log(`[ForecastGraphStore] setConfigPanelOpen called with: ${open}`);
    set({ configPanelOpen: open });
  },

  openConfigPanelForNode: (nodeId: string) => {
    logger.log(`[ForecastGraphStore] openConfigPanelForNode called for nodeId: ${nodeId}`);
    set({ selectedNodeId: nodeId, configPanelOpen: true });
  },

  setLoading: (isLoading: boolean) => {
    logger.log(`[ForecastGraphStore] setLoading called with: ${isLoading}`);
    set({ isLoading });
  },

  setError: (error: string | null) => {
    if (error === null) {
      logger.log(`[ForecastGraphStore] Clearing error state.`);
    } else {
      logger.error(`[ForecastGraphStore] setError called with: ${error}`);
    }
    set({ error });
  },

  setSelectedVisualizationMonth: (month: Date | null) => {
    logger.log('[ForecastGraphStore] setSelectedVisualizationMonth called with:', month);
    
    // FIXED: Ensure we always store proper Date objects (handle any string inputs)
    const properMonth = month === null ? null : (month instanceof Date ? month : new Date(month));
    
    set({ selectedVisualizationMonth: properMonth });
  },

  setShowVisualizationSlider: (show: boolean) => {
    logger.log('[ForecastGraphStore] setShowVisualizationSlider called with:', show);
    set({ showVisualizationSlider: show });
  },

  updateVisualizationMonthForPeriodChange: (newStartDate: string | null, newEndDate: string | null) => {
    const state = get();
    const currentSelectedMonth = state.selectedVisualizationMonth;
    
    logger.log('[ForecastGraphStore] updateVisualizationMonthForPeriodChange called with:', { newStartDate, newEndDate, currentSelectedMonth });
    
    if (!newStartDate || !newEndDate) {
      set({ selectedVisualizationMonth: null });
      return;
    }
    
    const newMonths = generateForecastMonths(newStartDate, newEndDate);

    if (newMonths.length === 0) {
      set({ selectedVisualizationMonth: null });
      return;
    }
    
    // Try to keep current selection if still valid
    if (currentSelectedMonth) {
      // FIXED: Ensure currentSelectedMonth is a proper Date object (handle persistence deserialization)
      const currentMonth = currentSelectedMonth instanceof Date ? currentSelectedMonth : new Date(currentSelectedMonth);
      
      const isStillValid = newMonths.some(month => 
        month.getTime() === currentMonth.getTime()
      );
      
      if (isStillValid) {
        // Ensure we store a proper Date object
        set({ selectedVisualizationMonth: currentMonth });
        return; // Keep current selection
      }
    }
    
    // Find closest month or default to first month
    const closestMonth = newMonths[0]; // For now, just use first month
    set({ selectedVisualizationMonth: closestMonth });
  },

  generateForecastMonths: (startDate: string, endDate: string) => {
    return generateForecastMonths(startDate, endDate);
  },

  getNodeValueForMonth: (nodeId: string, month: Date) => {
    const state = get();
    const results = state.calculationResults;
    
    if (!results || !nodeId || !month) {
      return null;
    }
    
    const matchNodeId = (n: any) =>
      n.nodeId === nodeId ||
      (typeof n.nodeId === 'string' &&
        typeof nodeId === 'string' &&
        n.nodeId.toLowerCase() === nodeId.toLowerCase());

    // Prefer allNodes (full graph); fall back to metrics-only (e.g. includeIntermediateNodes false)
    const nodeResult =
      results.allNodes?.find(matchNodeId) ?? results.metrics?.find(matchNodeId);
    if (!nodeResult) {
      return null;
    }
    
    // FIXED: Skip constant nodes - they don't need visualization
    if (nodeResult.nodeType === 'CONSTANT') {
      return null;
    }
    
    // FIXED: Ensure month is a proper Date object (handle persistence deserialization)
    const monthDate = month instanceof Date ? month : new Date(month);
    
    // Local calendar month matches slider label and API MM-YYYY rows (avoids UTC shift on local midnight)
    const monthKey = normalizeMmYyyyKey(dateToMmYyyyLocalCalendar(monthDate));

    const monthValue = nodeResult.values.find((value: any) => {
      if (value?.month == null) return false;
      const rowKey = coerceMonthToMmYyyyKey(value.month) ?? normalizeMmYyyyKey(String(value.month));
      return rowKey === monthKey;
    });
    
    if (!monthValue) {
      return null;
    }
    
    // FIXED: Extract forecast value based on node type
    let value: number | null = null;
    let valueType: 'forecast' | 'budget' | 'historical' | 'constant' | 'calculated' = 'forecast';
    
    switch (nodeResult.nodeType) {
      case 'METRIC':
        // Graph forecast output only — do not fall back to budget when forecast is null (misleading in editor)
        value = (monthValue.forecast ?? monthValue.calculated) ?? null;
        valueType = 'forecast';
        break;

      case 'DATA':
        value =
          (monthValue.calculated ??
            monthValue.forecast ??
            monthValue.budget ??
            monthValue.historical) ?? null;
        valueType = 'forecast';
        break;

      case 'OPERATOR':
      case 'SEED':
        value =
          (monthValue.calculated ??
            monthValue.forecast ??
            monthValue.historical ??
            monthValue.budget) ??
          null;
        valueType = 'calculated';
        break;
        
      case 'CONSTANT':
        // Constants should not reach here due to early return, but handle gracefully
        return null;
        
      default:
        // Fallback for any other node types
        value = (monthValue.calculated ?? monthValue.forecast) ?? null;
        valueType = 'forecast';
    }
    
    if (value === null || value === undefined) {
      return null;
    }
    
    // Format the value for display
    const formattedValue = Math.abs(value) >= 1000 
      ? new Intl.NumberFormat('de-DE', { 
          notation: 'compact', 
          compactDisplay: 'short',
          maximumFractionDigits: 1 
        }).format(value)
      : new Intl.NumberFormat('de-DE', {
          style: 'decimal',
          minimumFractionDigits: 0,
          maximumFractionDigits: 2
        }).format(value);
    
    return {
      nodeId,
      month: monthKey, // Use MM-YYYY format as required by updated interface
      value,
      valueType,
      formattedValue,
    };
  },
});

export interface UIState {
  selectedNodeId: string | null;
  configPanelOpen: boolean;
  isLoading: boolean;
  error: string | null;
  selectedVisualizationMonth: Date | null;
  showVisualizationSlider: boolean;
  // Hydration state for Zustand v5 compatibility
  _hasHydrated: boolean;
}

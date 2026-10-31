export interface UIState {
  selectedNodeId: string | null;
  configPanelOpen: boolean;
  isLoading: boolean;
  error: string | null;
  selectedVisualizationMonth: Date | null;
  showVisualizationSlider: boolean;
}

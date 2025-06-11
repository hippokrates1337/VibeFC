'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import ForecastCanvas from '@/components/forecast/forecast-canvas';
import ForecastToolbar from '@/components/forecast/forecast-toolbar';
import { useToast } from '@/components/ui/use-toast';
import { 
  useForecastGraphStore, 
  useForecastNodes, 
  useForecastEdges, 
  useForecastMetadata, 
  useIsForecastDirty,
  useLoadForecast,
  useForecastOrganizationId,
  useForecastError,
  useSelectedVisualizationMonth,
  useSetSelectedVisualizationMonth,
  useShowVisualizationSlider,
  useSetShowVisualizationSlider,
  useForecastMonths,
  useCalculationResults,
  useUpdateVisualizationMonthForPeriodChange
} from '@/lib/store/forecast-graph-store';
import { Toaster } from '@/components/ui/toaster';
import { forecastApi, mapForecastToClientFormat } from '@/lib/api/forecast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useOrganizationStore } from '@/lib/store/organization';
import { CalculationResultsTable } from '@/components/forecast/calculation-results-table';
import MonthSlider from '@/components/forecast/month-slider';
import VisualizationControls from '@/components/forecast/visualization-controls';

export default function ForecastEditorPage() {
  const { forecastId } = useParams<{ forecastId: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [isPageComponentLoading, setIsPageComponentLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [navigationTarget, setNavigationTarget] = useState('');
  
  const loadForecastToStore = useLoadForecast();
  const setDirtyState = useForecastGraphStore(state => state.setDirty);
  const setStoreError = useForecastGraphStore(state => state.setError);
  const isStoreDirty = useIsForecastDirty();
  const { name, startDate, endDate } = useForecastMetadata();
  const nodes = useForecastNodes();
  const edges = useForecastEdges();
  const currentForecastOrgId = useForecastOrganizationId();
  const currentActiveOrg = useOrganizationStore((state) => state.currentOrganization);
  const storeError = useForecastError();

  // Visualization state
  const selectedMonth = useSelectedVisualizationMonth();
  const setSelectedMonth = useSetSelectedVisualizationMonth();
  const showSlider = useShowVisualizationSlider();
  const setShowSlider = useSetShowVisualizationSlider();
  const forecastMonths = useForecastMonths();
  const calculationResults = useCalculationResults();
  const updateVisualizationMonthForPeriodChange = useUpdateVisualizationMonthForPeriodChange();
  
  useEffect(() => {
    if (currentActiveOrg && currentForecastOrgId && currentActiveOrg.id !== currentForecastOrgId) {
      toast({
        title: 'Organization Changed',
        description: `The active organization has changed. You are being redirected as this forecast belongs to a different organization.`,
        variant: 'default',
      });
      router.push('/forecast-definition');
    }
  }, [currentActiveOrg, currentForecastOrgId, router, toast]);
  
  const fetchForecastData = useCallback(async (forceReload = false) => {
    if (!forecastId) return;
    
    // Check if we already have data for this forecast and there are unsaved changes
    const currentForecastId = useForecastGraphStore.getState().forecastId;
    const isDirty = useForecastGraphStore.getState().isDirty;
    const hasNodes = useForecastGraphStore.getState().nodes.length > 0;
    const hasEdges = useForecastGraphStore.getState().edges.length > 0;
    
    // If we already have data for this forecast and there are unsaved changes, don't reload
    if (!forceReload && currentForecastId === forecastId && isDirty && (hasNodes || hasEdges)) {
      console.log('[ForecastEditorPage] Preserving unsaved changes, skipping API fetch');
      setIsPageComponentLoading(false);
      return;
    }
    
    // If we have data for a different forecast, or no data at all, or forced reload, fetch fresh data
    setIsPageComponentLoading(true);
    setStoreError(null);

    try {
      const response = await forecastApi.getForecast(forecastId);
      if (response.error || !response.data) {
        throw new Error(response.error?.message || 'Failed to load forecast details.');
      }
      const clientData = mapForecastToClientFormat(response.data);
      loadForecastToStore(clientData);
      console.log('[ForecastEditorPage] Fresh data loaded from API');
    } catch (err: any) {
      console.error('Error loading forecast:', err);
      setStoreError(err.message);
      toast({
        title: 'Error Loading Forecast',
        description: err.message || 'Could not load the specified forecast.',
        variant: 'destructive',
      });
    } finally {
      setIsPageComponentLoading(false);
    }
  }, [forecastId, loadForecastToStore, setStoreError, toast]);

  useEffect(() => {
    fetchForecastData();
  }, [fetchForecastData]);

  // Effect to handle forecast period changes for visualization
  useEffect(() => {
    updateVisualizationMonthForPeriodChange(startDate, endDate);
  }, [startDate, endDate, updateVisualizationMonthForPeriodChange]);
  
  const handleSave = async () => {
    if (!forecastId) return;
    try {
      setIsSaving(true);
      
      const { data, error: saveError } = await forecastApi.saveForecastGraph(
        forecastId,
        name,
        startDate || '',
        endDate || '',
        nodes,
        edges
      );
      
      if (saveError) {
        throw new Error(saveError.message);
      }
      
      // Reload the saved data to get the correct node IDs and updated references
      if (data) {
        const clientData = mapForecastToClientFormat(data);
        loadForecastToStore(clientData);
        console.log('[ForecastEditorPage] Reloaded forecast with updated node IDs after save');
      }
      
      setDirtyState(false);
      toast({
        title: 'Success',
        description: 'Forecast saved successfully',
      });
    } catch (error: any) {
      console.error('Error saving forecast:', error);
      toast({
        title: 'Error',
        description: 'Failed to save forecast: ' + (error.message || 'Unknown error'),
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleNavigation = (target: string) => {
    if (isStoreDirty) {
      setNavigationTarget(target);
      setShowUnsavedDialog(true);
    } else {
      router.push(target);
    }
  };
  
  const handleBack = () => {
    handleNavigation('/forecast-definition');
  };
  
  const handleConfirmNavigation = () => {
    setShowUnsavedDialog(false);
    router.push(navigationTarget);
  };
  
  const handleReload = async () => {
    await fetchForecastData(true); // Force reload
  };
  
  if (isPageComponentLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-900">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-blue-400" />
          <p className="text-sm text-slate-400">Loading forecast...</p>
        </div>
      </div>
    );
  }

  if (storeError) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-900">
        <div className="text-center space-y-4">
          <p className="text-lg text-red-400 font-medium">Error: {storeError}</p>
          <button onClick={() => router.push('/forecast-definition')} className="text-blue-400 hover:text-blue-300 hover:underline">
            Return to Forecast List
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-slate-900">
      {/* Sidebar */}
      <div className="w-80 border-r border-slate-700 bg-slate-800 shadow-sm">
        <div className="h-full overflow-y-auto">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-slate-200 mb-4">Forecast Builder</h2>
            <ForecastToolbar onSave={handleSave} onBack={handleBack} onReload={handleReload} />
          </div>
        </div>
      </div>
      
      {/* Canvas */}
      <div className="flex-1 relative bg-slate-900 flex flex-col">
        {/* Visualization Controls and Month Slider */}
        <div className="bg-slate-800 border-b border-slate-700 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-200">Visualization</h3>
            <VisualizationControls
              showSlider={showSlider}
              onToggleSlider={setShowSlider}
              disabled={!calculationResults}
            />
          </div>
          
          {showSlider && calculationResults && forecastMonths.length > 0 && (
            <div className="space-y-2">
              <MonthSlider
                months={forecastMonths}
                selectedMonth={selectedMonth}
                onMonthChange={setSelectedMonth}
                disabled={!calculationResults}
              />
            </div>
          )}
          
          {showSlider && !calculationResults && (
            <div className="text-center py-4">
              <p className="text-sm text-slate-400">
                Run forecast calculation to enable month visualization
              </p>
            </div>
          )}
        </div>

        <div className="flex-1">
          <ForecastCanvas />
        </div>
        
        {/* Simple scrollable table for calculation results (interim) */}
        <div className="p-4 max-h-96 overflow-y-auto border-t border-slate-700">
          <CalculationResultsTable />
        </div>
      </div>
      
      <Toaster />
      
      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-200">Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              You have unsaved changes. Are you sure you want to leave without saving?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-700 text-slate-200 hover:bg-slate-600 border-slate-600">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmNavigation} className="bg-red-600 hover:bg-red-700 text-white">
              Leave Without Saving
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 
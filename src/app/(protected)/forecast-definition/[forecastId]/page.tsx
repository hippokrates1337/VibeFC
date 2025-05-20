'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
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
  useForecastError
} from '@/lib/store/forecast-graph-store';
import { Toaster } from '@/components/ui/toaster';
import { forecastApi, mapForecastToClientFormat } from '@/lib/api/forecast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useOrganizationStore } from '@/lib/store/organization';

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
  const resetStore = useForecastGraphStore.getState().resetStore;
  const isStoreDirty = useIsForecastDirty();
  const { name, startDate, endDate } = useForecastMetadata();
  const nodes = useForecastNodes();
  const edges = useForecastEdges();
  const currentForecastOrgId = useForecastOrganizationId();
  const currentActiveOrg = useOrganizationStore((state) => state.currentOrganization);
  const storeError = useForecastError();
  
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
  
  const fetchForecastData = useCallback(async () => {
    if (!forecastId) return;
    setIsPageComponentLoading(true);
    setStoreError(null);

    try {
      const response = await forecastApi.getForecast(forecastId);
      if (response.error || !response.data) {
        throw new Error(response.error?.message || 'Failed to load forecast details.');
      }
      const clientData = mapForecastToClientFormat(response.data);
      loadForecastToStore(clientData);
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
    return () => {
      resetStore();
    };
  }, [fetchForecastData, resetStore]);
  
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
  
  if (isPageComponentLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (storeError) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center">
        <p className="mb-4 text-lg text-destructive">Error: {storeError}</p>
        <button onClick={() => router.push('/forecast-definition')} className="text-primary hover:underline">
          Return to Forecast List
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <Button 
          onClick={handleBack} 
          variant="ghost" 
          size="sm" 
          className="flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Forecasts
        </Button>
        
        <Button 
          onClick={handleSave} 
          disabled={isSaving || isPageComponentLoading}
          className="flex items-center gap-1"
        >
          <Save className="h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save Forecast'}
        </Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_3fr] gap-4">
        <Card className="p-4">
          <ForecastToolbar onSave={handleSave} />
        </Card>
        
        <Card className="h-[600px] overflow-hidden">
          <ForecastCanvas />
        </Card>
      </div>
      
      <Toaster />
      
      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to leave without saving?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmNavigation}>
              Leave Without Saving
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Save } from 'lucide-react';
import ForecastCanvas from '@/components/forecast/forecast-canvas';
import ForecastToolbar from '@/components/forecast/forecast-toolbar';
import { useToast } from '@/components/ui/use-toast';
import { useForecastGraphStore } from '@/lib/store/forecast-graph-store';
import { Toaster } from '@/components/ui/toaster';

export default function ForecastEditorPage() {
  const { forecastId } = useParams<{ forecastId: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Get store actions
  const loadForecast = useForecastGraphStore(state => state.loadForecast);
  const setDirty = useForecastGraphStore(state => state.setDirty);
  const setError = useForecastGraphStore(state => state.setError);
  
  // Load forecast data on mount
  useEffect(() => {
    const fetchForecast = async () => {
      try {
        setIsLoading(true);
        
        // Example data - in a real implementation, this would come from the API
        const forecastData = {
          id: forecastId,
          name: 'Sample Forecast',
          startDate: '2023-01-01',
          endDate: '2023-12-31',
          nodes: [],
          edges: []
        };
        
        loadForecast(forecastData); // This action already sets isDirty to false in the store
      } catch (error) {
        console.error('Error loading forecast:', error);
        setError('Failed to load forecast data');
        toast({
          title: 'Error',
          description: 'Failed to load forecast data',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchForecast();
    // console.log('ForecastEditorPage useEffect temporarily disabled for diagnostics');
    // setIsLoading(false); // You might want to set this to false if the effect is disabled
  }, [forecastId, loadForecast, setError]);
  
  
  // Save forecast data
  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      // In a real implementation, this would call the API to save the forecast
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setDirty(false);
      toast({
        title: 'Success',
        description: 'Forecast saved successfully',
      });
    } catch (error) {
      console.error('Error saving forecast:', error);
      toast({
        title: 'Error',
        description: 'Failed to save forecast',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleBack = () => {
    router.push('/forecast-definition');
  };
  
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
          disabled={isSaving || isLoading}
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
    </div>
  );
} 
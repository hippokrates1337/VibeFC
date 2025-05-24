'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Forecast, forecastApi } from '@/lib/api/forecast';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { useOrganizationStore } from '@/lib/store/organization';
import { useOrganizationForecasts, useIsForecastLoading, useForecastError } from '@/lib/store/forecast-graph-store';

// Helper function to safely format dates
const formatDateSafe = (dateString: string | null | undefined, formatPattern: string): string => {
  if (!dateString) {
    return 'N/A';
  }
  try {
    const date = new Date(dateString);
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return 'N/A';
    }
    return format(date, formatPattern);
  } catch (error) {
    console.warn(`Error formatting date string "${dateString}":`, error);
    return 'N/A';
  }
};

export default function ForecastDefinitionPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const currentOrganizationFromStore = useOrganizationStore((state) => state.currentOrganization);

  const forecasts = useOrganizationForecasts();
  const isForecastListLoading = useIsForecastLoading();
  const forecastError = useForecastError();

  // Create a new forecast
  const handleCreateForecast = async () => {
    if (!currentOrganizationFromStore?.id) {
      toast({
        title: 'Organization Not Selected',
        description: 'Please select an organization before creating a forecast.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsCreating(true);
      
      // Default values for new forecast in ISO 8601 format
      const today = new Date();
      const startDate = today.toISOString(); 
      
      const endDateObj = new Date(today);
      endDateObj.setMonth(endDateObj.getMonth() + 12);
      endDateObj.setDate(0); // Last day of the 11th month from now (12 months total period)
      const endDate = endDateObj.toISOString();
      
      const { data, error } = await forecastApi.createForecast(
        'New Forecast',
        startDate,
        endDate,
        currentOrganizationFromStore.id
      );
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (data) {
        router.push(`/forecast-definition/${data.id}`);
      }
    } catch (error: any) {
      console.error('Error creating forecast:', error);
      toast({
        title: 'Error',
        description: 'Failed to create forecast: ' + error.message,
        variant: 'destructive',
      });
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="container py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-100">Forecast Definition</h1>
            <p className="text-slate-400 mt-1">
              Create and manage forecast models with our graphical editor
            </p>
          </div>
          <Button 
            onClick={handleCreateForecast} 
            disabled={isCreating}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create New Forecast'
            )}
          </Button>
        </div>
        
        {isForecastListLoading && !isCreating ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : forecastError ? (
          <div className="flex flex-col items-center justify-center mt-10 p-10 border border-slate-700 rounded-lg bg-slate-800">
            <h3 className="text-lg font-medium text-red-400">Error loading forecasts</h3>
            <p className="text-slate-400 mt-1 mb-4">{forecastError}</p>
          </div>
        ) : (
          <>
            {forecasts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {forecasts.map((forecast) => (
                  <Card key={forecast.id} className="overflow-hidden bg-slate-800 border-slate-700 hover:bg-slate-750 transition-colors">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xl text-slate-100">{forecast.name}</CardTitle>
                      <CardDescription className="text-slate-400">
                        {formatDateSafe(forecast.forecastStartDate, 'MMM d, yyyy')} - {formatDateSafe(forecast.forecastEndDate, 'MMM d, yyyy')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-32 flex items-center justify-center bg-slate-700 rounded-md border border-slate-600">
                        <p className="text-sm text-slate-400">Graph preview</p>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between border-t border-slate-700 p-4 bg-slate-800">
                      <div className="text-xs text-slate-400">
                        Updated {formatDateSafe(forecast.updatedAt, 'MMM d, yyyy')}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/forecast-definition/${forecast.id}`)}
                        className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600 hover:text-white"
                      >
                        Open Editor
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center mt-10 p-10 border border-slate-700 rounded-lg bg-slate-800">
                <h3 className="text-lg font-medium text-slate-200">No forecasts found</h3>
                <p className="text-slate-400 mt-1 mb-4">Create your first forecast to get started</p>
                <Button onClick={handleCreateForecast} disabled={isCreating} className="bg-blue-600 hover:bg-blue-700 text-white">
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Forecast'
                  )}
                </Button>
              </div>
            )}
          </>
        )}
        
        <Toaster />
      </div>
    </div>
  );
} 
'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

// Placeholder data until API integration in Phase 5
const PLACEHOLDER_FORECASTS = [
  {
    id: '1',
    name: 'Q1 2023 Revenue Forecast',
    startDate: '2023-01-01',
    endDate: '2023-03-31',
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Annual Budget 2023',
    startDate: '2023-01-01',
    endDate: '2023-12-31',
    updatedAt: new Date().toISOString(),
  },
];

export default function ForecastDefinitionPage() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  
  // Placeholder function until API integration in Phase 5
  const handleCreateForecast = () => {
    setIsCreating(true);
    // Simulate API call latency
    setTimeout(() => {
      const newId = Math.random().toString(36).substring(2, 9);
      router.push(`/forecast-definition/${newId}`);
    }, 500);
  };

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Forecast Definition</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage forecast models with our graphical editor
          </p>
        </div>
        <Button 
          onClick={handleCreateForecast} 
          disabled={isCreating}
        >
          {isCreating ? 'Creating...' : 'Create New Forecast'}
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {PLACEHOLDER_FORECASTS.map((forecast) => (
          <Card key={forecast.id} className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">{forecast.name}</CardTitle>
              <CardDescription>
                {new Date(forecast.startDate).toLocaleDateString()} - {new Date(forecast.endDate).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-32 flex items-center justify-center bg-muted rounded-md">
                <p className="text-sm text-muted-foreground">Graph preview</p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t p-4">
              <div className="text-xs text-muted-foreground">
                Updated {new Date(forecast.updatedAt).toLocaleDateString()}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/forecast-definition/${forecast.id}`)}
              >
                Open Editor
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
      
      {PLACEHOLDER_FORECASTS.length === 0 && (
        <div className="flex flex-col items-center justify-center mt-10 p-10 border rounded-lg">
          <h3 className="text-lg font-medium">No forecasts found</h3>
          <p className="text-muted-foreground mt-1 mb-4">Create your first forecast to get started</p>
          <Button onClick={handleCreateForecast} disabled={isCreating}>
            {isCreating ? 'Creating...' : 'Create Forecast'}
          </Button>
        </div>
      )}
    </div>
  );
} 
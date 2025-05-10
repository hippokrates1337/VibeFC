'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
// import { useOrganization } from '@/providers/organization-provider';
import { useOrganizationStore } from '@/lib/store/organization'; // Import store hook
import { AdminOnly } from '@/components/RoleBasedAccess';
import { useAuth } from '@/providers/auth-provider';

export function OrganizationSettings() {
  // Get state and actions from store
  const currentOrganization = useOrganizationStore(state => state.currentOrganization); // Select only the needed state primitive/object
  const updateOrganizationAction = useOrganizationStore(state => state.updateOrganization);
  const deleteOrganizationAction = useOrganizationStore(state => state.deleteOrganization);
  const { session } = useAuth();

  const [name, setName] = useState(currentOrganization?.name || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Update local state when the selected organization changes
  useEffect(() => {
    if (currentOrganization) {
      setName(currentOrganization.name);
      setError(null); // Clear errors on org switch
    }
  }, [currentOrganization]);

  const handleUpdate = async () => {
    if (!currentOrganization || !session?.access_token) return;
    setIsUpdating(true);
    setError(null);
    
    try {
      const result = await updateOrganizationAction(currentOrganization.id, name, session.access_token);
      if (!result) throw new Error('Failed to update organization');
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to update organization');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!currentOrganization || !session?.access_token || 
        !window.confirm(`Are you sure you want to delete ${currentOrganization.name}? This cannot be undone.`)) return;
    
    setIsDeleting(true);
    setError(null);
    
    try {
      const success = await deleteOrganizationAction(currentOrganization.id, session.access_token);
      if (!success) throw new Error('Failed to delete organization');
      setError(null);
      // Current org will change automatically via store update after delete
    } catch (err: any) {
      setError(err.message || 'Failed to delete organization');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!currentOrganization) {
    return <p className="text-muted-foreground">Select an organization to manage settings.</p>;
  }

  return (
    <AdminOnly>
      <div className="space-y-8">
        <div>
          <h2 className="text-xl font-semibold">Organization Settings</h2>
          <p className="text-muted-foreground">
            Manage your organization's settings and members.
          </p>
        </div>
        
        <div className="space-y-4">
          <h3 className="text-lg font-medium">General Settings</h3>
          
          <form onSubmit={handleUpdate} className="space-y-4">
            {error && (
              <div className="bg-red-100 text-red-800 p-3 rounded-md text-sm">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Organization Name
              </label>
              <input
                id="name"
                type="text"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter organization name"
                disabled={isUpdating}
              />
            </div>
            
            <Button type="submit" disabled={isUpdating || name === currentOrganization.name}>
              {isUpdating ? 'Updating...' : 'Update Organization'}
            </Button>
          </form>
        </div>
        
        <div className="border-t pt-6 space-y-4">
          <h3 className="text-lg font-medium text-red-600">Danger Zone</h3>
          <p className="text-sm text-muted-foreground">
            Once you delete an organization, there is no going back. Please be certain.
          </p>
          
          <Button 
            variant="destructive" 
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete Organization'}
          </Button>
        </div>
      </div>
    </AdminOnly>
  );
} 
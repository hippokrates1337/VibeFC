'use client';

import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useOrganizationStore } from '@/lib/store/organization';
import { PlusCircle } from 'lucide-react';
import { CreateOrganizationModal } from './CreateOrganizationModal';
import { useAuth } from '@/providers/auth-provider';
import { useShallow } from 'zustand/react/shallow';

export function OrganizationSelector() {
  const { organizations, currentOrganization, switchOrganization, isLoading } = useOrganizationStore(
    useShallow((state) => ({ 
      organizations: state.organizations,
      currentOrganization: state.currentOrganization,
      switchOrganization: state.switchOrganization,
      isLoading: state.isLoading 
    }))
  );
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { user, session } = useAuth();

  const handleSwitch = async (orgId: string) => {
    if (orgId === '__create__') {
      setIsCreateModalOpen(true);
    } else if (orgId !== currentOrganization?.id && user && session?.access_token) {
      try {
        await switchOrganization(orgId, user.id, session.access_token);
      } catch (error) {
        console.error('Failed to switch organization', error);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="h-4 w-28 bg-slate-700 animate-pulse rounded"></div>
      </div>
    );
  }

  // No organizations yet
  if (organizations.length === 0) {
    return (
      <div className="flex items-center space-x-2" data-testid="org-selector-container">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsCreateModalOpen(true)}
          className="text-sm bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600 hover:text-white"
        >
          Create Organization
        </Button>
        <CreateOrganizationModal 
          open={isCreateModalOpen} 
          onOpenChange={() => setIsCreateModalOpen(false)} 
        />
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2" data-testid="org-selector-container">
      <Select 
        value={currentOrganization?.id || ''} 
        onValueChange={handleSwitch}
        data-testid="organization-selector"
      >
        <SelectTrigger className="w-[180px] bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600">
          <SelectValue placeholder="Select organization" />
        </SelectTrigger>
        <SelectContent className="bg-slate-700 border-slate-600">
          {organizations.map((org) => (
            <SelectItem key={org.id} value={org.id} className="text-slate-200 hover:bg-slate-600 focus:bg-slate-600">
              {org.name}
            </SelectItem>
          ))}
          <SelectItem value="__create__" className="text-blue-400 font-semibold hover:bg-slate-600 focus:bg-slate-600">
            <div className="flex items-center">
              <PlusCircle className="mr-2 h-4 w-4" /> Create New...
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
      <CreateOrganizationModal 
        open={isCreateModalOpen} 
        onOpenChange={() => setIsCreateModalOpen(false)} 
      />
    </div>
  );
} 
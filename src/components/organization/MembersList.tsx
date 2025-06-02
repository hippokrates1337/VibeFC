'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOrganizationStore } from '@/lib/store/organization';
import { useAuth } from '@/providers/auth-provider';
import { AdminOnly } from '@/components/RoleBasedAccess';
import { OrganizationMember } from '@/lib/supabase';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2 } from "lucide-react";
import { useShallow } from 'zustand/react/shallow';

export function MembersList() {
  const { user, session } = useAuth();
  const { members, userRole, currentOrganization } = useOrganizationStore(useShallow(state => ({ 
    members: state.members,
    userRole: state.userRole,
    currentOrganization: state.currentOrganization
  })));
  const updateMemberRoleAction = useOrganizationStore(state => state.updateMemberRole);
  const removeMemberAction = useOrganizationStore(state => state.removeMember);

  const [isUpdating, setIsUpdating] = useState<Record<string, boolean>>({});
  const [isRemoving, setIsRemoving] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const handleRoleChange = async (memberUserId: string, newRole: 'admin' | 'editor' | 'viewer') => {
    if (!currentOrganization || !session?.access_token) return;
    
    setIsUpdating(prev => ({ ...prev, [memberUserId]: true }));
    setError(null);
    
    try {
      const success = await updateMemberRoleAction(
        memberUserId, 
        newRole, 
        currentOrganization.id, 
        session.access_token
      );
      
      if (!success) throw new Error('Failed to update member role');
    } catch (err: any) {
      setError(err.message || 'Failed to update member role');
    } finally {
      setIsUpdating(prev => ({ ...prev, [memberUserId]: false }));
    }
  };

  const handleRemoveMember = async (memberUserId: string) => {
    if (!currentOrganization || !session?.access_token || 
        !window.confirm('Are you sure you want to remove this member?')) return;
    
    setIsRemoving(prev => ({ ...prev, [memberUserId]: true }));
    setError(null);
    
    try {
      const success = await removeMemberAction(
        memberUserId, 
        currentOrganization.id, 
        session.access_token
      );
      
      if (!success) throw new Error('Failed to remove member');
    } catch (err: any) {
      setError(err.message || 'Failed to remove member');
    } finally {
      setIsRemoving(prev => ({ ...prev, [memberUserId]: false }));
    }
  };

  if (!currentOrganization) {
    return <p className="text-slate-400">Select an organization to view members.</p>;
  }

  if (members.length === 0) {
    return <p className="text-slate-400">No members found in this organization.</p>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-slate-200">Organization Members</h3>
      
      {error && (
        <div className="bg-red-900/20 text-red-300 p-3 rounded-md text-sm mb-4 border border-red-800">
          {error}
        </div>
      )}
      
      <div className="border border-slate-700 rounded-md divide-y divide-slate-700 bg-slate-800">
        {members.map((member: OrganizationMember) => (
          <div key={member.user_id} className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium text-slate-100">{member.email}</p>
              {member.user_id === currentOrganization.owner_id && (
                <span className="text-xs bg-blue-900/30 text-blue-300 px-2 py-1 rounded border border-blue-800">Owner</span>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <AdminOnly>
                {member.user_id !== currentOrganization.owner_id && (
                  <>
                    <Select
                      value={member.role}
                      onValueChange={(value) => handleRoleChange(member.user_id, value as 'admin' | 'editor' | 'viewer')}
                      disabled={userRole !== 'admin' || member.user_id === user?.id}
                    >
                      <SelectTrigger className="w-[100px] bg-slate-700 border-slate-600 text-slate-100 focus:border-blue-500">
                        <SelectValue placeholder="Role" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700 border-slate-600">
                        <SelectItem value="admin" className="text-slate-100 hover:bg-slate-600 focus:bg-slate-600">Admin</SelectItem>
                        <SelectItem value="editor" className="text-slate-100 hover:bg-slate-600 focus:bg-slate-600">Editor</SelectItem>
                        <SelectItem value="viewer" className="text-slate-100 hover:bg-slate-600 focus:bg-slate-600">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveMember(member.user_id)}
                      disabled={userRole !== 'admin' || member.user_id === user?.id || member.user_id === currentOrganization.owner_id}
                      className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </AdminOnly>
              
              {(!userRole || userRole !== 'admin' || member.user_id === currentOrganization.owner_id) && (
                <span className="text-sm text-slate-400">{member.role}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 
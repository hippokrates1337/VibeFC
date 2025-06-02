'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { AdminOnly } from '@/components/RoleBasedAccess';
import { useOrganizationStore } from '@/lib/store/organization';
import { useAuth } from '@/providers/auth-provider';
import { useShallow } from 'zustand/react/shallow';

export function InviteMemberForm() {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'editor' | 'viewer'>('viewer');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const { session } = useAuth();
  const { currentOrganization } = useOrganizationStore(useShallow(state => ({ 
    currentOrganization: state.currentOrganization 
  })));
  const inviteMemberAction = useOrganizationStore(state => state.inviteMember);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Email is required" });
      return;
    }
    
    if (!currentOrganization || !session?.access_token) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in to invite members" });
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const success = await inviteMemberAction(
        email,
        role,
        currentOrganization.id,
        session.access_token
      );
      
      if (!success) throw new Error('Failed to invite member');
      
      setSuccess(`Invitation sent to ${email}`);
      setEmail(''); // Reset form
      setRole('viewer');
      
      toast({ 
        title: "Success", 
        description: `Invitation sent to ${email}` 
      });
    } catch (err: any) {
      setError(err.message || 'Failed to invite member');
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: err.message || 'Failed to invite member' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AdminOnly>
      <div className="p-6 border border-slate-700 rounded-lg shadow-sm bg-slate-800">
        <h3 className="text-lg font-semibold mb-4 text-slate-100">Invite New Member</h3>
        {error && (
          <div className="bg-red-900/20 text-red-300 p-3 rounded-md text-sm border border-red-800 mb-4">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-900/20 text-green-300 p-3 rounded-md text-sm border border-green-800 mb-4">
            {success}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-slate-200">
              Email Address
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              placeholder="member@example.com"
              disabled={isLoading}
              className="bg-slate-700 border-slate-600 text-slate-100 placeholder:text-slate-400 focus:border-blue-500"
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="role" className="text-sm font-medium text-slate-200">
              Role
            </label>
            <Select
              value={role}
              onValueChange={(value) => setRole(value as 'admin' | 'editor' | 'viewer')}
              disabled={isLoading}
            >
              <SelectTrigger className="bg-slate-700 border-slate-600 text-slate-100 focus:border-blue-500">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                <SelectItem value="admin" className="text-slate-100 hover:bg-slate-600 focus:bg-slate-600">Admin</SelectItem>
                <SelectItem value="editor" className="text-slate-100 hover:bg-slate-600 focus:bg-slate-600">Editor</SelectItem>
                <SelectItem value="viewer" className="text-slate-100 hover:bg-slate-600 focus:bg-slate-600">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button 
            type="submit" 
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isLoading ? 'Sending Invitation...' : 'Invite Member'}
          </Button>
        </form>
      </div>
    </AdminOnly>
  );
} 
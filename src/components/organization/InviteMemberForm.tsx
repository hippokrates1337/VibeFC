'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
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
      <div className="p-6 border rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Invite New Member</h3>
        {error && (
          <div className="bg-red-100 text-red-800 p-3 rounded-md text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-100 text-green-800 p-3 rounded-md text-sm">
            {success}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email Address
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              placeholder="member@example.com"
              disabled={isLoading}
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="role" className="text-sm font-medium">
              Role
            </label>
            <Select
              value={role}
              onValueChange={(value) => setRole(value as 'admin' | 'editor' | 'viewer')}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Sending Invitation...' : 'Invite Member'}
          </Button>
        </form>
      </div>
    </AdminOnly>
  );
} 
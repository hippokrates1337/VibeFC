import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabase, Organization, OrganizationMember } from '@/lib/supabase';
import { logger } from '@/lib/utils/logger';

interface OrganizationState {
  organizations: Organization[];
  currentOrganization: Organization | null;
  userRole: 'admin' | 'editor' | 'viewer' | null;
  members: OrganizationMember[];
  isLoading: boolean;
  error: string | null;
  fetchOrganizationData: (userId: string, token: string) => Promise<void>;
  loadMembers: (organizationId: string, token: string) => Promise<void>;
  switchOrganization: (organizationId: string, userId: string, token: string) => Promise<void>;
  clearOrganizationData: () => void;
  createOrganization: (name: string, userId: string, token: string) => Promise<Organization | null>;
  updateOrganization: (id: string, name: string, token: string) => Promise<Organization | null>;
  deleteOrganization: (id: string, token: string) => Promise<boolean>;
  inviteMember: (email: string, role: string, currentOrgId: string, token: string) => Promise<boolean>;
  updateMemberRole: (userId: string, role: string, currentOrgId: string, token: string) => Promise<boolean>;
  removeMember: (userId: string, currentOrgId: string, token: string) => Promise<boolean>;
}

export const useOrganizationStore = create<OrganizationState>()(
  persist(
    (set, get) => ({
      organizations: [],
      currentOrganization: null,
      userRole: null,
      members: [],
      isLoading: false,
      error: null,

      fetchOrganizationData: async (userId, token) => {
        logger.log('[OrganizationStore] Fetching organization data for user:', userId);
        if (get().isLoading) {
          logger.log('[OrganizationStore] Already loading, skipping fetch.');
          return;
        }
        set({ isLoading: true, error: null });

        try {
          await supabase.auth.setSession({ access_token: token, refresh_token: '' });
          
          const { data: memberships, error: membershipError } = await supabase
            .from('organization_members')
            .select('organization_id, role')
            .eq('user_id', userId);

          if (membershipError) throw membershipError;

          if (!memberships || memberships.length === 0) {
            logger.log('[OrganizationStore] No memberships found.');
            set({ organizations: [], currentOrganization: null, userRole: null, members: [], isLoading: false });
            return;
          }
          logger.log(`[OrganizationStore] Found ${memberships.length} memberships.`);

          const orgIds = memberships.map((m: { organization_id: string; role: string }) => m.organization_id);
          const { data: orgs, error: orgsError } = await supabase
            .from('organizations')
            .select('*')
            .in('id', orgIds);

          if (orgsError) throw orgsError;
          if (!orgs) throw new Error('Failed to fetch organization details.');
          logger.log(`[OrganizationStore] Found ${orgs.length} organization details.`);

          set({ organizations: orgs });

          const state = get();
          const persistedOrgId = state.currentOrganization?.id;
          const currentOrg = persistedOrgId
            ? orgs.find((org: Organization) => org.id === persistedOrgId) || orgs[0]
            : orgs[0];

          if (currentOrg) {
            logger.log(`[OrganizationStore] Setting current organization to: ${currentOrg.name} (ID: ${currentOrg.id})`);
            const membership = memberships.find((m: { organization_id: string; role: string }) => m.organization_id === currentOrg.id);
            const role = membership?.role as 'admin' | 'editor' | 'viewer' || null;
            set({ currentOrganization: currentOrg, userRole: role });
            
            await get().loadMembers(currentOrg.id, token);
          } else {
             logger.log('[OrganizationStore] No current organization could be determined.');
             set({ currentOrganization: null, userRole: null, members: [] });
          }

        } catch (err: any) {
          logger.error('[OrganizationStore] Error fetching organization data:', err);
          set({ error: err.message || 'Failed to load organization data.', currentOrganization: null, userRole: null, members: [] });
        } finally {
          set({ isLoading: false });
        }
      },

      loadMembers: async (organizationId, token) => {
        logger.log(`[OrganizationStore] Loading members for org ID: ${organizationId}`);
        try {
          await supabase.auth.setSession({ access_token: token, refresh_token: '' });
          
          const { data, error } = await supabase
            .from('organization_members_with_emails')
            .select('*')
            .eq('organization_id', organizationId);

          if (error) throw error;
          
          const membersData = data || [];
          logger.log(`[OrganizationStore] Found ${membersData.length} members.`);
          const mappedMembers = membersData.map((member: any) => ({
            id: member.id as number, 
            organization_id: member.organization_id as string,
            user_id: member.user_id as string,
            role: member.role as 'admin' | 'editor' | 'viewer',
            joined_at: member.joined_at as string,
            email: member.email as string | undefined,
          }));
          set({ members: mappedMembers });
        } catch (err: any) {
          logger.error(`[OrganizationStore] Error loading members for org ${organizationId}:`, err);
          set({ members: [], error: err.message || 'Failed to load members.' });
        }
      },

      switchOrganization: async (organizationId: string, userId: string, token: string) => {
        logger.log(`[OrganizationStore] Switching to organization ID: ${organizationId}`);
        const state = get();
        const org = state.organizations.find((o: Organization) => o.id === organizationId);

        if (!org) {
          logger.error(`[OrganizationStore] Cannot switch to org ${organizationId}: Not found.`);
          return;
        }

        try {
          set({ isLoading: true, error: null });
          await supabase.auth.setSession({ access_token: token, refresh_token: '' });
          
          const { data: membershipData, error: membershipError } = await supabase
            .from('organization_members')
            .select('role')
            .eq('organization_id', organizationId)
            .eq('user_id', userId)
            .single();
            
          if (membershipError) throw membershipError;
          
          const role = membershipData?.role as 'admin' | 'editor' | 'viewer' || null;
          
          set({ currentOrganization: org, userRole: role });
          
          await state.loadMembers(org.id, token);
          
          logger.log(`[OrganizationStore] Switched to organization: ${org.name} with role: ${role}`);
        } catch (err: any) {
          logger.error(`[OrganizationStore] Error switching to org ${organizationId}:`, err);
          set({ error: err.message || 'Failed to switch organization.' });
        } finally {
          set({ isLoading: false });
        }
      },

      clearOrganizationData: () => {
        logger.log('[OrganizationStore] Clearing organization data.');
        set({
          organizations: [],
          currentOrganization: null,
          userRole: null,
          members: [],
          isLoading: false,
          error: null
        });
      },
      
      createOrganization: async (name: string, userId: string, token: string) => {
        logger.log(`[OrganizationStore] Creating new organization: ${name}`);
        set({ isLoading: true, error: null });
        
        try {
          await supabase.auth.setSession({ access_token: token, refresh_token: '' });
          
          const { data: newOrg, error: createError } = await supabase
            .from('organizations')
            .insert({ name, owner_id: userId })
            .select()
            .single();
            
          if (createError) throw createError;
          if (!newOrg) throw new Error('Failed to create organization.');
          
          const { error: memberError } = await supabase
            .from('organization_members')
            .upsert({
              organization_id: newOrg.id,
              user_id: userId,
              role: 'admin'
            }, {
              onConflict: 'organization_id,user_id',
              ignoreDuplicates: true
            });

          if (memberError) throw memberError;

          const currentOrgs = get().organizations;
          set({ 
            organizations: [...currentOrgs, newOrg],
            currentOrganization: newOrg,
            userRole: 'admin'
          });
          
          await get().loadMembers(newOrg.id, token);
          
          logger.log(`[OrganizationStore] Created organization: ${newOrg.name} (ID: ${newOrg.id})`);
          return newOrg;
        } catch (err: any) {
          logger.error('[OrganizationStore] Error creating organization:', err);
          set({ error: err.message || 'Failed to create organization.' });
          return null;
        } finally {
          set({ isLoading: false });
        }
      },
      
      updateOrganization: async (id: string, name: string, token: string) => {
        logger.log(`[OrganizationStore] Updating organization ${id} to: ${name}`);
        set({ isLoading: true, error: null });
        
        try {
          await supabase.auth.setSession({ access_token: token, refresh_token: '' });
          
          const { data: updatedOrg, error } = await supabase
            .from('organizations')
            .update({ name })
            .eq('id', id)
            .select()
            .single();
            
          if (error) throw error;
          if (!updatedOrg) throw new Error('Failed to update organization.');
          
          const currentOrgs = get().organizations;
          const updatedOrgs = currentOrgs.map(org => 
            org.id === id ? updatedOrg : org
          );
          
          set({ organizations: updatedOrgs });
          
          if (get().currentOrganization?.id === id) {
            set({ currentOrganization: updatedOrg });
          }
          
          logger.log(`[OrganizationStore] Updated organization: ${updatedOrg.name}`);
          return updatedOrg;
        } catch (err: any) {
          logger.error(`[OrganizationStore] Error updating organization ${id}:`, err);
          set({ error: err.message || 'Failed to update organization.' });
          return null;
        } finally {
          set({ isLoading: false });
        }
      },
      
      deleteOrganization: async (id: string, token: string) => {
        logger.log(`[OrganizationStore] Deleting organization: ${id}`);
        set({ isLoading: true, error: null });
        
        try {
          await supabase.auth.setSession({ access_token: token, refresh_token: '' });
          
          // First, delete all members associated with this organization
          const { error: memberDeleteError } = await supabase
            .from('organization_members')
            .delete()
            .eq('organization_id', id);
            
          if (memberDeleteError) {
            logger.error(`[OrganizationStore] Error deleting members for org ${id}:`, memberDeleteError);
            // Optionally, decide if you want to proceed with organization deletion even if members fail to delete
            // For now, we'll throw the error to stop the process
            throw memberDeleteError;
          }
          logger.log(`[OrganizationStore] Successfully deleted members for org ${id}.`);
          
          // Now, delete the organization itself
          const { error } = await supabase
            .from('organizations')
            .delete()
            .eq('id', id);
            
          if (error) throw error;
          
          const currentOrgs = get().organizations.filter(org => org.id !== id);
          set({ organizations: currentOrgs });
          
          if (get().currentOrganization?.id === id) {
            if (currentOrgs.length > 0) {
              const nextOrg = currentOrgs[0];
              set({ 
                currentOrganization: nextOrg,
                userRole: null,
                members: []
              });
            } else {
              set({ 
                currentOrganization: null,
                userRole: null,
                members: []
              });
            }
          }
          
          logger.log(`[OrganizationStore] Deleted organization: ${id}`);
          return true;
        } catch (err: any) {
          logger.error(`[OrganizationStore] Error deleting organization ${id}:`, err);
          set({ error: err.message || 'Failed to delete organization.' });
          return false;
        } finally {
          set({ isLoading: false });
        }
      },
      
      inviteMember: async (email: string, role: string, currentOrgId: string, token: string) => {
        logger.log(`[OrganizationStore] Inviting ${email} to organization ${currentOrgId} with role: ${role}`);
        set({ isLoading: true, error: null });
        
        try {
          await supabase.auth.setSession({ access_token: token, refresh_token: '' });
          
          const { data: userData, error: userError } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', email)
            .maybeSingle();
            
          if (userError) throw userError;
          
          if (!userData) {
            const { error: inviteError } = await supabase
              .from('organization_invitations')
              .insert({
                organization_id: currentOrgId,
                email,
                role
              });
              
            if (inviteError) throw inviteError;
          } else {
            const { error: memberError } = await supabase
              .from('organization_members')
              .insert({
                organization_id: currentOrgId,
                user_id: userData.id,
                role
              });
              
            if (memberError) throw memberError;
          }
          
          await get().loadMembers(currentOrgId, token);
          
          logger.log(`[OrganizationStore] Successfully invited ${email} to organization ${currentOrgId}`);
          return true;
        } catch (err: any) {
          logger.error(`[OrganizationStore] Error inviting member to org ${currentOrgId}:`, err);
          set({ error: err.message || 'Failed to invite member.' });
          return false;
        } finally {
          set({ isLoading: false });
        }
      },
      
      updateMemberRole: async (userId: string, role: string, currentOrgId: string, token: string) => {
        logger.log(`[OrganizationStore] Updating role for user ${userId} to ${role} in org ${currentOrgId}`);
        set({ isLoading: true, error: null });
        
        try {
          await supabase.auth.setSession({ access_token: token, refresh_token: '' });
          
          const { error } = await supabase
            .from('organization_members')
            .update({ role })
            .eq('organization_id', currentOrgId)
            .eq('user_id', userId);
            
          if (error) throw error;
          
          const currentMembers = get().members;
          const updatedMembers = currentMembers.map(member => 
            member.user_id === userId && member.organization_id === currentOrgId
              ? { ...member, role: role as 'admin' | 'editor' | 'viewer' }
              : member
          );
          
          set({ members: updatedMembers });
          
          const { data: { user } } = await supabase.auth.getUser();
          if (user && user.id === userId) {
              set({ userRole: role as 'admin' | 'editor' | 'viewer' });
          }
          
          logger.log(`[OrganizationStore] Updated role for user ${userId} to ${role}`);
          return true;
        } catch (err: any) {
          logger.error(`[OrganizationStore] Error updating member role in org ${currentOrgId}:`, err);
          set({ error: err.message || 'Failed to update member role.' });
          return false;
        } finally {
          set({ isLoading: false });
        }
      },
      
      removeMember: async (userId: string, currentOrgId: string, token: string) => {
        logger.log(`[OrganizationStore] Removing user ${userId} from org ${currentOrgId}`);
        set({ isLoading: true, error: null });
        
        try {
          await supabase.auth.setSession({ access_token: token, refresh_token: '' });
          
          const { error } = await supabase
            .from('organization_members')
            .delete()
            .eq('organization_id', currentOrgId)
            .eq('user_id', userId);
            
          if (error) throw error;
          
          const updatedMembers = get().members.filter(
            member => !(member.user_id === userId && member.organization_id === currentOrgId)
          );
          
          set({ members: updatedMembers });
          
          logger.log(`[OrganizationStore] Removed user ${userId} from org ${currentOrgId}`);
          return true;
        } catch (err: any) {
          logger.error(`[OrganizationStore] Error removing member from org ${currentOrgId}:`, err);
          set({ error: err.message || 'Failed to remove member.' });
          return false;
        } finally {
          set({ isLoading: false });
        }
      }
    }),
    {
      name: 'organization-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        currentOrganization: state.currentOrganization ? { id: state.currentOrganization.id } : null 
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          logger.error('[OrganizationStore] Failed to rehydrate', error)
        } else {
          logger.log('[OrganizationStore] Rehydration successful')
        }
      },
    }
  )
); 
import { OrganizationSettings } from '@/components/organization/OrganizationSettings';
import { MembersList } from '@/components/organization/MembersList';
import { InviteMemberForm } from '@/components/organization/InviteMemberForm';

export const metadata = {
  title: 'Organization Management - VibeFC',
  description: 'Manage your organization settings and members',
};

export default function OrganizationsPage() {
  return (
    <div className="container py-10 space-y-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Organization Management</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
        <div className="md:col-span-2 space-y-10">
          <OrganizationSettings />
          <MembersList />
        </div>
        
        <div>
          <InviteMemberForm />
        </div>
      </div>
    </div>
  );
} 
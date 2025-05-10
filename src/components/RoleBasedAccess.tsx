'use client';

import { ReactNode } from 'react';
// import { useOrganization } from '@/providers/organization-provider';
import { useOrganizationStore } from '@/lib/store/organization'; // Import store hook

interface RoleBasedAccessProps {
  children: React.ReactNode;
  allowedRoles: Array<'admin' | 'editor' | 'viewer'>;
  fallback?: React.ReactNode;
}

export function RoleBasedAccess({ 
  children, 
  allowedRoles, 
  fallback = null 
}: RoleBasedAccessProps) {
  // const { userRole } = useOrganization();
  const userRole = useOrganizationStore(state => state.userRole); // Get role from store

  // If the user doesn't have a role or their role isn't in the allowed roles, show fallback
  if (!userRole || !allowedRoles.includes(userRole)) {
    return <>{fallback}</>;
  }

  // Otherwise, show the children
  return <>{children}</>;
}

// Helper components for common role combinations
export function AdminOnly({ children, fallback = null }: { children: React.ReactNode, fallback?: React.ReactNode }) {
  return <RoleBasedAccess allowedRoles={['admin']} fallback={fallback}>{children}</RoleBasedAccess>;
}

export function AdminOrEditor({ children, fallback = null }: { children: React.ReactNode, fallback?: React.ReactNode }) {
  return <RoleBasedAccess allowedRoles={['admin', 'editor']} fallback={fallback}>{children}</RoleBasedAccess>;
}

export function NotViewer({ children, fallback = null }: { children: React.ReactNode, fallback?: React.ReactNode }) {
  return <RoleBasedAccess allowedRoles={['admin', 'editor']} fallback={fallback}>{children}</RoleBasedAccess>;
} 
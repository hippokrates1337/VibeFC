'use client';

import { useAuth } from '@/providers/auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { OrganizationSelector } from '@/components/organization/OrganizationSelector';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, signOut } = useAuth();
  const router = useRouter();
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/landing');
    }
  }, [user, isLoading, router]);
  
  // Show loading state
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }
  
  // If not authenticated, don't render the children
  if (!user) {
    return null;
  }
  
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-background">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="font-semibold text-lg">
              VibeFC
            </Link>
            <nav className="hidden md:flex gap-6">
              <Link href="/" className="text-sm font-medium">
                Home
              </Link>
              <Link href="/organizations" className="text-sm font-medium">
                Organizations
              </Link>
              <Link href="/data-intake" className="text-sm font-medium">
                Data Intake
              </Link>
            </nav>
          </div>
          
          <div className="flex items-center gap-4">
            <OrganizationSelector />
            <Button
              variant="ghost"
              onClick={async () => {
                await signOut();
              }}
            >
              Sign Out
            </Button>
          </div>
        </div>
      </header>
      
      <main className="flex-1">{children}</main>
    </div>
  );
} 
'use client';

import { useAuth } from '@/providers/auth-provider';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function RootPage() {
  const { user, isLoading, signOut } = useAuth();
  const router = useRouter();
  
  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="container py-16 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Common header for both authenticated and unauthenticated users */}
      <header className="border-b bg-background">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="font-semibold text-lg">
              VibeFC
            </Link>
            {user && (
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
                <Link href="/forecast-definition" className="text-sm font-medium">
                  Forecast Definition
                </Link>
              </nav>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            {user ? (
              <Button
                variant="ghost"
                onClick={async () => {
                  await signOut();
                }}
              >
                Sign Out
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login">
                  <Button variant="ghost">Sign In</Button>
                </Link>
                <Link href="/signup">
                  <Button variant="default">Create Account</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>
      
      <main className="flex-1">
        {/* If not authenticated, show a message with link to landing */}
        {!user ? (
          <div className="container py-16 flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-4">Welcome to VibeFC</h1>
              <p className="mb-6">Please sign in to continue.</p>
              <Link
                href="/landing"
                className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-3 rounded-md font-medium"
              >
                Go to Landing Page
              </Link>
            </div>
          </div>
        ) : (
          /* Protected dashboard content for authenticated users */
          <div className="container mx-auto px-4 py-8">
            <h1 className="text-4xl font-bold tracking-tight mb-8">
              Welcome to VibeFC
            </h1>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg border bg-card p-6">
                <h2 className="text-xl font-semibold mb-4">Variables</h2>
                <p className="text-muted-foreground mb-4">
                  Import, view, and manage your financial data from various sources.
                </p>
                <Link
                  href="/data-intake"
                  className="text-primary hover:text-primary/80 transition-colors"
                >
                  View Variables
                </Link>
              </div>

              <div className="rounded-lg border bg-card p-6">
                <h2 className="text-xl font-semibold mb-4">Organizations</h2>
                <p className="text-muted-foreground mb-4">
                  Manage your organizations and team members.
                </p>
                <Link
                  href="/organizations"
                  className="text-primary hover:text-primary/80 transition-colors"
                >
                  Manage Organizations
                </Link>
              </div>

              <div className="rounded-lg border bg-card p-6">
                <h2 className="text-xl font-semibold mb-4">Forecast Definition</h2>
                <p className="text-muted-foreground mb-4">
                  Create and edit forecasts using a visual node-based editor.
                </p>
                <Link
                  href="/forecast-definition"
                  className="text-primary hover:text-primary/80 transition-colors"
                >
                  Manage Forecasts
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
} 
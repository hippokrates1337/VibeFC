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
      <div className="container py-16 flex items-center justify-center bg-slate-900 min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Common header for both authenticated and unauthenticated users */}
      <header className="border-b border-slate-700 bg-slate-800">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="font-semibold text-lg text-slate-100 hover:text-blue-400 transition-colors">
              VibeFC
            </Link>
            {user && (
              <nav className="hidden md:flex gap-6">
                <Link href="/" className="text-sm font-medium text-slate-300 hover:text-slate-100 transition-colors">
                  Home
                </Link>
                <Link href="/organizations" className="text-sm font-medium text-slate-300 hover:text-slate-100 transition-colors">
                  Organizations
                </Link>
                <Link href="/data-intake" className="text-sm font-medium text-slate-300 hover:text-slate-100 transition-colors">
                  Data Intake
                </Link>
                <Link href="/forecast-definition" className="text-sm font-medium text-slate-300 hover:text-slate-100 transition-colors">
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
                className="text-slate-300 hover:text-slate-100 hover:bg-slate-700"
              >
                Sign Out
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login">
                  <Button variant="ghost" className="text-slate-300 hover:text-slate-100 hover:bg-slate-700">Sign In</Button>
                </Link>
                <Link href="/signup">
                  <Button variant="default" className="bg-blue-600 hover:bg-blue-700 text-white">Create Account</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>
      
      <main className="flex-1 bg-slate-900">
        {/* If not authenticated, show a message with link to landing */}
        {!user ? (
          <div className="container py-16 flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-4 text-slate-100">Welcome to VibeFC</h1>
              <p className="mb-6 text-slate-400">Please sign in to continue.</p>
              <Link
                href="/landing"
                className="bg-blue-600 text-white hover:bg-blue-700 px-8 py-3 rounded-md font-medium transition-colors"
              >
                Go to Landing Page
              </Link>
            </div>
          </div>
        ) : (
          /* Protected dashboard content for authenticated users */
          <div className="container mx-auto px-4 py-8">
            <h1 className="text-4xl font-bold tracking-tight mb-8 text-slate-100">
              Welcome to VibeFC
            </h1>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg border border-slate-700 bg-slate-800 p-6 hover:bg-slate-750 transition-colors">
                <h2 className="text-xl font-semibold mb-4 text-slate-100">Variables</h2>
                <p className="text-slate-400 mb-4">
                  Import, view, and manage your financial data from various sources.
                </p>
                <Link
                  href="/data-intake"
                  className="text-blue-400 hover:text-blue-300 transition-colors font-medium"
                >
                  View Variables →
                </Link>
              </div>

              <div className="rounded-lg border border-slate-700 bg-slate-800 p-6 hover:bg-slate-750 transition-colors">
                <h2 className="text-xl font-semibold mb-4 text-slate-100">Organizations</h2>
                <p className="text-slate-400 mb-4">
                  Manage your organizations and team members.
                </p>
                <Link
                  href="/organizations"
                  className="text-blue-400 hover:text-blue-300 transition-colors font-medium"
                >
                  Manage Organizations →
                </Link>
              </div>

              <div className="rounded-lg border border-slate-700 bg-slate-800 p-6 hover:bg-slate-750 transition-colors">
                <h2 className="text-xl font-semibold mb-4 text-slate-100">Forecast Definition</h2>
                <p className="text-slate-400 mb-4">
                  Create and edit forecasts using a visual node-based editor.
                </p>
                <Link
                  href="/forecast-definition"
                  className="text-blue-400 hover:text-blue-300 transition-colors font-medium"
                >
                  Manage Forecasts →
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
} 
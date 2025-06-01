'use client';

import { useAuth } from '@/providers/auth-provider';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function RootPage() {
  const { user, isLoading, signOut } = useAuth();
  
  console.log('🌐 ROOT PAGE STATE:', {
    hasUser: !!user,
    userId: user?.id,
    isLoading,
    timestamp: new Date().toISOString()
  });
  
  // Show loading while checking auth
  if (isLoading) {
    console.log('🌐 ROOT: Showing auth loading state');
    return (
      <div className="container py-16 flex items-center justify-center bg-slate-900 min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }
  
  // If user is authenticated, show dashboard
  if (user) {
    console.log('🌐 ROOT: Rendering dashboard for authenticated user');
    return (
      <div className="min-h-screen flex flex-col">
        <header className="border-b border-slate-700 bg-slate-800">
          <div className="container flex h-16 items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/" className="font-semibold text-lg text-slate-100 hover:text-blue-400 transition-colors">
                VibeFC
              </Link>
              <nav className="hidden md:flex gap-6">
                <Link href="/data-intake" className="text-sm font-medium text-slate-300 hover:text-slate-100 transition-colors">
                  Data Intake
                </Link>
                <Link href="/organizations" className="text-sm font-medium text-slate-300 hover:text-slate-100 transition-colors">
                  Organizations
                </Link>
                <Link href="/forecast-definition" className="text-sm font-medium text-slate-300 hover:text-slate-100 transition-colors">
                  Forecast Definition
                </Link>
              </nav>
            </div>
            
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-300">Welcome, {user.email}</span>
              <Button
                variant="ghost"
                onClick={async () => {
                  try {
                    console.log('🚪 ROOT: Signing out user...');
                    await signOut();
                    console.log('🚪 ROOT: User signed out successfully');
                  } catch (error) {
                    console.error('🚪 ROOT: Sign out failed:', error);
                  }
                }}
                className="text-slate-300 hover:text-slate-100 hover:bg-slate-700"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 bg-slate-900">
          <div className="container py-16">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-6 text-slate-100">
                Welcome to VibeFC Dashboard
              </h1>
              
              <p className="text-xl text-slate-400 mb-8 max-w-2xl mx-auto">
                Your financial forecasting platform is ready. Choose from the tools below to get started.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
              <div className="rounded-lg border border-slate-700 bg-slate-800 p-6 flex flex-col items-center text-center">
                <div className="bg-blue-900/20 p-3 rounded-full mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
                    <rect width="18" height="18" x="3" y="3" rx="2"></rect>
                    <path d="M7 7h10"></path>
                    <path d="M7 12h10"></path>
                    <path d="M7 17h10"></path>
                  </svg>
                </div>
                <h2 className="text-xl font-semibold mb-2 text-slate-100">Data Import</h2>
                <p className="text-slate-400 mb-4">
                  Import your financial data from various sources with flexible format support
                </p>
                <Link 
                  href="/data-intake"
                  className="mt-auto bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Start Import
                </Link>
              </div>
              
              <div className="rounded-lg border border-slate-700 bg-slate-800 p-6 flex flex-col items-center text-center">
                <div className="bg-blue-900/20 p-3 rounded-full mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
                    <path d="M2 20h.01"></path>
                    <path d="M7 20v-4"></path>
                    <path d="M12 20v-8"></path>
                    <path d="M17 20v-6"></path>
                    <path d="M22 20V8"></path>
                  </svg>
                </div>
                <h2 className="text-xl font-semibold mb-2 text-slate-100">Forecast Analysis</h2>
                <p className="text-slate-400 mb-4">
                  Create visualizations and reports to analyze your forecasting data
                </p>
                <Link 
                  href="/forecast-definition"
                  className="mt-auto bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  View Forecasts
                </Link>
              </div>
              
              <div className="rounded-lg border border-slate-700 bg-slate-800 p-6 flex flex-col items-center text-center">
                <div className="bg-blue-900/20 p-3 rounded-full mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="m22 21-3-3 3-3"></path>
                  </svg>
                </div>
                <h2 className="text-xl font-semibold mb-2 text-slate-100">Organizations</h2>
                <p className="text-slate-400 mb-4">
                  Manage your organizations, team members, and access permissions
                </p>
                <Link 
                  href="/organizations"
                  className="mt-auto bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Manage Organizations
                </Link>
              </div>
            </div>
            
            <div className="mt-20 text-center">
              <p className="text-slate-400">
                © {new Date().getFullYear()} VibeFC | Financial Forecasting Platform
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  console.log('🌐 ROOT: Rendering public landing for unauthenticated user');
  
  // Show public landing for unauthenticated users
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-slate-700 bg-slate-800">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="font-semibold text-lg text-slate-100 hover:text-blue-400 transition-colors">
              VibeFC
            </Link>
          </div>
          
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" className="text-slate-300 hover:text-slate-100 hover:bg-slate-700">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button variant="default" className="bg-blue-600 hover:bg-blue-700 text-white">Create Account</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 bg-slate-900">
        <div className="container py-16">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 text-slate-100">
              Financial Forecasting Made Simple
            </h1>
            
            <p className="text-xl text-slate-400 mb-8 max-w-2xl mx-auto">
              VibeFC helps you create, maintain, and analyze financial forecasts with collaborative tools and intuitive interfaces.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Link 
                href="/login" 
                className="bg-blue-600 text-white hover:bg-blue-700 px-8 py-3 rounded-md font-medium transition-colors"
              >
                Sign In
              </Link>
              <Link 
                href="/signup" 
                className="bg-slate-700 text-slate-100 hover:bg-slate-600 border border-slate-600 px-8 py-3 rounded-md font-medium transition-colors"
              >
                Create Account
              </Link>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            <div className="rounded-lg border border-slate-700 bg-slate-800 p-6 flex flex-col items-center text-center">
              <div className="bg-blue-900/20 p-3 rounded-full mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
                  <rect width="18" height="18" x="3" y="3" rx="2"></rect>
                  <path d="M7 7h10"></path>
                  <path d="M7 12h10"></path>
                  <path d="M7 17h10"></path>
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-2 text-slate-100">Data Import</h2>
              <p className="text-slate-400">
                Import your financial data from various sources with flexible format support
              </p>
            </div>
            
            <div className="rounded-lg border border-slate-700 bg-slate-800 p-6 flex flex-col items-center text-center">
              <div className="bg-blue-900/20 p-3 rounded-full mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
                  <path d="M3 3v18h18"></path>
                  <path d="m19 9-5 5-4-4-3 3"></path>
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-2 text-slate-100">Variable Management</h2>
              <p className="text-slate-400">
                Organize and edit your financial variables with an intuitive interface
              </p>
            </div>
            
            <div className="rounded-lg border border-slate-700 bg-slate-800 p-6 flex flex-col items-center text-center">
              <div className="bg-blue-900/20 p-3 rounded-full mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
                  <path d="M2 20h.01"></path>
                  <path d="M7 20v-4"></path>
                  <path d="M12 20v-8"></path>
                  <path d="M17 20v-6"></path>
                  <path d="M22 20V8"></path>
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-2 text-slate-100">Forecast Analysis</h2>
              <p className="text-slate-400">
                Create visualizations and reports to analyze your forecasting data
              </p>
            </div>
          </div>
          
          <div className="mt-20 text-center">
            <p className="text-slate-400">
              © {new Date().getFullYear()} VibeFC | Financial Forecasting Platform
            </p>
          </div>
        </div>
      </main>
    </div>
  );
} 
'use client';

import Link from 'next/link';
import { useAuth } from '@/providers/auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function Landing() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  
  // Redirect authenticated users to the protected dashboard
  useEffect(() => {
    if (!isLoading && user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  // If still loading or user is authenticated, show a loading state
  if (isLoading || user) {
    return (
      <div className="container py-16 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Landing page for unauthenticated users
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-background">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/landing" className="font-semibold text-lg">
              VibeFC
            </Link>
          </div>
          
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button variant="default">Create Account</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="container py-16">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Financial Forecasting Made Simple
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              VibeFC helps you create, maintain, and analyze financial forecasts with collaborative tools and intuitive interfaces.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Link 
                href="/login" 
                className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-3 rounded-md font-medium"
              >
                Sign In
              </Link>
              <Link 
                href="/signup" 
                className="bg-secondary text-secondary-foreground hover:bg-secondary/90 px-8 py-3 rounded-md font-medium"
              >
                Create Account
              </Link>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            <div className="rounded-lg border p-6 flex flex-col items-center text-center">
              <div className="bg-primary/10 p-3 rounded-full mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                  <rect width="18" height="18" x="3" y="3" rx="2"></rect>
                  <path d="M7 7h10"></path>
                  <path d="M7 12h10"></path>
                  <path d="M7 17h10"></path>
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-2">Data Import</h2>
              <p className="text-muted-foreground">
                Import your financial data from various sources with flexible format support
              </p>
            </div>
            
            <div className="rounded-lg border p-6 flex flex-col items-center text-center">
              <div className="bg-primary/10 p-3 rounded-full mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                  <path d="M3 3v18h18"></path>
                  <path d="m19 9-5 5-4-4-3 3"></path>
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-2">Variable Management</h2>
              <p className="text-muted-foreground">
                Organize and edit your financial variables with an intuitive interface
              </p>
            </div>
            
            <div className="rounded-lg border p-6 flex flex-col items-center text-center">
              <div className="bg-primary/10 p-3 rounded-full mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                  <path d="M2 20h.01"></path>
                  <path d="M7 20v-4"></path>
                  <path d="M12 20v-8"></path>
                  <path d="M17 20v-6"></path>
                  <path d="M22 20V8"></path>
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-2">Forecast Analysis</h2>
              <p className="text-muted-foreground">
                Create visualizations and reports to analyze your forecasting data
              </p>
            </div>
          </div>
          
          <div className="mt-20 text-center">
            <p className="text-muted-foreground">
              © {new Date().getFullYear()} VibeFC | Financial Forecasting Platform
            </p>
          </div>
        </div>
      </main>
    </div>
  );
} 
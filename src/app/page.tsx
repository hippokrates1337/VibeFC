import Link from 'next/link';

export const metadata = {
  title: 'Dashboard - VibeFC',
  description: 'Financial forecasting dashboard',
};

export default function Home() {
  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-lg border p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Organizations</h2>
          <p className="text-muted-foreground mb-4">
            Manage your organizations and team members.
          </p>
          <Link href="/organizations" className="text-primary hover:underline">
            View Organizations →
          </Link>
        </div>
        
        <div className="rounded-lg border p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Data Intake</h2>
          <p className="text-muted-foreground mb-4">
            Input and manage your financial data.
          </p>
          <Link href="/data-intake" className="text-primary hover:underline">
            Go to Data Intake →
          </Link>
        </div>
        
        <div className="rounded-lg border p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Variables</h2>
          <p className="text-muted-foreground mb-4">
            Configure and manage forecast variables.
          </p>
          <Link href="/variables" className="text-primary hover:underline">
            Manage Variables →
          </Link>
        </div>
      </div>
    </div>
  );
} 
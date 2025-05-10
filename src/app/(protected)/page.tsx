import Link from 'next/link'

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold tracking-tight mb-8">
        Welcome to VibeFC
      </h1>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-xl font-semibold mb-4">Data Intake</h2>
          <p className="text-muted-foreground mb-4">
            Import your financial data from various sources.
          </p>
          <Link
            href="/data-intake"
            className="text-primary hover:text-primary/80 transition-colors"
          >
            Go to Data Intake
          </Link>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-xl font-semibold mb-4">Variables</h2>
          <p className="text-muted-foreground mb-4">
            View and manage your imported variables.
          </p>
          <Link
            href="/variables"
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
      </div>
    </div>
  )
} 
import Link from 'next/link'

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">VibeFC - Financial Forecasting</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Data Intake Card */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">Data Intake</h2>
          <p className="text-gray-600 mb-4">
            Import and manage your financial data from various sources.
          </p>
          <Link 
            href="/data-intake"
            className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            Manage Data
          </Link>
        </div>

        {/* Forecast Definition Card */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">Forecast Definition</h2>
          <p className="text-gray-600 mb-4">
            Define and configure your forecast calculations.
          </p>
          <Link 
            href="/forecast-definition"
            className="inline-block bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors"
          >
            Configure Forecasts
          </Link>
        </div>

        {/* Forecast Analysis Card */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">Forecast Analysis</h2>
          <p className="text-gray-600 mb-4">
            View and analyze your forecast results.
          </p>
          <Link 
            href="/forecast-analysis"
            className="inline-block bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors"
          >
            View Results
          </Link>
        </div>
      </div>
    </div>
  )
} 
# Temporarily set execution policy to bypass for this process
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force

# Set environment variables if needed
$env:SUPABASE_URL = "YOUR_SUPABASE_URL"
$env:SUPABASE_KEY = "YOUR_SUPABASE_KEY"

# Build the application
Write-Host "Building the application..." -ForegroundColor Green
npx nest build

# Run the application
Write-Host "Starting the application..." -ForegroundColor Green
node dist/main.js 
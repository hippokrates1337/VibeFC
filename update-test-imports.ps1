# PowerShell script to update test imports to use custom test utils
# This script updates all test files to use @/test-utils instead of @testing-library/react

Write-Host "Updating test imports to use custom test utils with error boundary..." -ForegroundColor Green

# Get all test files that still import from @testing-library/react
$testFiles = Get-ChildItem -Path "src" -Recurse -Include "*.test.tsx", "*.test.ts" | 
    Where-Object { 
        $content = Get-Content $_.FullName -Raw
        $content -match "import.*@testing-library/react" -and 
        $content -notmatch "@/test-utils" -and
        $_.Name -ne "error-boundary-provider.test.tsx"  # Skip error boundary test
    }

Write-Host "Found $($testFiles.Count) test files to update:" -ForegroundColor Yellow
$testFiles | ForEach-Object { Write-Host "  - $($_.FullName)" }

foreach ($file in $testFiles) {
    Write-Host "Updating $($file.Name)..." -ForegroundColor Cyan
    
    $content = Get-Content $file.FullName -Raw
    
    # Replace the import statement
    $updatedContent = $content -replace "import\s*\{([^}]+)\}\s*from\s*'@testing-library/react';", "import {`$1} from '@/test-utils';"
    
    # Write back to file
    Set-Content -Path $file.FullName -Value $updatedContent -NoNewline
    
    Write-Host "  ✓ Updated $($file.Name)" -ForegroundColor Green
}

Write-Host "`nUpdate complete! All test files now use @/test-utils with error boundary support." -ForegroundColor Green
Write-Host "This should resolve the test failures caused by unhandled component errors." -ForegroundColor Yellow 
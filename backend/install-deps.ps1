# Temporarily set execution policy to bypass for this process
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Green
npm install

# If you get errors with specific packages, try installing them individually:
if (-not $?) {
    Write-Host "Trying to install core dependencies individually..." -ForegroundColor Yellow
    
    # Install NestJS core packages
    npm install @nestjs/common @nestjs/config @nestjs/core @nestjs/platform-express
    
    # Install Supabase
    npm install @supabase/supabase-js
    
    # Install utilities
    npm install class-transformer class-validator reflect-metadata rxjs uuid
    
    # Install dev dependencies
    npm install --save-dev @nestjs/cli @nestjs/schematics @nestjs/testing @types/express @types/jest @types/node @types/supertest @types/uuid @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint eslint-config-prettier eslint-plugin-prettier jest prettier source-map-support supertest ts-jest ts-loader ts-node tsconfig-paths typescript
}

Write-Host "Installation completed" -ForegroundColor Green 
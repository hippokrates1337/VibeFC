# VibeFC Backend

This directory contains the NestJS backend application for VibeFC.

## Overview

The backend is built using the NestJS framework with TypeScript. It follows a modular architecture, interacts directly with a Supabase database, and adheres to the coding standards defined in `backend-rules.mdc` and `_cursorrules.mdc`.

## Key Directories

- **`src/`**: Contains the application's source code, organized into modules (features), controllers, services, DTOs, etc.
- **`dist/`**: Contains the compiled JavaScript code ready for execution.
- **`sql/`**: Contains supplementary SQL scripts or database-related files.
- **`test/`**: (Expected, based on rules) Should contain end-to-end tests.

## Getting Started

1.  **Install Dependencies:** Run `npm install` or the provided `install-deps.ps1` script.
2.  **Environment Setup:** Configure environment variables (e.g., database connection string, JWT secrets) in a `.env` file (refer to `.env.example` if available).
3.  **Database:** Ensure the Supabase database is set up and migrated. Refer to `SUPABASE_SETUP.md` and potentially `MIGRATION_GUIDE.md`.
4.  **Run:** Use `npm run start:dev` for development or the provided `run-app.ps1` script.

## Standards

- **Architecture:** Modular (one module per domain), Core Module, Shared Module.
- **Data Access:** Direct Supabase client interaction.
- **Validation:** `class-validator` in DTOs.
- **Testing:** Jest for unit tests, Supertest for integration tests.
- **Security:** JWT authentication, RBAC guards. 
# Health Module (`backend/src/health`)

## Overview
Provides endpoints for monitoring the health and status of the backend application and its dependencies.

## Endpoints

- **`GET /health`**: A simple health check endpoint. Returns the application status and timestamp.
  - **Response**: `{ "status": "ok", "timestamp": "..." }`

- **`GET /health/supabase`**: Checks the connectivity and status of the Supabase database connection.
  - **Response (Success)**: `{ "status": "ok", "message": "Supabase connection successful", "timestamp": "..." }`
  - **Response (Error)**: `{ "status": "error", "message": "Supabase connection failed: ...", "timestamp": "..." }`

## Architecture

- **`health.module.ts`**: Defines the NestJS module, importing `SupabaseModule` to allow the controller to interact with `SupabaseService`.
- **`health.controller.ts`**: Implements the logic for the `/health` and `/health/supabase` endpoints. It uses `SupabaseService` to perform the database connection check.

## Purpose
This module follows observability best practices by providing standard endpoints for health monitoring systems (like Kubernetes liveness/readiness probes) and for diagnosing connectivity issues with critical dependencies like the database. 
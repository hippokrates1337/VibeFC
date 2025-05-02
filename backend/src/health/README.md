# Health Module (`backend/src/health`)

## Overview
Provides endpoints for monitoring the health and status of the backend application.

## Endpoints

- **`GET /health`**: A simple health check endpoint. Returns the application status and timestamp.
  - **Response**: `{ "status": "ok", "timestamp": "..." }`

## Architecture

- **`health.module.ts`**: Defines the NestJS module for health checks.
- **`health.controller.ts`**: Implements the logic for the `/health` endpoint.

## Purpose
This module follows observability best practices by providing a standard endpoint for health monitoring systems (like Kubernetes liveness/readiness probes). 
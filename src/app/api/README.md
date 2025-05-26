# API Routes (`src/app/api/`)

This directory contains Next.js API route handlers that serve as the backend endpoints for the VibeFC frontend application.

## Overview

These API routes act as proxies and middleware layers between the frontend and the main backend services, providing:
- Request/response transformation
- Authentication handling
- Error handling and logging
- Frontend-specific business logic

## Structure

### `/env-test/`
- **`route.ts`**: Simple endpoint for testing environment variable access and API functionality

### `/data-intake/`
- **Purpose**: Handles data intake operations, primarily for variable management
- **Structure**: Contains nested routes for different data intake operations
- **Documentation**: See `data-intake/README.md` for detailed endpoint documentation

### `/health/`
- **`route.ts`**: Health check endpoint for monitoring the frontend API layer
- **Purpose**: Provides status information about the frontend API services

## Conventions

- Each directory represents a feature area or service group
- Route handlers are defined in `route.ts` files following Next.js App Router conventions
- Dynamic routes use bracket notation (e.g., `[id]`, `[userId]`)
- Nested routes are organized in subdirectories for better structure

## Authentication

Most API routes expect authentication via:
- JWT tokens in the `Authorization: Bearer <token>` header
- Session cookies for browser-based requests
- Routes may proxy authentication to the backend services

## Error Handling

API routes implement consistent error handling:
- HTTP status codes following REST conventions
- JSON error responses with descriptive messages
- Proper error logging for debugging

## Usage

These routes are consumed by the frontend components and can be called using:
- Fetch API
- Custom API hooks (see `src/lib/api/`)
- React Query or SWR for data fetching 
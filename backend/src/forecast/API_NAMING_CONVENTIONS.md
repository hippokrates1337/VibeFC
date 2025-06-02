# API Naming Conventions

## Overview

This document outlines the standardized naming conventions for the VibeFC API to ensure consistency between the frontend and backend.

## Field Naming Standards

- All API field names use **camelCase** (e.g., `forecastStartDate`, `organizationId`, `createdAt`)
- This applies to request bodies, response bodies, and URL query parameters
- Snake_case is no longer used in any API interfaces to avoid ambiguity

## Key Field Names

### Forecast

| Field Name | Type | Description |
|------------|------|-------------|
| id | string | Unique identifier |
| name | string | Display name |
| forecastStartDate | string | Start date (YYYY-MM-DD) |
| forecastEndDate | string | End date (YYYY-MM-DD) |
| organizationId | string | Related organization ID |
| userId | string | Owner user ID |
| createdAt | string | Creation timestamp |
| updatedAt | string | Last update timestamp |

### Forecast Node

| Field Name | Type | Description |
|------------|------|-------------|
| id | string | Unique identifier |
| forecastId | string | Related forecast ID |
| kind | string | Node type (DATA, CONSTANT, etc.) |
| attributes | object | Node-specific attributes |
| position | object | {x, y} position |

### Forecast Edge

| Field Name | Type | Description |
|------------|------|-------------|
| id | string | Unique identifier |
| forecastId | string | Related forecast ID |
| sourceNodeId | string | Source node ID |
| targetNodeId | string | Target node ID |

## Implementation

These naming conventions have been implemented in:

1. Frontend API interfaces in `src/lib/api/forecast.ts`
2. API request and response handling code
3. Documentation and examples

All teams should follow these conventions to maintain consistency across the codebase. 
# Variables (`src/app/(protected)/variables/`)

This directory contains the routes and components related to the variable management feature.

**Authorization:** Access to this section requires the user to be authenticated. This is enforced by the `src/middleware.ts`.

**Organization Context:** Variables are filtered by the currently selected organization. The user will only see variables belonging to their current organization. This filtering is handled through the organization and variable stores.

## Components

- `page.tsx`: The main page displaying all variables for the current organization, including time series data ranges and variable counts.

*(Add more details about the specific functionality within this section as it's developed)* 
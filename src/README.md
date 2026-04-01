# Source Directory (`src/`) ✅ **Phase 1 Harmonization Ready**

This directory contains the core source code for the VibeFC frontend application, built with Next.js and adhering to the defined project standards.

## 🎯 Calculation Harmonization Status

**Phase 1 (Backend Foundation) - ✅ COMPLETED**
- Backend data model updated with MM-YYYY period management
- Database schema enhanced with new period columns
- Variable date consistency implemented
- All DTOs and services updated for unified calculation support

**Phase 2 (Unified Calculation Engine) - ✅ COMPLETED**
- Unified `calculateUnified()` method with MM-YYYY period management
- MM-YYYY utilities service for timezone-free calculations
- Enhanced debugging with comprehensive logging and source tracking
- Specific calculation rules for historical, forecast, and budget value types

**Phase 3 (Unified Calculation Service & Endpoint) - ✅ COMPLETED**
- New `POST /forecasts/:id/calculate-unified` endpoint
- Automatic period reading from forecast metadata
- Enhanced result storage with unified format
- Complete backward compatibility with legacy endpoints
- All backend tests passing

**Phase 4 (Frontend Store Unification) - ✅ COMPLETED**
- Unified store architecture replacing dual array system
- MM-YYYY period management integration
- Single calculation result structure with all types (historical, forecast, budget)
- Enhanced unified calculation methods with auto-loading
- Comprehensive backward compatibility during transition

**Phase 5 (Frontend API Client & Type Updates) - ✅ COMPLETED**
- Complete type system overhaul with MM-YYYY format for all calculation types
- Enhanced API client error handling with specific period validation
- Deprecated legacy types with clear migration path to Phase 8
- Component interface compatibility preserved with Date/MM-YYYY bridge
- Type safety maintained throughout with proper interface boundaries

**Phase 6 (Frontend UI Updates - Forecast Display Page) - ✅ COMPLETED**
- New Period Management Panel with MM-YYYY selectors and validation
- Unified calculation button triggering all calculation types in single request
- Auto-loading logic for existing calculations on page visit
- Updated results table using unified data structure
- Enhanced user experience with real-time feedback and comprehensive error handling

**Phase 7 (Frontend UI Updates - Forecast Definition Page) - ✅ COMPLETED**
- Updated calculation integration in ForecastToolbar to use unified system
- Single calculation button replaces separate historical calculation logic
- Visualization components verified compatible with unified data structure
- MonthSlider and node visualization work with unified calculation results
- Clean separation of concerns: definition page for graph structure, display page for execution

**Next Steps (Phase 8):**
- Phase 8: Legacy code cleanup and comprehensive testing

See `calculation_harmonization.md` for detailed implementation roadmap.

## Structure

- **`app/`**: Contains the application routes, layouts, and pages following the Next.js App Router convention.
- **`components/`**: Houses reusable UI components, potentially organized by feature. Includes shared components and those built using `shadcn/ui`.
- **`lib/`**: Includes shared utility functions, helper modules, and library code used across the application.
- **`providers/`**: Contains React Context providers or similar state management/dependency injection setups used globally or across features.
- **`types/`**: Defines shared TypeScript interfaces and type definitions used throughout the frontend codebase.
- **`hooks/`**: Reserved for global custom hooks (currently empty - uses distributed hook architecture).

## Testing Setup

- **`setupTests.ts`**: Configuration file for the Jest testing framework.
- **`test-utils.tsx`**: Custom React Testing Library utilities with error boundary support.
- **`test-utils.md`**: Documentation for test utilities and migration scripts.

The test utilities provide error-resilient testing by wrapping components in error boundaries, preventing test failures from unhandled component errors. See `test-utils.md` for detailed usage and migration information.

## Standards

Development within this directory follows the guidelines outlined in `frontend-rules.mdc` and `_cursorrules.mdc`, emphasizing:

- **Next.js App Router**: For routing and layouts.
- **Server Components**: Default component type, with Client Components used sparingly (`'use client'`).
- **Styling**: Tailwind CSS and `shadcn/ui` for UI development.
- **State Management**: Primarily local state and URL state (`nuqs`), with Context API in `providers/`.
- **Testing**: Jest and React Testing Library for unit and component tests with custom error boundary utilities. 
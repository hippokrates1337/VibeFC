# Debug Calc (`src/app/(protected)/debug-calc/`)

This directory contains the debug calculation page that provides comprehensive debugging capabilities for forecast calculations. This page allows developers and advanced users to analyze the step-by-step execution of forecast calculations, identify performance bottlenecks, and debug calculation issues.

**Authorization:** Access to this section requires user authentication. It resides within the `(protected)` route group, and access is enforced by `src/middleware.ts`.

## Features

### Forecast Selection and Loading
- **Forecast Selector**: Dropdown to select any forecast from the current organization
- **Forecast Metadata Display**: Shows forecast period, last updated time, and other details
- **Automatic Loading**: Loads the complete forecast graph when a forecast is selected

### Debug Configuration
- **Debug Level Selection**: Choose between basic (100 steps), detailed (1000 steps), or verbose (10000 steps) logging
- **Calculation Type Selection**: Select which calculation types to debug (historical, forecast, budget)
- **Debug Options**: Configure inclusion of intermediate nodes, performance metrics, and memory usage

### Debug Results Overview
- **Summary Statistics**: Shows total steps, nodes, execution time, and cache hit rate
- **Calculation Types Display**: Visual badges showing which calculation types were processed
- **View Mode Selection**: Choose between tree view, steps log, metrics view, or split view
- **Error and Warning Display**: Shows any errors or warnings encountered during calculation

## Architecture

### State Management
The debug page uses the enhanced forecast graph store with debug capabilities:

- **Debug State**: Managed through `useDebug()` and `useDebugActions()` hooks
- **Computed Values**: Derived state through `useDebugComputed()` hook
- **Forecast Integration**: Seamlessly integrates with existing forecast loading system

### API Integration
The page communicates with the debug calculation API:

- **Debug Calculation**: Triggers comprehensive debug calculations via `debugCalculationApi.calculateWithDebug()`
- **Tree Structure**: Loads calculation tree structure independently via `debugCalculationApi.getCalculationTree()`
- **Step Details**: Retrieves detailed calculation steps via `debugCalculationApi.getCalculationSteps()`

### Component Structure
- **`page.tsx`**: Main debug page component
- **`ForecastSelector`**: Reusable forecast selection component
- **`DebugConfiguration`**: Configuration panel for debug settings
- **`DebugResultsOverview`**: Summary and overview of debug results

## Usage

### Basic Debug Workflow
1. **Select Forecast**: Choose a forecast from the organization's available forecasts
2. **Configure Debug**: Set debug level, calculation types, and options
3. **Run Debug Calculation**: Trigger the debug calculation process
4. **Analyze Results**: Review the detailed results, performance metrics, and any issues

### Debug Levels
- **Basic**: Captures up to 100 calculation steps, suitable for quick debugging
- **Detailed**: Captures up to 1000 steps, good for most debugging scenarios
- **Verbose**: Captures up to 10000 steps, for comprehensive analysis of complex forecasts

### Calculation Types
- **Historical**: Debug calculations using actual/historical data
- **Forecast**: Debug forward-looking forecast calculations
- **Budget**: Debug budget/planned value calculations

## Data Flow

### Debug Calculation Process
1. User selects forecast and configures debug options
2. Page triggers debug calculation via API
3. Backend performs calculation with instrumentation
4. Debug results returned including:
   - Calculation tree structure
   - Step-by-step execution log
   - Performance metrics
   - Error and warning information

### State Updates
- Debug state updated in real-time during calculation
- Results cached in store for analysis
- UI components automatically reflect state changes

## Performance Considerations

### Optimization Features
- **Configurable Step Limits**: Prevents memory issues with extremely large calculations
- **Lazy Loading**: Components load data as needed
- **Efficient State Management**: Minimal re-renders through optimized selectors

### Resource Management
- **Memory Usage Tracking**: Optional memory usage monitoring
- **Cache Statistics**: Detailed cache hit/miss information
- **Execution Time Monitoring**: Per-node and per-phase timing data

## Development Notes

### Phase 2 Implementation
Current implementation includes:
- ✅ Forecast selection and loading
- ✅ Debug configuration interface
- ✅ Basic debug state management
- ✅ API integration
- ✅ Results overview display

### Future Phases
- **Phase 3**: Detailed visualization components (tree view, step log, metrics display)
- **Phase 4**: Advanced features (filtering, search, export capabilities)

### Testing Considerations
- Test forecast selection with various organization setups
- Verify debug configuration options work correctly
- Test error handling for failed calculations
- Validate state management during forecast switching

## Security and Access Control

### Authentication
- Page requires user authentication via JWT
- Access controlled through middleware
- Organization-scoped data access

### Data Sensitivity
- Debug information may contain sensitive calculation details
- Results are scoped to user's organization
- No data persistence beyond current session (by design)

## API Endpoints Used

- `GET /forecasts?organizationId={id}` - List organization forecasts
- `GET /forecasts/{id}` - Get forecast details
- `POST /forecasts/{id}/calculate-debug` - Trigger debug calculation
- `GET /forecasts/{id}/debug/calculation-tree` - Get calculation tree structure
- `GET /forecasts/{id}/debug/calculation-steps` - Get calculation steps

This page provides the foundation for comprehensive forecast debugging capabilities and will be enhanced with detailed visualization components in subsequent phases.

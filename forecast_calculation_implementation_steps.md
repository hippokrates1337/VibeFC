# Forecast Calculation Implementation Plan

## Overview
This document outlines the implementation steps for adding forecast calculation functionality to the VibeFC platform. The implementation will convert directed acyclic graphs of forecast nodes into executable calculation trees and compute monthly forecast values.

## Architecture Summary

### Data Flow
1. **Graph → Trees**: Convert node/edge graph into calculation trees with metric nodes as roots
2. **Monthly Calculation**: Compute forecast/budget/historical values for each month in forecast period
3. **Persistent Storage**: Store results in Zustand store with backend synchronization
4. **UI Integration**: Make calculated values available throughout the application

---

## Implementation Steps

### Phase 1: Data Structures and Types ✅ COMPLETED

**Key Features Implemented:**
- Complete TypeScript interfaces for calculation results (`MonthlyForecastValue`, `MetricCalculationResult`, `ForecastCalculationResult`)
- Calculation tree structures (`CalculationTree`, `CalculationTreeNode`)
- Graph validation types (`GraphValidationResult`)
- Enhanced `forecast-graph-store.ts` with validation and calculation state

### Phase 2: Frontend Calculation Engine ✅ COMPLETED

**Key Features Implemented:**
- `GraphConverter` service with comprehensive graph validation and cycle detection
- `CalculationEngine` core with support for all node types (DATA, CONSTANT, OPERATOR, METRIC, SEED)
- `VariableDataService` for variable data access during calculations
- Performance optimization through caching and memoization
- Top-level metric node identification for tree creation

**Files Created:**
- `src/lib/services/forecast-calculation/graph-converter.ts`
- `src/lib/services/forecast-calculation/calculation-engine.ts`
- `src/lib/services/forecast-calculation/variable-data-service.ts`
- `src/lib/services/forecast-calculation/forecast-service.ts`
- `src/lib/services/forecast-calculation/index.ts`

### Phase 3: Backend API Structure ✅ COMPLETED

**Key Features Implemented:**
- Complete REST API endpoints for calculation operations
- Database schema with `forecast_calculation_results` table and RLS policies
- Backend controllers and DTOs for calculation requests/responses
- Integration with existing forecast and data-intake services
- Comprehensive error handling and logging

**Files Created:**
- `backend/src/forecast/controllers/forecast-calculation.controller.ts`
- `backend/src/forecast/services/forecast-calculation.service.ts`
- `backend/src/forecast/dto/calculation.dto.ts`
- `backend/sql/add_forecast_calculation_tables.sql`

**Note:** Currently uses placeholder calculation logic, not real graph execution.

### Phase 4: Frontend Store Integration ✅ COMPLETED

**Key Features Implemented:**
- API client for backend communication (`src/lib/api/forecast-calculation.ts`)
- Integration of calculation functionality into `forecast-graph-store.ts`
- Proper authentication and error handling
- Result caching and persistence

### Phase 5: UI Components ✅ COMPLETED

**Key Features Implemented:**
- `GraphValidationDisplay` component with real-time validation status
- `CalculationResultsDisplay` component with export functionality
- Enhanced `ForecastToolbar` with calculation triggers and status
- `CalculationErrorBoundary` for graceful error handling
- Comprehensive status displays and loading states

**Files Created:**
- `src/components/forecast/graph-validation-display.tsx`
- `src/components/forecast/calculation-results-display.tsx`
- `src/components/forecast/calculation-error-boundary.tsx`

### Phase 6: Page Integration ✅ COMPLETED

**Key Features Implemented:**
- Dual results display (sidebar compact + main area table)
- `CalculationResultsTable` component for simple tabular results
- Updated forecast editor page layout
- Responsive design with proper overflow handling

**Files Created:**
- `src/components/forecast/calculation-results-table.tsx`

---

## Phase 7: Backend Calculation Engine Integration ⚠️ MISSING - NEW PHASE

**Problem Statement:**
The backend currently uses placeholder calculation logic instead of the sophisticated frontend calculation engine. This phase integrates the real calculation services with the backend.

### 7.1 Backend Service Integration ✅ COMPLETED
**File**: `backend/src/forecast/services/forecast-calculation.service.ts`

**Required Changes:**
- Import and integrate frontend calculation services into backend
- Replace `createCalculationResult()` with real graph execution
- Implement proper variable data usage in calculations
- Add comprehensive error handling for calculation failures

```typescript
// NEW: Import frontend calculation services
import { GraphConverter } from '../../../lib/services/forecast-calculation/graph-converter';
import { CalculationEngine } from '../../../lib/services/forecast-calculation/calculation-engine';
import { VariableDataService } from '../../../lib/services/forecast-calculation/variable-data-service';

// REPLACE: createCalculationResult method with real calculation
private async executeRealCalculation(
  forecastId: string,
  forecast: any,
  nodes: any[],
  edges: any[],
  variables: any[]
): Promise<ForecastCalculationResult> {
  const graphConverter = new GraphConverter();
  const variableDataService = new VariableDataService();
  const calculationEngine = new CalculationEngine(variableDataService);
  
  // Convert graph to calculation trees
  const trees = graphConverter.convertToTrees(nodes, edges);
  
  // Execute real calculation
  const result = await calculationEngine.calculateForecast(
    trees,
    new Date(forecast.forecastStartDate),
    new Date(forecast.forecastEndDate),
    variables
  );
  
  return {
    ...result,
    forecastId
  };
}
```

### 7.2 Variable Data Integration ✅ COMPLETED
**File**: `backend/src/forecast/services/forecast-calculation.service.ts`

**Required Changes:**
- Transform backend variable format to frontend calculation format
- Ensure proper variable access during node evaluation
- Handle missing or incomplete variable data gracefully

```typescript
// NEW: Transform variables for calculation engine
private transformVariablesForCalculation(variables: any[]): Variable[] {
  return variables.map(variable => ({
    id: variable.id,
    name: variable.name,
    type: variable.type,
    organizationId: variable.organization_id,
    timeSeries: variable.values.map(value => ({
      date: new Date(value.date),
      value: value.value
    }))
  }));
}
```

### 7.3 Graph Data Transformation ✅ COMPLETED
**File**: `backend/src/forecast/services/forecast-calculation.service.ts`

**Required Changes:**
- Transform backend node/edge format to frontend calculation format
- Ensure proper node data attribute mapping
- Handle node type compatibility between backend and frontend

```typescript
// NEW: Transform nodes and edges for calculation engine
private transformGraphForCalculation(nodes: any[], edges: any[]): {
  nodes: ForecastNodeClient[];
  edges: ForecastEdgeClient[];
} {
  const transformedNodes = nodes.map(node => ({
    id: node.id,
    type: node.kind, // Backend uses 'kind', frontend uses 'type'
    data: node.attributes,
    position: node.position
  }));
  
  const transformedEdges = edges.map(edge => ({
    id: edge.id,
    source: edge.source_node_id,
    target: edge.target_node_id
  }));
  
  return { nodes: transformedNodes, edges: transformedEdges };
}
```

### 7.4 Error Handling Enhancement ✅ COMPLETED
**File**: `backend/src/forecast/services/forecast-calculation.service.ts`

**Required Changes:**
- Add specific error handling for calculation engine failures
- Provide detailed error messages for graph validation failures
- Implement proper error logging and debugging information

```typescript
// ENHANCE: Error handling in calculateForecast method
try {
  // ... existing code ...
  
  // NEW: Real calculation with proper error handling
  const calculationResult = await this.executeRealCalculation(
    forecastId,
    forecast,
    nodes,
    edges,
    transformedVariables
  );
  
} catch (error) {
  // NEW: Specific error handling for calculation failures
  if (error.message.includes('Graph validation failed')) {
    throw new BadRequestException(`Invalid forecast graph: ${error.message}`);
  }
  if (error.message.includes('Variable not found')) {
    throw new BadRequestException(`Missing variable data: ${error.message}`);
  }
  // ... existing error handling ...
}
```

### 7.5 UI/UX Improvements ✅ COMPLETED

#### 7.5.1 Automatic Graph Validation ✅ COMPLETED
**Files**: 
- `src/components/forecast/forecast-toolbar.tsx`

**Implemented Changes:**
- ✅ Removed manual graph validation button from toolbar
- ✅ Integrated validation automatically into calculate forecast workflow
- ✅ Show validation errors inline when calculation fails due to validation
- ✅ Removed separate "Graph Validation" section from toolbar

```typescript
// REMOVE: Manual validation trigger
const handleCalculate = async () => {
  // NEW: Automatic validation before calculation
  const graphConverter = new GraphConverter();
  const validation = graphConverter.validateGraph(nodes, edges);
  
  if (!validation.isValid) {
    toast({
      title: 'Graph Validation Failed',
      description: `Found ${validation.errors.length} error(s): ${validation.errors.join(', ')}`,
      variant: 'destructive',
    });
    return; // Don't proceed with calculation
  }
  
  // Proceed with calculation only if validation passes
  await calculateForecast();
};
```

#### 7.5.2 Calculate Button State Management ✅ COMPLETED
**File**: `src/components/forecast/forecast-toolbar.tsx`

**Implemented Changes:**
- ✅ Calculate button disabled when forecast has unsaved changes
- ✅ User must save forecast before calculation is allowed
- ✅ Clear messaging about save requirement

```typescript
// UPDATED: Calculate button logic
const canCalculate = !isDirty &&  // Must be saved first
                    hasMetricNodes && 
                    !isCalculating && 
                    forecastId && 
                    organizationId;
                    // Remove graphValidation requirement - now automatic
```

#### 7.5.3 Single Results Display Location ✅ COMPLETED
**Files**:
- `src/app/(protected)/forecast-definition/[forecastId]/page.tsx`
- `src/components/forecast/forecast-toolbar.tsx`

**Implemented Changes:**
- ✅ Removed `CalculationResultsDisplay` from sidebar/toolbar
- ✅ Keep only `CalculationResultsTable` below canvas
- ✅ Simplified results display to single location

```typescript
// REMOVE from forecast-toolbar.tsx:
<div className="mt-6">
  <CalculationResultsDisplay compact={true} />
</div>

// KEEP in page.tsx (below canvas):
<div className="p-4 max-h-96 overflow-y-auto border-t border-slate-700">
  <CalculationResultsTable />
</div>
```

### 7.6 Integration Testing ✅ COMPLETED
**File**: `backend/src/forecast/services/__tests__/forecast-calculation.service.integration.test.ts`

**Required Changes:**
- Create integration tests for real calculation execution
- Test with actual graph structures and variable data
- Validate calculation results against expected values

---

## Phase 8: Testing and Validation (Updated)

### 8.1 Unit Testing ✅ COMPLETED
**Files**: 
- `src/lib/services/forecast-calculation/__tests__/graph-converter.test.ts` - Graph validation and conversion tests
- `backend/src/forecast/services/__tests__/*.test.ts` - Backend calculation services (existing)

**Test Coverage**:
- ✅ Graph validation rules and edge cases
- ✅ Cycle detection in graphs
- ✅ Orphaned node detection
- ✅ SEED node reference validation
- ✅ Operator node input order validation
- ✅ Data integrity checks

**Implemented Tests**:
- ✅ Simple valid graph validation
- ✅ Cycle detection with multiple node types
- ✅ Orphaned node identification
- ✅ Metric node requirement validation
- ✅ Operator node input order verification
- ✅ Data node variable reference validation
- ✅ Graph to calculation tree conversion
- ✅ Complex multi-metric graph handling

### 8.2 Integration Testing 🔄 IN PROGRESS
**Files**:
- `src/components/forecast/__tests__/*.test.tsx` - UI component integration (existing)
- Backend calculation integration tests needed

**Test Scenarios**:
- Complete forecast calculation workflow
- Graph validation and error handling
- Variable data retrieval and usage
- Result storage and retrieval

### 8.3 End-to-End Testing ⏳ PENDING
**Test Cases**:
- User creates forecast graph → validates → calculates → views results
- Error scenarios: invalid graphs, missing variables, calculation failures
- Performance testing with large graphs (50+ nodes)

---

## Updated Success Criteria

### Completed (Phases 1-6)
- [x] Complete TypeScript type system for calculations
- [x] Frontend calculation engine with graph validation
- [x] Backend API structure with database schema
- [x] UI components for validation and results display
- [x] Integration with forecast editor page

### Phase 7 Requirements (New)
- [x] Backend uses real calculation engine instead of placeholder logic
- [x] Graph nodes and edges properly transformed and executed
- [x] Variable data correctly integrated into calculations
- [x] SEED → OPERATOR → METRIC flow properly executed
- [x] Monthly forecast values reflect actual graph structure
- [x] Error handling for all calculation failure scenarios
- [x] Automatic graph validation on calculate (no manual validation button)
- [x] Calculate button disabled when forecast has unsaved changes
- [x] Single results display location (below canvas only, not in sidebar)

### Phase 8 Requirements (Updated)
- [ ] 80% test coverage for all calculation components
- [ ] Integration tests validate real calculation results
- [ ] Performance acceptable for graphs with 50+ nodes
- [ ] End-to-end workflow testing complete

## Risk Mitigation

### Phase 7 Specific Risks
1. **Data Format Incompatibility**: Backend and frontend data formats may not align
   - **Mitigation**: Create comprehensive transformation functions with validation
2. **Variable Access Issues**: Backend variable format may not work with frontend calculation engine
   - **Mitigation**: Implement proper data transformation and fallback handling
3. **Performance Degradation**: Real calculation may be slower than placeholder logic
   - **Mitigation**: Implement caching and optimization strategies

## Implementation Priority

### Critical Path (Phase 7)
1. **Service Integration** - Import and wire up frontend calculation services
2. **Data Transformation** - Ensure compatibility between backend and frontend data formats
3. **Error Handling** - Robust error handling for calculation failures
4. **Testing** - Validate real calculation results against expected values

### Success Validation
- [ ] Calculation produces results that reflect actual graph structure
- [ ] Variable data from your AG_REV_Recurring_All and AG_REV_Budget_Recurring_All is used
- [ ] SEED node references previous month's METRIC results
- [ ] OPERATOR node performs actual mathematical operations
- [ ] Results change when graph structure or variable data changes
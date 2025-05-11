## Implementation Plan: Graphical Forecast Definition

### Phase 1: Backend - Database & API Setup (NestJS & Supabase) ✅

1.  **Database Schema Definition (Supabase/PostgreSQL):** ✅
    *   **`forecasts` table:**
        *   `id`: UUID, primary key
        *   `organization_id`: UUID, foreign key to `organizations.id`
        *   `name`: TEXT, user-defined name for the forecast
        *   `forecast_start_date`: DATE
        *   `forecast_end_date`: DATE
        *   `created_at`: TIMESTAMPTZ, default `now()`
        *   `updated_at`: TIMESTAMPTZ, default `now()`
        *   `user_id`: UUID, foreign key to `auth.users.id` (creator)
    *   **`forecast_node_kind_enum` type (PostgreSQL ENUM):**
        *   Values: ['DATA', 'CONSTANT', 'OPERATOR', 'METRIC', 'SEED']
    *   **`forecast_nodes` table:**
        *   `id`: UUID, primary key
        *   `forecast_id`: UUID, foreign key to `forecasts.id`
        *   `kind`: `forecast_node_kind_enum`
        *   `attributes`: JSONB, to store kind-specific attributes:
            *   Data Node: `{ "variableId": "uuid", "offsetMonths": number }`
            *   Constant Node: `{ "value": number }` 
            *   Operator Node: `{ "op": "+ | - | * | / | ^", "inputOrder": ["node_id_1", "node_id_2", ...] }`
            *   Metric Node: `{ "label": "string", "budgetVariableId": "uuid", "historicalVariableId": "uuid" }`
            *   Seed Node: `{ "sourceMetricId": "uuid" }`
        *   `position`: JSONB, `{ "x": number, "y": number }`
        *   `created_at`: TIMESTAMPTZ, default `now()`
        *   `updated_at`: TIMESTAMPTZ, default `now()`
    *   **`forecast_edges` table:**
        *   `id`: UUID, primary key
        *   `forecast_id`: UUID, foreign key to `forecasts.id`
        *   `source_node_id`: UUID, foreign key to `forecast_nodes.id`
        *   `target_node_id`: UUID, foreign key to `forecast_nodes.id`
        *   `created_at`: TIMESTAMPTZ, default `now()`
    *   **RLS Policies:** Implement RLS for these tables ensuring organization-scoped access.

2.  **SQL Migration Script:** ✅
    *   Develop a SQL script to create the tables, enum type, foreign keys, and RLS policies.
    *   This will be applied using `mcp_supabase_apply_migration`.

3.  **Backend Module & Services (NestJS):** ✅
    *   Create `ForecastModule`.
    *   Using Supabase client instead of Prisma to interact with the database.
    *   **DTOs (`src/forecast/dto`):** `CreateForecastDto`, `UpdateForecastDto`, `ForecastNodeDto`, `ForecastEdgeDto` (reflecting schema changes, especially for `ConstantNode`).
    *   **Services (`src/forecast/services`):** `ForecastService`, `ForecastNodeService`, `ForecastEdgeService` for CRUD and validation.
    *   **Controllers (`src/forecast/controllers`):** `ForecastController` with endpoints for:
        *   `POST /forecasts`, `GET /forecasts`, `GET /forecasts/:id`, `PATCH /forecasts/:id`, `DELETE /forecasts/:id`.
        *   Also included node and edge endpoints: `POST /forecasts/:forecastId/nodes`, `GET /forecasts/:forecastId/nodes`, etc.

4.  **Backend Testing (Unit & Integration):** ✅
    *   **Unit Tests (Jest):**
        *   For `ForecastService`, `ForecastNodeService`, `ForecastEdgeService`: Test CRUD operations, validation logic (e.g., attribute validation for each node kind).
    *   **Integration Tests (Supertest & Jest):**
        *   For `ForecastController`: Test API endpoints thoroughly (request/response, status codes, error handling) for creating, reading, updating, and deleting forecasts, including their nodes and edges.

### Phase 2: Frontend - Core UI & State (Next.js, Zustand, React Flow)

1.  **New Zustand Store (`src/lib/store/forecast-graph-store.ts`):**
    *   **State:** `forecastId`, `forecastName`, `forecastStartDate`, `forecastEndDate`, `nodes` (Array of `ForecastNodeClient` - interface for node data, including client-side state like `isSelected`, and reflecting `ConstantNode` attribute change), `edges` (Array of `ForecastEdgeClient`), `isDirty`.
    *   **Actions:** `loadForecast`, `setForecastPeriod`, `addNode`, `updateNode`, `deleteNode`, `addEdge`, `deleteEdge`, `setDirty`, `resetStore`.

2.  **Routing & Page Structure:**
    *   `src/app/(protected)/forecast-definition/page.tsx`: For listing/creating forecasts.
    *   `src/app/(protected)/forecast-definition/[forecastId]/page.tsx`: For the canvas editor.
    *   Ensure that navigation gets updated in the bar at the top of each page in the (protected) route and there is a new card on `src\app\landing\page.tsx` 

3.  **Canvas Library Integration (React Flow):**
    *   Set up React Flow provider (`ReactFlowProvider`) around the canvas area.
    *   Basic configuration for zoom, pan.

4.  **Frontend Store & Core Logic Testing (Unit):**
    *   **Unit Tests (Jest):**
        *   For `forecastGraphStore`: Test actions (e.g., adding a node correctly initializes its attributes based on kind, deleting a node also removes connected edges) and selectors. Test client-side validation logic within the store if any (e.g., for node attributes before an update action).

### Phase 3: Frontend - Canvas & Node Implementation

1.  **Main Canvas Component (`src/components/forecast/forecast-canvas.tsx`):**
    *   Use React Flow components (`<ReactFlow nodes={...} edges={...} onNodesChange={...} onEdgesChange={...} />`).
    *   Connect to `forecastGraphStore` for `nodes` and `edges`.
    *   Dispatch store actions on React Flow events (`onNodesChange`, `onEdgesChange`, `onConnect`, etc.).

2.  **Custom Node Components (`src/components/forecast/nodes/`):**
    *   Develop React components for each node kind: `DataNode.tsx`, `ConstantNode.tsx` (reflecting attribute change), `OperatorNode.tsx`, `MetricNode.tsx`, `SeedNode.tsx`.
    *   Style with Tailwind CSS / Shadcn UI, color-coded by kind.
    *   Pass these as `nodeTypes` to React Flow.

3.  **Edge Rendering & Interaction:**
    *   Configure React Flow for edge drawing and custom edge types if needed (e.g., with arrowheads).
    *   Handle `onConnect` to add edges to the store.

4.  **Frontend Canvas & Node Component Testing (Unit & Snapshot):**
    *   **Unit/Snapshot Tests (React Testing Library, Jest):**
        *   For each custom node component: Test rendering based on props, display of key attributes.
    *   **Component Tests (React Testing Library, Jest):**
        *   For `ForecastCanvas`: Test that nodes and edges from the store are correctly passed to React Flow. Mock React Flow internals if necessary to test interactions like node selection dispatching store actions.

### Phase 4: Frontend - UI Controls & Interactions

1.  **Node Configuration Panel (`src/components/forecast/node-config-panel.tsx`):**
    *   Use Shadcn `Sheet` or `Dialog`.
    *   Dynamically render input fields (Shadcn `Input`, `Select`, etc.) based on selected `node.kind` and its attributes (reflecting `ConstantNode` change).
    *   Update Zustand store on attribute changes.

2.  **Toolbar/Sidebar Controls (`src/components/forecast/forecast-toolbar.tsx`):**
    *   Shadcn `Button`, `DropdownMenu` for adding nodes.
    *   Shadcn `DatePicker` for "Forecast Start" / "End".
    *   "Save" button.
    *   Controls for "Delete Node/Edge", "Duplicate with Edges".

3.  **Client-Side Validation & User Feedback:**
    *   Implement UI-level validation (e.g., required fields in config panel).
    *   DAG cycle detection (consider a library or a simplified approach initially).
    *   Shadcn `Toast` or `Alert` for messages, `AlertDialog` for "unsaved changes" warning.

4.  **Frontend UI Controls & Interaction Testing (Component):**
    *   **Component Tests (React Testing Library, Jest):**
        *   For `NodeConfigPanel`: Test dynamic rendering of forms for each node type. Test that changes in the form update the Zustand store correctly.
        *   For `ForecastToolbar`: Test that button clicks (add node, save, delete) and period selections dispatch the correct Zustand store actions or trigger API calls (mocked).

### Phase 5: Full Integration, API Hookup & Refinement

1.  **API Integration Services (`src/lib/api/forecast.ts`):**
    *   Functions using `fetch` to call NestJS backend endpoints for CRUD operations on forecasts.
    *   Integrate these services with Zustand store actions (e.g., `saveForecast` action calls the API).

2.  **Loading/Saving Forecasts:**
    *   Implement logic to load forecast data into Zustand store when `[forecastId]/page.tsx` mounts.
    *   Implement the "Save" button functionality to persist the current state from Zustand to the backend. Clear `isDirty` on success.

3.  **"Duplicate with Edges" Functionality:**
    *   Implement logic in Zustand store to clone a selected node and its connected edges, generating new IDs and adjusting positions.

4.  **End-to-End Flow & Final Integration Testing:**
    *   **Manual E2E Testing:** Test the complete user flow:
        *   Creating a new forecast.
        *   Adding/configuring all types of nodes.
        *   Connecting/disconnecting nodes.
        *   Saving the forecast graph.
        *   Reloading the page and verifying the graph is loaded correctly.
        *   Updating and re-saving.
        *   Deleting nodes/edges.
        *   Testing "unsaved changes" warning.
    *   **Automated E2E Tests (Optional, e.g., Playwright/Cypress):** If time permits, automate key user scenarios.
    *   Verify client-server communication, data integrity, and error handling across the full stack.
    *   Ensure adherence to all styling and project structure rules. 
# Forecast Services

This directory houses the NestJS service classes for the Forecast module. Services encapsulate the core business logic, data manipulation, and interaction with the database (via Supabase) for forecasts, forecast nodes, and forecast edges.

## Responsibilities

-   **Business Logic**: Implementing the primary logic for creating, retrieving, updating, and deleting forecast-related entities.
-   **Data Validation**: Performing deeper validation beyond what DTOs handle, such as checking for the existence of related entities (e.g., ensuring nodes exist before creating an edge).
-   **Database Interaction**: Communicating with the Supabase backend to persist and retrieve data from the `forecasts`, `forecast_nodes`, and `forecast_edges` tables.
-   **Error Handling**: Managing and throwing appropriate HTTP exceptions (e.g., `NotFoundException`, `InternalServerErrorException`, `ForbiddenException`) based on the outcome of operations or RLS policies.
-   **Data Mapping**: Transforming data between the database entity format and the Data Transfer Object (DTO) format used by controllers and clients.

## Services

-   `forecast.service.ts`:
    -   Manages the lifecycle of `Forecast` entities.
    -   Handles CRUD operations for forecasts, including associating them with users and organizations.
    -   Ensures user authorization for accessing and modifying forecasts.

-   `forecast-node.service.ts`:
    -   Manages the lifecycle of `ForecastNode` entities within a specific forecast.
    -   Handles CRUD operations for nodes.
    -   Responsible for validating node attributes and positions.

-   `forecast-edge.service.ts`:
    -   Manages the lifecycle of `ForecastEdge` entities, which represent connections between `ForecastNode`s.
    -   Handles Create, Read, and Delete operations for edges.
    -   Ensures that edges connect valid source and target nodes belonging to the same forecast.

These services are injected into the `ForecastController` to be used for handling API requests. They promote a clear separation of concerns, keeping the controllers lean and the business logic centralized and testable. 
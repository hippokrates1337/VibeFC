# Forecast Controllers

This directory contains the NestJS controllers responsible for handling incoming HTTP requests related to the Forecast module.

## Responsibilities

-   **Request Handling**: Controllers receive HTTP requests from clients.
-   **Input Validation**: Basic input validation (e.g., parameter and body shapes) is implicitly handled by DTOs and NestJS pipes.
-   **Authentication & Authorization**: Controllers utilize guards (e.g., `JwtAuthGuard`) to ensure that only authenticated users can access the endpoints and that they have the necessary permissions for the requested resources. For instance, users can only interact with forecasts they own or are associated with their organization.
-   **Delegation to Services**: Controllers delegate the core business logic to the appropriate service classes (e.g., `ForecastService`, `ForecastNodeService`, `ForecastEdgeService`). They orchestrate calls to these services and format the responses.
-   **Response Formatting**: They return appropriate HTTP status codes and responses (e.g., DTOs or error messages) to the client.

## Controllers

-   `forecast.controller.ts`: Manages CRUD (Create, Read, Update, Delete) operations for:
    -   **Forecasts**: Overall forecasting projects.
    -   **Forecast Nodes**: Individual components or steps within a forecast.
    -   **Forecast Edges**: Connections between forecast nodes.

## Security

-   Endpoints are protected using `JwtAuthGuard`.
-   Authorization logic, such as verifying user ownership of a forecast before allowing operations on its nodes or edges, is implemented within the controller methods by first fetching the parent forecast using the user's ID.

This structure adheres to the NestJS architectural pattern of keeping controllers lean and focused on request/response handling, while complex business logic resides in services. 
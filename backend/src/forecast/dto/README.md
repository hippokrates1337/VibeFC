# Forecast Data Transfer Objects (DTOs)

This directory contains Data Transfer Object (DTO) classes for the Forecast module. DTOs are used to define the shape of data for requests and responses in the API. They play a crucial role in:

-   **Data Validation**: Using `class-validator` decorators to ensure incoming request data conforms to expected formats and constraints (e.g., `IsNotEmpty`, `IsUUID`, `IsEnum`, `IsDateString`).
-   **Type Safety**: Providing clear TypeScript interfaces and classes for the structure of data exchanged between the client/controller and services.
-   **API Contract**: Serving as a clear definition of the expected request payloads and response bodies.

## DTO Files

-   `forecast.dto.ts`:
    -   `CreateForecastDto`: Defines the shape for creating a new forecast, including name, start/end dates, and organization ID.
    -   `UpdateForecastDto`: Defines the optional fields for updating an existing forecast (name, start/end dates).
    -   `ForecastDto`: Represents a forecast entity, including its ID, user ID, creation/update timestamps, and other metadata.

-   `forecast-node.dto.ts`:
    -   `ForecastNodeKind` (enum like union type as per rules, but currently an enum): Defines the types of nodes available in a forecast graph (e.g., `DATA`, `CONSTANT`, `OPERATOR`).
    -   `NodePosition` (interface): Defines the x/y coordinates for a node's position.
    -   `DataNodeAttributes`, `ConstantNodeAttributes`, etc. (interfaces): Define the specific attributes for each `ForecastNodeKind`.
    -   `NodeAttributes` (union type): A union of all possible node attribute interfaces.
    -   `CreateForecastNodeDto`: Defines the shape for creating a new forecast node, including its forecast ID, kind, attributes, and position.
    -   `UpdateForecastNodeDto`: Defines the optional fields for updating an existing node (kind, attributes, position).
    -   `ForecastNodeDto`: Represents a forecast node entity, including its ID, kind, attributes, position, and timestamps.

-   `forecast-edge.dto.ts`:
    -   `CreateForecastEdgeDto`: Defines the shape for creating a new edge between two nodes, requiring forecast ID, source node ID, and target node ID.
    -   `UpdateForecastEdgeDto`: Defines optional fields for updating an edge (currently only attributes, but could include source/target node IDs if edge modification were supported beyond attribute changes).
    -   `ForecastEdgeDto`: Represents a forecast edge entity, including its ID, forecast ID, source/target node IDs, and creation timestamp.

These DTOs are utilized by controllers for request body validation and by services for defining the structure of data they operate on and return. 
# API: Data Intake - Variables

Handles CRUD operations for data variables by proxying requests to the backend.

## Endpoints

### `POST /api/data-intake/variables`

- **Description**: Creates one or more data variables.
- **Method**: `POST`
- **Request Body**: Forwards the JSON request body directly to the backend endpoint `POST {BACKEND_URL}/data-intake/variables`.
- **Response**: Returns the JSON response from the backend.

### `DELETE /api/data-intake/variables/item/[id]`

- **Description**: Deletes a specific data variable by its ID.
- **Method**: `DELETE`
- **URL Parameter**: `id` - The UUID of the variable to delete.
- **Backend Interaction**: Sends a `DELETE` request to `{BACKEND_URL}/data-intake/variables` with a JSON body containing the ID: `{ "ids": [id] }`.
- **Response**: Returns the JSON response from the backend (or a success message if the backend returns no content).

### `GET /api/data-intake/variables/user/[userId]`

- **Description**: Gets all variables for a specific user.
- **Method**: `GET`
- **URL Parameter**: `userId` - The user ID to fetch variables for.
- **Backend Interaction**: Sends a `GET` request to `{BACKEND_URL}/data-intake/variables/{userId}`.
- **Response**: Returns the JSON response from the backend.

## Route Structure

- `route.ts` - Main endpoint for POST, PUT operations and for redirecting GET requests
- `/item/[id]/route.ts` - Handles operations for a specific variable item
- `/user/[userId]/route.ts` - Handles operations for user-specific variable lists
- `/user/frontend-user/route.ts` - Specific implementation for the frontend-user 
# API: Data Intake - Variables

Handles CRUD operations for data variables by proxying requests to the backend.

## Endpoints

### `POST /api/data-intake/variables`

- **Description**: Creates one or more data variables.
- **Method**: `POST`
- **Request Body**: Forwards the JSON request body directly to the backend endpoint `POST {BACKEND_URL}/data-intake/variables`.
- **Response**: Returns the JSON response from the backend.

### `PUT /api/data-intake/variables`

- **Description**: Updates one or more data variables.
- **Method**: `PUT`
- **Request Body**: JSON object with variable update data, forwards directly to backend.
- **Backend Interaction**: Forwards the request to `{BACKEND_URL}/data-intake/variables`.
- **Response**: Returns the JSON response from the backend.

### `DELETE /api/data-intake/variables`

- **Description**: Deletes one or more data variables.
- **Method**: `DELETE`
- **Request Body**: JSON object with `{ "ids": ["uuid1", "uuid2", ...], "organizationId": "uuid" }`
- **Backend Interaction**: Forwards the request body directly to `{BACKEND_URL}/data-intake/variables`.
- **Response**: Returns the JSON response from the backend.

### `DELETE /api/data-intake/variables/item/[id]`

- **Description**: Deletes a specific data variable by its ID (alternative endpoint).
- **Method**: `DELETE`
- **URL Parameter**: `id` - The UUID of the variable to delete.
- **Request Body**: JSON object with `{ "organizationId": "uuid" }`
- **Backend Interaction**: Sends a `DELETE` request to `{BACKEND_URL}/data-intake/variables` with a JSON body containing the ID: `{ "ids": [id], "organizationId": "uuid" }`.
- **Response**: Returns the JSON response from the backend (or a success message if the backend returns no content).

### `GET /api/data-intake/variables/user/[userId]`

- **Description**: Gets all variables for a specific user.
- **Method**: `GET`
- **URL Parameter**: `userId` - The user ID to fetch variables for.
- **Backend Interaction**: Sends a `GET` request to `{BACKEND_URL}/data-intake/variables/{userId}`.
- **Response**: Returns the JSON response from the backend.

## Route Structure

- `route.ts` - Main endpoint for POST, PUT, DELETE operations and for redirecting GET requests
- `/item/[id]/route.ts` - Handles DELETE operations for a specific variable item (alternative endpoint)
- `/user/[userId]/route.ts` - Handles GET operations for user-specific variable lists
- `/user/frontend-user/route.ts` - Specific implementation for the frontend-user

## Architecture

All API routes act as **proxies** to the backend services. The frontend should **never call the backend directly** due to CORS restrictions and authentication handling. Instead:

1. **Frontend** → calls Next.js API routes (`/api/data-intake/variables`)
2. **Next.js API** → forwards requests to backend (`{BACKEND_URL}/data-intake/variables`)
3. **Backend** → processes request and returns response
4. **Next.js API** → forwards response back to frontend 
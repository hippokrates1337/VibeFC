# VibeFC - Financial Forecasting Platform

A collaborative platform for creating and maintaining financial forecasts.

## Features

- **Data Intake:** 
  - Import financial data from CSV files (comma or semicolon delimited) with flexible date and number format support (German/English).
  - Automatic date normalization to the first of the month.
  - Manage variables (types: ACTUAL, BUDGET, INPUT, UNKNOWN) with preview, add, update, or skip options during import.
  - View, edit, and delete variables and their time series data through a card-based interface and detailed modals.
  - Data managed via Zustand (localStorage) and synchronized with a backend per organization.
- **Forecast Definition:** 
  - Define and configure forecast calculations
  - Interactive graph canvas for building forecast models
  - **Robust unsaved changes preservation** across browser events, window switching, and authentication refreshes
  - **Keyboard Controls:**
    - **Delete/Backspace:** Delete selected nodes and edges on the forecast canvas
    - **Double-click:** Open node configuration panel
    - **Drag:** Move nodes around the canvas
    - **Click + Drag:** Create connections between nodes
  - **Toolbar Actions:**
    - **Save:** Save changes to the server
    - **Reload:** Discard changes and reload fresh data from server
- **Forecast Analysis:** View and analyze forecast results

## Tech Stack

### Frontend
- **Framework**: Next.js 14 with React and TypeScript
- **Styling**: Tailwind CSS with Shadcn UI components
- **State Management**: Zustand with localStorage persistence
- **Graph Visualization**: React Flow for interactive forecast canvas
- **Testing**: Jest and React Testing Library

### Backend
- **Framework**: NestJS with TypeScript
- **Database**: Supabase PostgreSQL with Row Level Security (RLS)
- **Authentication**: JWT with Supabase Auth
- **Validation**: class-validator for DTOs
- **Testing**: Jest for unit tests, Supertest for integration tests

### Database Schema
- **organizations**: Organization details and ownership
- **organization_members**: User membership and roles (admin, editor, viewer)
- **variables**: Time-series data variables (ACTUAL, BUDGET, INPUT, UNKNOWN)
- **forecasts**: Forecast metadata and date ranges
- **forecast_nodes**: Graph nodes (DATA, CONSTANT, OPERATOR, METRIC, SEED)
- **forecast_edges**: Connections between forecast nodes

## Getting Started

### Prerequisites

- Node.js 18 or later
- PostgreSQL 12 or later
- yarn or npm

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/vibefc.git
   cd vibefc
   ```

2. Install dependencies:
   ```bash
   yarn install
   ```

3. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

4. Update the environment variables in `.env` with your database credentials.

5. Initialize the database:
   ```bash
   yarn prisma db push
   ```

6. Start the development server:
   ```bash
   yarn dev
   ```

The application will be available at http://localhost:3000.

## Project Structure

### Frontend (`src/`)
```
src/
├── app/                   # Next.js App Router
│   ├── (protected)/       # Authenticated routes
│   │   ├── data-intake/   # Data import and variable management
│   │   ├── organizations/ # Organization management
│   │   └── forecast-definition/ # Forecast creation and editing
│   ├── api/               # Server-side API route handlers
│   ├── auth/              # Authentication callbacks
│   ├── login/             # Public login page
│   └── signup/            # Public registration page
├── components/            # Reusable React components
│   ├── forecast/          # Forecast-specific components
│   ├── ui/                # Shadcn UI components
│   └── ...                # Other feature components
├── lib/                   # Utility functions and shared logic
│   ├── api/               # API client functions
│   ├── store/             # Zustand state management
│   │   ├── variables.ts   # Variable data and persistence
│   │   ├── organization.ts # Organization data and selection
│   │   └── forecast-graph-store.ts # Forecast graph state
│   └── utils/             # Helper functions
├── providers/             # React context providers
├── types/                 # Shared TypeScript definitions
├── middleware.ts          # Authentication and route protection
└── setupTests.ts          # Jest test configuration
```

### Backend (`backend/`)
```
backend/
├── src/
│   ├── common/            # Shared utilities and guards
│   ├── data-intake/       # Variable CRUD operations
│   ├── forecast/          # Forecast management (nodes, edges, metadata)
│   ├── health/            # Health check endpoints
│   ├── supabase/          # Supabase client configuration
│   ├── test-auth/         # Authentication testing utilities
│   └── validators/        # Custom validation decorators
├── dist/                  # Compiled JavaScript output
├── sql/                   # Database scripts and migrations
└── test/                  # End-to-end tests
```

### Key Architecture Components

**Authentication & Authorization**:
- `src/middleware.ts` handles route protection using Supabase authentication
- Backend uses JWT guards and Row Level Security (RLS) for data access control
- Organization-based access control with member roles (admin, editor, viewer)

**State Management**:
- Zustand stores with localStorage persistence for offline capability
- Variable store manages time-series data with organization filtering
- Forecast graph store handles React Flow nodes/edges with dirty state tracking

**API Architecture**:
- Frontend API routes (`src/app/api/`) for client-server communication
- Backend NestJS modules with controller/service/DTO pattern
- Direct Supabase client integration with RLS policies

## Development

### Frontend Development
- `yarn dev` - Start the Next.js development server
- `yarn build` - Create a production build
- `yarn start` - Start the production server
- `yarn lint` - Check for code style issues
- `yarn test` - Run all tests
- `yarn test:watch` - Run tests in watch mode
- `yarn test:coverage` - Generate test coverage report

### Backend Development
Navigate to the `backend/` directory:
- `npm install` - Install dependencies
- `npm run start:dev` - Start NestJS development server
- `npm run build` - Build the application
- `npm run start:prod` - Start production server
- `npm run test` - Run unit tests
- `npm run test:e2e` - Run end-to-end tests

### Environment Setup
1. **Frontend**: Copy `.env.example` to `.env` and configure:
   - `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key
   - `NEXT_PUBLIC_BACKEND_URL` - Backend API URL (e.g., `http://localhost:3001`)

2. **Backend**: Configure environment variables for:
   - Supabase connection string
   - JWT secrets
   - Database credentials

## Testing Strategy

The application uses Jest and React Testing Library for testing:

- **Unit Tests**: Located alongside source files in `__tests__` folders
- **Component Tests**: Testing UI components in isolation
- **Coverage Goals**: Aiming for 80%+ code coverage

The `src/setupTests.ts` file is used to configure the Jest testing environment. Its main role is to ensure that browser-specific APIs, like `fetch`, are available and correctly polyfilled or mocked when tests run in the Node.js environment. This helps in testing components that make HTTP requests.

## Data Model

### Core Entities

**Variables**: Time-series financial data
- `id` (UUID), `name`, `type` (ACTUAL, BUDGET, INPUT, UNKNOWN)
- `values`: Array of time-series points with date and value
- `organization_id`: Links to organization ownership
- Supports flexible date/number formats (German/English)

**Organizations**: Multi-tenant structure
- `id`, `name`, `owner_id` (links to auth.users)
- Members with roles: admin, editor, viewer
- Row Level Security enforces data isolation

**Forecasts**: Graph-based forecasting models
- `id`, `name`, `start_date`, `end_date`, `organization_id`
- Contains nodes and edges defining calculation flow

**Forecast Nodes**: Calculation components
- **DATA**: References variables with time offset
- **CONSTANT**: Fixed numerical values
- **OPERATOR**: Mathematical operations (+, -, *, /, ^)
- **METRIC**: Computes values from historical/budget data
- **SEED**: Initializes forecast calculations

**Forecast Edges**: Connections between nodes
- Defines data flow and calculation dependencies
- Links source and target nodes within a forecast

## API Endpoints

### Data Intake Module (`/data-intake`)
- `POST /variables` - Create multiple variables
- `GET /variables/:userId` - Get variables by user's organizations
- `PUT /variables` - Update existing variables
- `DELETE /variables` - Delete variables (requires organizationId)

### Forecast Module (`/forecasts`)
**Forecasts**:
- `POST /forecasts` - Create new forecast
- `GET /forecasts` - List organization forecasts
- `GET /forecasts/:id` - Get specific forecast
- `PATCH /forecasts/:id` - Update forecast metadata
- `DELETE /forecasts/:id` - Delete forecast

**Nodes**:
- `POST /forecasts/:forecastId/nodes` - Add node to forecast
- `GET /forecasts/:forecastId/nodes` - Get all forecast nodes
- `PATCH /forecasts/:forecastId/nodes/:nodeId` - Update node
- `DELETE /forecasts/:forecastId/nodes/:nodeId` - Delete node

**Edges**:
- `POST /forecasts/:forecastId/edges` - Create node connection
- `GET /forecasts/:forecastId/edges` - Get all connections
- `DELETE /forecasts/:forecastId/edges/:edgeId` - Delete connection

All endpoints require JWT authentication and respect organization-based access control through Supabase RLS policies.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

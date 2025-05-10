# VibeFC - Financial Forecasting Platform

A collaborative platform for creating and maintaining financial forecasts.

## Features

- **Data Intake:** 
  - Import financial data from CSV files with flexible date format support
  - Preview and manage imported variables with add/update/skip options
  - Support for different number formats (German and English)
  - Variable types: ACTUAL, BUDGET, and INPUT
- **Variables Management:** Browse and view all imported variables with their time series data
- **Forecast Definition:** Define and configure forecast calculations
- **Forecast Analysis:** View and analyze forecast results

## Tech Stack

- Frontend: Next.js 14 with React and TypeScript
- Styling: Tailwind CSS with Shadcn UI components
- State Management: Zustand with localStorage persistence
- Database: PostgreSQL with Prisma ORM
- Backend: Next.js API Routes

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

```
src/
├── app/                   # Next.js app router pages
│   ├── data-intake/       # Data import functionality
│   └── variables/         # Variables overview
├── components/            # Reusable React components
├── lib/                   # Utility functions and shared logic
│   └── store/             # Zustand state management
└── providers/             # React context providers
├── middleware.ts          # Handles request processing, primarily for authentication
└── setupTests.ts          # Jest setup file for test environment configuration
```

The `src/middleware.ts` file is crucial for handling authentication and authorization. It intercepts incoming requests to:
- Skip middleware for API routes and static files.
- Prevent redirect loops.
- Protect routes by verifying user authentication (via Supabase) and redirecting users to login if unauthenticated, or to the homepage if an authenticated user tries to access auth pages.

## Development

- Run `yarn dev` to start the development server
- Run `yarn build` to create a production build
- Run `yarn start` to start the production server
- Run `yarn lint` to check for code style issues
- Run `yarn test` to run all tests
- Run `yarn test:watch` to run tests in watch mode
- Run `yarn test:coverage` to generate a test coverage report

## Testing Strategy

The application uses Jest and React Testing Library for testing:

- **Unit Tests**: Located alongside source files in `__tests__` folders
- **Component Tests**: Testing UI components in isolation
- **Coverage Goals**: Aiming for 80%+ code coverage

The `src/setupTests.ts` file is used to configure the Jest testing environment. Its main role is to ensure that browser-specific APIs, like `fetch`, are available and correctly polyfilled or mocked when tests run in the Node.js environment. This helps in testing components that make HTTP requests.

## Data Model

The application manages the following key data structures:

- **Variable:** Financial data variables with metadata
  - Properties: id, name, type (ACTUAL, BUDGET, INPUT)
  - Contains time series data (date-value pairs)

- **Time Series:** Date-value pairs for each variable
  - Date format: Flexible parsing of various formats (ISO, German, US)
  - Value format: Support for both dot and comma decimal separators

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

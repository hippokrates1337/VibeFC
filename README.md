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
```

## Development

- Run `yarn dev` to start the development server
- Run `yarn build` to create a production build
- Run `yarn start` to start the production server
- Run `yarn lint` to check for code style issues

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

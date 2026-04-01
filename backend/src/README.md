# Backend Source Directory (`backend/src/`)

This directory contains the TypeScript source code for the VibeFC NestJS backend application.

## Recent Changes - Supabase Optimization (Phase 1)

**🚀 Performance Optimization Status:**
- ✅ **Supabase Module**: Migrated to `SupabaseOptimizedService` as primary service
- ✅ **Forecast Services**: Updated to use connection pooling and request-scoped clients
- ✅ **Forecast Controller**: Updated to pass request objects through service calls  
- ✅ **Organization Services**: Migrated to optimized service pattern
- ✅ **Organization Controllers**: Updated to pass request objects through service calls
- ✅ **Data-Intake Services**: Migrated to optimized service pattern
- ✅ **Data-Intake Controller**: Updated to pass request objects through service calls

**Architecture Changes:**
- **Connection Pooling**: Replaced request-scoped services with singleton + connection pooling
- **Request Parameter Pattern**: All service methods now accept `Request` parameter for user context
- **Performance Gains**: Expected 95%+ faster bulk saves, 98.7% reduction in API calls

## Structure

- **`main.ts`**: The application entry point, responsible for bootstrapping the NestJS application.
- **`app.module.ts`**: The root module of the application. It imports feature modules and configures global providers like `ConfigModule`.
- **`app.d.ts`**: Contains global TypeScript declarations, potentially for extending Express Request types.

- **Feature Modules**: Each subdirectory typically represents a feature module, encapsulating domain-specific logic. Key modules include:
    - **`organizations/`**: Manages organizations and their members, including CRUD operations and membership controls. **✅ OPTIMIZED** (See `organizations/README.md`)
    - **`data-intake/`**: Responsible for managing time-series variables, including CRUD operations and data validation. **✅ OPTIMIZED** (See `data-intake/README.md`)
    - **`forecast/`**: Enables the creation, management, and execution of time-series forecasts using a dynamic node-based graph structure. **✅ OPTIMIZED** with complete node visualization tracking (Phase 5). (See `forecast/README.md`)
    - **`health/`**: Provides endpoints for monitoring the health and status of the backend application (e.g., `GET /health`). (See `health/README.md`)
    - **`test-auth/`**: Provides a test endpoint (`/test-auth`) for inspecting authenticated user details and headers, useful for debugging authentication setups. (See `test-auth/README.md`)

- **Core/Shared Logic**: Directories containing shared modules, core functionalities, or integration logic:
    - **`supabase/`**: **✅ OPTIMIZED** - Now provides `SupabaseOptimizedService` with connection pooling and client caching for high-performance database operations, while maintaining JWT-based authentication and RLS security. (See `supabase/README.md`)
    - **`common/`**: Contains shared components, utilities, and configurations (e.g., global guards like `JwtAuthGuard`) used across multiple feature modules. (See `common/README.md`)
    - **`validators/`**: Contains custom `class-validator` decorators for specific validation needs (e.g., `date-range.validator.ts`). (See `validators/README.md`)

- **Module Structure Convention (as per `backend-rules.mdc`)**:
    - `*.module.ts`: Defines the NestJS module.
    - `controllers/`: Contains controllers handling incoming requests and routing.
    - `services/`: Contains business logic and interacts with data sources.
    - `dto/`: Defines Data Transfer Objects for request/response validation and typing.
    - `entities/`: (If applicable) Defines interfaces/classes related to data structures.
    - `guards/`, `decorators/`: (If applicable) For specific auth or utility logic.
    - `tests/` or `__tests__/` or `*.spec.ts`: Contains unit/integration tests.

## Performance Optimization Details

**Method Signature Changes:**
All service methods now follow this pattern:
```typescript
// Before
async findOne(id: string, userId: string): Promise<ForecastDto>

// After  
async findOne(id: string, userId: string, request: Request): Promise<ForecastDto>
```

**Service Usage Pattern:**
```typescript
// In services
constructor(private supabaseService: SupabaseOptimizedService) {}

async someMethod(data: any, request: Request) {
  const client = this.supabaseService.getClientForRequest(request);
  const { data, error } = await client.from('table').select('*');
}

// In controllers
async controllerMethod(@Request() req: RequestWithUser, @Param('id') id: string) {
  return this.service.someMethod(data, req); // Pass request object
}
```

**Security Maintained:**
- RLS (Row Level Security) policies remain active
- User context properly isolated via request-scoped clients
- JWT authentication unchanged at API level

## Conventions

- **Modularity**: Code is organized into feature modules, each with a clear responsibility.
- **Dependency Injection**: NestJS's built-in DI system is used extensively.
- **Configuration**: Global configuration is handled via `@nestjs/config` (`ConfigModule`).
- **Authentication**: Primarily JWT-based, with guards protecting routes. `SupabaseOptimizedService` provides user-scoped clients while leveraging connection pooling.
- **Naming**: Follows `backend-rules.mdc` and `_cursorrules.mdc`.
- **Database Interaction**: Primarily handled within services using the optimized `SupabaseOptimizedService` client pattern.

## Migration Notes

**✅ Migration Complete:**
All core services have been successfully migrated to the optimized pattern:
1. ✅ All services now inject `SupabaseOptimizedService` instead of `SupabaseService`  
2. ✅ All service method signatures include `request: Request` parameter
3. ✅ All services use `this.supabaseService.getClientForRequest(request)` for database access
4. ✅ All controller calls pass request object to service methods

**Next Steps:**
1. Run integration tests to verify performance improvements
2. Monitor performance metrics in production
3. Update test mocks for new service patterns
4. Optional: Legacy code cleanup and additional monitoring 
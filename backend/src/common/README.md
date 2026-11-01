# Common (`backend/src/common`)

Shared pieces used by the feature modules.

- `guards/jwt-auth.guard.ts`: requires a valid Supabase JWT.
- `decorators/current-user.decorator.ts`, `interfaces/authenticated-request.interface.ts`: the caller.
- `errors/database-error.ts`: `toHttpException` maps a Supabase/PostgREST error to an HTTP
  exception — row-level security → 403, no row (`PGRST116`, `P0002`) → 404, duplicate → 409,
  invalid input (`22P02`, `23514`, `P0001`, …) → 400, anything else → 500. Responses never carry
  the database message; the log does. Services throw only HTTP exceptions.
- `services/performance.service.ts`: timing of slow operations.
- `testing/fake-supabase.ts`: a recording fake Supabase client for service specs (excluded
  from the build).

Writes that row-level security filters out return no row instead of an error; services
read the affected row (`maybeSingle()`) or count (`delete({ count: 'exact' })`) and answer
403 instead of reporting success.

# Data intake

CRUD for variables: named monthly time series (`ACTUAL`, `BUDGET`, `INPUT`, `UNKNOWN`) owned by an
organization. The forecast engine reads them through `DataIntakeService.getVariablesByUser`.

## Storage

- `variables`: one row per variable (name, type, organization, owner).
- `variable_values`: one row per variable and month (`month` is the first of the month, `value` may
  be `NULL` = no value). Primary key `(variable_id, month)`, so a month exists at most once.
- Writes go through the SQL functions `create_variables` and `update_variables`
  (`supabase/migrations/20261025170006_variable_values.sql`). Each call is one transaction and runs
  with the caller's RLS: members read, editors and admins write, admins delete.

## API

| Method | Path | Body / notes |
|---|---|---|
| POST | `/data-intake/variables` | `{variables: [{id, name, type, organization_id, values}]}`; the owner is always the caller |
| GET | `/data-intake/variables/:userId` | variables of all organizations the caller belongs to |
| PUT | `/data-intake/variables` | `{variables: [{id, name?, type?, values?, replaceValues?}]}` |
| DELETE | `/data-intake/variables` | `{ids, organizationId}`; values are deleted with the variable |

`values` are `[{date, value}]`. In responses `date` is `YYYY-MM-01`. In requests:

- `date` is `YYYY-MM` or `YYYY-MM-DD` (optionally with a time), read as written: the server's time
  zone never shifts a month.
- `value` is a finite number or `null`.
- Each month may appear once.
- Anything else is rejected with 400 and a message naming every bad point; nothing is stored.

PUT merges by month by default: the given months are added or overwritten, all others stay.
With `replaceValues: true` the given months become the whole series (used by the variable editor).

Errors: 400 invalid input, 403 no permission, 404 unknown or not editable variable, 409 duplicate id.

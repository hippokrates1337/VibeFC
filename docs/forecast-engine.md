# Forecast engine semantics

This is the specification for `packages/forecast-engine`, the calculation engine behind
`POST /forecasts/:id/calculate-unified` and the graph validation in the forecast editor.
The tests in `packages/forecast-engine/src/__tests__` check every rule below; when the two
disagree, fix one of them in the same change.

The engine is pure TypeScript: synchronous, deterministic, no Nest, React, I/O, clock or
locale. The backend wraps it in `ForecastEngineService`; the frontend imports the same
`validateGraph`.

## 1. Periods

- A period is an integer **month index**: `year * 12 + (month - 1)`. January 2025 is
  `2025 * 12 + 0 = 24300`. Consecutive months differ by 1, so "t − k" is plain subtraction.
- Conversion happens only at the boundary: `parseMonth('MM-YYYY')`, `formatMonth(index)`,
  `monthIndexFromDateString('YYYY-MM-DD…')` (reads the calendar month as written) and
  `monthIndexFromDate(date)` (UTC getters). Nothing in the engine calls a local-time `Date`
  method, so results are identical in every time zone. The tests run under `TZ=UTC` and
  `TZ=Europe/Berlin`.

### Windows

A calculation has two windows, each an inclusive `[start, end]` with `start <= end`:

| Calc type    | Output months (its window `W`)      |
|--------------|-------------------------------------|
| `historical` | actual window `A`                   |
| `forecast`   | forecast window `F`                 |
| `budget`     | `A ∪ F`                             |

The windows may overlap or have a gap. The result has one row per month in `A ∪ F`
(ascending); a calc type's value is `null` in rows outside its window or when it was not
requested.

Each calc type is evaluated over its **range** `R = [min W, max W]`. For `budget` with a gap
between `A` and `F`, the gap months are computed (so lag edges can read them) but not
returned. Months before `R.start` are the type's **past** (section 4).

## 2. Graph

### Client graph (what the canvas and the database store)

Nodes `{id, type, data}` and edges `{id, source, target}`. Data flows from `source` to
`target`: the target uses the source as an input.

| Type       | Attributes used by the engine |
|------------|-------------------------------|
| `CONSTANT` | `value` (finite number) |
| `DATA`     | `variableId`, `offsetMonths` (stored as a **lead**: `+1` means next month), optional `missingAsZero` |
| `OPERATOR` | `op` (`+ - * / ^ offset`), `inputOrder` (source ids), `offsetMonths` for `offset` (stored as a **lag**: `1` means last month) |
| `METRIC`   | `useCalculated`, `historicalVariableId`, `budgetVariableId`, `label` |
| `SEED`     | `sourceMetricId` |

### Normalized graph

`buildGraph` turns the client graph into nodes with an ordered list of inputs
`{source, lag}` where `lag >= 0` is how many months back the input is read. One sign
convention applies everywhere: **positive lag = the past**.

- **OPERATOR** (`+ - * / ^`): one input per incoming edge, lag 0.
- **OPERATOR `offset`** with `offsetMonths = k`: exactly one input, lag `k`.
  Its value is the input's value `k` months ago.
- **SEED** with `sourceMetricId = M`: one input `{source: M, lag: 1}`. A SEED is "metric M
  last month". An edge drawn *into* a SEED from a METRIC is read as the same thing (it is
  the SEED's source, not a same-month dependency), so it never creates a cycle. If the edge
  and `sourceMetricId` name different metrics, that is an error.
- **METRIC**: at most one incoming edge (its formula), lag 0.
- **DATA**: no inputs. Its stored lead `offsetMonths = o` becomes `lag = -o`: the node reads
  its variable at `t - lag = t + o`. Data is not computed, so reading the future is fine.
  (The stored attribute keeps its old meaning so saved forecasts do not change; renaming it
  is a follow-up together with the UI.)
- **CONSTANT**: no inputs.

#### Operand order

`-`, `/` and `^` are not commutative, so input order is defined independently of edge-array
order: inputs listed in `inputOrder` come first, in that order; the rest follow sorted by
edge `rank` (when present), then source id, then edge id. Unlisted inputs of an operator with more than one input trigger the warning
`INPUT_ORDER_INCOMPLETE`. `inputOrder` entries that are not inputs are ignored with the
warning `INPUT_ORDER_UNKNOWN`. Duplicate edges between the same two nodes are separate inputs.
(The `rank` column on `forecast_edges` does not exist yet; until it does, `inputOrder`
decides.)

## 3. Validation

`validateGraph(nodes, edges)` returns `{isValid, errors, warnings}`; each issue is
`{code, severity, message, nodeIds, edgeIds?, path?}`. `path` lists the nodes of a cycle in
data-flow order, first node repeated at the end, so the UI can highlight it.

Errors (calculation refused):

| Code | Meaning |
|------|---------|
| `NO_METRIC` | the graph has no METRIC node |
| `DANGLING_EDGE` | an edge's source or target does not exist |
| `UNKNOWN_NODE_TYPE` | node type is not one of the five |
| `INVALID_OPERATOR` | `op` is not one of `+ - * / ^ offset` |
| `OPERATOR_WITHOUT_INPUTS` | arithmetic operator with no inputs |
| `INVALID_INPUT_COUNT` | `offset` needs exactly 1 input, `^` exactly 2, METRIC at most 1 |
| `INVALID_OFFSET` | `offsetMonths` of an `offset` operator is not an integer ≥ 0, or a DATA `offsetMonths` is not an integer |
| `INPUT_NOT_ALLOWED` | an edge into a DATA or CONSTANT node, or into a SEED from a non-METRIC |
| `INVALID_CONSTANT` | CONSTANT `value` is not a finite number |
| `SEED_WITHOUT_SOURCE` | SEED has neither `sourceMetricId` nor an incoming METRIC edge |
| `SEED_SOURCE_NOT_FOUND` | `sourceMetricId` names a node that does not exist |
| `SEED_SOURCE_NOT_METRIC` | `sourceMetricId` names a node that is not a METRIC |
| `SEED_SOURCE_CONFLICT` | incoming edge and `sourceMetricId` name different metrics |
| `CYCLE` | a same-month cycle (below) |
| `UNGROUNDED_RECURRENCE` | a cycle through lag edges that contains no METRIC (below) |
| `INVALID_WINDOW` | (`calculate` only) a period whose start is after its end |

Warnings (calculation runs): `DISCONNECTED_NODE`, `METRIC_WITHOUT_INPUT` (its calculated
values are `null`), `METRIC_WITHOUT_HISTORICAL_VARIABLE` (its past is `null`, section 4),
`METRIC_WITHOUT_BUDGET_VARIABLE` (only when `useCalculated` is false), `DATA_WITHOUT_VARIABLE`,
`INPUT_ORDER_INCOMPLETE`, `INPUT_ORDER_UNKNOWN`, `MISSING_LABEL`.

### Cycles

1. **Same-month graph.** Keep only lag-0 inputs. Every strongly connected component with more
   than one node, or a node feeding itself, is a `CYCLE` (Tarjan SCC). `nodeIds` is the whole
   component; `path` is one concrete cycle through it. A same-month cycle has no solution:
   `X = Y + 1, Y = X` is not a forecast.
2. **Grounding.** Keep all inputs, including lag ≥ 1, but drop each METRIC's input (a METRIC's
   past is data, section 4). Any remaining cycle is `UNGROUNDED_RECURRENCE`: for example
   `X = offset(Y, 1) + 1, Y = X` between two operators has no base case. Checked only when step
   1 found no cycle.

So `M = SEED(M) + 1`, `M1 = SEED(M2) + 1, M2 = SEED(M1) + 1` and `M = offset(M, 12) * 1.05`
are all valid recurrences.

`checkConnection(nodes, edges, {source, target})` runs the same validation with one extra edge
and returns the issues that edge would introduce (for the canvas's `isValidConnection`).

## 4. Evaluation

For each requested calc type `τ`, for each month `t` in `R_τ` ascending, for each node in
topological order of the same-month graph (ties broken by node id), compute `v(n, t, τ)` into
a memo that lives only for this call:

| Node | `v(n, t, τ)` |
|------|--------------|
| CONSTANT | `value` |
| DATA | the variable's value at `t - lag` if the variable type applies to `τ` (below), else `null` |
| OPERATOR `+ - * / ^` | the operation over the inputs' values; `null` if any input is `null` |
| OPERATOR `offset` | its input read at lag `k` |
| SEED | its source metric read at lag 1 |
| METRIC, `τ = forecast` | its input's value (always calculated); `null` without an input |
| METRIC, `τ ≠ forecast`, `useCalculated` | same as forecast |
| METRIC, `historical`, not calculated | `historicalVariableId`'s value at `t` |
| METRIC, `budget`, not calculated | `budgetVariableId`'s value at `t` |

DATA variable types per calc type (unchanged from the old engine):
`historical` reads `ACTUAL` and `UNKNOWN`; `forecast` reads `INPUT` and `UNKNOWN`; `budget`
reads `BUDGET`. Any other combination is `null` ("does not apply"). METRIC variables are read
regardless of variable type.

### Reading an input

An input `{source, lag}` read at month `t` for type `τ` gives `v(source, t − lag, τ)`:

- `t − lag` inside `R_τ`: the memo. A lag-0 input was computed earlier in this month
  (topological order); a lag ≥ 1 input in an earlier month.
- `t − lag` before `R_τ.start`: the source's **past value** `past(source, t − lag, τ)`.

### The past (base case)

Before a calc type's range starts, history is known:

- **METRIC**: its historical data, `historicalVariableId` at that month, for every calc type.
  No historical variable → `null`. This is the base case of every recurrence: SEED in the
  first forecast month reads the metric's actual from the month before.
- **Every other node**: the same formula as in section 4, with its inputs also read from the
  past. DATA reads its variable (same type rules); offset and SEED reach further back.

Because every cycle contains a METRIC (grounding check), the past is finite.

### Missing data

A missing value (no data point, or a `null` point) is `null`, and `null` propagates through
every operator. A DATA node with `missingAsZero: true` reads a missing point as `0` instead;
this does not apply when its variable type does not apply to the calc type, or when the
variable does not exist. A referenced variable that is not loaded gives `null` and the run
warning `VARIABLE_NOT_FOUND`.

### Arithmetic

Unchanged from the old engine's `performOperation`:

- `+` sums, `*` multiplies.
- `-` with one input negates; otherwise the first input minus the rest, left to right.
- `/` with one input is the reciprocal; otherwise the first input divided by the rest. Division
  by zero is `null`.
- `^` is `a ^ b` with exactly two inputs.
- Any non-finite result (`NaN`, `±Infinity`) is `null`.

### Output

One result per node, in the input node order, with one row per month in `A ∪ F`:
`{month, historical, forecast, budget, calculated}`. `calculated` is
`forecast ?? historical ?? budget` for non-METRIC nodes and `null` for METRIC nodes (as
before). The backend maps month indices back to `MM-YYYY`, so the `MonthlyValue` and unified
result DTOs keep their shape.

### Trace

With `trace: true` the result also contains a list of steps, one per evaluated
`(node, month, type)` in evaluation order: `{nodeId, nodeType, type, month, phase ('window' or
'past'), value, inputs: [{nodeId, lag, month, value}], variableId?}`. The trace is part of the
return value; nothing is stored between calls. The backend's debug endpoint maps it to its
step DTO (`month` as MM-YYYY, `phase` passed through).

## 5. Differences from the old engine

| Case | Old | New |
|------|-----|-----|
| `M1 = SEED(M2)+1, M2 = SEED(M1)+1` | rejected as "circular cross-tree SEED dependency" | valid recurrence |
| `M = SEED(M)+5`, historical / budget with `useCalculated` | first month only, then `null` | full series |
| `M = X + offset(X, 1)` (shared node) | `null` or a value depending on edge order | value, independent of edge order |
| Edge Metric → SEED on the canvas | cycle error without node ids | read as the SEED's source |
| Engine on a machine east of UTC | every lookup one month early | identical in every time zone |
| Missing DATA value | silently `0` | `null`, unless `missingAsZero` |
| Offset or SEED reading before the forecast window | forecast formula evaluated in that month; SEED in an "actual-only" month returned the *same* month's actual | the metric's actual in that month; lags add up (`offset(SEED(M), 1)` is `M` two months back) |
| METRIC without an input | whole calculation rejected | warning; calculated values are `null` |
| Operator inputs not in `inputOrder` | silently ignored | appended in a defined order, with a warning |
| Validation errors | HTTP 500 with a generic message | HTTP 400 with `{code, message, nodeIds, path}` per issue |
| Nodes not reachable from a METRIC | left out of `allNodes` | included |
| SEED in budget | restarted from actuals at the *forecast* start; `null` at the actual start | one series over actual ∪ forecast, starting from actuals before the actual window |
| Two edges between the same two nodes | one operand (collapsed through `inputOrder`) | two operands |
| Non-finite result (`1/0`) | `Infinity` leaked into the result | `null` |

A side-by-side run of both engines on 400 random graphs the old engine accepts (TZ=UTC) gave
265 identical results, 30 identical once missing data reads as 0, and 103 different, every one
explained by a row above.

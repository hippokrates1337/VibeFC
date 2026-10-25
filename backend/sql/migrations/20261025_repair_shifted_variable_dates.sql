-- =============================================================================
-- DRAFT — repair variable dates shifted by the old data-intake normalization
--
-- Problem: until fix/intake-month-shift, DataIntakeService.normalizeToFirstOfMonth
-- used local-time Date methods. On a backend running east of UTC (e.g. a laptop in
-- Germany) every stored date became the LAST day of the PREVIOUS month:
--   upload '2025-01-01'  ->  stored '2024-12-31'   (meant January, read as December)
-- The forecast engine reads stored dates as written, so these variables feed every
-- forecast one month early. Each later save of the series through such a backend
-- (variable editor, "Update Existing" on import) shifted it one more month.
--
-- What this script repairs: a point dated on the last day of a month was written by
-- an east-of-UTC backend; its intended month is the next one, so it moves to the
-- first of the next month ('2024-12-31' -> '2025-01-01').
--
-- What it cannot repair, and flags for manual review instead:
--   * series saved more than once through an east-of-UTC backend: still shifted by
--     (saves - 1) months after this repair. Only updated_at > created_at hints at it.
--   * series last saved by a backend WEST of UTC: dates are first-of-month but one
--     month early; they are indistinguishable from correct dates in the data.
--   * series last saved by a UTC backend after an east-of-UTC save: also first-of-month
--     and one month early, also indistinguishable.
--   * dates that are neither the 1st nor the last day of a month (not written by the
--     normalization; left as they are).
-- Check flagged variables against their source files and re-upload them.
--
-- How to run: Supabase Dashboard → SQL Editor, once per project, AFTER the fixed
-- backend is deployed everywhere (otherwise new shifted rows keep appearing).
--   1. Run step 1 (read-only) and review the result.
--   2. Run step 2. It backs up the affected rows into the repair schema (not exposed
--      through the API), repairs them and runs checks A–C. It ends with ROLLBACK;
--      replace that with COMMIT once the checks look right.
--   3. Recalculate the affected forecasts: results stored before the repair were
--      computed from the shifted data.
-- Undo (after COMMIT):
--   UPDATE public.variables v SET values = b.values
--   FROM repair.variables_backup_20261025 b WHERE v.id = b.id;
--
-- A point is "shifted" when its date is a valid YYYY-MM-DD whose next day is the 1st.
-- CASE guards the ::date cast: Postgres may evaluate AND operands in any order.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Step 1 (read-only): which variables are affected
--   shifted_points  last-day-of-month dates; repaired by step 2
--   other_points    neither the 1st nor the last day; left untouched
--   review          repaired, but a repeated or mixed save may leave a shift behind
-- -----------------------------------------------------------------------------
WITH points AS (
  SELECT
    v.id,
    CASE WHEN (p->>'date') ~ '^\d{4}-\d{2}-\d{2}$'
      THEN extract(day FROM (p->>'date')::date) = 1 ELSE false END AS is_first,
    CASE WHEN (p->>'date') ~ '^\d{4}-\d{2}-\d{2}$'
      THEN extract(day FROM (p->>'date')::date + 1) = 1 ELSE false END AS is_shifted
  FROM public.variables v
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(v.values) = 'array' THEN v.values ELSE '[]' END
  ) AS p
)
SELECT
  v.organization_id,
  v.id,
  v.name,
  v.type,
  v.created_at,
  v.updated_at,
  count(*) AS points,
  count(*) FILTER (WHERE p.is_shifted) AS shifted_points,
  count(*) FILTER (WHERE NOT p.is_first AND NOT p.is_shifted) AS other_points,
  count(*) FILTER (WHERE p.is_shifted) > 0
    AND (v.updated_at > v.created_at + interval '1 minute'
         OR count(*) FILTER (WHERE p.is_first) > 0) AS review
FROM public.variables v
JOIN points p ON p.id = v.id
GROUP BY v.organization_id, v.id, v.name, v.type, v.created_at, v.updated_at
HAVING count(*) FILTER (WHERE NOT p.is_first) > 0
ORDER BY v.organization_id, v.name;

-- -----------------------------------------------------------------------------
-- Step 2: back up, repair, check
-- -----------------------------------------------------------------------------
BEGIN;

CREATE SCHEMA IF NOT EXISTS repair;
REVOKE ALL ON SCHEMA repair FROM PUBLIC;

CREATE TABLE IF NOT EXISTS repair.variables_backup_20261025 (
  id UUID PRIMARY KEY,
  values JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  backed_up_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO repair.variables_backup_20261025 (id, values, updated_at)
SELECT v.id, v.values, v.updated_at
FROM public.variables v
WHERE EXISTS (
    SELECT 1
    FROM jsonb_array_elements(
      CASE WHEN jsonb_typeof(v.values) = 'array' THEN v.values ELSE '[]' END
    ) AS p
    WHERE CASE WHEN (p->>'date') ~ '^\d{4}-\d{2}-\d{2}$'
      THEN extract(day FROM (p->>'date')::date + 1) = 1 ELSE false END
  )
ON CONFLICT (id) DO NOTHING;

-- Move each last-day-of-month date to the first of the next month; keep point order.
-- updated_at stays as it was, so step 1's review hint still works on a re-run.
UPDATE public.variables v
SET values = (
  SELECT jsonb_agg(
    CASE
      WHEN CASE WHEN (p->>'date') ~ '^\d{4}-\d{2}-\d{2}$'
             THEN extract(day FROM (p->>'date')::date + 1) = 1 ELSE false END
      THEN jsonb_set(p, '{date}', to_jsonb(to_char((p->>'date')::date + 1, 'YYYY-MM-DD')))
      ELSE p
    END
    ORDER BY ord
  )
  FROM jsonb_array_elements(v.values) WITH ORDINALITY AS t(p, ord)
)
WHERE v.id IN (SELECT id FROM repair.variables_backup_20261025);

-- Check A: no last-day-of-month dates remain (expect 0).
SELECT count(*) AS remaining_shifted_points
FROM public.variables v
CROSS JOIN LATERAL jsonb_array_elements(
  CASE WHEN jsonb_typeof(v.values) = 'array' THEN v.values ELSE '[]' END
) AS p
WHERE CASE WHEN (p->>'date') ~ '^\d{4}-\d{2}-\d{2}$'
    THEN extract(day FROM (p->>'date')::date + 1) = 1 ELSE false END;

-- Check B: no repaired variable has two points in the same month (expect no rows). A
-- hit means the series mixed shifted and correct dates: restore it from the backup
-- and re-upload it.
SELECT v.id, v.name, left(p->>'date', 7) AS month, count(*) AS points
FROM public.variables v
CROSS JOIN LATERAL jsonb_array_elements(
  CASE WHEN jsonb_typeof(v.values) = 'array' THEN v.values ELSE '[]' END
) AS p
WHERE v.id IN (SELECT id FROM repair.variables_backup_20261025)
GROUP BY v.id, v.name, left(p->>'date', 7)
HAVING count(*) > 1;

-- Check C: point counts are unchanged (expect no rows).
SELECT v.id, v.name, jsonb_array_length(b.values) AS before, jsonb_array_length(v.values) AS after
FROM public.variables v
JOIN repair.variables_backup_20261025 b ON b.id = v.id
WHERE jsonb_array_length(b.values) <> jsonb_array_length(v.values);

-- Replace with COMMIT once checks A–C look right.
ROLLBACK;

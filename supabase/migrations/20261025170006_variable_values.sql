-- =============================================================================
-- Variable values move from the variables.values JSONB array into their own table:
-- one row per variable and calendar month. The database now guarantees one value per
-- month and first-of-month dates, and saving can add or overwrite single months.
-- There is no live data, so the old column is dropped without copying it.
-- =============================================================================

CREATE TABLE public.variable_values (
  variable_id UUID NOT NULL REFERENCES public.variables(id) ON DELETE CASCADE,
  -- First day of the month the value belongs to.
  month DATE NOT NULL CHECK (month = date_trunc('month', month)::date),
  -- NULL: the month is known to have no value (the engine treats it like a missing row).
  value DOUBLE PRECISION CHECK (
    value IS NULL OR value NOT IN ('NaN'::double precision, 'Infinity'::double precision, '-Infinity'::double precision)
  ),
  PRIMARY KEY (variable_id, month)
);

ALTER TABLE public.variables DROP COLUMN values;
ALTER TABLE public.variables ALTER COLUMN organization_id SET NOT NULL;

-- -----------------------------------------------------------------------------
-- RLS: same rules as the parent variable (members read; editors and admins write)
-- -----------------------------------------------------------------------------
ALTER TABLE public.variable_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view variable values in their organizations"
  ON public.variable_values FOR SELECT TO authenticated
  USING (variable_id IN (
    SELECT id FROM public.variables
    WHERE organization_id IN (SELECT public.user_organization_ids())
  ));

CREATE POLICY "Editors and admins can create variable values"
  ON public.variable_values FOR INSERT TO authenticated
  WITH CHECK (variable_id IN (
    SELECT id FROM public.variables
    WHERE organization_id IN (SELECT public.user_organization_ids_where_editor_or_admin())
  ));

CREATE POLICY "Editors and admins can update variable values"
  ON public.variable_values FOR UPDATE TO authenticated
  USING (variable_id IN (
    SELECT id FROM public.variables
    WHERE organization_id IN (SELECT public.user_organization_ids_where_editor_or_admin())
  ))
  WITH CHECK (variable_id IN (
    SELECT id FROM public.variables
    WHERE organization_id IN (SELECT public.user_organization_ids_where_editor_or_admin())
  ));

CREATE POLICY "Editors and admins can delete variable values"
  ON public.variable_values FOR DELETE TO authenticated
  USING (variable_id IN (
    SELECT id FROM public.variables
    WHERE organization_id IN (SELECT public.user_organization_ids_where_editor_or_admin())
  ));

-- -----------------------------------------------------------------------------
-- Save functions (SECURITY INVOKER: RLS applies as the caller). Each call is one
-- transaction, so a variable is never stored without its values.
-- Points: [{"month": "YYYY-MM-01", "value": number | null}]; the backend validates them.
-- -----------------------------------------------------------------------------

-- Merge: add or overwrite the given months. Replace: also delete all other months.
CREATE FUNCTION public.apply_variable_values(p_variable_id UUID, p_points JSONB, p_replace BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF p_replace THEN
    DELETE FROM public.variable_values vv
    WHERE vv.variable_id = p_variable_id
      AND vv.month NOT IN (
        SELECT (pt->>'month')::date FROM jsonb_array_elements(p_points) AS pt
      );
  END IF;

  INSERT INTO public.variable_values (variable_id, month, value)
  SELECT p_variable_id, (pt->>'month')::date, (pt->>'value')::double precision
  FROM jsonb_array_elements(p_points) AS pt
  ON CONFLICT (variable_id, month) DO UPDATE SET value = EXCLUDED.value;
END;
$$;

-- [{id, name, type, user_id, organization_id, values: [points]}]
CREATE FUNCTION public.create_variables(p_variables JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v JSONB;
BEGIN
  FOR v IN SELECT * FROM jsonb_array_elements(p_variables)
  LOOP
    INSERT INTO public.variables (id, name, type, user_id, organization_id, created_at, updated_at)
    VALUES (
      (v->>'id')::uuid,
      v->>'name',
      v->>'type',
      v->>'user_id',
      (v->>'organization_id')::uuid,
      NOW(),
      NOW()
    );
    PERFORM public.apply_variable_values((v->>'id')::uuid, COALESCE(v->'values', '[]'::jsonb), true);
  END LOOP;
END;
$$;

-- [{id, name?, type?, values?: [points], replace_values?: boolean}]. Omitted fields are
-- unchanged; values are merged by month unless replace_values is true.
CREATE FUNCTION public.update_variables(p_variables JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v JSONB;
BEGIN
  FOR v IN SELECT * FROM jsonb_array_elements(p_variables)
  LOOP
    UPDATE public.variables SET
      name = COALESCE(v->>'name', name),
      type = COALESCE(v->>'type', type),
      updated_at = NOW()
    WHERE id = (v->>'id')::uuid;

    -- Not found, or not editable for this user (RLS hides it): same answer either way.
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Variable % not found', v->>'id' USING ERRCODE = 'P0002';
    END IF;

    IF v ? 'values' THEN
      PERFORM public.apply_variable_values(
        (v->>'id')::uuid,
        v->'values',
        COALESCE((v->>'replace_values')::boolean, false)
      );
    END IF;
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.apply_variable_values(UUID, JSONB, BOOLEAN) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.create_variables(JSONB) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_variables(JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_variable_values(UUID, JSONB, BOOLEAN) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_variables(JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_variables(JSONB) TO authenticated, service_role;

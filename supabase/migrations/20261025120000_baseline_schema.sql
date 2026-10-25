-- =============================================================================
-- Baseline schema for VibeFC.
--
-- Same schema, RLS and functions as backend/sql/complete_supabase_setup.sql plus
-- 20261018_lockdown_variables_rls.sql (both removed), written for a fresh database:
-- no legacy cleanup, no IF NOT EXISTS. Later changes go into new migration files
-- (npx supabase migration new <name>); never edit an applied migration.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Types
-- -----------------------------------------------------------------------------
CREATE TYPE public.organization_role AS ENUM ('admin', 'editor', 'viewer');
CREATE TYPE public.forecast_node_kind_enum AS ENUM ('DATA', 'CONSTANT', 'OPERATOR', 'METRIC', 'SEED');

-- -----------------------------------------------------------------------------
-- Organizations and membership
-- -----------------------------------------------------------------------------
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE public.organization_members (
  id BIGSERIAL PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.organization_role NOT NULL DEFAULT 'viewer',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, user_id)
);

-- Pending invitations for emails that have no account yet.
CREATE TABLE public.organization_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role public.organization_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, email)
);

-- Email directory for invites and the member list. SELECT is open to signed-in
-- users because the invite flow looks users up by email (privacy tradeoff).
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_email ON public.profiles (email);

-- security_invoker: RLS is evaluated as the querying user.
CREATE VIEW public.organization_members_with_emails
WITH (security_invoker = true)
AS
SELECT
  om.id,
  om.organization_id,
  om.user_id,
  om.role,
  om.joined_at,
  p.email
FROM public.organization_members om
LEFT JOIN public.profiles p ON p.id = om.user_id;

GRANT SELECT ON public.organization_members_with_emails TO authenticated;

-- -----------------------------------------------------------------------------
-- Variables (time series; values is a JSONB array of {date: 'YYYY-MM-01', value})
-- -----------------------------------------------------------------------------
CREATE TABLE public.variables (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('ACTUAL', 'BUDGET', 'INPUT', 'UNKNOWN')),
  values JSONB NOT NULL,
  user_id TEXT NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_variables_organization_id ON public.variables (organization_id);

-- -----------------------------------------------------------------------------
-- Forecasts: metadata, graph (nodes, edges) and stored calculation results
-- -----------------------------------------------------------------------------
CREATE TABLE public.forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  forecast_start_date DATE NOT NULL,
  forecast_end_date DATE NOT NULL,
  forecast_start_month TEXT,
  forecast_end_month TEXT,
  actual_start_month TEXT,
  actual_end_month TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE public.forecast_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  forecast_id UUID NOT NULL REFERENCES public.forecasts(id) ON DELETE CASCADE,
  kind public.forecast_node_kind_enum NOT NULL,
  attributes JSONB NOT NULL,
  position JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.forecast_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  forecast_id UUID NOT NULL REFERENCES public.forecasts(id) ON DELETE CASCADE,
  source_node_id UUID NOT NULL REFERENCES public.forecast_nodes(id) ON DELETE CASCADE,
  target_node_id UUID NOT NULL REFERENCES public.forecast_nodes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.forecast_calculation_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  forecast_id UUID NOT NULL REFERENCES public.forecasts(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  results JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_forecast_calculation_results_forecast_id
  ON public.forecast_calculation_results (forecast_id);
CREATE INDEX idx_forecast_calculation_results_org_id
  ON public.forecast_calculation_results (organization_id);
CREATE INDEX idx_forecast_calculation_results_calculated_at
  ON public.forecast_calculation_results (calculated_at DESC);
CREATE INDEX idx_forecast_calculation_results_forecast_org
  ON public.forecast_calculation_results (forecast_id, organization_id);

-- -----------------------------------------------------------------------------
-- Triggers
-- -----------------------------------------------------------------------------
CREATE FUNCTION public.sync_profile_from_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, updated_at)
  VALUES (NEW.id, NEW.email, NOW())
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_sync_profile
  AFTER INSERT OR UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_from_auth_user();

-- The creator of an organization becomes its admin.
CREATE FUNCTION public.add_organization_creator_as_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'admin');
  RETURN NEW;
END;
$$;

CREATE TRIGGER organization_creator_admin_trigger
  AFTER INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.add_organization_creator_as_admin();

CREATE FUNCTION public.update_forecast_calculation_results_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_forecast_calculation_results_updated_at
  BEFORE UPDATE ON public.forecast_calculation_results
  FOR EACH ROW
  EXECUTE FUNCTION public.update_forecast_calculation_results_updated_at();

-- -----------------------------------------------------------------------------
-- Membership helpers for RLS. SECURITY DEFINER so reading memberships does not
-- re-enter RLS on organization_members ("infinite recursion").
-- -----------------------------------------------------------------------------
CREATE FUNCTION public.user_organization_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT organization_id FROM public.organization_members
  WHERE user_id = auth.uid();
$$;

CREATE FUNCTION public.user_organization_ids_where_admin()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT organization_id FROM public.organization_members
  WHERE user_id = auth.uid() AND role = 'admin';
$$;

CREATE FUNCTION public.user_organization_ids_where_editor_or_admin()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT organization_id FROM public.organization_members
  WHERE user_id = auth.uid() AND role IN ('editor', 'admin');
$$;

GRANT EXECUTE ON FUNCTION public.user_organization_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_organization_ids_where_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_organization_ids_where_editor_or_admin() TO authenticated;

-- -----------------------------------------------------------------------------
-- RLS: organizations, members, invitations, profiles
-- -----------------------------------------------------------------------------
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their organizations"
  ON public.organizations FOR SELECT
  USING (id IN (SELECT public.user_organization_ids()));

-- Lets creators read the org row before any membership exists (INSERT RETURNING).
CREATE POLICY "Owners can view organizations they own"
  ON public.organizations FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Authenticated users can create organizations"
  ON public.organizations FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admins can update organizations"
  ON public.organizations FOR UPDATE
  USING (id IN (SELECT public.user_organization_ids_where_admin()));

CREATE POLICY "Admins can delete organizations"
  ON public.organizations FOR DELETE
  USING (id IN (SELECT public.user_organization_ids_where_admin()));

CREATE POLICY "Members can view other members in their organizations"
  ON public.organization_members FOR SELECT
  USING (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY "Admins can add members to organizations"
  ON public.organization_members FOR INSERT
  WITH CHECK (organization_id IN (SELECT public.user_organization_ids_where_admin()));

-- Bootstrap: owners can add themselves (covers a missing trigger and client upserts).
CREATE POLICY "Organization owners can insert own membership"
  ON public.organization_members FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = organization_id AND o.owner_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update member roles"
  ON public.organization_members FOR UPDATE
  USING (organization_id IN (SELECT public.user_organization_ids_where_admin()));

CREATE POLICY "Admins can remove members"
  ON public.organization_members FOR DELETE
  USING (organization_id IN (SELECT public.user_organization_ids_where_admin()));

CREATE POLICY "Admins can view invitations for their organizations"
  ON public.organization_invitations FOR SELECT
  USING (organization_id IN (SELECT public.user_organization_ids_where_admin()));

CREATE POLICY "Admins can create invitations for their organizations"
  ON public.organization_invitations FOR INSERT
  WITH CHECK (organization_id IN (SELECT public.user_organization_ids_where_admin()));

CREATE POLICY "Admins can delete invitations for their organizations"
  ON public.organization_invitations FOR DELETE
  USING (organization_id IN (SELECT public.user_organization_ids_where_admin()));

CREATE POLICY "Profiles are readable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- -----------------------------------------------------------------------------
-- RLS: variables (members read, editors and admins write, admins delete)
-- -----------------------------------------------------------------------------
ALTER TABLE public.variables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view data in their organizations"
  ON public.variables FOR SELECT TO authenticated
  USING (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY "Editors and admins can create data"
  ON public.variables FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT public.user_organization_ids_where_editor_or_admin()));

CREATE POLICY "Editors and admins can update data"
  ON public.variables FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT public.user_organization_ids_where_editor_or_admin()))
  WITH CHECK (organization_id IN (SELECT public.user_organization_ids_where_editor_or_admin()));

CREATE POLICY "Admins can delete data"
  ON public.variables FOR DELETE TO authenticated
  USING (organization_id IN (SELECT public.user_organization_ids_where_admin()));

-- -----------------------------------------------------------------------------
-- RLS: forecasts, nodes, edges (any member), calculation results (editors write)
-- -----------------------------------------------------------------------------
ALTER TABLE public.forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forecast_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forecast_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forecast_calculation_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view forecasts in their organizations"
  ON public.forecasts FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert forecasts in their organizations"
  ON public.forecasts FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update forecasts in their organizations"
  ON public.forecasts FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete forecasts in their organizations"
  ON public.forecasts FOR DELETE
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can view forecast nodes in their organizations"
  ON public.forecast_nodes FOR SELECT
  USING (forecast_id IN (
    SELECT id FROM public.forecasts WHERE organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can insert forecast nodes in their organizations"
  ON public.forecast_nodes FOR INSERT
  WITH CHECK (forecast_id IN (
    SELECT id FROM public.forecasts WHERE organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can update forecast nodes in their organizations"
  ON public.forecast_nodes FOR UPDATE
  USING (forecast_id IN (
    SELECT id FROM public.forecasts WHERE organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can delete forecast nodes in their organizations"
  ON public.forecast_nodes FOR DELETE
  USING (forecast_id IN (
    SELECT id FROM public.forecasts WHERE organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can view forecast edges in their organizations"
  ON public.forecast_edges FOR SELECT
  USING (forecast_id IN (
    SELECT id FROM public.forecasts WHERE organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can insert forecast edges in their organizations"
  ON public.forecast_edges FOR INSERT
  WITH CHECK (forecast_id IN (
    SELECT id FROM public.forecasts WHERE organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can delete forecast edges in their organizations"
  ON public.forecast_edges FOR DELETE
  USING (forecast_id IN (
    SELECT id FROM public.forecasts WHERE organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can view calculation results for their organization forecasts"
  ON public.forecast_calculation_results FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert calculation results for their organization forecasts"
  ON public.forecast_calculation_results FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND role IN ('admin', 'editor')
  ));

CREATE POLICY "Users can update calculation results for their organization forecasts"
  ON public.forecast_calculation_results FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND role IN ('admin', 'editor')
  ));

CREATE POLICY "Users can delete calculation results for their organization forecasts"
  ON public.forecast_calculation_results FOR DELETE
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND role IN ('admin', 'editor')
  ));

-- -----------------------------------------------------------------------------
-- RPC: bulk_save_forecast_graph (ForecastService.bulkSaveGraph). Replaces a
-- forecast's nodes and edges in one transaction; client ids are mapped to new
-- UUIDs, including SEED sourceMetricId and OPERATOR inputOrder references.
-- -----------------------------------------------------------------------------
CREATE FUNCTION public.bulk_save_forecast_graph(
  p_forecast_id UUID,
  p_forecast_data JSONB,
  p_nodes_data JSONB,
  p_edges_data JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_forecast RECORD;
  id_map JSONB := '{}'::JSONB;
  node JSONB;
  new_id UUID;
  edge JSONB;
  sid TEXT;
  tid TEXT;
  v_nodes JSONB;
  v_edges JSONB;
  attrs JSONB;
  -- Named to avoid Supabase SQL Editor mis-parsing "v_*" locals as table identifiers in RLS hints.
  work_forecast_start date;
  work_forecast_end date;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.forecasts WHERE id = p_forecast_id) THEN
    RAISE EXCEPTION 'Forecast not found: %', p_forecast_id;
  END IF;

  SELECT forecast_start_date, forecast_end_date INTO work_forecast_start, work_forecast_end FROM public.forecasts WHERE id = p_forecast_id;

  work_forecast_start := COALESCE(
    (NULLIF(trim(p_forecast_data->>'forecastStartDate'), ''))::date,
    work_forecast_start
  );
  work_forecast_end := COALESCE(
    (NULLIF(trim(p_forecast_data->>'forecastEndDate'), ''))::date,
    work_forecast_end
  );

  UPDATE public.forecasts SET
    name = COALESCE(p_forecast_data->>'name', name),
    forecast_start_date = work_forecast_start,
    forecast_end_date = work_forecast_end,
    forecast_start_month = to_char(work_forecast_start, 'MM-YYYY'),
    forecast_end_month = to_char(work_forecast_end, 'MM-YYYY'),
    actual_start_month = COALESCE(NULLIF(p_forecast_data->>'actualStartMonth', ''), actual_start_month),
    actual_end_month = COALESCE(NULLIF(p_forecast_data->>'actualEndMonth', ''), actual_end_month),
    updated_at = NOW()
  WHERE id = p_forecast_id;

  DELETE FROM public.forecast_edges WHERE forecast_id = p_forecast_id;
  DELETE FROM public.forecast_nodes WHERE forecast_id = p_forecast_id;

  -- Phase 1: clientId -> new DB id (edges use id_map; SEED attributes must too)
  FOR node IN SELECT * FROM jsonb_array_elements(COALESCE(p_nodes_data, '[]'::jsonb))
  LOOP
    new_id := gen_random_uuid();
    id_map := id_map || jsonb_build_object(node->>'clientId', to_jsonb(new_id::text));
  END LOOP;

  -- Phase 2: insert with SEED attributes.sourceMetricId remapped to new METRIC ids
  FOR node IN SELECT * FROM jsonb_array_elements(COALESCE(p_nodes_data, '[]'::jsonb))
  LOOP
    new_id := (id_map->>(node->>'clientId'))::uuid;
    attrs := COALESCE(node->'attributes', '{}'::jsonb);

    IF (node->>'kind') = 'SEED'
       AND attrs ? 'sourceMetricId'
       AND (attrs->>'sourceMetricId') IS NOT NULL
       AND (attrs->>'sourceMetricId') <> ''
       AND id_map ? (attrs->>'sourceMetricId')
    THEN
      attrs := jsonb_set(
        attrs,
        '{sourceMetricId}',
        to_jsonb(id_map->>(attrs->>'sourceMetricId'))
      );
    ELSIF (node->>'kind') = 'OPERATOR' AND attrs ? 'inputOrder' THEN
      attrs := jsonb_set(
        attrs,
        '{inputOrder}',
        (
          SELECT COALESCE(
            jsonb_agg(
              CASE WHEN id_map ? e THEN to_jsonb(id_map->>e) ELSE to_jsonb(e) END
              ORDER BY ord
            ),
            '[]'::jsonb
          )
          FROM jsonb_array_elements_text(attrs->'inputOrder') WITH ORDINALITY AS t(e, ord)
        )
      );
    END IF;

    INSERT INTO public.forecast_nodes (id, forecast_id, kind, attributes, position, created_at, updated_at)
    VALUES (
      new_id,
      p_forecast_id,
      (node->>'kind')::public.forecast_node_kind_enum,
      attrs,
      COALESCE(node->'position', '{"x": 0, "y": 0}'::jsonb),
      NOW(),
      NOW()
    );
  END LOOP;

  FOR edge IN SELECT * FROM jsonb_array_elements(COALESCE(p_edges_data, '[]'::jsonb))
  LOOP
    sid := id_map->>(edge->>'sourceClientId');
    tid := id_map->>(edge->>'targetClientId');
    IF sid IS NULL OR tid IS NULL THEN
      RAISE EXCEPTION 'Invalid edge client reference: % -> %', edge->>'sourceClientId', edge->>'targetClientId';
    END IF;
    INSERT INTO public.forecast_edges (id, forecast_id, source_node_id, target_node_id, created_at)
    VALUES (
      gen_random_uuid(),
      p_forecast_id,
      sid::uuid,
      tid::uuid,
      NOW()
    );
  END LOOP;

  SELECT * INTO v_forecast FROM public.forecasts WHERE id = p_forecast_id;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', fn.id,
      'forecastId', fn.forecast_id,
      'kind', fn.kind,
      'attributes', fn.attributes,
      'position', fn.position,
      'createdAt', to_char(fn.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'updatedAt', to_char(fn.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    )
  ), '[]'::jsonb) INTO v_nodes
  FROM public.forecast_nodes fn
  WHERE fn.forecast_id = p_forecast_id;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', fe.id,
      'forecastId', fe.forecast_id,
      'sourceNodeId', fe.source_node_id,
      'targetNodeId', fe.target_node_id,
      'createdAt', to_char(fe.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    )
  ), '[]'::jsonb) INTO v_edges
  FROM public.forecast_edges fe
  WHERE fe.forecast_id = p_forecast_id;

  RETURN jsonb_build_object(
    'id', v_forecast.id,
    'name', v_forecast.name,
    'forecastStartDate', v_forecast.forecast_start_date::text,
    'forecastEndDate', v_forecast.forecast_end_date::text,
    'organizationId', v_forecast.organization_id,
    'userId', v_forecast.user_id,
    'createdAt', to_char(v_forecast.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'updatedAt', to_char(v_forecast.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'forecastStartMonth', v_forecast.forecast_start_month,
    'forecastEndMonth', v_forecast.forecast_end_month,
    'actualStartMonth', v_forecast.actual_start_month,
    'actualEndMonth', v_forecast.actual_end_month,
    'nodes', v_nodes,
    'edges', v_edges
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.bulk_save_forecast_graph(UUID, JSONB, JSONB, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bulk_save_forecast_graph(UUID, JSONB, JSONB, JSONB) TO service_role;

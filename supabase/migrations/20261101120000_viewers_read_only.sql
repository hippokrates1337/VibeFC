-- =============================================================================
-- Viewers are read-only.
--
-- Forecasts, their nodes and their edges could be created, changed and deleted by any
-- member, viewers included. Writes now need the editor or admin role, like variables and
-- calculation results. bulk_save_forecast_graph is SECURITY INVOKER, so it follows these
-- policies too. UPDATE policies also check the new row, so a row cannot be moved into a
-- forecast or organization the caller may not write.
--
-- Also drops "Organization owners can insert own membership": the creator becomes admin
-- through the SECURITY DEFINER trigger on organizations, and the policy let an owner who
-- had been demoted or removed add themselves back as admin.
-- =============================================================================

-- forecasts -------------------------------------------------------------------
DROP POLICY "Users can insert forecasts in their organizations" ON public.forecasts;
DROP POLICY "Users can update forecasts in their organizations" ON public.forecasts;
DROP POLICY "Users can delete forecasts in their organizations" ON public.forecasts;

CREATE POLICY "Editors and admins can create forecasts"
  ON public.forecasts FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT public.user_organization_ids_where_editor_or_admin()));

CREATE POLICY "Editors and admins can update forecasts"
  ON public.forecasts FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT public.user_organization_ids_where_editor_or_admin()))
  WITH CHECK (organization_id IN (SELECT public.user_organization_ids_where_editor_or_admin()));

CREATE POLICY "Editors and admins can delete forecasts"
  ON public.forecasts FOR DELETE TO authenticated
  USING (organization_id IN (SELECT public.user_organization_ids_where_editor_or_admin()));

-- forecast_nodes --------------------------------------------------------------
DROP POLICY "Users can insert forecast nodes in their organizations" ON public.forecast_nodes;
DROP POLICY "Users can update forecast nodes in their organizations" ON public.forecast_nodes;
DROP POLICY "Users can delete forecast nodes in their organizations" ON public.forecast_nodes;

CREATE POLICY "Editors and admins can create forecast nodes"
  ON public.forecast_nodes FOR INSERT TO authenticated
  WITH CHECK (forecast_id IN (
    SELECT id FROM public.forecasts
    WHERE organization_id IN (SELECT public.user_organization_ids_where_editor_or_admin())
  ));

CREATE POLICY "Editors and admins can update forecast nodes"
  ON public.forecast_nodes FOR UPDATE TO authenticated
  USING (forecast_id IN (
    SELECT id FROM public.forecasts
    WHERE organization_id IN (SELECT public.user_organization_ids_where_editor_or_admin())
  ))
  WITH CHECK (forecast_id IN (
    SELECT id FROM public.forecasts
    WHERE organization_id IN (SELECT public.user_organization_ids_where_editor_or_admin())
  ));

CREATE POLICY "Editors and admins can delete forecast nodes"
  ON public.forecast_nodes FOR DELETE TO authenticated
  USING (forecast_id IN (
    SELECT id FROM public.forecasts
    WHERE organization_id IN (SELECT public.user_organization_ids_where_editor_or_admin())
  ));

-- forecast_edges (no updates: edges are replaced) -----------------------------
DROP POLICY "Users can insert forecast edges in their organizations" ON public.forecast_edges;
DROP POLICY "Users can delete forecast edges in their organizations" ON public.forecast_edges;

CREATE POLICY "Editors and admins can create forecast edges"
  ON public.forecast_edges FOR INSERT TO authenticated
  WITH CHECK (forecast_id IN (
    SELECT id FROM public.forecasts
    WHERE organization_id IN (SELECT public.user_organization_ids_where_editor_or_admin())
  ));

CREATE POLICY "Editors and admins can delete forecast edges"
  ON public.forecast_edges FOR DELETE TO authenticated
  USING (forecast_id IN (
    SELECT id FROM public.forecasts
    WHERE organization_id IN (SELECT public.user_organization_ids_where_editor_or_admin())
  ));

-- organization_members ----------------------------------------------------------
DROP POLICY "Organization owners can insert own membership" ON public.organization_members;

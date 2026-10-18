-- =============================================================================
-- Lock down RLS on public.variables
--
-- Problem: the legacy "Backend service" policies were not restricted to a role.
-- Policies are OR'd, so "Backend service can view all variables" (USING (true))
-- let anyone holding the public anon key read every organization's variables via
-- PostgREST, and the magic user_id policies ('frontend-user', 'backend-%', ...)
-- let anyone write such rows into any organization. The user_id-based policies
-- let any authenticated user insert rows into an organization they don't belong to.
--
-- After this migration, access to variables is org-scoped only:
--   SELECT: members · INSERT/UPDATE: editors + admins · DELETE: admins
--
-- How to run: Supabase Dashboard → SQL Editor, once per project.
--
-- Before running, check for rows that would become invisible (no organization):
--   SELECT count(*) FROM public.variables WHERE organization_id IS NULL;
-- If there are any, assign them to an organization first, e.g.
--   UPDATE public.variables SET organization_id = '<org-uuid>' WHERE organization_id IS NULL;
-- =============================================================================

BEGIN;

DROP POLICY IF EXISTS "Backend service can insert variables" ON public.variables;
DROP POLICY IF EXISTS "Backend service can update variables" ON public.variables;
DROP POLICY IF EXISTS "Backend service can delete variables" ON public.variables;
DROP POLICY IF EXISTS "Backend service can view all variables" ON public.variables;

DROP POLICY IF EXISTS "Users can view their own variables" ON public.variables;
DROP POLICY IF EXISTS "Users can insert their own variables" ON public.variables;
DROP POLICY IF EXISTS "Users can update their own variables" ON public.variables;
DROP POLICY IF EXISTS "Users can delete their own variables" ON public.variables;

-- Re-create the org-scoped policies restricted to signed-in users, with WITH CHECK
-- on UPDATE so a row cannot be moved into an organization the user can't edit.
DROP POLICY IF EXISTS "Members can view data in their organizations" ON public.variables;
DROP POLICY IF EXISTS "Editors and admins can create data" ON public.variables;
DROP POLICY IF EXISTS "Editors and admins can update data" ON public.variables;
DROP POLICY IF EXISTS "Admins can delete data" ON public.variables;

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

COMMIT;

-- Verify: only the four org-scoped policies should remain, all TO {authenticated}.
--   SELECT policyname, cmd, roles, qual, with_check
--   FROM pg_policies WHERE schemaname = 'public' AND tablename = 'variables';

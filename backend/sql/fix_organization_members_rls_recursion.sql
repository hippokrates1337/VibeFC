-- =============================================================================
-- Fix: infinite recursion detected in policy for relation "organization_members"
-- Cause: RLS policies on organization_members used subqueries that SELECT
--        from organization_members again, re-entering RLS evaluation.
-- Run in Supabase Dashboard → SQL Editor (once per project).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.user_organization_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT organization_id FROM public.organization_members
  WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.user_organization_ids_where_admin()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT organization_id FROM public.organization_members
  WHERE user_id = auth.uid() AND role = 'admin';
$$;

CREATE OR REPLACE FUNCTION public.user_organization_ids_where_editor_or_admin()
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

-- organizations
DROP POLICY IF EXISTS "Members can view their organizations" ON public.organizations;
DROP POLICY IF EXISTS "Owners can view organizations they own" ON public.organizations;
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;
DROP POLICY IF EXISTS "Admins can update organizations" ON public.organizations;
DROP POLICY IF EXISTS "Admins can delete organizations" ON public.organizations;

CREATE POLICY "Members can view their organizations"
  ON public.organizations FOR SELECT
  USING (id IN (SELECT public.user_organization_ids()));

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

-- organization_members
DROP POLICY IF EXISTS "Members can view other members in their organizations" ON public.organization_members;
DROP POLICY IF EXISTS "Admins can add members to organizations" ON public.organization_members;
DROP POLICY IF EXISTS "Organization owners can insert own membership" ON public.organization_members;
DROP POLICY IF EXISTS "Admins can update member roles" ON public.organization_members;
DROP POLICY IF EXISTS "Admins can remove members" ON public.organization_members;

CREATE POLICY "Members can view other members in their organizations"
  ON public.organization_members FOR SELECT
  USING (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY "Admins can add members to organizations"
  ON public.organization_members FOR INSERT
  WITH CHECK (organization_id IN (SELECT public.user_organization_ids_where_admin()));

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

-- variables (org-scoped policies only; adjust names if yours differ)
DROP POLICY IF EXISTS "Members can view data in their organizations" ON public.variables;
DROP POLICY IF EXISTS "Editors and admins can create data" ON public.variables;
DROP POLICY IF EXISTS "Editors and admins can update data" ON public.variables;
DROP POLICY IF EXISTS "Admins can delete data" ON public.variables;

CREATE POLICY "Members can view data in their organizations"
  ON public.variables FOR SELECT
  USING (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY "Editors and admins can create data"
  ON public.variables FOR INSERT
  WITH CHECK (organization_id IN (SELECT public.user_organization_ids_where_editor_or_admin()));

CREATE POLICY "Editors and admins can update data"
  ON public.variables FOR UPDATE
  USING (organization_id IN (SELECT public.user_organization_ids_where_editor_or_admin()));

CREATE POLICY "Admins can delete data"
  ON public.variables FOR DELETE
  USING (organization_id IN (SELECT public.user_organization_ids_where_admin()));

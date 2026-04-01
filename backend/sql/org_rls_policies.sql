-- Reference: org-scoped RLS (use fix_organization_members_rls_recursion.sql on existing DBs).
-- Policies must NOT subquery organization_members directly from organization_members policies
-- (PostgreSQL: infinite recursion). Use SECURITY DEFINER helpers below.

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

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE variables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their organizations"
  ON organizations FOR SELECT
  USING (id IN (SELECT public.user_organization_ids()));

CREATE POLICY "Authenticated users can create organizations"
  ON organizations FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admins can update organizations"
  ON organizations FOR UPDATE
  USING (id IN (SELECT public.user_organization_ids_where_admin()));

CREATE POLICY "Admins can delete organizations"
  ON organizations FOR DELETE
  USING (id IN (SELECT public.user_organization_ids_where_admin()));

CREATE POLICY "Members can view other members in their organizations"
  ON organization_members FOR SELECT
  USING (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY "Admins can add members to organizations"
  ON organization_members FOR INSERT
  WITH CHECK (organization_id IN (SELECT public.user_organization_ids_where_admin()));

CREATE POLICY "Admins can update member roles"
  ON organization_members FOR UPDATE
  USING (organization_id IN (SELECT public.user_organization_ids_where_admin()));

CREATE POLICY "Admins can remove members"
  ON organization_members FOR DELETE
  USING (organization_id IN (SELECT public.user_organization_ids_where_admin()));

CREATE POLICY "Members can view data in their organizations"
  ON variables FOR SELECT
  USING (organization_id IN (SELECT public.user_organization_ids()));

CREATE POLICY "Editors and admins can create data"
  ON variables FOR INSERT
  WITH CHECK (organization_id IN (SELECT public.user_organization_ids_where_editor_or_admin()));

CREATE POLICY "Editors and admins can update data"
  ON variables FOR UPDATE
  USING (organization_id IN (SELECT public.user_organization_ids_where_editor_or_admin()));

CREATE POLICY "Admins can delete data"
  ON variables FOR DELETE
  USING (organization_id IN (SELECT public.user_organization_ids_where_admin()));

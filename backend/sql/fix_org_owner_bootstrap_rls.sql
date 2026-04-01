-- =============================================================================
-- Fix: organization creation never results in membership (backend sees 0 rows).
-- Cause: RLS only allowed viewing orgs via organization_members, and only allowed
--        inserting members if you were already an admin — impossible for the
--        first row. INSERT ... RETURNING also needs SELECT on the new org row
--        before a membership exists (unless the AFTER INSERT trigger ran first).
-- Run in Supabase Dashboard → SQL Editor after fix_organization_members_rls_recursion.sql
-- =============================================================================

DROP POLICY IF EXISTS "Owners can view organizations they own" ON public.organizations;
CREATE POLICY "Owners can view organizations they own"
  ON public.organizations FOR SELECT
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Organization owners can insert own membership" ON public.organization_members;
CREATE POLICY "Organization owners can insert own membership"
  ON public.organization_members FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = organization_id AND o.owner_id = auth.uid()
    )
  );

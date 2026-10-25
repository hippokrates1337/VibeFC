-- Profiles are filled by the on_auth_user_created_sync_profile trigger, which only sees
-- users created after the baseline was applied. Copy the users that existed before, so
-- member lists and invites can find them by email. Safe to run on any project.
INSERT INTO public.profiles (id, email, updated_at)
SELECT id, email, NOW()
FROM auth.users
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  updated_at = NOW();

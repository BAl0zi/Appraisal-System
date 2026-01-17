-- Add is_password_changed column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_password_changed boolean DEFAULT false;

-- Enable RLS on users table if not already enabled
-- Note: If you enable RLS, you must provide policies for all roles to view/update data as needed.
-- Proceed with caution. If RLS is currently disabled, enabling it might block the DirectorDashboard from listing users.
-- For now, let's assume valid access or that RLS isn't strictly blocking.
-- If you need to enable RLS, uncomment the following line and add appropriate policies.
-- ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to update their own validation status
-- This policy is needed only if RLS is enabled on public.users
-- DROP POLICY IF EXISTS "Users can update own is_password_changed" ON public.users;
-- CREATE POLICY "Users can update own is_password_changed"
--   ON public.users
--   FOR UPDATE
--   USING (auth.uid() = id)
--   WITH CHECK (auth.uid() = id);

-- If RLS is disabled (common in early dev), the update from client will work if the client has permissions.
-- By default, Supabase exposes tables.

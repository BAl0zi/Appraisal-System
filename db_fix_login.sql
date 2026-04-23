-- Fix the infinite recursion login error by replacing the recursive policy on public.users
-- with a non-recursive approach using a SECURITY DEFINER function.
-- 1. Create a secure function to fetch user roles bypassing RLS
CREATE OR REPLACE FUNCTION get_user_role(user_id uuid) RETURNS text LANGUAGE sql SECURITY DEFINER
SET search_path = public AS $$
SELECT role
FROM public.users
WHERE id = user_id;
$$;
-- 2. Drop the recursive policies that broke the login
DROP POLICY IF EXISTS "Directors can view all users" ON public.users;
DROP POLICY IF EXISTS "Directors and Super Admins can view all users" ON public.users;
-- 3. Ensure users can always read their own profile (Required for login to work)
-- Wait, if there was already a policy like this, it is fine to recreate it safely.
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
CREATE POLICY "Users can view their own profile" ON public.users FOR
SELECT USING (auth.uid() = id);
-- 4. Create the new non-recursive policy for Directors and Super Admins
CREATE POLICY "Directors and Super Admins can view all users" ON public.users FOR
SELECT USING (
    get_user_role(auth.uid()) IN ('DIRECTOR', 'SUPER ADMIN')
  );
-- 5. Fix the other recursive policies we created in db_super_admin_policies.sql
-- Appraisals - View all
DROP POLICY IF EXISTS "Director can view all appraisals" ON public.appraisals;
DROP POLICY IF EXISTS "Director and Super Admin can view all appraisals" ON public.appraisals;
CREATE POLICY "Director and Super Admin can view all appraisals" ON public.appraisals FOR
SELECT USING (
    get_user_role(auth.uid()) IN ('DIRECTOR', 'SUPER ADMIN')
  );
-- Appraisal Periods - Manage
DROP POLICY IF EXISTS "Director can manage periods" ON public.appraisal_periods;
DROP POLICY IF EXISTS "Director and Super Admin can manage periods" ON public.appraisal_periods;
CREATE POLICY "Director and Super Admin can manage periods" ON public.appraisal_periods FOR ALL USING (
  get_user_role(auth.uid()) IN ('DIRECTOR', 'SUPER ADMIN')
);
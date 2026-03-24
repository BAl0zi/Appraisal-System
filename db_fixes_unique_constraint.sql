-- Fix unique constraint on appraiser_assignments that prevents role-based assignments
-- The constraint "appraiser_assignments_appraisee_id_key" only allows one appraiser per appraisee
-- We need to remove it to support role-based assignments
-- 1. Drop the problematic unique constraint if it exists
ALTER TABLE public.appraiser_assignments DROP CONSTRAINT IF EXISTS appraiser_assignments_appraisee_id_key;
-- 2. Create a composite unique index that allows multiple assignments per appraisee (one per role)
-- This ensures: one appraiser per appraisee per role
-- Using a partial unique index to handle NULL roles properly
CREATE UNIQUE INDEX IF NOT EXISTS idx_appraiser_assignments_unique_role ON public.appraiser_assignments (appraisee_id, role)
WHERE role IS NOT NULL;
-- 3. Create a unique index for cases where role is NULL (legacy/primary assignments)
-- This ensures only one NULL role assignment per appraisee
CREATE UNIQUE INDEX IF NOT EXISTS idx_appraiser_assignments_unique_null_role ON public.appraiser_assignments (appraisee_id)
WHERE role IS NULL;
-- 4. Drop old lookup index if needed (optional, can keep for performance)
DROP INDEX IF EXISTS idx_appraiser_assignments_lookup;
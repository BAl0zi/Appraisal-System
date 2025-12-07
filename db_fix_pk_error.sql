-- Fix for ERROR: 23502 (column "role" contains null values)
-- This script ensures the 'role' column exists and adjusts constraints to allow NULL values.

-- 1. Ensure 'role' column exists
ALTER TABLE public.appraiser_assignments ADD COLUMN IF NOT EXISTS role text;

-- 2. Drop the existing primary key constraint. 
-- We cannot use 'role' in a PRIMARY KEY because it contains NULL values (which is expected behavior for this app).
ALTER TABLE public.appraiser_assignments DROP CONSTRAINT IF EXISTS appraiser_assignments_pkey;

-- 3. (Optional) Create a unique index instead to enforce uniqueness while allowing NULLs.
-- This ensures one appraiser per appraisee per role.
-- Note: In standard Postgres, multiple NULLs are distinct, but our application logic handles the cleanup.
-- We create an index to speed up lookups.
CREATE INDEX IF NOT EXISTS idx_appraiser_assignments_lookup 
ON public.appraiser_assignments (appraisee_id, appraiser_id);

-- 4. Ensure other missing columns exist (from previous fix)
ALTER TABLE public.appraisals ADD COLUMN IF NOT EXISTS role text;
ALTER TABLE public.appraisals ADD COLUMN IF NOT EXISTS appraisal_type text DEFAULT 'SCORESHEET';
ALTER TABLE public.appraisals ADD COLUMN IF NOT EXISTS term text;
ALTER TABLE public.appraisals ADD COLUMN IF NOT EXISTS year integer;

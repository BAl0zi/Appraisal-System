-- 1. Update users table to support multiple roles
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS roles text[] DEFAULT '{}';

-- Migrate existing role to roles array (if role is not null)
UPDATE public.users SET roles = ARRAY[role] WHERE role IS NOT NULL AND roles = '{}';

-- 2. Update appraiser_assignments to be role-specific
-- We need to know WHICH role of the appraisee is being appraised
ALTER TABLE public.appraiser_assignments ADD COLUMN IF NOT EXISTS role text;

-- If we have existing assignments, we might need to backfill 'role' based on the user's primary role
-- For now, let's just make it nullable, but in future it should be part of the unique constraint
-- DROP CONSTRAINT if exists to avoid errors on re-run
ALTER TABLE public.appraiser_assignments DROP CONSTRAINT IF EXISTS appraiser_assignments_pkey;
ALTER TABLE public.appraiser_assignments ADD PRIMARY KEY (appraiser_id, appraisee_id, role);

-- 3. Update appraisals to be role-specific
ALTER TABLE public.appraisals ADD COLUMN IF NOT EXISTS role text;

-- 4. Add appraisal_type to appraisals (TARGETS, OBSERVATION, EVALUATION, SCORESHEET)
ALTER TABLE public.appraisals ADD COLUMN IF NOT EXISTS appraisal_type text DEFAULT 'SCORESHEET';
-- We might want to rename 'appraisals' to 'appraisal_forms' later, but for now let's keep it simple.

-- 5. Add term and year to appraisals
ALTER TABLE public.appraisals ADD COLUMN IF NOT EXISTS term text;
ALTER TABLE public.appraisals ADD COLUMN IF NOT EXISTS year integer;

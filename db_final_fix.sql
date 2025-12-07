-- IMPORTANT: Clear your SQL Editor completely before pasting this.

-- 1. Add 'role' column to appraiser_assignments table
ALTER TABLE public.appraiser_assignments ADD COLUMN IF NOT EXISTS role text;

-- 2. Drop the primary key constraint to allow NULL values in the role column
ALTER TABLE public.appraiser_assignments DROP CONSTRAINT IF EXISTS appraiser_assignments_pkey;

-- 3. Add missing columns to the appraisals table
ALTER TABLE public.appraisals ADD COLUMN IF NOT EXISTS role text;
ALTER TABLE public.appraisals ADD COLUMN IF NOT EXISTS appraisal_type text DEFAULT 'SCORESHEET';
ALTER TABLE public.appraisals ADD COLUMN IF NOT EXISTS term text;
ALTER TABLE public.appraisals ADD COLUMN IF NOT EXISTS year integer;

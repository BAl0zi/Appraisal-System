-- Run this script in your Supabase SQL Editor to fix the "column does not exist" error.
-- This adds the missing columns that are required for the assignment and appraisal logic.

-- 1. Add 'role' column to appraiser_assignments
ALTER TABLE public.appraiser_assignments ADD COLUMN IF NOT EXISTS role text;

-- 2. Add missing columns to appraisals table
ALTER TABLE public.appraisals ADD COLUMN IF NOT EXISTS role text;
ALTER TABLE public.appraisals ADD COLUMN IF NOT EXISTS appraisal_type text DEFAULT 'SCORESHEET';
ALTER TABLE public.appraisals ADD COLUMN IF NOT EXISTS term text;
ALTER TABLE public.appraisals ADD COLUMN IF NOT EXISTS year integer;

-- 3. Update Primary Key for appraiser_assignments to support multiple roles (Optional but recommended)
-- This ensures one appraiser per role per appraisee
DO $$
BEGIN
    -- Only change PK if the role column exists and we haven't done it yet
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appraiser_assignments' AND column_name = 'role') THEN
        -- Check if current PK is just (appraiser_id, appraisee_id)
        -- This is a simplified check. You can just run the drop/add if you are sure.
        ALTER TABLE public.appraiser_assignments DROP CONSTRAINT IF EXISTS appraiser_assignments_pkey;
        ALTER TABLE public.appraiser_assignments ADD PRIMARY KEY (appraiser_id, appraisee_id, role);
    END IF;
END $$;

-- Create Job Category Enum
DO $$ BEGIN
    CREATE TYPE public.job_category AS ENUM (
      'TEACHING',
      'NON_TEACHING',
      'FIRSTLINE_LEADERSHIP',
      'INTERMEDIATE_LEADERSHIP',
      'SENIOR_LEADERSHIP'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add columns to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS job_category public.job_category,
ADD COLUMN IF NOT EXISTS additional_roles text[]; -- Array of strings for things like "Class Teacher", "HOP"

-- Create Appraisal Periods (Terms) table to manage active terms
CREATE TABLE IF NOT EXISTS public.appraisal_periods (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL, -- e.g., "Term 1 2025"
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_active boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for periods
ALTER TABLE public.appraisal_periods ENABLE ROW LEVEL SECURITY;

-- Everyone can view active periods
CREATE POLICY "Everyone can view active periods" ON public.appraisal_periods
  FOR SELECT USING (true);

-- Only Director can manage periods
CREATE POLICY "Director can manage periods" ON public.appraisal_periods
  FOR ALL USING (exists (select 1 from public.users where id = auth.uid() and role = 'DIRECTOR'));

-- Update appraisals table to link to a period and specific role
ALTER TABLE public.appraisals 
ADD COLUMN IF NOT EXISTS period_id uuid REFERENCES public.appraisal_periods(id),
ADD COLUMN IF NOT EXISTS appraisal_role text; -- The specific role being appraised (e.g. "Class Teacher")

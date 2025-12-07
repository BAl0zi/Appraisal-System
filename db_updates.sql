-- Add flag for password change
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_password_changed boolean DEFAULT false;

-- Create appraisals table
CREATE TABLE IF NOT EXISTS public.appraisals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  appraiser_id uuid REFERENCES public.users(id) NOT NULL,
  appraisee_id uuid REFERENCES public.users(id) NOT NULL,
  status text CHECK (status IN ('DRAFT', 'COMPLETED', 'SIGNED')) DEFAULT 'DRAFT',
  overall_score numeric,
  appraisal_data jsonb,
  signed_document_url text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for appraisals
ALTER TABLE public.appraisals ENABLE ROW LEVEL SECURITY;

-- Appraisers can view own created appraisals
CREATE POLICY "Appraisers can view own created appraisals" ON public.appraisals
  FOR SELECT USING (auth.uid() = appraiser_id);

-- Appraisers can insert appraisals
CREATE POLICY "Appraisers can insert appraisals" ON public.appraisals
  FOR INSERT WITH CHECK (auth.uid() = appraiser_id);

-- Appraisers can update own appraisals
CREATE POLICY "Appraisers can update own appraisals" ON public.appraisals
  FOR UPDATE USING (auth.uid() = appraiser_id);

-- Director can view all appraisals
CREATE POLICY "Director can view all appraisals" ON public.appraisals
  FOR SELECT USING (exists (select 1 from public.users where id = auth.uid() and role = 'DIRECTOR'));

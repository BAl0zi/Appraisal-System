-- Update the check constraint for appraisals status to include 'TARGETS_SUBMITTED'
ALTER TABLE public.appraisals DROP CONSTRAINT IF EXISTS appraisals_status_check;

ALTER TABLE public.appraisals 
  ADD CONSTRAINT appraisals_status_check 
  CHECK (status IN ('DRAFT', 'TARGETS_SUBMITTED', 'COMPLETED', 'SIGNED'));

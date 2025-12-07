-- Update appraisals status check constraint to include EVALUATION_SUBMITTED
ALTER TABLE public.appraisals DROP CONSTRAINT IF EXISTS appraisals_status_check;

ALTER TABLE public.appraisals 
  ADD CONSTRAINT appraisals_status_check 
  CHECK (status IN ('DRAFT', 'TARGETS_SUBMITTED', 'OBSERVATION_SUBMITTED', 'EVALUATION_SUBMITTED', 'COMPLETED', 'SIGNED'));

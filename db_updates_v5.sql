-- Add deletion request columns to appraisals table
ALTER TABLE appraisals 
ADD COLUMN IF NOT EXISTS deletion_requested BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

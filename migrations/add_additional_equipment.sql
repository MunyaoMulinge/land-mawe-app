-- Add additional_equipment free-text column to job_cards
-- For capturing extra equipment not in the standard checklist
ALTER TABLE job_cards ADD COLUMN IF NOT EXISTS additional_equipment TEXT;

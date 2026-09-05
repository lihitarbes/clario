-- Date-specific business availability (additive to recurring weekly).
-- Apply manually after 20260904170000_documents_storage_hardening_and_visit_check.sql
-- Safe to review before apply. Does NOT add closed-day / vacation overrides.
--
-- Replaces ONLY the legacy column CHECK on day_of_week:
--   business_availability_day_of_week_check
--   (from initial schema: day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6))
-- Leaves table CHECK (end_time > start_time) untouched
--   (Postgres name: business_availability_check).

-- ---------------------------------------------------------------------------
-- 1. Allow date-specific rows (day_of_week nullable + specific_date)
-- ---------------------------------------------------------------------------
ALTER TABLE public.business_availability
  ALTER COLUMN day_of_week DROP NOT NULL;

ALTER TABLE public.business_availability
  ADD COLUMN IF NOT EXISTS specific_date date;

-- Drop ONLY the exact legacy day_of_week range CHECK (column-level inline
-- constraint from 20260822120000_initial_schema.sql).
ALTER TABLE public.business_availability
  DROP CONSTRAINT IF EXISTS business_availability_day_of_week_check;

-- Exactly one mode:
--   recurring: day_of_week set, specific_date null, day in 0–6
--   date-specific: specific_date set, day_of_week null
ALTER TABLE public.business_availability
  DROP CONSTRAINT IF EXISTS business_availability_mode_check;

ALTER TABLE public.business_availability
  ADD CONSTRAINT business_availability_mode_check
  CHECK (
    (
      day_of_week IS NOT NULL
      AND specific_date IS NULL
      AND day_of_week BETWEEN 0 AND 6
    )
    OR (
      day_of_week IS NULL
      AND specific_date IS NOT NULL
    )
  );

CREATE INDEX IF NOT EXISTS business_availability_business_specific_date_idx
  ON public.business_availability (business_id, specific_date)
  WHERE specific_date IS NOT NULL;

COMMENT ON COLUMN public.business_availability.specific_date IS
  'When set, this row is one-off availability for that calendar date (day_of_week must be NULL). When NULL, row is recurring weekly (day_of_week required).';

COMMENT ON COLUMN public.business_availability.day_of_week IS
  '0=Sunday … 6=Saturday for recurring weekly availability. NULL when specific_date is set.';

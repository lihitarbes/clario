-- Milestone 7.1: form template builder fields, renewal settings, soft archive
-- Apply manually in Supabase SQL Editor after review.
-- Does NOT add assignments, submissions, or notifications.
-- Safe to rerun: IF NOT EXISTS columns/index; constraint dropped before recreate.

-- ---------------------------------------------------------------------------
-- 1. Template metadata columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.forms
  ADD COLUMN IF NOT EXISTS renewal_interval_months integer,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

ALTER TABLE public.forms
  DROP CONSTRAINT IF EXISTS forms_renewal_interval_months_positive;

ALTER TABLE public.forms
  ADD CONSTRAINT forms_renewal_interval_months_positive
  CHECK (
    renewal_interval_months IS NULL
    OR renewal_interval_months > 0
  );

COMMENT ON COLUMN public.forms.renewal_interval_months IS
  'NULL = never renew; positive integer = months between renewals.';

COMMENT ON COLUMN public.forms.archived_at IS
  'Soft archive timestamp. Archived templates cannot be assigned; historical data preserved.';

-- Active templates per business (owner list queries)
CREATE INDEX IF NOT EXISTS forms_business_active_idx
  ON public.forms (business_id, created_at DESC)
  WHERE archived_at IS NULL;

-- ---------------------------------------------------------------------------
-- 2. Prevent owner hard-delete (CASCADE would destroy historical submissions)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "forms_delete_owner" ON public.forms;

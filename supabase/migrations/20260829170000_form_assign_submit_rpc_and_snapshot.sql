-- Milestone 7.2: submission snapshot, valid_until, assignment_kind, atomic submit RPC
-- Apply manually in Supabase SQL Editor after review.
-- Safe to rerun where noted.

-- ---------------------------------------------------------------------------
-- 1. form_assignments — assignment kind (future update flows; M7.2 uses owner_assign)
-- ---------------------------------------------------------------------------
ALTER TABLE public.form_assignments
  ADD COLUMN IF NOT EXISTS assignment_kind text NOT NULL DEFAULT 'owner_assign';

ALTER TABLE public.form_assignments
  DROP CONSTRAINT IF EXISTS form_assignments_assignment_kind_check;

ALTER TABLE public.form_assignments
  ADD CONSTRAINT form_assignments_assignment_kind_check
  CHECK (
    assignment_kind IN (
      'owner_assign',
      'owner_update_request',
      'client_update'
    )
  );

COMMENT ON COLUMN public.form_assignments.assignment_kind IS
  'Why this assignment was created. M7.2 sets owner_assign on initial owner assignment.';

-- ---------------------------------------------------------------------------
-- 2. form_submissions — immutable snapshot + validity
-- ---------------------------------------------------------------------------
ALTER TABLE public.form_submissions
  ADD COLUMN IF NOT EXISTS snapshot jsonb,
  ADD COLUMN IF NOT EXISTS valid_until timestamptz,
  ADD COLUMN IF NOT EXISTS supersedes_submission_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint
    WHERE conname = 'form_submissions_supersedes_submission_id_fkey'
  ) THEN
    ALTER TABLE public.form_submissions
      ADD CONSTRAINT form_submissions_supersedes_submission_id_fkey
      FOREIGN KEY (supersedes_submission_id)
      REFERENCES public.form_submissions (id)
      ON DELETE SET NULL;
  END IF;
END $$;

UPDATE public.form_submissions
SET snapshot = '{}'::jsonb
WHERE snapshot IS NULL;

ALTER TABLE public.form_submissions
  ALTER COLUMN snapshot SET NOT NULL;

COMMENT ON COLUMN public.form_submissions.snapshot IS
  'Complete form template definition at submission time (not only visible questions).';

COMMENT ON COLUMN public.form_submissions.valid_until IS
  'NULL when form has no renewal interval; otherwise submitted_at + renewal_interval_months.';

COMMENT ON COLUMN public.form_submissions.supersedes_submission_id IS
  'Reserved for M7.4 version chains; unused in M7.2.';

-- ---------------------------------------------------------------------------
-- 3. RLS — clients submit via RPC insert + trigger; no manual assignment completion
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "form_assignments_update_linked_client_complete"
  ON public.form_assignments;

DROP POLICY IF EXISTS "form_submissions_insert_linked_client"
  ON public.form_submissions;

CREATE POLICY "form_submissions_insert_linked_client"
  ON public.form_submissions FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_linked_client(client_id)
    AND EXISTS (
      SELECT 1 FROM public.form_assignments AS fa
      WHERE fa.id = form_assignment_id
        AND fa.client_id = form_submissions.client_id
        AND fa.form_id = form_submissions.form_id
        AND fa.status = 'pending'
    )
  );

-- ---------------------------------------------------------------------------
-- 4. Complete pending assignment when a submission row is inserted (same transaction)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_form_submissions_complete_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.form_assignments AS fa
  SET
    status = 'completed',
    completed_at = NEW.submitted_at
  WHERE fa.id = NEW.form_assignment_id
    AND fa.client_id = NEW.client_id
    AND fa.status = 'pending';

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.trg_form_submissions_complete_assignment() FROM PUBLIC;

DROP TRIGGER IF EXISTS form_submissions_complete_assignment
  ON public.form_submissions;

CREATE TRIGGER form_submissions_complete_assignment
  AFTER INSERT ON public.form_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_form_submissions_complete_assignment();

-- ---------------------------------------------------------------------------
-- 5. submit_form_assignment — SECURITY INVOKER RPC (insert submission atomically)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_form_assignment(
  p_form_assignment_id uuid,
  p_answers jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_assignment public.form_assignments%ROWTYPE;
  v_form public.forms%ROWTYPE;
  v_submission_id uuid := pg_catalog.gen_random_uuid();
  v_submitted_at timestamptz := pg_catalog.now();
  v_valid_until timestamptz;
  v_snapshot jsonb;
BEGIN
  IF p_form_assignment_id IS NULL THEN
    RAISE EXCEPTION 'invalid_assignment'
      USING ERRCODE = 'P0001';
  END IF;

  IF p_answers IS NULL OR jsonb_typeof(p_answers) <> 'object' THEN
    RAISE EXCEPTION 'invalid_answers'
      USING ERRCODE = 'P0001';
  END IF;

  -- Do not use FOR UPDATE here: under RLS, SELECT FOR UPDATE also requires an
  -- UPDATE policy. M7.2 removed client UPDATE on form_assignments so clients
  -- cannot mark assignments completed without a submission. Concurrent submit
  -- is still blocked by unique form_assignment_id + INSERT pending check.
  SELECT *
  INTO v_assignment
  FROM public.form_assignments AS fa
  WHERE fa.id = p_form_assignment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'assignment_not_found'
      USING ERRCODE = 'P0002';
  END IF;

  IF NOT public.is_linked_client(v_assignment.client_id) THEN
    RAISE EXCEPTION 'not_authorized'
      USING ERRCODE = '42501';
  END IF;

  IF v_assignment.status <> 'pending' THEN
    RAISE EXCEPTION 'assignment_not_pending'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT *
  INTO v_form
  FROM public.forms AS f
  WHERE f.id = v_assignment.form_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'form_not_found'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_form.archived_at IS NOT NULL THEN
    RAISE EXCEPTION 'form_archived'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_form.renewal_interval_months IS NOT NULL THEN
    v_valid_until := v_submitted_at
      + (v_form.renewal_interval_months * pg_catalog.interval '1 month');
  ELSE
    v_valid_until := NULL;
  END IF;

  v_snapshot := jsonb_build_object(
    'formTitle', v_form.title,
    'formDescription', v_form.description,
    'renewalIntervalMonths', v_form.renewal_interval_months,
    'submittedFieldDefinitions', v_form.fields
  );

  INSERT INTO public.form_submissions (
    id,
    form_id,
    form_assignment_id,
    client_id,
    answers,
    snapshot,
    submitted_at,
    valid_until
  ) VALUES (
    v_submission_id,
    v_assignment.form_id,
    v_assignment.id,
    v_assignment.client_id,
    p_answers,
    v_snapshot,
    v_submitted_at,
    v_valid_until
  );

  RETURN v_submission_id;
END;
$$;

COMMENT ON FUNCTION public.submit_form_assignment(uuid, jsonb) IS
  'Linked client submits answers for a pending assignment. Inserts immutable submission; trigger completes assignment.';

REVOKE ALL ON FUNCTION public.submit_form_assignment(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_form_assignment(uuid, jsonb) TO authenticated;

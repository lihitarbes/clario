-- Fix M7.2 submit RPC: SELECT FOR UPDATE fails under RLS for linked clients
-- because form_assignments_update_linked_client_complete was dropped.
-- Clients retain SELECT; concurrent submits remain guarded by unique
-- form_assignment_id and the pending INSERT policy.
-- Safe to rerun (CREATE OR REPLACE).

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

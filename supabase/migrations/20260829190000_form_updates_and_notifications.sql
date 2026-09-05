-- Milestone 7.4 + 7.5: form updates (prefill) + form notifications
-- Apply manually in Supabase SQL Editor after review.
-- Safe to rerun where noted (IF NOT EXISTS / DROP IF EXISTS / CREATE OR REPLACE).

-- ---------------------------------------------------------------------------
-- 1. form_assignments.prefill_from_submission_id
-- ---------------------------------------------------------------------------
ALTER TABLE public.form_assignments
  ADD COLUMN IF NOT EXISTS prefill_from_submission_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint
    WHERE conname = 'form_assignments_prefill_from_submission_id_fkey'
  ) THEN
    ALTER TABLE public.form_assignments
      ADD CONSTRAINT form_assignments_prefill_from_submission_id_fkey
      FOREIGN KEY (prefill_from_submission_id)
      REFERENCES public.form_submissions (id)
      ON DELETE SET NULL;
  END IF;
END $$;

COMMENT ON COLUMN public.form_assignments.prefill_from_submission_id IS
  'Prior submission used to pre-fill this update assignment; also becomes supersedes_submission_id on submit.';

CREATE INDEX IF NOT EXISTS form_assignments_prefill_from_submission_id_idx
  ON public.form_assignments (prefill_from_submission_id)
  WHERE prefill_from_submission_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. Client may create their own update assignments (not initial owner assigns)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "form_assignments_insert_linked_client_update"
  ON public.form_assignments;

CREATE POLICY "form_assignments_insert_linked_client_update"
  ON public.form_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_linked_client(client_id)
    AND assignment_kind = 'client_update'
    AND status = 'pending'
    AND prefill_from_submission_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.form_submissions AS s
      WHERE s.id = prefill_from_submission_id
        AND s.client_id = form_assignments.client_id
        AND s.form_id = form_assignments.form_id
    )
    AND EXISTS (
      SELECT 1
      FROM public.forms AS f
      WHERE f.id = form_id
        AND f.archived_at IS NULL
    )
  );

-- ---------------------------------------------------------------------------
-- 3. submit_form_assignment — set supersedes_submission_id from prefill
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
  v_supersedes uuid;
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

  v_supersedes := v_assignment.prefill_from_submission_id;

  IF v_supersedes IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.form_submissions AS s
      WHERE s.id = v_supersedes
        AND s.client_id = v_assignment.client_id
        AND s.form_id = v_assignment.form_id
    ) THEN
      RAISE EXCEPTION 'invalid_prefill_submission'
        USING ERRCODE = 'P0001';
    END IF;
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
    valid_until,
    supersedes_submission_id
  ) VALUES (
    v_submission_id,
    v_assignment.form_id,
    v_assignment.id,
    v_assignment.client_id,
    p_answers,
    v_snapshot,
    v_submitted_at,
    v_valid_until,
    v_supersedes
  );

  RETURN v_submission_id;
END;
$$;

COMMENT ON FUNCTION public.submit_form_assignment(uuid, jsonb) IS
  'Linked client submits answers for a pending assignment. Snapshot is immutable; supersedes_submission_id comes from assignment prefill.';

REVOKE ALL ON FUNCTION public.submit_form_assignment(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_form_assignment(uuid, jsonb) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. notifications — form_assignment_id + new types
-- ---------------------------------------------------------------------------
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS form_assignment_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint
    WHERE conname = 'notifications_form_assignment_id_fkey'
  ) THEN
    ALTER TABLE public.notifications
      ADD CONSTRAINT notifications_form_assignment_id_fkey
      FOREIGN KEY (form_assignment_id)
      REFERENCES public.form_assignments (id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS notifications_form_assignment_id_idx
  ON public.notifications (form_assignment_id)
  WHERE form_assignment_id IS NOT NULL;

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (
    type IN (
      'appointment_request',
      'appointment_cancelled_by_client',
      'appointment_approved',
      'appointment_declined',
      'form_assigned',
      'form_update_requested',
      'form_submitted'
    )
  );

-- Replace insert_notification with optional form_assignment_id (keeps 7-arg calls valid via DEFAULT).
DROP FUNCTION IF EXISTS public.insert_notification(uuid, text, text, text, uuid, uuid, uuid);

CREATE OR REPLACE FUNCTION public.insert_notification(
  p_recipient_profile_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_appointment_id uuid,
  p_business_id uuid,
  p_client_id uuid,
  p_form_assignment_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_id uuid := pg_catalog.gen_random_uuid();
BEGIN
  IF p_recipient_profile_id IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.notifications (
    id,
    recipient_profile_id,
    type,
    title,
    message,
    appointment_id,
    business_id,
    client_id,
    form_assignment_id
  ) VALUES (
    v_id,
    p_recipient_profile_id,
    p_type,
    p_title,
    p_message,
    p_appointment_id,
    p_business_id,
    p_client_id,
    p_form_assignment_id
  );

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.insert_notification(
  uuid, text, text, text, uuid, uuid, uuid, uuid
) FROM PUBLIC;

-- ---------------------------------------------------------------------------
-- 5. Triggers — form assignment / submission → notifications
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_form_assignments_create_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_form_title text;
  v_business_id uuid;
  v_client_user_id uuid;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    RETURN NEW;
  END IF;

  -- Client-initiated updates do not notify the client.
  IF NEW.assignment_kind = 'client_update' THEN
    RETURN NEW;
  END IF;

  SELECT f.title, f.business_id
  INTO v_form_title, v_business_id
  FROM public.forms AS f
  WHERE f.id = NEW.form_id;

  SELECT c.user_id
  INTO v_client_user_id
  FROM public.clients AS c
  WHERE c.id = NEW.client_id;

  IF v_client_user_id IS NULL OR v_form_title IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.assignment_kind = 'owner_update_request' THEN
    PERFORM public.insert_notification(
      v_client_user_id,
      'form_update_requested',
      'Form update requested',
      'Your practitioner requested an update to: ' || v_form_title,
      NULL,
      v_business_id,
      NEW.client_id,
      NEW.id
    );
  ELSE
    -- owner_assign (and any future initial kinds)
    PERFORM public.insert_notification(
      v_client_user_id,
      'form_assigned',
      'New form to complete',
      'New form to complete: ' || v_form_title,
      NULL,
      v_business_id,
      NEW.client_id,
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.trg_form_assignments_create_notifications() FROM PUBLIC;

DROP TRIGGER IF EXISTS form_assignments_create_notifications
  ON public.form_assignments;

CREATE TRIGGER form_assignments_create_notifications
  AFTER INSERT ON public.form_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_form_assignments_create_notifications();

CREATE OR REPLACE FUNCTION public.trg_form_submissions_notify_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_client_name text;
  v_form_title text;
  v_business_id uuid;
  v_owner_id uuid;
BEGIN
  SELECT c.full_name
  INTO v_client_name
  FROM public.clients AS c
  WHERE c.id = NEW.client_id;

  SELECT f.title, f.business_id, b.owner_id
  INTO v_form_title, v_business_id, v_owner_id
  FROM public.forms AS f
  INNER JOIN public.businesses AS b ON b.id = f.business_id
  WHERE f.id = NEW.form_id;

  IF v_owner_id IS NULL OR v_form_title IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM public.insert_notification(
    v_owner_id,
    'form_submitted',
    'Form submitted',
    COALESCE(v_client_name, 'A client') || ' submitted: ' || v_form_title,
    NULL,
    v_business_id,
    NEW.client_id,
    NEW.form_assignment_id
  );

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.trg_form_submissions_notify_owner() FROM PUBLIC;

DROP TRIGGER IF EXISTS form_submissions_notify_owner
  ON public.form_submissions;

CREATE TRIGGER form_submissions_notify_owner
  AFTER INSERT ON public.form_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_form_submissions_notify_owner();

-- Milestone 6 refinement: visit publication (draft/published) + atomic appointment completion
-- Apply manually in Supabase SQL Editor after review.
-- Does NOT auto-publish existing visits.

-- ---------------------------------------------------------------------------
-- 1. Publication timestamp on visits
-- ---------------------------------------------------------------------------
ALTER TABLE public.visits
  ADD COLUMN IF NOT EXISTS published_at timestamptz NULL;

COMMENT ON COLUMN public.visits.published_at IS
  'When the visit was published to the linked client. NULL = draft (business-only).';

-- Existing rows remain draft (NULL). No backfill.

CREATE INDEX IF NOT EXISTS visits_published_at_idx
  ON public.visits (published_at)
  WHERE published_at IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. Helper: visit is published (for recommendation RLS)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.visit_is_published(p_visit_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.visits AS v
    WHERE v.id = p_visit_id
      AND v.published_at IS NOT NULL
  );
$$;

REVOKE ALL ON FUNCTION public.visit_is_published(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.visit_is_published(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. Atomic: complete scheduled appointment + create visit (one transaction)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_appointment_with_visit(
  p_appointment_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_appointment public.appointments;
  v_visit_id uuid;
BEGIN
  IF p_appointment_id IS NULL THEN
    RAISE EXCEPTION 'invalid_input'
      USING ERRCODE = '22023';
  END IF;

  IF NOT public.is_business_owner() THEN
    RAISE EXCEPTION 'not_authorized'
      USING ERRCODE = '42501';
  END IF;

  SELECT a.*
  INTO v_appointment
  FROM public.appointments AS a
  WHERE a.id = p_appointment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'appointment_not_found'
      USING ERRCODE = 'P0002';
  END IF;

  IF NOT public.owns_business(v_appointment.business_id) THEN
    RAISE EXCEPTION 'not_authorized'
      USING ERRCODE = '42501';
  END IF;

  -- Idempotent: already completed — return existing visit or repair missing visit
  IF v_appointment.status = 'completed' THEN
    SELECT v.id
    INTO v_visit_id
    FROM public.visits AS v
    WHERE v.appointment_id = p_appointment_id;

    IF v_visit_id IS NOT NULL THEN
      RETURN v_visit_id;
    END IF;

    INSERT INTO public.visits (appointment_id, client_id)
    VALUES (p_appointment_id, v_appointment.client_id)
    RETURNING id INTO v_visit_id;

    RETURN v_visit_id;
  END IF;

  -- Only scheduled may transition to completed
  IF v_appointment.status <> 'scheduled' THEN
    RAISE EXCEPTION 'invalid_status'
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.appointments AS a
  SET status = 'completed'
  WHERE a.id = p_appointment_id
    AND a.status = 'scheduled';

  INSERT INTO public.visits (appointment_id, client_id)
  VALUES (p_appointment_id, v_appointment.client_id)
  ON CONFLICT (appointment_id) DO NOTHING
  RETURNING id INTO v_visit_id;

  IF v_visit_id IS NULL THEN
    SELECT v.id
    INTO v_visit_id
    FROM public.visits AS v
    WHERE v.appointment_id = p_appointment_id;
  END IF;

  IF v_visit_id IS NULL THEN
    RAISE EXCEPTION 'visit_create_failed'
      USING ERRCODE = 'P0003';
  END IF;

  RETURN v_visit_id;
END;
$$;

COMMENT ON FUNCTION public.complete_appointment_with_visit(uuid) IS
  'Business owner completes a scheduled appointment and creates exactly one draft visit atomically. Returns visit id. Idempotent when already completed.';

REVOKE ALL ON FUNCTION public.complete_appointment_with_visit(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_appointment_with_visit(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. client_visits — only published visits for linked clients
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.client_visits
WITH (security_invoker = false)
AS
SELECT
  v.id,
  v.appointment_id,
  v.client_id,
  v.summary,
  v.follow_up,
  v.created_at
FROM public.visits AS v
WHERE public.is_linked_client(v.client_id)
  AND v.published_at IS NOT NULL;

COMMENT ON VIEW public.client_visits IS
  'Client-safe visit projection. No professional_notes. Only published visits for linked clients. Owners use public.visits.';

REVOKE ALL ON public.client_visits FROM PUBLIC;
REVOKE ALL ON public.client_visits FROM anon;
REVOKE ALL ON public.client_visits FROM authenticated;
GRANT SELECT ON public.client_visits TO authenticated;

-- ---------------------------------------------------------------------------
-- 5. visit_recommendations — clients only see recommendations on published visits
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "visit_recommendations_select_linked_client"
  ON public.visit_recommendations;

CREATE POLICY "visit_recommendations_select_linked_client"
  ON public.visit_recommendations FOR SELECT
  TO authenticated
  USING (
    public.is_linked_client(client_id)
    AND public.visit_is_published(visit_id)
  );

-- Owner policies unchanged. Clients still have no INSERT/UPDATE/DELETE on recommendations.
-- visits_update_owner allows owner to set published_at (business-scoped UPDATE).

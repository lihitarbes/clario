-- Visit published notifications for linked clients.
-- Apply manually after 20260904180000_business_availability_specific_date.sql
-- Notify only on first transition to published; never on draft save, scope
-- change while published, unpublish, or republish after a prior visit_published.
--
-- insert_notification compatibility:
--   Prior migrations only REVOKE ALL … FROM PUBLIC (no GRANT to authenticated).
--   All call sites are SECURITY DEFINER triggers via PERFORM (7/8/9 args).
--   New trailing p_visit_id DEFAULT NULL keeps those signatures resolving.

-- ---------------------------------------------------------------------------
-- 1. notifications.visit_id
-- ---------------------------------------------------------------------------
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS visit_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint
    WHERE conname = 'notifications_visit_id_fkey'
  ) THEN
    ALTER TABLE public.notifications
      ADD CONSTRAINT notifications_visit_id_fkey
      FOREIGN KEY (visit_id)
      REFERENCES public.visits (id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS notifications_visit_id_idx
  ON public.notifications (visit_id)
  WHERE visit_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS notifications_recipient_visit_published_unread_idx
  ON public.notifications (recipient_profile_id, visit_id)
  WHERE type = 'visit_published' AND read_at IS NULL;

-- DB-level duplicate guard (complements trigger EXISTS check).
CREATE UNIQUE INDEX IF NOT EXISTS notifications_visit_published_unique_idx
  ON public.notifications (recipient_profile_id, visit_id)
  WHERE type = 'visit_published' AND visit_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. Expand type CHECK
-- ---------------------------------------------------------------------------
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
      'form_submitted',
      'purchase_requested',
      'purchase_confirmed',
      'purchase_completed',
      'purchase_cancelled',
      'visit_published'
    )
  );

-- ---------------------------------------------------------------------------
-- 3. insert_notification — optional visit_id (trailing DEFAULT)
-- ---------------------------------------------------------------------------
-- Drop the current 9-parameter overload from purchase notifications migration.
DROP FUNCTION IF EXISTS public.insert_notification(
  uuid, text, text, text, uuid, uuid, uuid, uuid, uuid
);

CREATE OR REPLACE FUNCTION public.insert_notification(
  p_recipient_profile_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_appointment_id uuid,
  p_business_id uuid,
  p_client_id uuid,
  p_form_assignment_id uuid DEFAULT NULL,
  p_purchase_id uuid DEFAULT NULL,
  p_visit_id uuid DEFAULT NULL
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
    form_assignment_id,
    purchase_id,
    visit_id
  ) VALUES (
    v_id,
    p_recipient_profile_id,
    p_type,
    p_title,
    p_message,
    p_appointment_id,
    p_business_id,
    p_client_id,
    p_form_assignment_id,
    p_purchase_id,
    p_visit_id
  );

  RETURN v_id;
END;
$$;

-- Match prior migrations: internal helper only (triggers / owner).
-- Do NOT GRANT EXECUTE to authenticated — insert_notification is not an app RPC.
REVOKE ALL ON FUNCTION public.insert_notification(
  uuid, text, text, text, uuid, uuid, uuid, uuid, uuid, uuid
) FROM PUBLIC;

-- ---------------------------------------------------------------------------
-- 4. Trigger — first publish only (NULL → non-NULL published_at)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_visits_notify_published()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_client_user_id uuid;
  v_business_id uuid;
  v_exists boolean;
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  -- Only first transition into published.
  IF OLD.published_at IS NOT NULL OR NEW.published_at IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT c.user_id, a.business_id
  INTO v_client_user_id, v_business_id
  FROM public.clients AS c
  INNER JOIN public.appointments AS a ON a.id = NEW.appointment_id
  WHERE c.id = NEW.client_id;

  IF v_client_user_id IS NULL OR v_business_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Duplicate guard: never notify twice for the same visit + recipient.
  SELECT EXISTS (
    SELECT 1
    FROM public.notifications AS n
    WHERE n.recipient_profile_id = v_client_user_id
      AND n.type = 'visit_published'
      AND n.visit_id = NEW.id
  )
  INTO v_exists;

  IF v_exists THEN
    RETURN NEW;
  END IF;

  PERFORM public.insert_notification(
    v_client_user_id,
    'visit_published',
    'New visit summary available',
    'New visit summary available',
    NEW.appointment_id,
    v_business_id,
    NEW.client_id,
    NULL,
    NULL,
    NEW.id
  );

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.trg_visits_notify_published() FROM PUBLIC;

DROP TRIGGER IF EXISTS visits_notify_published ON public.visits;

CREATE TRIGGER visits_notify_published
  AFTER UPDATE OF published_at ON public.visits
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_visits_notify_published();

COMMENT ON FUNCTION public.trg_visits_notify_published() IS
  'Notifies linked client on first visit publish only; skips draft saves, scope edits, unpublish, and republish when a visit_published row already exists.';

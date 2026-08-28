-- Milestone 5.3: in-app notifications (schema, RLS, appointment-triggered creation)
-- Apply manually in Supabase SQL Editor after reviewing.
-- Does NOT send email/SMS/push — database records only.

-- ---------------------------------------------------------------------------
-- 1. notifications table
-- ---------------------------------------------------------------------------
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  recipient_profile_id uuid NOT NULL
    REFERENCES public.profiles (id) ON DELETE CASCADE,
  type text NOT NULL
    CHECK (
      type IN (
        'appointment_request',
        'appointment_cancelled_by_client',
        'appointment_approved',
        'appointment_declined'
      )
    ),
  title text NOT NULL,
  message text NOT NULL,
  appointment_id uuid
    REFERENCES public.appointments (id) ON DELETE SET NULL,
  business_id uuid
    REFERENCES public.businesses (id) ON DELETE SET NULL,
  client_id uuid
    REFERENCES public.clients (id) ON DELETE SET NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT notifications_title_not_blank CHECK (pg_catalog.char_length(pg_catalog.btrim(title)) > 0),
  CONSTRAINT notifications_message_not_blank CHECK (pg_catalog.char_length(pg_catalog.btrim(message)) > 0)
);

CREATE INDEX notifications_recipient_created_idx
  ON public.notifications (recipient_profile_id, created_at DESC);

CREATE INDEX notifications_recipient_unread_idx
  ON public.notifications (recipient_profile_id)
  WHERE read_at IS NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 2. Internal insert helper (not callable by authenticated users)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.insert_notification(
  p_recipient_profile_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_appointment_id uuid,
  p_business_id uuid,
  p_client_id uuid
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
    client_id
  ) VALUES (
    v_id,
    p_recipient_profile_id,
    p_type,
    p_title,
    p_message,
    p_appointment_id,
    p_business_id,
    p_client_id
  );

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.insert_notification(
  uuid, text, text, text, uuid, uuid, uuid
) FROM PUBLIC;

-- ---------------------------------------------------------------------------
-- 3. Appointment status transitions → notifications (SECURITY DEFINER trigger)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_appointments_create_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_client_name text;
  v_business_name text;
  v_owner_id uuid;
  v_client_user_id uuid;
  v_time_label text;
BEGIN
  SELECT c.full_name, c.user_id
  INTO v_client_name, v_client_user_id
  FROM public.clients AS c
  WHERE c.id = NEW.client_id;

  SELECT b.name, b.owner_id
  INTO v_business_name, v_owner_id
  FROM public.businesses AS b
  WHERE b.id = NEW.business_id;

  v_time_label := pg_catalog.to_char(NEW.start_time AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI')
    || ' – '
    || pg_catalog.to_char(NEW.end_time AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI')
    || ' UTC';

  -- Client booked a pending request → notify business owner
  IF TG_OP = 'INSERT'
    AND NEW.status = 'pending'
    AND public.is_client_user()
    AND public.is_linked_client(NEW.client_id)
  THEN
    PERFORM public.insert_notification(
      v_owner_id,
      'appointment_request',
      'New appointment request',
      v_client_name || ' requested an appointment on '
        || v_time_label || ' at ' || v_business_name || '.',
      NEW.id,
      NEW.business_id,
      NEW.client_id
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Owner approved pending request → notify linked client (skip if unlinked)
    IF OLD.status = 'pending'
      AND NEW.status = 'scheduled'
      AND public.owns_business(NEW.business_id)
    THEN
      IF v_client_user_id IS NOT NULL THEN
        PERFORM public.insert_notification(
          v_client_user_id,
          'appointment_approved',
          'Appointment approved',
          'Your appointment request at ' || v_business_name
            || ' on ' || v_time_label || ' was approved.',
          NEW.id,
          NEW.business_id,
          NEW.client_id
        );
      END IF;
      RETURN NEW;
    END IF;

    -- Owner declined pending request → notify linked client (skip if unlinked)
    IF OLD.status = 'pending'
      AND NEW.status = 'cancelled'
      AND public.owns_business(NEW.business_id)
    THEN
      IF v_client_user_id IS NOT NULL THEN
        PERFORM public.insert_notification(
          v_client_user_id,
          'appointment_declined',
          'Appointment declined',
          'Your appointment request at ' || v_business_name
            || ' on ' || v_time_label || ' was declined.',
          NEW.id,
          NEW.business_id,
          NEW.client_id
        );
      END IF;
      RETURN NEW;
    END IF;

    -- Client cancelled pending or scheduled appointment → notify business owner
    IF OLD.status IN ('pending', 'scheduled')
      AND NEW.status = 'cancelled'
      AND public.is_client_user()
      AND public.is_linked_client(NEW.client_id)
    THEN
      PERFORM public.insert_notification(
        v_owner_id,
        'appointment_cancelled_by_client',
        'Appointment cancelled',
        v_client_name || ' cancelled their appointment on '
          || v_time_label || '.',
        NEW.id,
        NEW.business_id,
        NEW.client_id
      );
      RETURN NEW;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.trg_appointments_create_notifications() FROM PUBLIC;

CREATE TRIGGER appointments_create_notifications
  AFTER INSERT OR UPDATE OF status ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_appointments_create_notifications();

-- ---------------------------------------------------------------------------
-- 4. Restrict notification updates to marking read (trigger guard)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_notifications_mark_read_only()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.recipient_profile_id IS DISTINCT FROM OLD.recipient_profile_id
    OR NEW.type IS DISTINCT FROM OLD.type
    OR NEW.title IS DISTINCT FROM OLD.title
    OR NEW.message IS DISTINCT FROM OLD.message
    OR NEW.appointment_id IS DISTINCT FROM OLD.appointment_id
    OR NEW.business_id IS DISTINCT FROM OLD.business_id
    OR NEW.client_id IS DISTINCT FROM OLD.client_id
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'Only read_at may be updated on notifications.';
  END IF;

  IF OLD.read_at IS NOT NULL THEN
    RAISE EXCEPTION 'Notification is already read.';
  END IF;

  IF NEW.read_at IS NULL THEN
    RAISE EXCEPTION 'read_at must be set when marking a notification read.';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.trg_notifications_mark_read_only() FROM PUBLIC;

CREATE TRIGGER notifications_mark_read_only
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_notifications_mark_read_only();

-- ---------------------------------------------------------------------------
-- 5. RLS policies (SELECT own; UPDATE mark-read only — no INSERT for users)
-- ---------------------------------------------------------------------------
CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (recipient_profile_id = auth.uid());

CREATE POLICY "notifications_update_mark_read"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (
    recipient_profile_id = auth.uid()
    AND read_at IS NULL
  )
  WITH CHECK (recipient_profile_id = auth.uid());

-- No INSERT / DELETE policies for authenticated users.
-- Rows are created only by SECURITY DEFINER trigger functions.

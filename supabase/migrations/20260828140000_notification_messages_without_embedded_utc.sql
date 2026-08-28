-- Milestone 5.3 follow-up: stop embedding UTC appointment times in notification messages.
-- Appointment times are formatted in the application UI from appointment_id.
-- Apply manually in Supabase SQL Editor after reviewing.

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
BEGIN
  SELECT c.full_name, c.user_id
  INTO v_client_name, v_client_user_id
  FROM public.clients AS c
  WHERE c.id = NEW.client_id;

  SELECT b.name, b.owner_id
  INTO v_business_name, v_owner_id
  FROM public.businesses AS b
  WHERE b.id = NEW.business_id;

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
      v_client_name || ' requested an appointment at ' || v_business_name || '.',
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
          'Your appointment request at ' || v_business_name || ' was approved.',
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
          'Your appointment request at ' || v_business_name || ' was declined.',
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
        v_client_name || ' cancelled their appointment.',
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

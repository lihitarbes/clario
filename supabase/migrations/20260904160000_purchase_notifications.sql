-- Purchase notifications: types, purchase_id FK, triggers.
-- Apply manually after 20260904150000_product_images_storage_security_definer.sql
-- (or after the latest applied migration). Safe to rerun where noted.
--
-- Types added:
--   purchase_requested  — first purchase_item insert → owner
--   purchase_confirmed  — status → confirmed → client
--   purchase_completed  — status → completed → client
--   purchase_cancelled  — status → cancelled → other party

-- ---------------------------------------------------------------------------
-- 1. notifications.purchase_id
-- ---------------------------------------------------------------------------
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS purchase_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint
    WHERE conname = 'notifications_purchase_id_fkey'
  ) THEN
    ALTER TABLE public.notifications
      ADD CONSTRAINT notifications_purchase_id_fkey
      FOREIGN KEY (purchase_id)
      REFERENCES public.purchases (id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS notifications_purchase_id_idx
  ON public.notifications (purchase_id)
  WHERE purchase_id IS NOT NULL;

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
      'purchase_cancelled'
    )
  );

-- ---------------------------------------------------------------------------
-- 3. insert_notification — optional purchase_id
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.insert_notification(
  uuid, text, text, text, uuid, uuid, uuid, uuid
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
  p_purchase_id uuid DEFAULT NULL
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
    purchase_id
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
    p_purchase_id
  );

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.insert_notification(
  uuid, text, text, text, uuid, uuid, uuid, uuid, uuid
) FROM PUBLIC;

-- ---------------------------------------------------------------------------
-- 4. purchase_requested — statement-level trigger on purchase_items
--    Cart inserts all line items in one multi-row INSERT. A FOR EACH ROW
--    count(*)=1 check can miss that case (all rows visible → count > 1).
--    Statement trigger + NEW TABLE gives exactly one notify per purchase_id
--    in the statement, and never fires if no items were inserted.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_purchase_items_notify_requested()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_purchase_id uuid;
  v_purchase public.purchases%ROWTYPE;
  v_owner_id uuid;
  v_client_name text;
BEGIN
  FOR v_purchase_id IN
    SELECT DISTINCT nt.purchase_id
    FROM new_table AS nt
  LOOP
    SELECT *
    INTO v_purchase
    FROM public.purchases AS p
    WHERE p.id = v_purchase_id;

    IF NOT FOUND OR v_purchase.status <> 'pending' THEN
      CONTINUE;
    END IF;

    -- Idempotent: skip if a request notification already exists for this purchase.
    IF EXISTS (
      SELECT 1
      FROM public.notifications AS n
      WHERE n.purchase_id = v_purchase_id
        AND n.type = 'purchase_requested'
    ) THEN
      CONTINUE;
    END IF;

    SELECT b.owner_id
    INTO v_owner_id
    FROM public.businesses AS b
    WHERE b.id = v_purchase.business_id;

    SELECT c.full_name
    INTO v_client_name
    FROM public.clients AS c
    WHERE c.id = v_purchase.client_id;

    PERFORM public.insert_notification(
      v_owner_id,
      'purchase_requested',
      'New purchase request',
      'New purchase request from '
        || coalesce(nullif(btrim(v_client_name), ''), 'a client'),
      NULL,
      v_purchase.business_id,
      v_purchase.client_id,
      NULL,
      v_purchase.id
    );
  END LOOP;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.trg_purchase_items_notify_requested() FROM PUBLIC;

DROP TRIGGER IF EXISTS purchase_items_notify_requested ON public.purchase_items;

CREATE TRIGGER purchase_items_notify_requested
  AFTER INSERT ON public.purchase_items
  REFERENCING NEW TABLE AS new_table
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.trg_purchase_items_notify_requested();

-- ---------------------------------------------------------------------------
-- 5. Status transitions → confirm / complete / cancel notifications
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_purchases_status_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_owner_id uuid;
  v_client_user_id uuid;
  v_client_name text;
  v_actor uuid := auth.uid();
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  SELECT b.owner_id
  INTO v_owner_id
  FROM public.businesses AS b
  WHERE b.id = NEW.business_id;

  SELECT c.user_id, c.full_name
  INTO v_client_user_id, v_client_name
  FROM public.clients AS c
  WHERE c.id = NEW.client_id;

  IF NEW.status = 'confirmed' AND OLD.status = 'pending' THEN
    PERFORM public.insert_notification(
      v_client_user_id,
      'purchase_confirmed',
      'Purchase confirmed',
      'Your purchase request was confirmed',
      NULL,
      NEW.business_id,
      NEW.client_id,
      NULL,
      NEW.id
    );
    RETURN NEW;
  END IF;

  IF NEW.status = 'completed' AND OLD.status = 'confirmed' THEN
    PERFORM public.insert_notification(
      v_client_user_id,
      'purchase_completed',
      'Purchase completed',
      'Your purchase has been completed',
      NULL,
      NEW.business_id,
      NEW.client_id,
      NULL,
      NEW.id
    );
    RETURN NEW;
  END IF;

  IF NEW.status = 'cancelled' AND OLD.status IN ('pending', 'confirmed') THEN
    -- Skip orphan cleanup cancels (purchase created but items insert failed).
    IF NOT EXISTS (
      SELECT 1
      FROM public.purchase_items AS pi
      WHERE pi.purchase_id = NEW.id
    ) THEN
      RETURN NEW;
    END IF;

    IF v_actor IS NOT NULL AND v_actor = v_owner_id THEN
      PERFORM public.insert_notification(
        v_client_user_id,
        'purchase_cancelled',
        'Purchase cancelled',
        'Your purchase request was cancelled by the business',
        NULL,
        NEW.business_id,
        NEW.client_id,
        NULL,
        NEW.id
      );
    ELSIF v_actor IS NOT NULL AND v_client_user_id IS NOT NULL AND v_actor = v_client_user_id THEN
      PERFORM public.insert_notification(
        v_owner_id,
        'purchase_cancelled',
        'Purchase cancelled',
        'Purchase request cancelled by '
          || coalesce(nullif(btrim(v_client_name), ''), 'a client'),
        NULL,
        NEW.business_id,
        NEW.client_id,
        NULL,
        NEW.id
      );
    ELSE
      -- Fallback: notify the client (typical owner/system path).
      PERFORM public.insert_notification(
        v_client_user_id,
        'purchase_cancelled',
        'Purchase cancelled',
        'Your purchase request was cancelled',
        NULL,
        NEW.business_id,
        NEW.client_id,
        NULL,
        NEW.id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.trg_purchases_status_notifications() FROM PUBLIC;

DROP TRIGGER IF EXISTS purchases_status_notifications ON public.purchases;

CREATE TRIGGER purchases_status_notifications
  AFTER UPDATE OF status ON public.purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_purchases_status_notifications();

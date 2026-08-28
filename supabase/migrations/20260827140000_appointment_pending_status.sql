-- Milestone 5: appointment pending status, blocking index, tightened client RLS
-- Apply manually in Supabase SQL Editor after reviewing.

-- ---------------------------------------------------------------------------
-- 1. Allow status = 'pending'
-- ---------------------------------------------------------------------------
ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_status_check;

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_status_check
  CHECK (status IN ('pending', 'scheduled', 'completed', 'cancelled'));

-- ---------------------------------------------------------------------------
-- 2. Partial index for blocking statuses (pending + scheduled)
-- ---------------------------------------------------------------------------
DROP INDEX IF EXISTS public.appointments_business_scheduled_idx;

CREATE INDEX appointments_business_blocking_idx
  ON public.appointments (business_id, start_time)
  WHERE status IN ('pending', 'scheduled');

-- ---------------------------------------------------------------------------
-- 3. Helper: linked active client row must match the appointment business
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.linked_client_belongs_to_business(
  p_client_id uuid,
  p_business_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.clients c
    WHERE c.id = p_client_id
      AND c.business_id = p_business_id
      AND c.user_id = auth.uid()
      AND c.archived_at IS NULL
  );
$$;

REVOKE ALL ON FUNCTION public.linked_client_belongs_to_business(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.linked_client_belongs_to_business(uuid, uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. Tighten client INSERT: must be pending + matching client/business
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "appointments_insert_linked_client" ON public.appointments;

CREATE POLICY "appointments_insert_linked_client"
  ON public.appointments FOR INSERT
  TO authenticated
  WITH CHECK (
    status = 'pending'
    AND public.linked_client_belongs_to_business(client_id, business_id)
  );

-- ---------------------------------------------------------------------------
-- 5. Tighten client UPDATE: cancel only (pending/scheduled → cancelled)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "appointments_update_linked_client" ON public.appointments;

CREATE POLICY "appointments_update_linked_client_cancel"
  ON public.appointments FOR UPDATE
  TO authenticated
  USING (
    public.is_linked_client(client_id)
    AND status IN ('pending', 'scheduled')
  )
  WITH CHECK (
    public.is_linked_client(client_id)
    AND status = 'cancelled'
  );

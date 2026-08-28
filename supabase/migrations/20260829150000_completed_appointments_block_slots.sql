-- Appointment blocking index: include completed appointments
-- Completed visits represent time that was used; those slots must stay blocked.
-- Apply manually in Supabase SQL Editor after review.
-- Performance/consistency only — no overlap enforcement at DB layer.

DROP INDEX IF EXISTS public.appointments_business_blocking_idx;

CREATE INDEX appointments_business_blocking_idx
  ON public.appointments (business_id, start_time)
  WHERE status IN ('pending', 'scheduled', 'completed');

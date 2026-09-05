-- Purchase status `completed` + optional phone on profiles for client account contact.
-- Apply manually in Supabase SQL Editor. Safe to rerun.

-- ---------------------------------------------------------------------------
-- 1. purchases.status — add completed
-- ---------------------------------------------------------------------------
ALTER TABLE public.purchases
  DROP CONSTRAINT IF EXISTS purchases_status_check;

ALTER TABLE public.purchases
  ADD CONSTRAINT purchases_status_check
  CHECK (
    status IN (
      'pending',
      'confirmed',
      'completed',
      'cancelled'
    )
  );

COMMENT ON COLUMN public.purchases.status IS
  'pending = request submitted; confirmed = owner approved; completed = fulfilled; cancelled = final cancelled.';

-- ---------------------------------------------------------------------------
-- 2. profiles.phone — account-level contact (synced to linked clients in app)
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text;

COMMENT ON COLUMN public.profiles.phone IS
  'Optional client phone for WhatsApp/contact; synced to linked clients.phone on profile save.';

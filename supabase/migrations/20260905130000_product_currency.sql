-- Products: per-product display currency (ILS | USD). No conversion.
-- Apply manually after 20260905120000_documents_client_read_requires_published_visit.sql.
-- Safe to rerun (ADD COLUMN IF NOT EXISTS + drop/add check).
-- Existing rows receive default 'ILS'.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS currency text;

UPDATE public.products
SET currency = 'ILS'
WHERE currency IS NULL;

ALTER TABLE public.products
  ALTER COLUMN currency SET DEFAULT 'ILS';

ALTER TABLE public.products
  ALTER COLUMN currency SET NOT NULL;

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_currency_check;

ALTER TABLE public.products
  ADD CONSTRAINT products_currency_check
  CHECK (currency IN ('ILS', 'USD'));

COMMENT ON COLUMN public.products.currency IS
  'Display currency for the product price. Values: ILS, USD. No FX conversion.';

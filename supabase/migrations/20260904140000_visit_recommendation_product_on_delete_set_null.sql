-- Soft-preserve visit recommendations when a catalog product is removed.
-- Apply after 20260904130000_product_images_storage.sql if using images in the same session.
-- Safe to rerun.

DO $$
DECLARE
  v_constraint text;
BEGIN
  SELECT con.conname
  INTO v_constraint
  FROM pg_catalog.pg_constraint AS con
  INNER JOIN pg_catalog.pg_class AS rel ON rel.oid = con.conrelid
  INNER JOIN pg_catalog.pg_namespace AS nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = 'public'
    AND rel.relname = 'visit_recommendations'
    AND con.contype = 'f'
    AND pg_catalog.pg_get_constraintdef(con.oid) ILIKE '%product_id%';

  IF v_constraint IS NOT NULL THEN
    EXECUTE format(
      'ALTER TABLE public.visit_recommendations DROP CONSTRAINT %I',
      v_constraint
    );
  END IF;
END $$;

ALTER TABLE public.visit_recommendations
  ADD CONSTRAINT visit_recommendations_product_id_fkey
  FOREIGN KEY (product_id)
  REFERENCES public.products (id)
  ON DELETE SET NULL;

COMMENT ON CONSTRAINT visit_recommendations_product_id_fkey
  ON public.visit_recommendations IS
  'Catalog link is optional; deleting a product clears the link but keeps the recommendation text.';

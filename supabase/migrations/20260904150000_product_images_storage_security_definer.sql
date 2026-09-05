-- Fix product-images Storage INSERT/UPDATE: do not query public.products
-- under nested RLS from storage.objects policies.
-- Apply manually after 20260904130000_product_images_storage.sql.
--
-- Root cause: product_images_owner_insert / owner_update WITH CHECK used
-- EXISTS (SELECT … FROM public.products …). That subquery is evaluated under
-- products RLS in the Storage policy context and fails closed, producing
-- "new row violates row-level security policy" even when the owner just
-- created the product via PostgREST. Documents storage already avoids this
-- by using SECURITY DEFINER helpers only.
--
-- Fix: SECURITY DEFINER helpers that verify path ↔ product ↔ owned business
-- (and active product ↔ linked client for reads). Security is unchanged:
-- owners still only write images for products in their own business.

-- ---------------------------------------------------------------------------
-- 1. Helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.owner_can_write_product_image(object_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    object_name IS NOT NULL
    AND split_part(object_name, '/', 2) = 'products'
    AND split_part(object_name, '/', 4) <> ''
    AND public.storage_product_image_business_id(object_name) IS NOT NULL
    AND public.storage_product_image_product_id(object_name) IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.products AS p
      WHERE p.id = public.storage_product_image_product_id(object_name)
        AND p.business_id = public.storage_product_image_business_id(object_name)
        AND public.owns_business(p.business_id)
    );
$$;

COMMENT ON FUNCTION public.owner_can_write_product_image(text) IS
  'Storage helper: owner may write product-images object only when path matches an owned product.';

CREATE OR REPLACE FUNCTION public.client_can_read_product_image(object_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.products AS p
    WHERE p.id = public.storage_product_image_product_id(object_name)
      AND p.business_id = public.storage_product_image_business_id(object_name)
      AND p.is_active = true
      AND public.is_client_of_business(p.business_id)
  );
$$;

COMMENT ON FUNCTION public.client_can_read_product_image(text) IS
  'Storage helper: linked client may read product-images only for active products of their businesses.';

REVOKE ALL ON FUNCTION public.owner_can_write_product_image(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.client_can_read_product_image(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.owner_can_write_product_image(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.client_can_read_product_image(text) TO authenticated;

-- Ensure path helpers are executable by authenticated (Storage RLS).
GRANT EXECUTE ON FUNCTION public.storage_try_uuid(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.storage_product_image_business_id(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.storage_product_image_product_id(text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. Replace product-images policies that used raw products EXISTS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "product_images_owner_insert" ON storage.objects;
DROP POLICY IF EXISTS "product_images_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "product_images_client_select" ON storage.objects;

CREATE POLICY "product_images_owner_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND public.owner_can_write_product_image(name)
  );

CREATE POLICY "product_images_owner_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND public.owns_business(public.storage_product_image_business_id(name))
  )
  WITH CHECK (
    bucket_id = 'product-images'
    AND public.owner_can_write_product_image(name)
  );

CREATE POLICY "product_images_client_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND public.client_can_read_product_image(name)
  );

-- Owner SELECT / DELETE remain ownership-scoped on the business path segment
-- (unchanged; sufficient for INSERT … RETURNING and object removal).

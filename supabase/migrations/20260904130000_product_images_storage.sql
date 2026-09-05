-- Product images: storage path on products + dedicated private bucket.
-- Apply manually in Supabase SQL Editor. Safe to rerun where noted.
-- Path convention: {business_id}/products/{product_id}/{file_name}

-- ---------------------------------------------------------------------------
-- 1. products.image_path
-- ---------------------------------------------------------------------------
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS image_path text;

COMMENT ON COLUMN public.products.image_path IS
  'Supabase Storage object path in product-images bucket; NULL when no image.';

-- ---------------------------------------------------------------------------
-- 2. product-images bucket
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  false,
  5242880, -- 5 MB
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- 3. Path helpers (never raise on malformed UUID segments)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.storage_try_uuid(value text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF value IS NULL OR btrim(value) = '' THEN
    RETURN NULL;
  END IF;
  RETURN btrim(value)::uuid;
EXCEPTION
  WHEN invalid_text_representation THEN
    RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.storage_try_uuid(text) IS
  'Cast text to uuid for storage path parsing; returns NULL instead of raising on invalid input.';

CREATE OR REPLACE FUNCTION public.storage_product_image_business_id(object_name text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT public.storage_try_uuid(split_part(object_name, '/', 1));
$$;

CREATE OR REPLACE FUNCTION public.storage_product_image_product_id(object_name text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN split_part(object_name, '/', 2) = 'products'
    THEN public.storage_try_uuid(split_part(object_name, '/', 3))
    ELSE NULL
  END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Storage RLS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "product_images_owner_select" ON storage.objects;
DROP POLICY IF EXISTS "product_images_owner_insert" ON storage.objects;
DROP POLICY IF EXISTS "product_images_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "product_images_owner_delete" ON storage.objects;
DROP POLICY IF EXISTS "product_images_client_select" ON storage.objects;

CREATE POLICY "product_images_owner_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND public.owns_business(public.storage_product_image_business_id(name))
  );

CREATE POLICY "product_images_owner_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND public.owns_business(public.storage_product_image_business_id(name))
    AND public.storage_product_image_product_id(name) IS NOT NULL
    AND split_part(name, '/', 2) = 'products'
    AND split_part(name, '/', 4) <> ''
    AND EXISTS (
      SELECT 1
      FROM public.products AS p
      WHERE p.id = public.storage_product_image_product_id(name)
        AND p.business_id = public.storage_product_image_business_id(name)
    )
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
    AND public.owns_business(public.storage_product_image_business_id(name))
    AND public.storage_product_image_product_id(name) IS NOT NULL
    AND split_part(name, '/', 2) = 'products'
    AND split_part(name, '/', 4) <> ''
    AND EXISTS (
      SELECT 1
      FROM public.products AS p
      WHERE p.id = public.storage_product_image_product_id(name)
        AND p.business_id = public.storage_product_image_business_id(name)
    )
  );

CREATE POLICY "product_images_owner_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND public.owns_business(public.storage_product_image_business_id(name))
  );

-- Linked clients may read images for active products of their businesses
CREATE POLICY "product_images_client_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND public.is_client_of_business(public.storage_product_image_business_id(name))
    AND EXISTS (
      SELECT 1
      FROM public.products AS p
      WHERE p.id = public.storage_product_image_product_id(name)
        AND p.business_id = public.storage_product_image_business_id(name)
        AND p.is_active = true
    )
  );

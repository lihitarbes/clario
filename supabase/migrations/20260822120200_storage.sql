-- Clario Milestone 1: Supabase Storage bucket and policies for documents
-- Path convention: {business_id}/{client_id}/{document_id}/{file_name}

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  10485760, -- 10 MB per file (MVP limit)
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/plain'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Parse storage object path segments (1-indexed)
CREATE OR REPLACE FUNCTION public.storage_document_business_id(object_name text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(split_part(object_name, '/', 1), '')::uuid;
$$;

CREATE OR REPLACE FUNCTION public.storage_document_client_id(object_name text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(split_part(object_name, '/', 2), '')::uuid;
$$;

CREATE OR REPLACE FUNCTION public.storage_document_file_id(object_name text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(split_part(object_name, '/', 3), '')::uuid;
$$;

-- Business owner: read/write/delete files under their business folder
CREATE POLICY "documents_storage_owner_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND public.owns_business(public.storage_document_business_id(name))
  );

CREATE POLICY "documents_storage_owner_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND public.owns_business(public.storage_document_business_id(name))
    AND public.client_belongs_to_my_business(public.storage_document_client_id(name))
    AND public.storage_document_file_id(name) IS NOT NULL
    AND split_part(name, '/', 4) <> ''
  );

CREATE POLICY "documents_storage_owner_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND public.owns_business(public.storage_document_business_id(name))
  )
  WITH CHECK (
    bucket_id = 'documents'
    AND public.owns_business(public.storage_document_business_id(name))
  );

CREATE POLICY "documents_storage_owner_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND public.owns_business(public.storage_document_business_id(name))
  );

-- Linked client: read-only access to their own client folder
CREATE POLICY "documents_storage_client_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND public.is_linked_client(public.storage_document_client_id(name))
    AND public.is_client_of_business(public.storage_document_business_id(name))
  );

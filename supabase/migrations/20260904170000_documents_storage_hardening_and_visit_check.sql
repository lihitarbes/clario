-- Documents Storage hardening + visit/client consistency.
-- Apply manually after 20260904160000_purchase_notifications.sql.
-- Safe to rerun where noted.
--
-- 1) Path helpers: never raise on malformed UUID segments (reuse storage_try_uuid).
-- 2) SECURITY DEFINER write/read helpers for documents bucket (avoid nested RLS).
-- 3) Trigger: documents.visit_id must belong to the same client (and business).

-- ---------------------------------------------------------------------------
-- 1. Safe path helpers (replace unsafe ::uuid casts)
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

CREATE OR REPLACE FUNCTION public.storage_document_business_id(object_name text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT public.storage_try_uuid(split_part(object_name, '/', 1));
$$;

CREATE OR REPLACE FUNCTION public.storage_document_client_id(object_name text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT public.storage_try_uuid(split_part(object_name, '/', 2));
$$;

CREATE OR REPLACE FUNCTION public.storage_document_file_id(object_name text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT public.storage_try_uuid(split_part(object_name, '/', 3));
$$;

GRANT EXECUTE ON FUNCTION public.storage_try_uuid(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.storage_document_business_id(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.storage_document_client_id(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.storage_document_file_id(text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. SECURITY DEFINER helpers for documents Storage RLS
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.owner_can_write_document(object_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    object_name IS NOT NULL
    AND split_part(object_name, '/', 4) <> ''
    AND public.storage_document_business_id(object_name) IS NOT NULL
    AND public.storage_document_client_id(object_name) IS NOT NULL
    AND public.storage_document_file_id(object_name) IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.documents AS d
      INNER JOIN public.clients AS c ON c.id = d.client_id
      WHERE d.id = public.storage_document_file_id(object_name)
        AND d.client_id = public.storage_document_client_id(object_name)
        AND c.business_id = public.storage_document_business_id(object_name)
        AND d.file_path = object_name
        AND public.owns_business(c.business_id)
    );
$$;

COMMENT ON FUNCTION public.owner_can_write_document(text) IS
  'Storage helper: owner may write documents object only when path matches owned document metadata.';

CREATE OR REPLACE FUNCTION public.client_can_read_document(object_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.documents AS d
    INNER JOIN public.clients AS c ON c.id = d.client_id
    WHERE d.id = public.storage_document_file_id(object_name)
      AND d.client_id = public.storage_document_client_id(object_name)
      AND c.business_id = public.storage_document_business_id(object_name)
      AND d.file_path = object_name
      AND public.is_linked_client(d.client_id)
  );
$$;

COMMENT ON FUNCTION public.client_can_read_document(text) IS
  'Storage helper: linked client may read documents objects for their own document metadata.';

REVOKE ALL ON FUNCTION public.owner_can_write_document(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.client_can_read_document(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.owner_can_write_document(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.client_can_read_document(text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. Replace documents Storage policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "documents_storage_owner_select" ON storage.objects;
DROP POLICY IF EXISTS "documents_storage_owner_insert" ON storage.objects;
DROP POLICY IF EXISTS "documents_storage_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "documents_storage_owner_delete" ON storage.objects;
DROP POLICY IF EXISTS "documents_storage_client_select" ON storage.objects;

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
    AND public.owner_can_write_document(name)
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
    AND public.owner_can_write_document(name)
  );

CREATE POLICY "documents_storage_owner_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND public.owns_business(public.storage_document_business_id(name))
  );

CREATE POLICY "documents_storage_client_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND public.client_can_read_document(name)
  );

-- ---------------------------------------------------------------------------
-- 4. Visit must belong to the same client (and that client's business)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_documents_visit_matches_client()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_visit_client_id uuid;
  v_visit_business_id uuid;
  v_client_business_id uuid;
BEGIN
  IF NEW.visit_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT c.business_id
  INTO v_client_business_id
  FROM public.clients AS c
  WHERE c.id = NEW.client_id;

  IF v_client_business_id IS NULL THEN
    RAISE EXCEPTION 'Document client not found.';
  END IF;

  SELECT v.client_id, a.business_id
  INTO v_visit_client_id, v_visit_business_id
  FROM public.visits AS v
  INNER JOIN public.appointments AS a ON a.id = v.appointment_id
  WHERE v.id = NEW.visit_id;

  IF v_visit_client_id IS NULL THEN
    RAISE EXCEPTION 'Linked visit not found.';
  END IF;

  IF v_visit_client_id IS DISTINCT FROM NEW.client_id THEN
    RAISE EXCEPTION 'Linked visit must belong to the same client.';
  END IF;

  IF v_visit_business_id IS DISTINCT FROM v_client_business_id THEN
    RAISE EXCEPTION 'Linked visit must belong to the same business as the client.';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.trg_documents_visit_matches_client() FROM PUBLIC;

DROP TRIGGER IF EXISTS documents_visit_matches_client ON public.documents;

CREATE TRIGGER documents_visit_matches_client
  BEFORE INSERT OR UPDATE OF client_id, visit_id
  ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_documents_visit_matches_client();

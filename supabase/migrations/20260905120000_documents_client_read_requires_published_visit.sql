-- Documents: linked clients may read visit-linked files only when the visit is published.
-- Apply manually after 20260904190000_visit_published_notifications.sql.
-- Safe to rerun (DROP POLICY IF EXISTS + CREATE OR REPLACE FUNCTION).
--
-- Rule:
--   visit_id IS NULL  → general client document; still readable by linked client
--   visit_id IS NOT NULL → readable only if visit_is_published(visit_id)
-- publication_scope does NOT affect document access.
-- Owner SELECT/CRUD policies are unchanged.

-- ---------------------------------------------------------------------------
-- 1. documents table — client SELECT
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "documents_select_linked_client" ON public.documents;

CREATE POLICY "documents_select_linked_client"
  ON public.documents FOR SELECT
  TO authenticated
  USING (
    public.is_linked_client(client_id)
    AND (
      visit_id IS NULL
      OR public.visit_is_published(visit_id)
    )
  );

-- ---------------------------------------------------------------------------
-- 2. Storage helper — same rule for documents bucket client reads
--    (documents_storage_client_select already uses this helper)
-- ---------------------------------------------------------------------------
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
      AND (
        d.visit_id IS NULL
        OR public.visit_is_published(d.visit_id)
      )
  );
$$;

COMMENT ON FUNCTION public.client_can_read_document(text) IS
  'Storage helper: linked client may read own documents; visit-linked objects require a published visit.';

REVOKE ALL ON FUNCTION public.client_can_read_document(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.client_can_read_document(text) TO authenticated;

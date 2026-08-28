-- Milestone 6: visit client-safe access, visit_recommendations, RLS hardening
-- Apply manually in Supabase SQL Editor after reviewing.
-- Does NOT implement application UI — database layer only.

-- ---------------------------------------------------------------------------
-- 1. RLS helper functions (SECURITY DEFINER, hardened search_path)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.visit_belongs_to_my_business(p_visit_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.visits AS v
    INNER JOIN public.clients AS c ON c.id = v.client_id
    WHERE v.id = p_visit_id
      AND public.owns_business(c.business_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.visit_client_matches(
  p_visit_id uuid,
  p_client_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.visits AS v
    WHERE v.id = p_visit_id
      AND v.client_id = p_client_id
  );
$$;

CREATE OR REPLACE FUNCTION public.visit_appointment_completed(p_visit_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.visits AS v
    INNER JOIN public.appointments AS a ON a.id = v.appointment_id
    WHERE v.id = p_visit_id
      AND a.status = 'completed'
  );
$$;

CREATE OR REPLACE FUNCTION public.recommendation_product_in_client_business(
  p_product_id uuid,
  p_client_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.products AS p
    INNER JOIN public.clients AS c ON c.id = p_client_id
    WHERE p.id = p_product_id
      AND p.business_id = c.business_id
  );
$$;

REVOKE ALL ON FUNCTION public.visit_belongs_to_my_business(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.visit_client_matches(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.visit_appointment_completed(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.recommendation_product_in_client_business(uuid, uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.visit_belongs_to_my_business(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.visit_client_matches(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.visit_appointment_completed(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recommendation_product_in_client_business(uuid, uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. Visits — remove client direct SELECT; harden owner INSERT
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "visits_select_linked_client" ON public.visits;

DROP POLICY IF EXISTS "visits_insert_owner" ON public.visits;

CREATE POLICY "visits_insert_owner"
  ON public.visits FOR INSERT
  TO authenticated
  WITH CHECK (
    public.client_belongs_to_my_business(client_id)
    AND public.appointment_belongs_to_my_business(appointment_id)
    AND EXISTS (
      SELECT 1
      FROM public.appointments AS a
      WHERE a.id = appointment_id
        AND a.client_id = client_id
        AND a.status = 'completed'
        AND public.owns_business(a.business_id)
    )
  );

-- Owner SELECT/UPDATE/DELETE policies unchanged (full row including professional_notes).

-- ---------------------------------------------------------------------------
-- 3. Client-safe visits view (safe columns + row filter; security definer)
--
-- PostgreSQL views do not support table-style RLS policies in a way we can rely
-- on in Supabase. Do NOT use ALTER VIEW ENABLE ROW LEVEL SECURITY or CREATE
-- POLICY ON view here.
--
-- Design:
-- - Drop client SELECT on public.visits (section 2) so direct queries return no
--   rows and never expose professional_notes.
-- - client_visits is a security-definer view (security_invoker = false) that
--   projects only client-safe columns and filters rows with is_linked_client(),
--   which uses auth.uid() for the current session.
-- - Owners continue to query public.visits directly (visits_select_owner).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.client_visits
WITH (security_invoker = false)
AS
SELECT
  v.id,
  v.appointment_id,
  v.client_id,
  v.summary,
  v.follow_up,
  v.created_at
FROM public.visits AS v
WHERE public.is_linked_client(v.client_id);

COMMENT ON VIEW public.client_visits IS
  'Client-safe visit projection. No professional_notes. Rows filtered to linked clients via auth.uid(). Owners should use public.visits.';

REVOKE ALL ON public.client_visits FROM PUBLIC;
REVOKE ALL ON public.client_visits FROM anon;
REVOKE ALL ON public.client_visits FROM authenticated;
GRANT SELECT ON public.client_visits TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. Rename product_recommendations → visit_recommendations
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "recommendations_select_owner" ON public.product_recommendations;
DROP POLICY IF EXISTS "recommendations_select_linked_client" ON public.product_recommendations;
DROP POLICY IF EXISTS "recommendations_insert_owner" ON public.product_recommendations;
DROP POLICY IF EXISTS "recommendations_update_owner" ON public.product_recommendations;
DROP POLICY IF EXISTS "recommendations_delete_owner" ON public.product_recommendations;

ALTER TABLE public.product_recommendations
  RENAME TO visit_recommendations;

ALTER INDEX IF EXISTS product_recommendations_client_id_idx
  RENAME TO visit_recommendations_client_id_idx;

ALTER INDEX IF EXISTS product_recommendations_visit_id_idx
  RENAME TO visit_recommendations_visit_id_idx;

-- ---------------------------------------------------------------------------
-- 5. visit_recommendations columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.visit_recommendations
  RENAME COLUMN notes TO instructions;

-- Add nullable columns first so existing rows (if any) can be backfilled safely.
ALTER TABLE public.visit_recommendations
  ADD COLUMN category text,
  ADD COLUMN title text;

-- Legacy rows always had product_id (NOT NULL before this migration).
UPDATE public.visit_recommendations AS vr
SET
  category = COALESCE(vr.category, 'product'),
  title = COALESCE(
    vr.title,
    (
      SELECT p.name
      FROM public.products AS p
      WHERE p.id = vr.product_id
    ),
    'Recommendation'
  )
WHERE vr.category IS NULL
   OR vr.title IS NULL
   OR pg_catalog.btrim(vr.title) = '';

ALTER TABLE public.visit_recommendations
  ALTER COLUMN category SET NOT NULL,
  ALTER COLUMN title SET NOT NULL;

ALTER TABLE public.visit_recommendations
  ADD CONSTRAINT visit_recommendations_category_check
  CHECK (
    category IN ('product', 'medication', 'device', 'treatment', 'other')
  );

ALTER TABLE public.visit_recommendations
  ADD CONSTRAINT visit_recommendations_title_not_blank
  CHECK (pg_catalog.char_length(pg_catalog.btrim(title)) > 0);

ALTER TABLE public.visit_recommendations
  ALTER COLUMN product_id DROP NOT NULL;

-- Optional catalog link must reference a product in the client's business.
ALTER TABLE public.visit_recommendations
  ADD CONSTRAINT visit_recommendations_product_business_check
  CHECK (
    product_id IS NULL
    OR public.recommendation_product_in_client_business(product_id, client_id)
  );

-- ---------------------------------------------------------------------------
-- 6. visit_recommendations RLS (hardened)
-- ---------------------------------------------------------------------------
CREATE POLICY "visit_recommendations_select_owner"
  ON public.visit_recommendations FOR SELECT
  TO authenticated
  USING (public.client_belongs_to_my_business(client_id));

CREATE POLICY "visit_recommendations_select_linked_client"
  ON public.visit_recommendations FOR SELECT
  TO authenticated
  USING (public.is_linked_client(client_id));

CREATE POLICY "visit_recommendations_insert_owner"
  ON public.visit_recommendations FOR INSERT
  TO authenticated
  WITH CHECK (
    public.client_belongs_to_my_business(client_id)
    AND public.visit_belongs_to_my_business(visit_id)
    AND public.visit_client_matches(visit_id, client_id)
    AND public.visit_appointment_completed(visit_id)
    AND (
      product_id IS NULL
      OR public.recommendation_product_in_client_business(product_id, client_id)
    )
  );

CREATE POLICY "visit_recommendations_update_owner"
  ON public.visit_recommendations FOR UPDATE
  TO authenticated
  USING (
    public.client_belongs_to_my_business(client_id)
    AND public.visit_belongs_to_my_business(visit_id)
  )
  WITH CHECK (
    public.client_belongs_to_my_business(client_id)
    AND public.visit_belongs_to_my_business(visit_id)
    AND public.visit_client_matches(visit_id, client_id)
    AND public.visit_appointment_completed(visit_id)
    AND (
      product_id IS NULL
      OR public.recommendation_product_in_client_business(product_id, client_id)
    )
  );

CREATE POLICY "visit_recommendations_delete_owner"
  ON public.visit_recommendations FOR DELETE
  TO authenticated
  USING (
    public.client_belongs_to_my_business(client_id)
    AND public.visit_belongs_to_my_business(visit_id)
  );

-- No INSERT / UPDATE / DELETE policies for clients.

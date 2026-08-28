-- M6 refinement: publication scope (full vs recommendations only)
-- Apply manually in Supabase SQL Editor after review.
-- Safe to rerun if publication_scope already exists.

-- ---------------------------------------------------------------------------
-- 1. Publication scope on visits
-- ---------------------------------------------------------------------------
ALTER TABLE public.visits
  ADD COLUMN IF NOT EXISTS publication_scope text;

UPDATE public.visits AS v
SET publication_scope = 'full'
WHERE v.publication_scope IS NULL;

ALTER TABLE public.visits
  ALTER COLUMN publication_scope SET DEFAULT 'full';

ALTER TABLE public.visits
  ALTER COLUMN publication_scope SET NOT NULL;

ALTER TABLE public.visits
  DROP CONSTRAINT IF EXISTS visits_publication_scope_check;

ALTER TABLE public.visits
  ADD CONSTRAINT visits_publication_scope_check
  CHECK (publication_scope IN ('full', 'recommendations_only'));

COMMENT ON COLUMN public.visits.publication_scope IS
  'What the client sees when published_at IS NOT NULL: full (summary + follow_up + recommendations) or recommendations_only.';

-- Preserve current behavior for already-published visits.
UPDATE public.visits AS v
SET publication_scope = 'full'
WHERE v.published_at IS NOT NULL
  AND v.publication_scope <> 'full';

-- Draft visits remain unpublished; default scope 'full' for future publish.

-- ---------------------------------------------------------------------------
-- 2. client_visits — mask summary/follow_up by scope; expose scope for client UI
--
-- Column order must match the existing view (append new columns at the end):
-- id, appointment_id, client_id, summary, follow_up, created_at, publication_scope
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.client_visits
WITH (security_invoker = false)
AS
SELECT
  v.id,
  v.appointment_id,
  v.client_id,
  CASE
    WHEN v.publication_scope = 'full' THEN v.summary
    ELSE NULL
  END AS summary,
  CASE
    WHEN v.publication_scope = 'full' THEN v.follow_up
    ELSE NULL
  END AS follow_up,
  v.created_at,
  v.publication_scope
FROM public.visits AS v
WHERE public.is_linked_client(v.client_id)
  AND v.published_at IS NOT NULL;

COMMENT ON VIEW public.client_visits IS
  'Client-safe visit projection. No professional_notes. Published visits only; summary/follow_up masked when publication_scope = recommendations_only.';

REVOKE ALL ON public.client_visits FROM PUBLIC;
REVOKE ALL ON public.client_visits FROM anon;
REVOKE ALL ON public.client_visits FROM authenticated;
GRANT SELECT ON public.client_visits TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. visit_recommendations client SELECT — unchanged
-- visit_is_published() still means published_at IS NOT NULL.
-- Recommendations visible for BOTH full and recommendations_only.
-- ---------------------------------------------------------------------------

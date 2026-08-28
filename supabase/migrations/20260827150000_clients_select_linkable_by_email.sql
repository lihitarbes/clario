-- Milestone 5 fix: allow clients to SELECT unlinked rows they are eligible to claim.
-- PostgreSQL applies SELECT policies when evaluating UPDATE ... WHERE, so the
-- existing clients_link_by_email UPDATE policy alone cannot see matching rows.
-- Keep clients_link_by_email unchanged.

CREATE POLICY "clients_select_linkable_by_email"
  ON public.clients FOR SELECT
  TO authenticated
  USING (
    public.is_client_user()
    AND user_id IS NULL
    AND archived_at IS NULL
    AND lower(email) = (
      SELECT lower(p.email) FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

-- Milestone 2: allow clients to link unlinked client records that match their profile email.
-- A client may only set user_id to their own auth.uid() on rows where user_id IS NULL
-- and lower(email) matches their profile email.

CREATE POLICY "clients_link_by_email"
  ON public.clients FOR UPDATE
  TO authenticated
  USING (
    public.is_client_user()
    AND user_id IS NULL
    AND archived_at IS NULL
    AND lower(email) = (
      SELECT lower(p.email) FROM public.profiles p WHERE p.id = auth.uid()
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND archived_at IS NULL
  );

-- Clario Milestone 1: RLS helper functions and policies

-- ---------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER — used by RLS policies)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_business_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.businesses WHERE owner_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_business_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'business_owner'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_client_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'client'
  );
$$;

CREATE OR REPLACE FUNCTION public.owns_business(p_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = p_business_id AND b.owner_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.client_belongs_to_my_business(p_client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.clients c
    INNER JOIN public.businesses b ON b.id = c.business_id
    WHERE c.id = p_client_id AND b.owner_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_linked_client(p_client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = p_client_id AND c.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_client_of_business(p_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.business_id = p_business_id
      AND c.user_id = auth.uid()
      AND c.archived_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.appointment_belongs_to_my_business(p_appointment_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.id = p_appointment_id AND public.owns_business(a.business_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.form_belongs_to_my_business(p_form_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.forms f
    WHERE f.id = p_form_id AND public.owns_business(f.business_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.purchase_belongs_to_my_business(p_purchase_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.purchases p
    WHERE p.id = p_purchase_id AND public.owns_business(p.business_id)
  );
$$;

-- ---------------------------------------------------------------------------
-- Enable RLS on all application tables
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Insert handled by auth trigger (SECURITY DEFINER), not direct client insert

-- ---------------------------------------------------------------------------
-- businesses
-- ---------------------------------------------------------------------------
CREATE POLICY "businesses_select_owner"
  ON public.businesses FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "businesses_select_client_of"
  ON public.businesses FOR SELECT
  TO authenticated
  USING (public.is_client_of_business(id));

CREATE POLICY "businesses_insert_owner"
  ON public.businesses FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND public.is_business_owner()
    AND NOT EXISTS (SELECT 1 FROM public.businesses b WHERE b.owner_id = auth.uid())
  );

CREATE POLICY "businesses_update_owner"
  ON public.businesses FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- clients
-- ---------------------------------------------------------------------------
CREATE POLICY "clients_select_owner"
  ON public.clients FOR SELECT
  TO authenticated
  USING (public.client_belongs_to_my_business(id));

CREATE POLICY "clients_select_linked"
  ON public.clients FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "clients_insert_owner"
  ON public.clients FOR INSERT
  TO authenticated
  WITH CHECK (
    public.owns_business(business_id)
    AND public.is_business_owner()
  );

CREATE POLICY "clients_update_owner"
  ON public.clients FOR UPDATE
  TO authenticated
  USING (public.client_belongs_to_my_business(id))
  WITH CHECK (public.client_belongs_to_my_business(id));

CREATE POLICY "clients_update_linked_profile"
  ON public.clients FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- business_availability
-- ---------------------------------------------------------------------------
CREATE POLICY "availability_select_owner"
  ON public.business_availability FOR SELECT
  TO authenticated
  USING (public.owns_business(business_id));

CREATE POLICY "availability_select_client"
  ON public.business_availability FOR SELECT
  TO authenticated
  USING (public.is_client_of_business(business_id));

CREATE POLICY "availability_insert_owner"
  ON public.business_availability FOR INSERT
  TO authenticated
  WITH CHECK (public.owns_business(business_id));

CREATE POLICY "availability_update_owner"
  ON public.business_availability FOR UPDATE
  TO authenticated
  USING (public.owns_business(business_id))
  WITH CHECK (public.owns_business(business_id));

CREATE POLICY "availability_delete_owner"
  ON public.business_availability FOR DELETE
  TO authenticated
  USING (public.owns_business(business_id));

-- ---------------------------------------------------------------------------
-- appointments
-- ---------------------------------------------------------------------------
CREATE POLICY "appointments_select_owner"
  ON public.appointments FOR SELECT
  TO authenticated
  USING (public.owns_business(business_id));

CREATE POLICY "appointments_select_linked_client"
  ON public.appointments FOR SELECT
  TO authenticated
  USING (public.is_linked_client(client_id));

CREATE POLICY "appointments_insert_owner"
  ON public.appointments FOR INSERT
  TO authenticated
  WITH CHECK (
    public.owns_business(business_id)
    AND public.client_belongs_to_my_business(client_id)
  );

CREATE POLICY "appointments_insert_linked_client"
  ON public.appointments FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_linked_client(client_id)
    AND public.is_client_of_business(business_id)
  );

CREATE POLICY "appointments_update_owner"
  ON public.appointments FOR UPDATE
  TO authenticated
  USING (public.owns_business(business_id))
  WITH CHECK (public.owns_business(business_id));

CREATE POLICY "appointments_update_linked_client"
  ON public.appointments FOR UPDATE
  TO authenticated
  USING (public.is_linked_client(client_id))
  WITH CHECK (public.is_linked_client(client_id));

CREATE POLICY "appointments_delete_owner"
  ON public.appointments FOR DELETE
  TO authenticated
  USING (public.owns_business(business_id));

-- ---------------------------------------------------------------------------
-- visits
-- ---------------------------------------------------------------------------
CREATE POLICY "visits_select_owner"
  ON public.visits FOR SELECT
  TO authenticated
  USING (public.client_belongs_to_my_business(client_id));

CREATE POLICY "visits_select_linked_client"
  ON public.visits FOR SELECT
  TO authenticated
  USING (public.is_linked_client(client_id));

CREATE POLICY "visits_insert_owner"
  ON public.visits FOR INSERT
  TO authenticated
  WITH CHECK (
    public.client_belongs_to_my_business(client_id)
    AND public.appointment_belongs_to_my_business(appointment_id)
  );

CREATE POLICY "visits_update_owner"
  ON public.visits FOR UPDATE
  TO authenticated
  USING (public.client_belongs_to_my_business(client_id))
  WITH CHECK (public.client_belongs_to_my_business(client_id));

CREATE POLICY "visits_delete_owner"
  ON public.visits FOR DELETE
  TO authenticated
  USING (public.client_belongs_to_my_business(client_id));

-- ---------------------------------------------------------------------------
-- forms
-- ---------------------------------------------------------------------------
CREATE POLICY "forms_select_owner"
  ON public.forms FOR SELECT
  TO authenticated
  USING (public.owns_business(business_id));

CREATE POLICY "forms_select_assigned_client"
  ON public.forms FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.form_assignments fa
      INNER JOIN public.clients c ON c.id = fa.client_id
      WHERE fa.form_id = forms.id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "forms_insert_owner"
  ON public.forms FOR INSERT
  TO authenticated
  WITH CHECK (public.owns_business(business_id));

CREATE POLICY "forms_update_owner"
  ON public.forms FOR UPDATE
  TO authenticated
  USING (public.owns_business(business_id))
  WITH CHECK (public.owns_business(business_id));

CREATE POLICY "forms_delete_owner"
  ON public.forms FOR DELETE
  TO authenticated
  USING (public.owns_business(business_id));

-- ---------------------------------------------------------------------------
-- form_assignments
-- ---------------------------------------------------------------------------
CREATE POLICY "form_assignments_select_owner"
  ON public.form_assignments FOR SELECT
  TO authenticated
  USING (public.client_belongs_to_my_business(client_id));

CREATE POLICY "form_assignments_select_linked_client"
  ON public.form_assignments FOR SELECT
  TO authenticated
  USING (public.is_linked_client(client_id));

CREATE POLICY "form_assignments_insert_owner"
  ON public.form_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    public.client_belongs_to_my_business(client_id)
    AND public.form_belongs_to_my_business(form_id)
  );

CREATE POLICY "form_assignments_update_owner"
  ON public.form_assignments FOR UPDATE
  TO authenticated
  USING (public.client_belongs_to_my_business(client_id))
  WITH CHECK (public.client_belongs_to_my_business(client_id));

CREATE POLICY "form_assignments_update_linked_client_complete"
  ON public.form_assignments FOR UPDATE
  TO authenticated
  USING (public.is_linked_client(client_id) AND status = 'pending')
  WITH CHECK (public.is_linked_client(client_id));

-- ---------------------------------------------------------------------------
-- form_submissions
-- ---------------------------------------------------------------------------
CREATE POLICY "form_submissions_select_owner"
  ON public.form_submissions FOR SELECT
  TO authenticated
  USING (public.client_belongs_to_my_business(client_id));

CREATE POLICY "form_submissions_select_linked_client"
  ON public.form_submissions FOR SELECT
  TO authenticated
  USING (public.is_linked_client(client_id));

CREATE POLICY "form_submissions_insert_linked_client"
  ON public.form_submissions FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_linked_client(client_id)
    AND EXISTS (
      SELECT 1 FROM public.form_assignments fa
      WHERE fa.id = form_assignment_id
        AND fa.client_id = form_submissions.client_id
        AND fa.form_id = form_submissions.form_id
        AND fa.status = 'pending'
    )
  );

-- ---------------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------------
CREATE POLICY "products_select_owner"
  ON public.products FOR SELECT
  TO authenticated
  USING (public.owns_business(business_id));

CREATE POLICY "products_select_client"
  ON public.products FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND public.is_client_of_business(business_id)
  );

CREATE POLICY "products_insert_owner"
  ON public.products FOR INSERT
  TO authenticated
  WITH CHECK (public.owns_business(business_id));

CREATE POLICY "products_update_owner"
  ON public.products FOR UPDATE
  TO authenticated
  USING (public.owns_business(business_id))
  WITH CHECK (public.owns_business(business_id));

CREATE POLICY "products_delete_owner"
  ON public.products FOR DELETE
  TO authenticated
  USING (public.owns_business(business_id));

-- ---------------------------------------------------------------------------
-- product_recommendations
-- ---------------------------------------------------------------------------
CREATE POLICY "recommendations_select_owner"
  ON public.product_recommendations FOR SELECT
  TO authenticated
  USING (public.client_belongs_to_my_business(client_id));

CREATE POLICY "recommendations_select_linked_client"
  ON public.product_recommendations FOR SELECT
  TO authenticated
  USING (public.is_linked_client(client_id));

CREATE POLICY "recommendations_insert_owner"
  ON public.product_recommendations FOR INSERT
  TO authenticated
  WITH CHECK (public.client_belongs_to_my_business(client_id));

CREATE POLICY "recommendations_update_owner"
  ON public.product_recommendations FOR UPDATE
  TO authenticated
  USING (public.client_belongs_to_my_business(client_id))
  WITH CHECK (public.client_belongs_to_my_business(client_id));

CREATE POLICY "recommendations_delete_owner"
  ON public.product_recommendations FOR DELETE
  TO authenticated
  USING (public.client_belongs_to_my_business(client_id));

-- ---------------------------------------------------------------------------
-- purchases
-- ---------------------------------------------------------------------------
CREATE POLICY "purchases_select_owner"
  ON public.purchases FOR SELECT
  TO authenticated
  USING (public.owns_business(business_id));

CREATE POLICY "purchases_select_linked_client"
  ON public.purchases FOR SELECT
  TO authenticated
  USING (public.is_linked_client(client_id));

CREATE POLICY "purchases_insert_owner"
  ON public.purchases FOR INSERT
  TO authenticated
  WITH CHECK (
    public.owns_business(business_id)
    AND public.client_belongs_to_my_business(client_id)
  );

CREATE POLICY "purchases_insert_linked_client"
  ON public.purchases FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_linked_client(client_id)
    AND public.is_client_of_business(business_id)
  );

CREATE POLICY "purchases_update_owner"
  ON public.purchases FOR UPDATE
  TO authenticated
  USING (public.owns_business(business_id))
  WITH CHECK (public.owns_business(business_id));

CREATE POLICY "purchases_update_linked_client_cancel"
  ON public.purchases FOR UPDATE
  TO authenticated
  USING (public.is_linked_client(client_id) AND status = 'pending')
  WITH CHECK (public.is_linked_client(client_id));

-- ---------------------------------------------------------------------------
-- purchase_items
-- ---------------------------------------------------------------------------
CREATE POLICY "purchase_items_select_owner"
  ON public.purchase_items FOR SELECT
  TO authenticated
  USING (public.purchase_belongs_to_my_business(purchase_id));

CREATE POLICY "purchase_items_select_linked_client"
  ON public.purchase_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.purchases p
      WHERE p.id = purchase_id AND public.is_linked_client(p.client_id)
    )
  );

CREATE POLICY "purchase_items_insert_owner"
  ON public.purchase_items FOR INSERT
  TO authenticated
  WITH CHECK (public.purchase_belongs_to_my_business(purchase_id));

CREATE POLICY "purchase_items_insert_linked_client"
  ON public.purchase_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.purchases p
      WHERE p.id = purchase_id
        AND public.is_linked_client(p.client_id)
        AND p.status = 'pending'
    )
  );

CREATE POLICY "purchase_items_update_owner"
  ON public.purchase_items FOR UPDATE
  TO authenticated
  USING (public.purchase_belongs_to_my_business(purchase_id))
  WITH CHECK (public.purchase_belongs_to_my_business(purchase_id));

CREATE POLICY "purchase_items_delete_owner"
  ON public.purchase_items FOR DELETE
  TO authenticated
  USING (public.purchase_belongs_to_my_business(purchase_id));

-- ---------------------------------------------------------------------------
-- documents
-- ---------------------------------------------------------------------------
CREATE POLICY "documents_select_owner"
  ON public.documents FOR SELECT
  TO authenticated
  USING (public.client_belongs_to_my_business(client_id));

CREATE POLICY "documents_select_linked_client"
  ON public.documents FOR SELECT
  TO authenticated
  USING (public.is_linked_client(client_id));

CREATE POLICY "documents_insert_owner"
  ON public.documents FOR INSERT
  TO authenticated
  WITH CHECK (public.client_belongs_to_my_business(client_id));

CREATE POLICY "documents_update_owner"
  ON public.documents FOR UPDATE
  TO authenticated
  USING (public.client_belongs_to_my_business(client_id))
  WITH CHECK (public.client_belongs_to_my_business(client_id));

CREATE POLICY "documents_delete_owner"
  ON public.documents FOR DELETE
  TO authenticated
  USING (public.client_belongs_to_my_business(client_id));

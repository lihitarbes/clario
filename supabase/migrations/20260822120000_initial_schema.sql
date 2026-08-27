-- Clario Milestone 1: core schema (14 application tables)
-- Apply via Supabase SQL editor or: supabase db push / supabase migration up

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Profiles (linked to Supabase Auth)
-- ---------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('business_owner', 'client')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX profiles_role_idx ON public.profiles (role);
CREATE UNIQUE INDEX profiles_email_idx ON public.profiles (lower(email));

-- ---------------------------------------------------------------------------
-- Businesses (one per owner in MVP)
-- ---------------------------------------------------------------------------
CREATE TABLE public.businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL UNIQUE REFERENCES public.profiles (id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  phone text,
  email text,
  default_appointment_duration_minutes integer NOT NULL DEFAULT 60
    CHECK (default_appointment_duration_minutes > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX businesses_owner_id_idx ON public.businesses (owner_id);

-- ---------------------------------------------------------------------------
-- Clients
-- ---------------------------------------------------------------------------
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  notes text,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX clients_business_id_idx ON public.clients (business_id);
CREATE INDEX clients_user_id_idx ON public.clients (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX clients_archived_at_idx ON public.clients (business_id, archived_at);
CREATE INDEX clients_unlinked_email_idx ON public.clients (lower(email))
  WHERE user_id IS NULL AND archived_at IS NULL;

-- One active client email per business (archived clients excluded)
CREATE UNIQUE INDEX clients_business_active_email_unique
  ON public.clients (business_id, lower(email))
  WHERE archived_at IS NULL;

-- ---------------------------------------------------------------------------
-- Business availability (weekly recurring slots)
-- ---------------------------------------------------------------------------
CREATE TABLE public.business_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  CHECK (end_time > start_time)
);

CREATE INDEX business_availability_business_id_idx
  ON public.business_availability (business_id);

-- ---------------------------------------------------------------------------
-- Appointments
-- ---------------------------------------------------------------------------
CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients (id) ON DELETE RESTRICT,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);

CREATE INDEX appointments_business_start_idx
  ON public.appointments (business_id, start_time);

CREATE INDEX appointments_client_start_idx
  ON public.appointments (client_id, start_time);

CREATE INDEX appointments_business_scheduled_idx
  ON public.appointments (business_id, start_time)
  WHERE status = 'scheduled';

-- ---------------------------------------------------------------------------
-- Visits (one per appointment)
-- ---------------------------------------------------------------------------
CREATE TABLE public.visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL UNIQUE REFERENCES public.appointments (id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients (id) ON DELETE RESTRICT,
  summary text,
  professional_notes text,
  follow_up text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX visits_client_id_idx ON public.visits (client_id);

-- ---------------------------------------------------------------------------
-- Forms
-- ---------------------------------------------------------------------------
CREATE TABLE public.forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX forms_business_id_idx ON public.forms (business_id);

-- ---------------------------------------------------------------------------
-- Form assignments
-- ---------------------------------------------------------------------------
CREATE TABLE public.form_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES public.forms (id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed')),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX form_assignments_client_status_idx
  ON public.form_assignments (client_id, status);

CREATE INDEX form_assignments_form_id_idx
  ON public.form_assignments (form_id);

-- Only one pending assignment per form + client
CREATE UNIQUE INDEX form_assignments_one_pending_per_form_client
  ON public.form_assignments (form_id, client_id)
  WHERE status = 'pending';

-- ---------------------------------------------------------------------------
-- Form submissions
-- ---------------------------------------------------------------------------
CREATE TABLE public.form_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES public.forms (id) ON DELETE CASCADE,
  form_assignment_id uuid NOT NULL UNIQUE REFERENCES public.form_assignments (id) ON DELETE RESTRICT,
  client_id uuid NOT NULL REFERENCES public.clients (id) ON DELETE RESTRICT,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  submitted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX form_submissions_client_id_idx
  ON public.form_submissions (client_id);

CREATE INDEX form_submissions_form_id_idx
  ON public.form_submissions (form_id);

-- ---------------------------------------------------------------------------
-- Products
-- ---------------------------------------------------------------------------
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price numeric(10, 2) NOT NULL CHECK (price >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX products_business_id_idx ON public.products (business_id);

-- ---------------------------------------------------------------------------
-- Product recommendations
-- ---------------------------------------------------------------------------
CREATE TABLE public.product_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid NOT NULL REFERENCES public.visits (id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients (id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products (id) ON DELETE RESTRICT,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX product_recommendations_client_id_idx
  ON public.product_recommendations (client_id);

CREATE INDEX product_recommendations_visit_id_idx
  ON public.product_recommendations (visit_id);

-- ---------------------------------------------------------------------------
-- Purchases
-- ---------------------------------------------------------------------------
CREATE TABLE public.purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients (id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  total_amount numeric(10, 2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX purchases_business_id_idx ON public.purchases (business_id);
CREATE INDEX purchases_client_id_idx ON public.purchases (client_id);

-- ---------------------------------------------------------------------------
-- Purchase items
-- ---------------------------------------------------------------------------
CREATE TABLE public.purchase_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id uuid NOT NULL REFERENCES public.purchases (id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products (id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric(10, 2) NOT NULL CHECK (unit_price >= 0)
);

CREATE INDEX purchase_items_purchase_id_idx
  ON public.purchase_items (purchase_id);

-- ---------------------------------------------------------------------------
-- Documents (metadata; files live in Supabase Storage)
-- ---------------------------------------------------------------------------
CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients (id) ON DELETE CASCADE,
  visit_id uuid REFERENCES public.visits (id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('receipt', 'visit_summary', 'insurance', 'other')),
  file_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX documents_client_id_idx ON public.documents (client_id);
CREATE INDEX documents_visit_id_idx ON public.documents (visit_id)
  WHERE visit_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Auth trigger: create profile on signup
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested_role text;
  assigned_role text;
BEGIN
  requested_role := COALESCE(NEW.raw_user_meta_data ->> 'role', 'client');

  IF requested_role NOT IN ('business_owner', 'client') THEN
    assigned_role := 'client';
  ELSE
    assigned_role := requested_role;
  END IF;

  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(trim(NEW.raw_user_meta_data ->> 'full_name'), ''), split_part(NEW.email, '@', 1)),
    lower(trim(NEW.email)),
    assigned_role
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO authenticated;

-- Supabase Schema Initialization for Viam
-- File: frontend/supabase/migrations/20260526_init_supabase_schema.sql

-- Enable uuid-ossp extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create Roles Enum if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE app_role AS ENUM ('user', 'local_admin', 'master_admin');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_status') THEN
    CREATE TYPE event_status AS ENUM ('draft', 'pending_review', 'approved', 'changes_requested', 'rejected', 'archived');
  END IF;
END $$;

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  email text,
  avatar_url text,
  home_city text,
  home_state text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. User Roles Table
CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  assigned_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Districts Table
CREATE TABLE IF NOT EXISTS public.districts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  city text,
  state text,
  country text DEFAULT 'United States',
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. Admin District Assignments Table
CREATE TABLE IF NOT EXISTS public.admin_district_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  district_id uuid NOT NULL REFERENCES public.districts(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, district_id)
);

-- 5. Saved Mass Locations Table
CREATE TABLE IF NOT EXISTS public.saved_mass_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mass_location_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, mass_location_id)
);

-- 6. Saved Events Table
CREATE TABLE IF NOT EXISTS public.saved_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, event_id)
);

-- 7. Events Table
CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  district_id uuid REFERENCES public.districts(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  category text NOT NULL,
  start_datetime timestamptz NOT NULL,
  end_datetime timestamptz,
  location_name text,
  address text NOT NULL,
  city text,
  state text,
  country text DEFAULT 'United States',
  latitude numeric,
  longitude numeric,
  host_name text,
  host_type text,
  audience text,
  external_url text,
  external_rsvp_url text,
  source_type text DEFAULT 'manual',
  related_church_id text,
  image_url text,
  status event_status NOT NULL DEFAULT 'pending_review',
  review_notes text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  is_demo_data boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security (RLS) on all public tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_district_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_mass_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

--------------------------------------------------------------------------------
-- SECURE ROLE & SCOPE HELPER FUNCTIONS (SECURITY DEFINER to bypass RLS loops)
--------------------------------------------------------------------------------

-- Helper to check if a user is a Master Admin
CREATE OR REPLACE FUNCTION public.is_master_admin(user_id uuid)
RETURNS boolean SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = $1 AND role = 'master_admin'
  );
END;
$$ LANGUAGE plpgsql;

-- Helper to check if a user is a Local Admin for a specific district
CREATE OR REPLACE FUNCTION public.is_district_admin(user_id uuid, district_id uuid)
RETURNS boolean SECURITY DEFINER AS $$
BEGIN
  -- Master Admin has absolute permissions
  IF public.is_master_admin($1) THEN
    RETURN true;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM public.admin_district_assignments
    WHERE admin_district_assignments.user_id = $1 AND admin_district_assignments.district_id = $2
  );
END;
$$ LANGUAGE plpgsql;

-- Helper to check if user has any administrative role
CREATE OR REPLACE FUNCTION public.is_any_admin(user_id uuid)
RETURNS boolean SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = $1 AND role IN ('local_admin', 'master_admin')
  );
END;
$$ LANGUAGE plpgsql;

--------------------------------------------------------------------------------
-- ROW LEVEL SECURITY POLICIES
--------------------------------------------------------------------------------

-- A. Profiles Policies
CREATE POLICY "Profiles are readable by everyone" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- B. User Roles Policies
CREATE POLICY "Users can read their own role" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id OR public.is_master_admin(auth.uid()));

CREATE POLICY "Only Master Admins can edit roles" ON public.user_roles
  FOR ALL USING (public.is_master_admin(auth.uid()));

-- C. Saved Mass Locations Policies
CREATE POLICY "Users can manage their own saved masses" ON public.saved_mass_locations
  FOR ALL USING (auth.uid() = user_id);

-- D. Saved Events Policies
CREATE POLICY "Users can manage their own saved events" ON public.saved_events
  FOR ALL USING (auth.uid() = user_id);

-- E. Districts Policies
CREATE POLICY "Districts are readable by everyone" ON public.districts
  FOR SELECT USING (true);

CREATE POLICY "Only Master Admins can manage districts" ON public.districts
  FOR ALL USING (public.is_master_admin(auth.uid()));

-- F. Admin District Assignments Policies
CREATE POLICY "Admins can view district assignments" ON public.admin_district_assignments
  FOR SELECT USING (auth.uid() = user_id OR public.is_master_admin(auth.uid()));

CREATE POLICY "Only Master Admins can assign districts" ON public.admin_district_assignments
  FOR ALL USING (public.is_master_admin(auth.uid()));

-- G. Events Policies
CREATE POLICY "Approved events are readable by everyone" ON public.events
  FOR SELECT USING (
    (status = 'approved' AND is_demo_data = false) OR 
    (auth.uid() IS NOT NULL AND auth.uid() = submitted_by) OR 
    (auth.uid() IS NOT NULL AND public.is_master_admin(auth.uid())) OR
    (auth.uid() IS NOT NULL AND district_id IS NOT NULL AND public.is_district_admin(auth.uid(), district_id))
  );

CREATE POLICY "Authenticated users can submit events" ON public.events
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND 
    auth.uid() = submitted_by
  );

CREATE POLICY "Users can edit drafts or items requesting changes" ON public.events
  FOR UPDATE USING (
    auth.uid() = submitted_by AND 
    (status = 'draft'::event_status OR status = 'changes_requested'::event_status)
  );

CREATE POLICY "Admins can moderate events in assigned districts" ON public.events
  FOR UPDATE USING (
    public.is_master_admin(auth.uid()) OR
    (district_id IS NOT NULL AND public.is_district_admin(auth.uid(), district_id))
  );

CREATE POLICY "Only submitters or Master Admins can delete events" ON public.events
  FOR DELETE USING (
    auth.uid() = submitted_by OR 
    public.is_master_admin(auth.uid())
  );

--------------------------------------------------------------------------------
-- AUTOMATED TRIGGERS FOR USER SIGNUP
--------------------------------------------------------------------------------

-- Trigger Function to create default Profile and Role upon signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Create Profile
  INSERT INTO public.profiles (id, display_name, email, created_at, updated_at)
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1), 'User'),
    new.email,
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;

  -- Create Default Role
  INSERT INTO public.user_roles (user_id, role, created_at, updated_at)
  VALUES (new.id, 'user'::app_role, now(), now())
  ON CONFLICT (user_id) DO NOTHING;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind Trigger to auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

--------------------------------------------------------------------------------
-- BOOTSTRAP INITIAL MASTER ADMIN WORKFLOW
--------------------------------------------------------------------------------
-- Execute this block in the Supabase SQL editor to bootstrap your user:
--
-- INSERT INTO public.user_roles (user_id, role)
-- SELECT id, 'master_admin'::app_role FROM auth.users
-- WHERE email = 'masteradmin@viam.com'
-- ON CONFLICT (user_id) DO UPDATE SET role = 'master_admin'::app_role;
--------------------------------------------------------------------------------

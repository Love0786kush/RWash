-- ====================================================================
-- SUPABASE AUTH & USERS SYNC DEFINITIVE PRODUCTION UPGRADE
-- Fixes:
--   1. profiles table (Nullable email to prevent phone OTP collision)
--   2. Unique constraints on customers (user_id and profile_id)
--   3. Unified public.users VIEW
--   4. Universal handle_new_user() trigger for Google, Phone, and Email
--   5. Backfill script for existing auth.users
--   6. RLS security policies for users, profiles, and customers
-- ====================================================================

-- ── 1. PROFILES TABLE SCHEMA ENHANCEMENT ────────────────────────────
-- Ensure profiles table exists
CREATE TABLE IF NOT EXISTS public.profiles (
  id              UUID         PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name       TEXT         NOT NULL DEFAULT '',
  email           TEXT,
  phone_number    TEXT,
  avatar_url      TEXT,
  address         TEXT,
  city            TEXT,
  role            TEXT         NOT NULL DEFAULT 'Customer'
                               CHECK (role IN ('Admin', 'Customer', 'Worker')),
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Allow email to be NULL in profiles (prevents phone users from colliding on '')
ALTER TABLE public.profiles ALTER COLUMN email DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN email DROP DEFAULT;

-- Ensure address, city, and avatar_url exist on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Drop legacy unique constraints on profiles.email that broke phone sign-ins
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_email_unique;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_email_key;
DROP INDEX IF EXISTS public.profiles_email_uq;
DROP INDEX IF EXISTS public.idx_profiles_email_unique;

-- Re-create partial unique index for email: only applies when email is not null and not empty
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email_unique
  ON public.profiles(email)
  WHERE email IS NOT NULL AND email <> '';

-- Partial unique index for phone_number: only applies when phone is not null and not empty
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_phone_unique
  ON public.profiles(phone_number)
  WHERE phone_number IS NOT NULL AND phone_number <> '';


-- ── 2. CUSTOMERS TABLE SCHEMA ENHANCEMENT ───────────────────────────
CREATE TABLE IF NOT EXISTS public.customers (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID         REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_id         UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
  name            TEXT         NOT NULL DEFAULT 'Customer',
  email           TEXT,
  phone           TEXT,
  avatar_url      TEXT,
  address         TEXT,
  city            TEXT,
  status          TEXT         NOT NULL DEFAULT 'Active'
                               CHECK (status IN ('Active', 'Inactive', 'Suspended')),
  total_bookings  INTEGER      NOT NULL DEFAULT 0,
  total_spent     NUMERIC(12,2)NOT NULL DEFAULT 0,
  loyalty_points  INTEGER      NOT NULL DEFAULT 0,
  referred_by     UUID         REFERENCES public.customers(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Ensure columns exist
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Active';

-- Add UNIQUE constraints to customers.user_id and customers.profile_id
-- This allows ON CONFLICT (user_id) DO UPDATE to work seamlessly in frontend and backend!
DO $$
BEGIN
  -- First clean up any duplicate customer user_id rows if present (keep latest)
  DELETE FROM public.customers c1
  WHERE c1.user_id IS NOT NULL
    AND c1.id NOT IN (
      SELECT id FROM (
        SELECT DISTINCT ON (user_id) id
        FROM public.customers
        WHERE user_id IS NOT NULL
        ORDER BY user_id, updated_at DESC, created_at DESC
      ) t
    );

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'customers_user_id_uq'
  ) THEN
    ALTER TABLE public.customers ADD CONSTRAINT customers_user_id_uq UNIQUE (user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'customers_profile_id_uq'
  ) THEN
    ALTER TABLE public.customers ADD CONSTRAINT customers_profile_id_uq UNIQUE (profile_id);
  END IF;
END $$;


-- ── 3. UNIFIED USERS VIEW (PUBLIC.USERS) ────────────────────────────
-- Provides a clean single view of all users for Supabase Dashboard & queries
CREATE OR REPLACE VIEW public.users AS
SELECT
  p.id,
  COALESCE(NULLIF(p.full_name, ''), c.name, 'Customer') AS name,
  COALESCE(NULLIF(p.email, ''), c.email) AS email,
  COALESCE(NULLIF(p.phone_number, ''), c.phone) AS phone,
  COALESCE(p.avatar_url, c.avatar_url) AS avatar_url,
  COALESCE(p.address, c.address) AS address,
  COALESCE(p.city, c.city) AS city,
  p.role,
  c.id AS customer_id,
  COALESCE(c.status, 'Active') AS customer_status,
  c.total_bookings,
  c.total_spent,
  c.loyalty_points,
  p.created_at,
  p.updated_at
FROM public.profiles p
LEFT JOIN public.customers c ON (c.user_id = p.id OR c.profile_id = p.id);


-- ── 4. BULLETPROOF TRIGGER FOR GOOGLE, PHONE & EMAIL SIGNUPS ─────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_full_name TEXT;
  v_avatar_url TEXT;
  v_phone TEXT;
  v_email TEXT;
  v_cust_id UUID;
BEGIN
  -- 1. Extract Full Name safely from all providers
  -- Google OAuth supplies 'name' or 'full_name'
  -- Email/Password supplies 'full_name' in raw_user_meta_data
  v_full_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'user_name'), ''),
    CASE
      WHEN NEW.email IS NOT NULL AND NEW.email <> '' THEN split_part(NEW.email, '@', 1)
      ELSE ''
    END
  );

  -- 2. Extract Avatar URL
  -- Google OAuth supplies 'picture' or 'avatar_url'
  v_avatar_url := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'avatar_url'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'picture'), ''),
    NULL
  );

  -- 3. Extract Phone (Phone OTP supplies NEW.phone e.g. +91XXXXXXXXXX)
  v_phone := COALESCE(
    NULLIF(TRIM(NEW.phone), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'phone'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'phone_number'), ''),
    NULL
  );

  -- 4. Extract Email (NULL if empty string to avoid unique constraint collisions)
  v_email := NULLIF(TRIM(COALESCE(NEW.email, NEW.raw_user_meta_data->>'email', '')), '');

  -- 5. Upsert into public.profiles
  INSERT INTO public.profiles (
    id,
    full_name,
    email,
    phone_number,
    avatar_url,
    role
  )
  VALUES (
    NEW.id,
    v_full_name,
    v_email,
    v_phone,
    v_avatar_url,
    'Customer'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = CASE
      WHEN public.profiles.full_name = '' OR public.profiles.full_name IS NULL
      THEN EXCLUDED.full_name
      ELSE public.profiles.full_name
    END,
    email = COALESCE(public.profiles.email, EXCLUDED.email),
    phone_number = COALESCE(public.profiles.phone_number, EXCLUDED.phone_number),
    avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url),
    updated_at = now();

  -- 6. Upsert into public.customers
  INSERT INTO public.customers (
    profile_id,
    user_id,
    name,
    email,
    phone,
    avatar_url,
    status
  )
  VALUES (
    NEW.id,
    NEW.id,
    CASE WHEN v_full_name <> '' THEN v_full_name ELSE 'Customer' END,
    v_email,
    v_phone,
    v_avatar_url,
    'Active'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    name = CASE
      WHEN public.customers.name = '' OR public.customers.name = 'Customer'
      THEN EXCLUDED.name
      ELSE public.customers.name
    END,
    email = COALESCE(public.customers.email, EXCLUDED.email),
    phone = COALESCE(public.customers.phone, EXCLUDED.phone),
    avatar_url = COALESCE(public.customers.avatar_url, EXCLUDED.avatar_url),
    profile_id = EXCLUDED.profile_id,
    updated_at = now();

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Prevent auth failures if any trigger issue occurs, but log the error
  RAISE WARNING 'handle_new_user error for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-bind trigger to fire on INSERT and UPDATE of auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ── 5. BACKFILL EXISTING AUTH USERS INTO PROFILES & CUSTOMERS ───────
-- Link user_id in customers if profile_id was already present
UPDATE public.customers
SET user_id = profile_id
WHERE user_id IS NULL AND profile_id IS NOT NULL;

DO $$
DECLARE
  r RECORD;
  v_name TEXT;
  v_avatar TEXT;
  v_phone TEXT;
  v_email TEXT;
BEGIN
  FOR r IN SELECT * FROM auth.users LOOP
    v_name := COALESCE(
      NULLIF(TRIM(r.raw_user_meta_data->>'full_name'), ''),
      NULLIF(TRIM(r.raw_user_meta_data->>'name'), ''),
      NULLIF(TRIM(r.raw_user_meta_data->>'user_name'), ''),
      CASE WHEN r.email IS NOT NULL AND r.email <> '' THEN split_part(r.email, '@', 1) ELSE 'Customer' END
    );
    v_avatar := COALESCE(
      NULLIF(TRIM(r.raw_user_meta_data->>'avatar_url'), ''),
      NULLIF(TRIM(r.raw_user_meta_data->>'picture'), ''),
      NULL
    );
    v_phone := COALESCE(
      NULLIF(TRIM(r.phone), ''),
      NULLIF(TRIM(r.raw_user_meta_data->>'phone'), ''),
      NULL
    );
    v_email := NULLIF(TRIM(COALESCE(r.email, r.raw_user_meta_data->>'email', '')), '');

    -- Ensure in profiles
    INSERT INTO public.profiles (id, full_name, email, phone_number, avatar_url, role)
    VALUES (r.id, v_name, v_email, v_phone, v_avatar, 'Customer')
    ON CONFLICT (id) DO UPDATE SET
      full_name = CASE WHEN public.profiles.full_name = '' OR public.profiles.full_name IS NULL THEN EXCLUDED.full_name ELSE public.profiles.full_name END,
      email = COALESCE(public.profiles.email, EXCLUDED.email),
      phone_number = COALESCE(public.profiles.phone_number, EXCLUDED.phone_number),
      avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url);

    -- Ensure in customers
    INSERT INTO public.customers (profile_id, user_id, name, email, phone, avatar_url, status)
    VALUES (r.id, r.id, v_name, v_email, v_phone, v_avatar, 'Active')
    ON CONFLICT (user_id) DO UPDATE SET
      name = CASE WHEN public.customers.name = '' OR public.customers.name = 'Customer' THEN EXCLUDED.name ELSE public.customers.name END,
      email = COALESCE(public.customers.email, EXCLUDED.email),
      phone = COALESCE(public.customers.phone, EXCLUDED.phone),
      avatar_url = COALESCE(public.customers.avatar_url, EXCLUDED.avatar_url),
      profile_id = EXCLUDED.profile_id;
  END LOOP;
END $$;


-- ── 6. HELPER FUNCTION & RLS SECURITY POLICIES ───────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'Admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- Profiles: Authenticated users can read and update their own profile; Admins full access
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_admin())
  WITH CHECK (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid() OR public.is_admin());

-- Customers: Authenticated users can read, insert and update their own customer record
DROP POLICY IF EXISTS "customers_select_own" ON public.customers;
CREATE POLICY "customers_select_own" ON public.customers
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR profile_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "customers_update_own" ON public.customers;
CREATE POLICY "customers_update_own" ON public.customers
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR profile_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR profile_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "customers_insert_own" ON public.customers;
CREATE POLICY "customers_insert_own" ON public.customers
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR profile_id = auth.uid() OR public.is_admin());

-- Vehicles: Authenticated users can manage vehicles linked to their customer_id
DROP POLICY IF EXISTS "vehicles_customer_manage" ON public.vehicles;
CREATE POLICY "vehicles_customer_manage" ON public.vehicles
  FOR ALL TO authenticated
  USING (
    customer_id IN (
      SELECT id FROM public.customers WHERE user_id = auth.uid() OR profile_id = auth.uid()
    ) OR public.is_admin()
  )
  WITH CHECK (
    customer_id IN (
      SELECT id FROM public.customers WHERE user_id = auth.uid() OR profile_id = auth.uid()
    ) OR public.is_admin()
  );


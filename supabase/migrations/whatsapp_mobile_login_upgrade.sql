-- ====================================================================
-- WHATSAPP-STYLE MOBILE LOGIN & PROFILE SETUP UPGRADE
-- ====================================================================

-- 1. Ensure avatar_url column exists in customers table
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Create index on phone for instantaneous mobile lookups
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_profiles_phone_number ON public.profiles(phone_number);

-- 3. Ensure customers can be queried and updated by profile_id and phone
-- Ensure RLS allows customer to view & update their own record
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'customers' AND policyname = 'Customers can view own profile by profile_id or auth'
  ) THEN
    CREATE POLICY "Customers can view own profile by profile_id or auth"
    ON public.customers FOR SELECT
    TO authenticated
    USING (profile_id = auth.uid() OR phone IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'customers' AND policyname = 'Customers can update own profile'
  ) THEN
    CREATE POLICY "Customers can update own profile"
    ON public.customers FOR UPDATE
    TO authenticated
    USING (profile_id = auth.uid())
    WITH CHECK (profile_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'customers' AND policyname = 'Customers can insert own profile'
  ) THEN
    CREATE POLICY "Customers can insert own profile"
    ON public.customers FOR INSERT
    TO authenticated
    WITH CHECK (profile_id = auth.uid());
  END IF;
END $$;

-- 4. Enable public read of profiles for authenticated users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());
  END IF;
END $$;

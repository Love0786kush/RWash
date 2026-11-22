ailed to run sql query: ERROR:  42883: function public.get_customer_id() does not exist
HINT:  No function matches the given name and argument types. You might need to add explicit type castsailed to run sql query: ERROR:  42883: function public.get_customer_id() does not exist
HINT:  No function matches the given name and argument types. You might need to add explicit type casts-- ===============================================================
-- MIGRATION 006: Database Integrity Fixes & Indexes (Part 1/3)
-- ===============================================================
-- Title    : FK constraints (NOT VALID first), profiles.email UNIQUE,
--            profiles.role CHECK
-- Rollback : Included at end of file
-- ===============================================================

-- ────────────────────────────────────────────────────────────────
-- PART 1: profiles.email UNIQUE (allows NULL)
-- ────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_email_unique UNIQUE (email);

-- ────────────────────────────────────────────────────────────────
-- PART 2: profiles.role CHECK constraint
-- ────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_role_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_role_check CHECK (role IN ('Admin', 'Customer', 'Worker'));
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────────
-- PART 3: customers.profile_id FK (NOT VALID first)
-- ────────────────────────────────────────────────────────────────
ALTER TABLE public.customers
  ADD CONSTRAINT customers_profile_id_fk
  FOREIGN KEY (profile_id) REFERENCES public.profiles(id)
  ON DELETE SET NULL NOT VALID;

-- Check for orphan rows (run this in production before VALIDATE):
-- SELECT count(*) FROM public.customers c
--   LEFT JOIN public.profiles p ON p.id = c.profile_id
--   WHERE p.id IS NULL AND c.profile_id IS NOT NULL;

-- ALTER TABLE public.customers VALIDATE CONSTRAINT customers_profile_id_fk;

-- ────────────────────────────────────────────────────────────────
-- PART 4: customers.user_id FK (NOT VALID first)
-- ────────────────────────────────────────────────────────────────
ALTER TABLE public.customers
  ADD CONSTRAINT customers_user_id_fk
  FOREIGN KEY (user_id) REFERENCES auth.users(id)
  ON DELETE SET NULL NOT VALID;

-- ALTER TABLE public.customers VALIDATE CONSTRAINT customers_user_id_fk;

-- ────────────────────────────────────────────────────────────────
-- PART 5: bookings.customer_id FK (NOT VALID first)
-- ────────────────────────────────────────────────────────────────
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_customer_id_fk
  FOREIGN KEY (customer_id) REFERENCES public.customers(id)
  ON DELETE SET NULL NOT VALID;

-- ALTER TABLE public.bookings VALIDATE CONSTRAINT bookings_customer_id_fk;

-- ────────────────────────────────────────────────────────────────
-- PART 6: bookings.service_id FK (NOT VALID first)
-- ===============================================================
-- MIGRATION 006: Database Integrity Fixes & Indexes (Part 2/3)
-- ===============================================================
-- Title    : Missing indexes for performance
-- Rollback : Included at end of file
-- ===============================================================

-- ────────────────────────────────────────────────────────────────
-- PART 8: Missing indexes
-- ────────────────────────────────────────────────────────────────

-- customers.phone — critical for phone OTP / mobile lookups
CREATE INDEX IF NOT EXISTS idx_customers_phone_phone_not_null
  ON public.customers(phone) WHERE phone IS NOT NULL;

-- bookings lookup indexes
CREATE INDEX IF NOT EXISTS idx_bookings_booking_date
  ON public.bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_time
  ON public.bookings(booking_time);
CREATE INDEX IF NOT EXISTS idx_bookings_service_id
  ON public.bookings(service_id);

-- subscriptions lookup indexes (expiry checks)
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer_id
  ON public.subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id
  ON public.subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_end_date
  ON public.subscriptions(end_date);

-- reviews customer_id index
CREATE INDEX IF NOT EXISTS idx_reviews_customer_id
  ON public.reviews(customer_id);

-- profiles phone_number index (mobile login)
CREATE INDEX IF NOT EXISTS idx_profiles_phone_number
  ON public.profiles(phone_number) WHERE phone_number IS NOT NULL;

-- ────────────────────────────────────────────────────────────────
-- PART 9: Indexes for customer status and phone lookup
-- ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_customers_phone_status
  ON public.customers(phone, status) WHERE phone IS NOT NULL;

-- ===============================================================
-- ROLLBACK SCRIPTS (Part 2 of 3)
-- ===============================================================
-- Drop indexes in reverse order of creation

DROP INDEX IF EXISTS idx_customers_phone_status;
DROP INDEX IF EXISTS idx_profiles_phone_number;
DROP INDEX IF EXISTS idx_reviews_customer_id;
DROP INDEX IF EXISTS idx_subscriptions_end_date;
DROP INDEX IF EXISTS idx_subscriptions_plan_id;
DROP INDEX IF EXISTS idx_subscriptions_customer_id;
DROP INDEX IF EXISTS idx_bookings_service_id;
DROP INDEX IF EXISTS idx_bookings_booking_time;
DROP INDEX IF EXISTS idx_bookings_booking_date;
DROP INDEX IF EXISTS idx_customers_phone_phone_not_null;

-- ── END OF MIGRATION PART 2 ──────────────────────────────────────

-- ────────────────────────────────────────────────────────────────
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_service_id_fk
  FOREIGN KEY (service_id) REFERENCES public.services(id)
  ON DELETE SET NULL NOT VALID;

-- ALTER TABLE public.bookings VALIDATE CONSTRAINT bookings_service_id_fk;

-- ────────────────────────────────────────────────────────────────
-- PART 7: vehicles.customer_id FK (NOT VALID first)
-- ────────────────────────────────────────────────────────────────
ALTER TABLE public.vehicles
  ADD CONSTRAINT vehicles_customer_id_fk
  FOREIGN KEY (customer_id) REFERENCES public.customers(id)
  ON DELETE CASCADE NOT VALID;

-- ALTER TABLE public.vehicles VALIDATE CONSTRAINT vehicles_customer_id_fk;

-- ===============================================================
-- ROLLBACK SCRIPTS (Part 1 of 3)
-- ===============================================================
-- These are the reverse of the CREATE statements above.
-- Run after the migration has been applied and validated.
-- ===============================================================
-- MIGRATION 006: Database Integrity Fixes & Indexes (Part 3/3)
-- ===============================================================
-- Title    : Additional indexes and consolidated rollback script
-- Rollback : Included at end of file
-- ===============================================================

-- ────────────────────────────────────────────────────────────────
-- PART 10: Index for booking lookups (created_at ordering)
-- ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_bookings_created_idx
  ON public.bookings(created_at DESC);

-- ────────────────────────────────────────────────────────────────
-- PART 11: Index for workers (empty value filter)
-- ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_bookings_worker_idx
  ON public.bookings(worker_id) WHERE worker_id IS NOT NULL;

-- ===============================================================
-- COMPLETE ROLLBACK SCRIPT (Merge of all 3 parts)
-- ===============================================================
-- This is the complete rollback script for the entire migration 006.
-- Run this AFTER the migration has been applied and validated.
-- ===============================================================

-- Step 1: Drop all indexes (in reverse order of creation)
DROP INDEX IF EXISTS idx_bookings_created_idx;
DROP INDEX IF EXISTS idx_bookings_worker_idx;
DROP INDEX IF EXISTS idx_customers_phone_status;
DROP INDEX IF EXISTS idx_profiles_phone_number;
DROP INDEX IF EXISTS idx_reviews_customer_id;
DROP INDEX IF EXISTS idx_subscriptions_end_date;
DROP INDEX IF EXISTS idx_subscriptions_plan_id;
DROP INDEX IF EXISTS idx_subscriptions_customer_id;
DROP INDEX IF EXISTS idx_bookings_service_id;
DROP INDEX IF EXISTS idx_bookings_booking_time;
DROP INDEX IF EXISTS idx_bookings_booking_date;
DROP INDEX IF EXISTS idx_customers_phone_phone_not_null;

-- Step 2: Drop foreign keys (reverse order of creation)
ALTER TABLE public.vehicles DROP CONSTRAINT IF EXISTS vehicles_customer_id_fk;
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_service_id_fk,
                                      DROP CONSTRAINT IF EXISTS bookings_customer_id_fk;
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_user_id_fk,
                                  DROP CONSTRAINT IF EXISTS customers_profile_id_fk;

-- Step 3: Drop CHECK constraint on profiles.role
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Step 4: Drop UNIQUE constraint on profiles.email
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_email_unique;

-- ── END OF MIGRATION 006 ─────────────────────────────────────────

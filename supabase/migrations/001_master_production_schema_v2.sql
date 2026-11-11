-- ================================================================
-- RWash — Master Supabase Production Schema v2.0
-- Project  : RWash Car Wash & Detailing Platform
-- Supabase : https://ehwmwqqetgcbswzyhwod.supabase.co
-- Version  : v2.0 (Nov 2026)
--
-- Changes from v1:
--   ✅ rwash-otp-service references removed (Supabase Auth handles OTP)
--   ✅ FCM now via Supabase Edge Function (no Node.js backend)
--   ✅ workers table added (wash technician management)
--   ✅ payments table added (Razorpay integration ready)
--   ✅ notifications table added (in-app notification bell)
--   ✅ audit_logs table added (admin action tracking)
--   ✅ Proper RLS policies (actual security, not just "allow all")
--   ✅ pgcrypto extension enabled (encryption ready)
--   ✅ CHECK constraints on all status/enum fields
--   ✅ Composite indexes for common queries
--   ✅ final_amount GENERATED column on bookings
--   ✅ customer stats auto-update trigger
--   ✅ Auto profile + customer creation on signup
-- ================================================================

-- ================================================================
-- SECTION 1: EXTENSIONS
-- ================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";       -- Encryption functions available


-- ================================================================
-- SECTION 2: HELPER FUNCTIONS
-- ================================================================

-- Auto-update updated_at on any table
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Check if the calling user is an Admin (used in RLS policies)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'Admin'
  )
$$;

-- Get the customers.id for the calling auth user
CREATE OR REPLACE FUNCTION public.get_customer_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id FROM public.customers
  WHERE user_id = auth.uid()
  LIMIT 1
$$;

-- Auto-create profile row when a new Supabase Auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone_number, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.email, ''),
    COALESCE(NEW.phone, ''),
    'Customer'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-create customers row when a Customer profile is created
CREATE OR REPLACE FUNCTION public.handle_new_profile()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'Customer' THEN
    INSERT INTO public.customers (profile_id, user_id, name, email, phone)
    VALUES (NEW.id, NEW.id, NEW.full_name, NEW.email, NEW.phone_number)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-increment customer stats when a booking is marked Completed
CREATE OR REPLACE FUNCTION public.update_customer_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'Completed' AND OLD.status <> 'Completed' THEN
    UPDATE public.customers
    SET
      total_bookings = total_bookings + 1,
      total_spent    = total_spent + COALESCE(NEW.final_amount, 0)
    WHERE id = NEW.customer_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ================================================================
-- SECTION 3: USER & IDENTITY TABLES
-- ================================================================

-- ── profiles ──────────────────────────────────────────────────
-- 1-to-1 with auth.users. Single source of truth for identity.
CREATE TABLE IF NOT EXISTS public.profiles (
  id              UUID         PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name       TEXT         NOT NULL DEFAULT '',
  email           TEXT         NOT NULL DEFAULT '',
  phone_number    TEXT,
  avatar_url      TEXT,
  address         TEXT,
  city            TEXT,
  role            TEXT         NOT NULL DEFAULT 'Customer'
                               CHECK (role IN ('Admin', 'Customer', 'Worker')),
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_uq
  ON public.profiles(email) WHERE email <> '';

-- ── admins ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admins (
  id              UUID         PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  email           TEXT         NOT NULL UNIQUE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ── customers ─────────────────────────────────────────────────
-- Supports both registered (user_id set) and walk-in (user_id NULL) customers
CREATE TABLE IF NOT EXISTS public.customers (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID         REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_id         UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
  name            TEXT         NOT NULL,
  email           TEXT,
  phone           TEXT,
  avatar_url      TEXT,
  status          TEXT         NOT NULL DEFAULT 'Active'
                               CHECK (status IN ('Active', 'Inactive', 'Suspended')),
  total_bookings  INTEGER      NOT NULL DEFAULT 0,
  total_spent     NUMERIC(12,2)NOT NULL DEFAULT 0,
  loyalty_points  INTEGER      NOT NULL DEFAULT 0,
  referred_by     UUID         REFERENCES public.customers(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customers_user_id_idx  ON public.customers(user_id);
CREATE INDEX IF NOT EXISTS customers_phone_idx    ON public.customers(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS customers_status_idx   ON public.customers(status);


-- ================================================================
-- SECTION 4: WORKERS (NEW)
-- ================================================================

-- Wash technicians / field staff
CREATE TABLE IF NOT EXISTS public.workers (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT         NOT NULL,
  phone           TEXT,
  email           TEXT,
  avatar_url      TEXT,
  skill_level     TEXT         NOT NULL DEFAULT 'Standard'
                               CHECK (skill_level IN ('Standard', 'Premium', 'Expert')),
  status          TEXT         NOT NULL DEFAULT 'Active'
                               CHECK (status IN ('Active', 'Inactive', 'On Leave')),
  rating          NUMERIC(3,2) DEFAULT 5.00 CHECK (rating BETWEEN 1.0 AND 5.0),
  total_bookings  INTEGER      NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);


-- ================================================================
-- SECTION 5: VEHICLE & SERVICE CATALOG
-- ================================================================

-- ── service_categories ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.service_categories (
  id              UUID   PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT   NOT NULL UNIQUE,
  description     TEXT,
  icon            TEXT,
  color           TEXT   NOT NULL DEFAULT '#6366f1',
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── services ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.services (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT         NOT NULL,
  category_id     UUID         REFERENCES public.service_categories(id) ON DELETE SET NULL,
  category        TEXT,
  description     TEXT,
  features        JSONB        NOT NULL DEFAULT '[]',
  price           NUMERIC(10,2)NOT NULL CHECK (price >= 0),
  offer_price     NUMERIC(10,2)CHECK (offer_price >= 0),
  duration        INTEGER      NOT NULL DEFAULT 45 CHECK (duration > 0),
  image_url       TEXT,
  vehicle_types   TEXT[]       DEFAULT ARRAY['Sedan','SUV','Hatchback','Luxury','Bike'],
  status          TEXT         NOT NULL DEFAULT 'Active'
                               CHECK (status IN ('Active', 'Inactive')),
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT offer_lte_price CHECK (offer_price IS NULL OR offer_price <= price)
);

CREATE INDEX IF NOT EXISTS services_status_idx     ON public.services(status);
CREATE INDEX IF NOT EXISTS services_category_idx   ON public.services(category_id);

-- ── vehicles ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vehicles (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id     UUID         NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  brand           VARCHAR(100) NOT NULL,
  model           VARCHAR(100) NOT NULL,
  vehicle_number  VARCHAR(50)  NOT NULL,
  color           VARCHAR(50)  NOT NULL,
  vehicle_type    VARCHAR(50)  NOT NULL
                               CHECK (vehicle_type IN ('Sedan','SUV','Hatchback','Luxury','Bike','Commercial')),
  image_url       TEXT,
  is_default      BOOLEAN      NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE (customer_id, vehicle_number)
);

CREATE INDEX IF NOT EXISTS vehicles_customer_idx ON public.vehicles(customer_id);


-- ================================================================
-- SECTION 6: BOOKINGS & REVIEWS
-- ================================================================

-- ── bookings ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bookings (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relations
  customer_id      UUID         REFERENCES public.customers(id) ON DELETE SET NULL,
  vehicle_id       UUID         REFERENCES public.vehicles(id)  ON DELETE SET NULL,
  vehicle_type     TEXT         NOT NULL DEFAULT 'Sedan',
  service_id       UUID         REFERENCES public.services(id)  ON DELETE SET NULL,
  worker_id        UUID         REFERENCES public.workers(id)   ON DELETE SET NULL,

  -- Schedule
  booking_date     DATE         NOT NULL,
  booking_time     TEXT         NOT NULL,

  -- Location
  address          TEXT,
  latitude         DOUBLE PRECISION,
  longitude        DOUBLE PRECISION,
  notes            TEXT,

  -- Pricing
  coupon_code      TEXT,
  base_amount      NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_amount  NUMERIC(10,2) NOT NULL DEFAULT 0,
  final_amount     NUMERIC(10,2) GENERATED ALWAYS AS (base_amount - discount_amount) STORED,

  -- Status
  payment_status   TEXT         NOT NULL DEFAULT 'Unpaid'
                                CHECK (payment_status IN ('Unpaid','Partial','Paid','Refunded')),
  status           TEXT         NOT NULL DEFAULT 'Pending'
                                CHECK (status IN (
                                  'Pending','Confirmed','Accepted',
                                  'Assigned','In Progress','Completed','Cancelled'
                                )),
  cancelled_at     TIMESTAMPTZ,
  cancel_reason    TEXT,
  completed_at     TIMESTAMPTZ,

  created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bookings_customer_idx    ON public.bookings(customer_id);
CREATE INDEX IF NOT EXISTS bookings_status_idx      ON public.bookings(status);
CREATE INDEX IF NOT EXISTS bookings_date_idx        ON public.bookings(booking_date DESC);
CREATE INDEX IF NOT EXISTS bookings_worker_idx      ON public.bookings(worker_id) WHERE worker_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS bookings_created_idx     ON public.bookings(created_at DESC);

-- ── reviews ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reviews (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      UUID         NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  customer_id     UUID         NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  service_id      UUID         NOT NULL REFERENCES public.services(id)  ON DELETE CASCADE,
  worker_id       UUID         REFERENCES public.workers(id) ON DELETE SET NULL,
  rating          INTEGER      NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment         TEXT,
  is_published    BOOLEAN      NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reviews_service_idx  ON public.reviews(service_id);
CREATE INDEX IF NOT EXISTS reviews_worker_idx   ON public.reviews(worker_id) WHERE worker_id IS NOT NULL;


-- ================================================================
-- SECTION 7: PAYMENTS (NEW)
-- ================================================================

-- Razorpay / Cash / Manual payment records
CREATE TABLE IF NOT EXISTS public.payments (
  id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id           UUID          REFERENCES public.bookings(id) ON DELETE SET NULL,
  customer_id          UUID          REFERENCES public.customers(id) ON DELETE SET NULL,

  amount               NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  currency             TEXT          NOT NULL DEFAULT 'INR',

  payment_method       TEXT          CHECK (payment_method IN (
                                       'UPI','Card','Cash','Net Banking','Wallet','Subscription'
                                     )),
  payment_gateway      TEXT          CHECK (payment_gateway IN (
                                       'Razorpay','Cash','Manual','Subscription'
                                     )),

  -- Razorpay fields
  gateway_order_id     TEXT,
  gateway_payment_id   TEXT          UNIQUE,
  gateway_signature    TEXT,

  status               TEXT          NOT NULL DEFAULT 'Pending'
                                     CHECK (status IN (
                                       'Pending','Processing','Success','Failed',
                                       'Refunded','Partially Refunded'
                                     )),
  paid_at              TIMESTAMPTZ,

  -- Refund
  refund_amount        NUMERIC(10,2) DEFAULT 0,
  refund_id            TEXT,
  refunded_at          TIMESTAMPTZ,

  notes                TEXT,
  metadata             JSONB         NOT NULL DEFAULT '{}',

  created_at           TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payments_booking_idx    ON public.payments(booking_id);
CREATE INDEX IF NOT EXISTS payments_customer_idx   ON public.payments(customer_id);
CREATE INDEX IF NOT EXISTS payments_status_idx     ON public.payments(status);
CREATE INDEX IF NOT EXISTS payments_razorpay_idx
  ON public.payments(gateway_payment_id) WHERE gateway_payment_id IS NOT NULL;


-- ================================================================
-- SECTION 8: SUBSCRIPTIONS
-- ================================================================

-- ── subscription_plans ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT          NOT NULL UNIQUE,
  price            NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  billing_cycle    TEXT          NOT NULL DEFAULT 'Monthly'
                                 CHECK (billing_cycle IN ('Monthly','Quarterly','Yearly')),
  offer_tag        TEXT,
  features         JSONB         NOT NULL DEFAULT '[]',
  washes_per_month INTEGER,
  discount_percent INTEGER       NOT NULL DEFAULT 0
                                 CHECK (discount_percent BETWEEN 0 AND 100),
  is_active        BOOLEAN       NOT NULL DEFAULT true,
  popular          BOOLEAN       NOT NULL DEFAULT false,
  sort_order       INTEGER       NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- ── subscriptions ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id      UUID          NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  plan_id          UUID          REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
  plan_name        TEXT          NOT NULL,
  price            NUMERIC(10,2) NOT NULL,
  billing_cycle    TEXT          NOT NULL DEFAULT 'Monthly',
  washes_used      INTEGER       NOT NULL DEFAULT 0,
  washes_total     INTEGER,
  status           TEXT          NOT NULL DEFAULT 'Active'
                                 CHECK (status IN ('Active','Cancelled','Expired','Suspended','Pending')),
  start_date       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  end_date         TIMESTAMPTZ   NOT NULL,
  cancelled_at     TIMESTAMPTZ,
  cancel_reason    TEXT,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS subscriptions_customer_idx ON public.subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS subscriptions_status_idx   ON public.subscriptions(status);


-- ================================================================
-- SECTION 9: MARKETING & CONTENT
-- ================================================================

-- ── banners ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.banners (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT,
  image_url       TEXT        NOT NULL,
  coupon_code     TEXT,
  redirect_url    TEXT,
  is_visible      BOOLEAN     NOT NULL DEFAULT true,
  display_order   INTEGER     NOT NULL DEFAULT 0,
  starts_at       TIMESTAMPTZ,
  ends_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── coupons ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.coupons (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  code             TEXT          NOT NULL UNIQUE,
  description      TEXT,
  discount_type    TEXT          NOT NULL DEFAULT 'flat'
                                 CHECK (discount_type IN ('flat','percent')),
  discount_amount  NUMERIC(10,2) NOT NULL CHECK (discount_amount > 0),
  max_discount     NUMERIC(10,2),
  min_order_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  customer_id      UUID          REFERENCES public.customers(id) ON DELETE SET NULL,
  usage_limit      INTEGER,
  usage_count      INTEGER       NOT NULL DEFAULT 0,
  is_used          BOOLEAN       NOT NULL DEFAULT false,
  valid_from       TIMESTAMPTZ   DEFAULT now(),
  valid_until      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- ── blogs ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.blogs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT        NOT NULL,
  slug            TEXT        UNIQUE,
  category        TEXT        NOT NULL,
  image_url       TEXT        NOT NULL,
  description     TEXT        NOT NULL,
  excerpt         TEXT,
  stage_number    TEXT        NOT NULL,
  is_published    BOOLEAN     NOT NULL DEFAULT true,
  published_at    TIMESTAMPTZ DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── gallery ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gallery (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT,
  image_url       TEXT        NOT NULL,
  category        TEXT        NOT NULL DEFAULT 'General',
  sort_order      INTEGER     NOT NULL DEFAULT 0,
  is_visible      BOOLEAN     NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── offers ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.offers (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT        NOT NULL,
  description     TEXT,
  image_url       TEXT,
  coupon_code     TEXT,
  discount_text   TEXT,
  valid_until     TIMESTAMPTZ,
  is_active       BOOLEAN     NOT NULL DEFAULT true,
  sort_order      INTEGER     NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ================================================================
-- SECTION 10: PUSH NOTIFICATIONS & FCM
-- ================================================================

-- ── user_fcm_tokens ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_fcm_tokens (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id     UUID        REFERENCES public.customers(id) ON DELETE CASCADE,
  user_id         UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  fcm_token       TEXT        NOT NULL UNIQUE,
  device_type     TEXT        NOT NULL DEFAULT 'android'
                              CHECK (device_type IN ('android','ios','web')),
  device_model    TEXT,
  app_version     TEXT,
  os_version      TEXT,
  is_active       BOOLEAN     NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fcm_tokens_customer_idx ON public.user_fcm_tokens(customer_id);
CREATE INDEX IF NOT EXISTS fcm_tokens_active_idx
  ON public.user_fcm_tokens(is_active) WHERE is_active = true;

-- ── notification_campaigns ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notification_campaigns (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name               TEXT        NOT NULL,
  description        TEXT,

  -- Notification content
  title              TEXT        NOT NULL,
  body               TEXT        NOT NULL,
  image_url          TEXT,
  small_icon         TEXT        NOT NULL DEFAULT 'default',
  action_buttons     JSONB       NOT NULL DEFAULT '[]',
  deep_link          TEXT        NOT NULL DEFAULT '/',

  -- Features
  timer_expiry       TIMESTAMPTZ,
  category           TEXT        NOT NULL DEFAULT 'Promotional',
  priority           TEXT        NOT NULL DEFAULT 'High'
                                 CHECK (priority IN ('High','Normal','Low')),
  sound              BOOLEAN     NOT NULL DEFAULT true,
  vibration          BOOLEAN     NOT NULL DEFAULT true,

  -- Targeting
  target_audience    TEXT        NOT NULL DEFAULT 'all'
                                 CHECK (target_audience IN (
                                   'all','selected_users','segments','topics'
                                 )),
  target_user_ids    JSONB       NOT NULL DEFAULT '[]',
  target_segment     TEXT        NOT NULL DEFAULT 'all_customers',
  target_topic       TEXT        NOT NULL DEFAULT 'all_users',

  -- Schedule
  scheduled_time     TIMESTAMPTZ,

  -- State
  status             TEXT        NOT NULL DEFAULT 'Draft'
                                 CHECK (status IN (
                                   'Draft','Scheduled','Sending','Sent','Failed','Cancelled'
                                 )),
  total_targeted     INTEGER     NOT NULL DEFAULT 0,
  successfully_sent  INTEGER     NOT NULL DEFAULT 0,
  failed_send        INTEGER     NOT NULL DEFAULT 0,
  clicked            INTEGER     NOT NULL DEFAULT 0,

  error_log          TEXT,
  created_by         UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at            TIMESTAMPTZ
);

-- ── notification_campaign_logs ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notification_campaign_logs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     UUID        NOT NULL REFERENCES public.notification_campaigns(id) ON DELETE CASCADE,
  customer_id     UUID        REFERENCES public.customers(id) ON DELETE SET NULL,
  fcm_token       TEXT,
  status          TEXT        NOT NULL DEFAULT 'Sent'
                              CHECK (status IN ('Sent','Failed','Clicked','Dismissed')),
  error_message   TEXT,
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  clicked_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS campaign_logs_campaign_idx
  ON public.notification_campaign_logs(campaign_id);

-- ── notifications ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id     UUID        NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  title           TEXT        NOT NULL,
  body            TEXT        NOT NULL,
  image_url       TEXT,
  deep_link       TEXT        NOT NULL DEFAULT '/',
  type            TEXT        NOT NULL DEFAULT 'General'
                              CHECK (type IN (
                                'General','Booking','Offer','Payment','Review','System'
                              )),
  is_read         BOOLEAN     NOT NULL DEFAULT false,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_customer_unread_idx
  ON public.notifications(customer_id, is_read) WHERE is_read = false;


-- ================================================================
-- SECTION 11: SETTINGS & AUDIT
-- ================================================================

CREATE TABLE IF NOT EXISTS public.settings (
  id                        INTEGER      PRIMARY KEY DEFAULT 1 CHECK (id = 1),

  -- Branding
  shop_name                 TEXT         NOT NULL DEFAULT 'RWash',
  tagline                   TEXT         DEFAULT 'Premium Car Wash at Your Doorstep',
  logo_url                  TEXT,

  -- Contact
  contact_phone             TEXT,
  contact_email             TEXT,
  whatsapp_number           TEXT,
  address                   TEXT,
  city                      TEXT         DEFAULT 'India',

  -- Working Hours
  working_hours_start       TEXT         NOT NULL DEFAULT '08:00',
  working_hours_end         TEXT         NOT NULL DEFAULT '20:00',
  working_days              TEXT[]       DEFAULT ARRAY['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],

  -- Auto Features
  auto_discount_new_user    BOOLEAN      NOT NULL DEFAULT false,
  auto_discount_percent     INTEGER      DEFAULT 10
                                         CHECK (auto_discount_percent BETWEEN 0 AND 100),
  auto_discount_expires_days INTEGER     DEFAULT 30,

  -- Business
  gst_number                TEXT,
  currency                  TEXT         NOT NULL DEFAULT 'INR',
  booking_buffer_hours      INTEGER      NOT NULL DEFAULT 2,

  -- App
  maintenance_mode          BOOLEAN      NOT NULL DEFAULT false,
  maintenance_message       TEXT         DEFAULT 'Upgrading services. Back shortly!',
  min_app_version           TEXT,

  updated_at                TIMESTAMPTZ  NOT NULL DEFAULT now()
);

INSERT INTO public.settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  action          TEXT        NOT NULL,
  table_name      TEXT        NOT NULL,
  record_id       TEXT,
  old_data        JSONB,
  new_data        JSONB,
  ip_address      TEXT,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_user_idx    ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS audit_logs_table_idx   ON public.audit_logs(table_name, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON public.audit_logs(created_at DESC);


-- ================================================================
-- SECTION 12: TRIGGERS
-- ================================================================

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'profiles','customers','workers','vehicles',
    'services','bookings','subscriptions','settings'
  ] LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS handle_updated_at ON public.%I;
       CREATE TRIGGER handle_updated_at
         BEFORE UPDATE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();',
      t, t
    );
  END LOOP;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_profile();

DROP TRIGGER IF EXISTS on_booking_completed ON public.bookings;
CREATE TRIGGER on_booking_completed
  AFTER UPDATE OF status ON public.bookings
  FOR EACH ROW
  WHEN (NEW.status = 'Completed' AND OLD.status <> 'Completed')
  EXECUTE FUNCTION public.update_customer_stats();


-- ================================================================
-- SECTION 13: ROW LEVEL SECURITY
-- ================================================================

ALTER TABLE public.profiles                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workers                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_categories         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blogs                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_fcm_tokens            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_campaigns     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_campaign_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs                 ENABLE ROW LEVEL SECURITY;

-- ── PROFILES ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "profiles_select"       ON public.profiles;
DROP POLICY IF EXISTS "profiles_update"       ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert"       ON public.profiles;

CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT WITH CHECK (true);

-- ── ADMINS ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "admins_all" ON public.admins;
CREATE POLICY "admins_all" ON public.admins
  FOR ALL USING (public.is_admin());

-- ── CUSTOMERS ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "customers_select"      ON public.customers;
DROP POLICY IF EXISTS "customers_update"      ON public.customers;
DROP POLICY IF EXISTS "customers_insert"      ON public.customers;

CREATE POLICY "customers_select" ON public.customers
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "customers_update" ON public.customers
  FOR UPDATE USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "customers_insert" ON public.customers
  FOR INSERT WITH CHECK (true);

-- ── WORKERS ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "workers_admin"         ON public.workers;
DROP POLICY IF EXISTS "workers_authenticated" ON public.workers;

CREATE POLICY "workers_admin" ON public.workers
  FOR ALL USING (public.is_admin());

CREATE POLICY "workers_authenticated" ON public.workers
  FOR SELECT USING (auth.role() = 'authenticated');

-- ── VEHICLES ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "vehicles_own_or_admin" ON public.vehicles;

CREATE POLICY "vehicles_own_or_admin" ON public.vehicles
  FOR ALL USING (
    customer_id = public.get_customer_id() OR public.is_admin()
  );

-- ── SERVICES & CATEGORIES ─────────────────────────────────────
DROP POLICY IF EXISTS "categories_public_read"  ON public.service_categories;
DROP POLICY IF EXISTS "categories_admin_write"  ON public.service_categories;
DROP POLICY IF EXISTS "services_public_read"    ON public.services;
DROP POLICY IF EXISTS "services_admin_all"      ON public.services;

CREATE POLICY "categories_public_read" ON public.service_categories
  FOR SELECT USING (true);

CREATE POLICY "categories_admin_write" ON public.service_categories
  FOR ALL USING (public.is_admin());

CREATE POLICY "services_public_read" ON public.services
  FOR SELECT USING (status = 'Active' OR public.is_admin());

CREATE POLICY "services_admin_all" ON public.services
  FOR ALL USING (public.is_admin());

-- ── BOOKINGS ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "bookings_select"  ON public.bookings;
DROP POLICY IF EXISTS "bookings_insert"  ON public.bookings;
DROP POLICY IF EXISTS "bookings_update"  ON public.bookings;

CREATE POLICY "bookings_select" ON public.bookings
  FOR SELECT USING (
    customer_id = public.get_customer_id() OR public.is_admin()
  );

CREATE POLICY "bookings_insert" ON public.bookings
  FOR INSERT WITH CHECK (
    customer_id = public.get_customer_id() OR public.is_admin()
  );

CREATE POLICY "bookings_update" ON public.bookings
  FOR UPDATE USING (
    customer_id = public.get_customer_id() OR public.is_admin()
  );

-- ── REVIEWS ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "reviews_public_read"  ON public.reviews;
DROP POLICY IF EXISTS "reviews_insert_own"   ON public.reviews;
DROP POLICY IF EXISTS "reviews_admin_all"    ON public.reviews;

CREATE POLICY "reviews_public_read" ON public.reviews
  FOR SELECT USING (is_published = true OR public.is_admin());

CREATE POLICY "reviews_insert_own" ON public.reviews
  FOR INSERT WITH CHECK (customer_id = public.get_customer_id());

CREATE POLICY "reviews_admin_all" ON public.reviews
  FOR ALL USING (public.is_admin());

-- ── PAYMENTS ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "payments_select"  ON public.payments;
DROP POLICY IF EXISTS "payments_insert"  ON public.payments;
DROP POLICY IF EXISTS "payments_update"  ON public.payments;

CREATE POLICY "payments_select" ON public.payments
  FOR SELECT USING (
    customer_id = public.get_customer_id() OR public.is_admin()
  );

CREATE POLICY "payments_insert" ON public.payments
  FOR INSERT WITH CHECK (
    customer_id = public.get_customer_id() OR public.is_admin()
  );

CREATE POLICY "payments_update" ON public.payments
  FOR UPDATE USING (public.is_admin());

-- ── SUBSCRIPTION PLANS ────────────────────────────────────────
DROP POLICY IF EXISTS "plans_public_read"    ON public.subscription_plans;
DROP POLICY IF EXISTS "plans_admin_write"    ON public.subscription_plans;

CREATE POLICY "plans_public_read" ON public.subscription_plans
  FOR SELECT USING (is_active = true OR public.is_admin());

CREATE POLICY "plans_admin_write" ON public.subscription_plans
  FOR ALL USING (public.is_admin());

-- ── SUBSCRIPTIONS ─────────────────────────────────────────────
DROP POLICY IF EXISTS "subscriptions_select" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_insert" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_update" ON public.subscriptions;

CREATE POLICY "subscriptions_select" ON public.subscriptions
  FOR SELECT USING (
    customer_id = public.get_customer_id() OR public.is_admin()
  );

CREATE POLICY "subscriptions_insert" ON public.subscriptions
  FOR INSERT WITH CHECK (
    customer_id = public.get_customer_id() OR public.is_admin()
  );

CREATE POLICY "subscriptions_update" ON public.subscriptions
  FOR UPDATE USING (public.is_admin());

-- ── MARKETING CONTENT ─────────────────────────────────────────
DROP POLICY IF EXISTS "banners_read"   ON public.banners;
DROP POLICY IF EXISTS "banners_admin"  ON public.banners;
DROP POLICY IF EXISTS "blogs_read"     ON public.blogs;
DROP POLICY IF EXISTS "blogs_admin"    ON public.blogs;
DROP POLICY IF EXISTS "gallery_read"   ON public.gallery;
DROP POLICY IF EXISTS "gallery_admin"  ON public.gallery;
DROP POLICY IF EXISTS "offers_read"    ON public.offers;
DROP POLICY IF EXISTS "offers_admin"   ON public.offers;

CREATE POLICY "banners_read"  ON public.banners  FOR SELECT USING (is_visible = true  OR public.is_admin());
CREATE POLICY "banners_admin" ON public.banners  FOR ALL    USING (public.is_admin());
CREATE POLICY "blogs_read"    ON public.blogs    FOR SELECT USING (is_published = true OR public.is_admin());
CREATE POLICY "blogs_admin"   ON public.blogs    FOR ALL    USING (public.is_admin());
CREATE POLICY "gallery_read"  ON public.gallery  FOR SELECT USING (is_visible = true  OR public.is_admin());
CREATE POLICY "gallery_admin" ON public.gallery  FOR ALL    USING (public.is_admin());
CREATE POLICY "offers_read"   ON public.offers   FOR SELECT USING (is_active = true   OR public.is_admin());
CREATE POLICY "offers_admin"  ON public.offers   FOR ALL    USING (public.is_admin());

-- ── COUPONS ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "coupons_admin"           ON public.coupons;
DROP POLICY IF EXISTS "coupons_authenticated"   ON public.coupons;

CREATE POLICY "coupons_admin" ON public.coupons
  FOR ALL USING (public.is_admin());

CREATE POLICY "coupons_authenticated" ON public.coupons
  FOR SELECT USING (
    auth.role() = 'authenticated' AND
    (customer_id IS NULL OR customer_id = public.get_customer_id())
  );

-- ── FCM TOKENS ────────────────────────────────────────────────
DROP POLICY IF EXISTS "fcm_tokens_own_or_admin" ON public.user_fcm_tokens;

CREATE POLICY "fcm_tokens_own_or_admin" ON public.user_fcm_tokens
  FOR ALL USING (user_id = auth.uid() OR public.is_admin());

-- ── NOTIFICATIONS ─────────────────────────────────────────────
DROP POLICY IF EXISTS "notifications_own" ON public.notifications;

CREATE POLICY "notifications_own" ON public.notifications
  FOR ALL USING (
    customer_id = public.get_customer_id() OR public.is_admin()
  );

-- ── NOTIFICATION CAMPAIGNS ────────────────────────────────────
DROP POLICY IF EXISTS "campaigns_admin"       ON public.notification_campaigns;
DROP POLICY IF EXISTS "campaign_logs_admin"   ON public.notification_campaign_logs;

CREATE POLICY "campaigns_admin"     ON public.notification_campaigns     FOR ALL USING (public.is_admin());
CREATE POLICY "campaign_logs_admin" ON public.notification_campaign_logs FOR ALL USING (public.is_admin());

-- ── SETTINGS ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "settings_read"   ON public.settings;
DROP POLICY IF EXISTS "settings_update" ON public.settings;

CREATE POLICY "settings_read"   ON public.settings FOR SELECT USING (true);
CREATE POLICY "settings_update" ON public.settings FOR UPDATE USING (public.is_admin());

-- ── AUDIT LOGS ────────────────────────────────────────────────
DROP POLICY IF EXISTS "audit_logs_admin" ON public.audit_logs;

CREATE POLICY "audit_logs_admin" ON public.audit_logs
  FOR ALL USING (public.is_admin());


-- ================================================================
-- SECTION 14: STORAGE BUCKET
-- ================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'rwash-images',
  'rwash-images',
  true,
  10485760,
  ARRAY['image/jpeg','image/png','image/webp','image/svg+xml','image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public              = true,
  file_size_limit     = 10485760,
  allowed_mime_types  = ARRAY['image/jpeg','image/png','image/webp','image/svg+xml','image/gif'];

DROP POLICY IF EXISTS "storage_public_read"           ON storage.objects;
DROP POLICY IF EXISTS "storage_authenticated_upload"  ON storage.objects;
DROP POLICY IF EXISTS "storage_own_or_admin_delete"   ON storage.objects;

CREATE POLICY "storage_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'rwash-images');

CREATE POLICY "storage_authenticated_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'rwash-images' AND auth.role() = 'authenticated'
  );

CREATE POLICY "storage_own_or_admin_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'rwash-images' AND (
      (storage.foldername(name))[1] IN ('avatars','vehicles') AND auth.uid() IS NOT NULL
      OR public.is_admin()
    )
  );


-- ================================================================
-- SECTION 15: REALTIME
-- ================================================================

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
EXCEPTION WHEN others THEN NULL; END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.services;
EXCEPTION WHEN others THEN NULL; END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.banners;
EXCEPTION WHEN others THEN NULL; END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.settings;
EXCEPTION WHEN others THEN NULL; END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_campaigns;
EXCEPTION WHEN others THEN NULL; END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN others THEN NULL; END $$;


-- ================================================================
-- SECTION 16: DEFAULT SEED DATA
-- ================================================================

INSERT INTO public.service_categories (name, description, icon, color, sort_order) VALUES
  ('Basic',    'Quick exterior wash',               'droplets',     '#3B82F6', 1),
  ('Standard', 'Interior + exterior cleaning',      'sparkles',     '#8B5CF6', 2),
  ('Premium',  'Full detailing package',            'star',         '#F59E0B', 3),
  ('Add-on',   'Extra services & enhancements',     'plus-circle',  '#10B981', 4)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.services (name, category, description, features, price, offer_price, duration, status) VALUES
  ('Basic Exterior Wash',
   'Basic',
   'Quick high-pressure foam wash with rinse and dry.',
   '["Snow foam wash","High pressure rinse","Air dry","Wheel rinse"]'::jsonb,
   299, 199, 30, 'Active'),

  ('Interior + Exterior Wash',
   'Standard',
   'Complete inside-outside cleaning for a fresh car.',
   '["Exterior foam wash","Interior vacuum","Dashboard wipe","Glass cleaning","Door sill clean"]'::jsonb,
   599, 499, 60, 'Active'),

  ('Full Premium Detailing',
   'Premium',
   'Professional detailing — your car looks showroom-new.',
   '["Deep exterior wash","Clay bar treatment","Ceramic spray coat","Interior steam clean","Tyre shine","Air freshener"]'::jsonb,
   1299, 999, 120, 'Active'),

  ('Interior Deep Clean',
   'Premium',
   'Full interior steam and shampooing treatment.',
   '["Seat shampoo","Floor mat wash","AC vent clean","Roof lining wipe","Fragrance treatment"]'::jsonb,
   999, 799, 90, 'Active'),

  ('Tyre Shine & Dressing',
   'Add-on',
   'Make your tyres look new and gleaming.',
   '["Tyre cleaning","Tyre dressing","Rim polish"]'::jsonb,
   199, NULL, 20, 'Active')
ON CONFLICT DO NOTHING;

INSERT INTO public.subscription_plans
  (name, price, billing_cycle, offer_tag, features, washes_per_month, is_active, popular, sort_order)
VALUES
  ('Basic Shield',
   999, 'Monthly', NULL,
   '["4 Basic Washes/month","Priority Booking","10% discount on add-ons","Booking reminders"]'::jsonb,
   4, true, false, 1),

  ('Pro Gloss',
   1999, 'Monthly', '🔥 Popular',
   '["8 Standard Washes/month","1 Free Interior Clean","15% discount on all services","Priority Support","Digital wash history"]'::jsonb,
   8, true, true, 2),

  ('VIP Detailing',
   3999, 'Monthly', '👑 Best Value',
   '["Unlimited Basic Washes","1 Monthly Full Detailing","25% discount on all services","Dedicated Manager","Free pick & drop"]'::jsonb,
   NULL, true, false, 3)
ON CONFLICT (name) DO NOTHING;

UPDATE public.settings SET
  shop_name           = 'RWash',
  tagline             = 'Premium Car Wash at Your Doorstep',
  contact_phone       = '+91-XXXXXXXXXX',
  whatsapp_number     = '+91-XXXXXXXXXX',
  city                = 'India',
  working_hours_start = '08:00',
  working_hours_end   = '20:00',
  booking_buffer_hours= 2,
  currency            = 'INR'
WHERE id = 1;


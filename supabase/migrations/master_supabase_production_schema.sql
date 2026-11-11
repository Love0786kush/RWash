-- ====================================================================
-- RWASH MASTER SUPABASE PRODUCTION SCHEMA (ALL-IN-ONE)
-- Version: 2.0 (Complete System: Auth, Bookings, Subscriptions, Push Notifications, Storage)
-- Run this in Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ====================================================================
-- 2. HELPER FUNCTIONS & TRIGGERS
-- ====================================================================

-- Function for auto-updating updated_at timestamp
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================================
-- 3. CORE USER & AUTH TABLES
-- ====================================================================

-- Profiles (Linked directly with auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone_number TEXT,
    avatar_url TEXT,
    address TEXT,
    city TEXT,
    role TEXT NOT NULL DEFAULT 'Customer' CHECK (role IN ('Admin', 'Customer')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Admins Table
CREATE TABLE IF NOT EXISTS public.admins (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Customers Table (Can link to profile_id or user_id, or allow guest walk-in customers)
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    avatar_url TEXT,
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Suspended')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Is Admin helper function (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'Admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile + customer entry on Supabase Auth Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    role_val TEXT := 'Customer';
BEGIN
    -- If first user ever registered, make them Admin
    IF (SELECT count(*) FROM auth.users) = 1 THEN
        role_val := 'Admin';
    END IF;

    -- 1. Create Profile
    INSERT INTO public.profiles (id, full_name, email, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Customer Account'),
        COALESCE(NEW.email, NEW.raw_user_meta_data->>'email', 'user@rwash.com'),
        role_val
    )
    ON CONFLICT (id) DO UPDATE SET 
        full_name = EXCLUDED.full_name, 
        email = EXCLUDED.email;

    -- 2. If Admin, also insert into Admins table
    IF role_val = 'Admin' THEN
        INSERT INTO public.admins (id, email)
        VALUES (NEW.id, COALESCE(NEW.email, 'admin@rwash.com'))
        ON CONFLICT (id) DO NOTHING;
    END IF;

    -- 3. Create Customer entry linked to profile
    INSERT INTO public.customers (profile_id, user_id, name, email, phone)
    VALUES (
        NEW.id,
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Customer Account'),
        NEW.email,
        NEW.raw_user_meta_data->>'phone'
    )
    ON CONFLICT DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON public.profiles 
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ====================================================================
-- 4. VEHICLES TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    vehicle_number VARCHAR(50) NOT NULL,
    color VARCHAR(50) NOT NULL,
    vehicle_type VARCHAR(50) NOT NULL, -- Hatchback, Sedan, SUV, Luxury, Bike
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ====================================================================
-- 5. SERVICE CATEGORIES & SERVICES
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.service_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    color TEXT DEFAULT '#6366f1',
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category_id UUID REFERENCES public.service_categories(id) ON DELETE SET NULL,
    category TEXT, -- Human-readable tag e.g. 'Basic', 'Standard', 'Premium'
    description TEXT,
    features TEXT, -- Bullet points or JSON string
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    offer_price NUMERIC(10, 2) CHECK (offer_price >= 0),
    duration INTEGER NOT NULL DEFAULT 45, -- duration in minutes
    image_url TEXT,
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

DROP TRIGGER IF EXISTS update_services_updated_at ON public.services;
CREATE TRIGGER update_services_updated_at 
    BEFORE UPDATE ON public.services 
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ====================================================================
-- 6. BOOKINGS & REVIEWS
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
    vehicle_type TEXT NOT NULL DEFAULT 'Sedan',
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    booking_date DATE NOT NULL,
    booking_time TEXT NOT NULL,
    address TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    notes TEXT,
    coupon_code TEXT,
    discount_amount NUMERIC DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Pending' 
      CHECK (status IN ('Pending', 'Confirmed', 'Accepted', 'Assigned', 'In Progress', 'Completed', 'Cancelled')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

DROP TRIGGER IF EXISTS update_bookings_updated_at ON public.bookings;
CREATE TRIGGER update_bookings_updated_at 
    BEFORE UPDATE ON public.bookings 
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ====================================================================
-- 7. SUBSCRIPTIONS & PLANS
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    price NUMERIC NOT NULL,
    billing_cycle TEXT NOT NULL DEFAULT 'Monthly', -- 'Monthly', 'Quarterly', 'Yearly'
    offer_tag TEXT,
    features JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    popular BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    plan_name TEXT NOT NULL,
    price NUMERIC NOT NULL,
    billing_cycle TEXT NOT NULL DEFAULT 'Monthly',
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Cancelled', 'Expired', 'Suspended')),
    start_date TIMESTAMPTZ DEFAULT now() NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ====================================================================
-- 8. COUPONS, BANNERS, GALLERY, BLOGS & OFFERS
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    discount_amount NUMERIC NOT NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    is_used BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.banners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT,
    image_url TEXT NOT NULL,
    coupon_code TEXT,
    redirect_url TEXT,
    is_visible BOOLEAN NOT NULL DEFAULT true,
    display_order INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.gallery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    image_url TEXT NOT NULL,
    title TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    discount TEXT NOT NULL,
    image_url TEXT,
    expiry_date DATE,
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Expired')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.blogs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    image_url TEXT NOT NULL,
    description TEXT NOT NULL,
    stage_number TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Simple in-app user notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ====================================================================
-- 9. PUSH NOTIFICATION CAMPAIGN SYSTEM & FCM TOKENS
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.notification_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    image_url TEXT,
    small_icon TEXT DEFAULT 'default',
    action_buttons JSONB DEFAULT '[]'::jsonb,
    deep_link TEXT DEFAULT '/',
    timer_expiry TIMESTAMPTZ,
    category TEXT DEFAULT 'Promotional',
    priority TEXT DEFAULT 'High',
    sound BOOLEAN DEFAULT true,
    vibration BOOLEAN DEFAULT true,
    target_audience TEXT DEFAULT 'all', -- 'all', 'selected_users', 'segments', 'topics'
    target_user_ids JSONB DEFAULT '[]'::jsonb,
    target_segment TEXT DEFAULT 'all_customers',
    target_topic TEXT DEFAULT 'all_users',
    scheduled_time TIMESTAMPTZ,
    status TEXT DEFAULT 'Draft' CHECK (status IN ('Draft', 'Scheduled', 'Sending', 'Sent', 'Failed')),
    total_targeted INTEGER DEFAULT 0,
    successfully_sent INTEGER DEFAULT 0,
    failed_send INTEGER DEFAULT 0,
    clicked INTEGER DEFAULT 0,
    error_log TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    sent_at TIMESTAMPTZ
);

DROP TRIGGER IF EXISTS update_notification_campaigns_updated_at ON public.notification_campaigns;
CREATE TRIGGER update_notification_campaigns_updated_at 
    BEFORE UPDATE ON public.notification_campaigns 
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Device FCM Tokens Table
CREATE TABLE IF NOT EXISTS public.user_fcm_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    user_id UUID,
    fcm_token TEXT NOT NULL UNIQUE,
    device_type TEXT DEFAULT 'android' CHECK (device_type IN ('android', 'ios', 'web')),
    device_model TEXT,
    app_version TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    last_used_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Dispatch Logs for notification campaigns
CREATE TABLE IF NOT EXISTS public.notification_campaign_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES public.notification_campaigns(id) ON DELETE CASCADE,
    customer_id UUID,
    fcm_token TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    error_message TEXT,
    sent_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ====================================================================
-- 10. GLOBAL SETTINGS TABLE (SINGLE ROW DESIGN)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.settings (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    business_name TEXT NOT NULL DEFAULT 'RWash Car Detailing',
    phone_number TEXT DEFAULT '+91 98765 43210',
    whatsapp_support_number TEXT DEFAULT '+919876543210',
    email TEXT DEFAULT 'support@rwash.com',
    address TEXT DEFAULT '123 Clean Car Blvd, Auto City',
    logo_url TEXT,
    working_hours TEXT DEFAULT 'Mon - Sun: 8:00 AM - 8:00 PM',
    social_links JSONB DEFAULT '{"facebook": "#", "instagram": "#", "whatsapp": "#"}'::jsonb,
    auto_new_user_discount_enabled BOOLEAN DEFAULT true,
    auto_new_user_discount_amount NUMERIC DEFAULT 99,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

INSERT INTO public.settings (id, business_name, phone_number, whatsapp_support_number, email, address, working_hours)
VALUES (1, 'RWash Car Detailing', '+91 98765 43210', '+919876543210', 'support@rwash.com', '123 Clean Car Blvd, Auto City', 'Mon - Sun: 8:00 AM - 8:00 PM')
ON CONFLICT (id) DO NOTHING;

DROP TRIGGER IF EXISTS update_settings_updated_at ON public.settings;
CREATE TRIGGER update_settings_updated_at 
    BEFORE UPDATE ON public.settings 
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ====================================================================
-- 11. INDEXES FOR LIGHTNING FAST QUERIES
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_profile_id ON public.customers(profile_id);
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON public.customers(user_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_customer_id ON public.vehicles(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON public.bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_service_id ON public.bookings(service_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON public.bookings(booking_date DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_services_category_id ON public.services(category_id);
CREATE INDEX IF NOT EXISTS idx_services_status ON public.services(status);
CREATE INDEX IF NOT EXISTS idx_reviews_booking_id ON public.reviews(booking_id);
CREATE INDEX IF NOT EXISTS idx_reviews_service_id ON public.reviews(service_id);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons(code);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.notification_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON public.notification_campaigns(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_customer_id ON public.user_fcm_tokens(customer_id);
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_active ON public.user_fcm_tokens(is_active);
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_token ON public.user_fcm_tokens(fcm_token);
CREATE INDEX IF NOT EXISTS idx_campaign_logs_campaign_id ON public.notification_campaign_logs(campaign_id);

-- ====================================================================
-- 12. ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_fcm_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_campaign_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Dynamic Macro: Create full access permissive policy for dev & app sync
DO $$
DECLARE
  tbl TEXT;
  tbls TEXT[] := ARRAY[
    'profiles', 'admins', 'customers', 'vehicles', 'service_categories', 
    'services', 'bookings', 'reviews', 'banners', 'gallery', 'offers', 
    'blogs', 'coupons', 'subscriptions', 'subscription_plans', 
    'notifications', 'notification_campaigns', 'user_fcm_tokens', 
    'notification_campaign_logs', 'settings'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    EXECUTE format('DROP POLICY IF EXISTS "allow_all_%s" ON public.%I', tbl, tbl);
    EXECUTE format('CREATE POLICY "allow_all_%s" ON public.%I FOR ALL USING (true) WITH CHECK (true)', tbl, tbl);
  END LOOP;
END $$;

-- ====================================================================
-- 13. SUPABASE STORAGE BUCKET ("rwash-images") & POLICIES
-- ====================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'rwash-images', 
  'rwash-images', 
  true, 
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif'];

-- Storage Policies for rwash-images
DROP POLICY IF EXISTS "Public Read rwash-images" ON storage.objects;
DROP POLICY IF EXISTS "Public Insert rwash-images" ON storage.objects;
DROP POLICY IF EXISTS "Public Update rwash-images" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete rwash-images" ON storage.objects;

CREATE POLICY "Public Read rwash-images" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'rwash-images');

CREATE POLICY "Public Insert rwash-images" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'rwash-images');

CREATE POLICY "Public Update rwash-images" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'rwash-images')
WITH CHECK (bucket_id = 'rwash-images');

CREATE POLICY "Public Delete rwash-images" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'rwash-images');

-- ====================================================================
-- 14. REALTIME ENABLEMENT
-- ====================================================================
DO $$
BEGIN
  -- Add tables to realtime publication if not already added
  ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.services;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.banners;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.settings;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_campaigns;
EXCEPTION WHEN OTHERS THEN
  NULL; -- Ignore if publication or table is already registered
END $$;

-- ====================================================================
-- 15. SEED DATA (CATEGORIES, SUBSCRIPTIONS, BLOGS)
-- ====================================================================
INSERT INTO public.service_categories (name, description, color) VALUES
  ('Basic',    'Entry-level wash packages',        '#10b981'),
  ('Standard', 'Mid-range detailing packages',     '#3b82f6'),
  ('Premium',  'Full-service luxury detailing',    '#8b5cf6'),
  ('Add-on',   'Optional enhancement services',    '#f59e0b')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.subscription_plans (name, price, billing_cycle, offer_tag, features, is_active, popular)
VALUES 
  ('Basic Shield Plan', 999, 'Monthly', '🔥 20% OFF', '["2 Doorstep Steam Washes / Mo", "Exterior Wash & Polish", "Tire Shine & Rim Detailing", "10% Off Add-on Services"]'::jsonb, true, false),
  ('Pro Gloss Monthly', 1999, 'Monthly', '⭐ BEST VALUE', '["4 Doorstep Steam Washes / Mo", "Full Interior Deep Vacuuming", "Hydrophobic Ceramic Coating", "20% Off All Detailing Packages", "Priority Slot Booking"]'::jsonb, true, true),
  ('VIP Detailing Club', 3999, 'Quarterly', '👑 VIP SPECIAL', '["Unlimited Detailing Washes / Quarter", "Complete Engine & Leather Care", "Premium Carnauba Hand Wax", "Dedicated Mobile Detailer", "Free Emergency Cleanup"]'::jsonb, true, false)
ON CONFLICT DO NOTHING;

INSERT INTO public.blogs (title, category, image_url, description, stage_number) VALUES
('The Science of Snow Foam Wash', 'Foam Wash', 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=1200&q=80', 'Traditional bucket washing drags micro-particles across your clear coat, leaving spiral scratches. Our clean snow foam technique lifts dirt particles safely before any physical mitt contacts the surface.', 'Stage 01 — Foam Pre-Wash'),
('Paint Rubbing & Mirror Buffing', 'Rubbing & Polishing', 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=1200&q=80', 'Oxidation, swirl marks, and minor scratches scatter light rays, making your paint look dull and faded. Our multi-stage compounding uses precision orbital machine polishers to level clearcoat imperfections, restoring mirror gloss clarity.', 'Stage 02 — Paint Correction'),
('Interior Cabin Sanitization', 'Interior Detailing', 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=1200&q=80', 'Your car cabin gathers invisible mold, dust, and food oils over time. We use medical-grade dry steam vapor extraction at 120°C to deep-clean air conditioning vents, carpet fibers, and upholstery without soaking them.', 'Stage 03 — Cabin Deep Extraction')
ON CONFLICT DO NOTHING;

-- Done!
SELECT 'RWASH Master Supabase Database Schema successfully deployed!' AS result;


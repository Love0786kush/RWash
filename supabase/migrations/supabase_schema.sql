-- ====================================================================
-- RWASH COMPLETE DATABASE SCHEMA & SECURITY POLICIES
-- ====================================================================

-- 1. DROP EXISTING TRIGGERS ON SYSTEM TABLES
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. DROP ALL CUSTOM TABLES CLEANLY (IN CASCADE ORDER - TRIGGERS WILL AUTOMATICALLY BE DROPPED)
DROP TABLE IF EXISTS public.reviews CASCADE;
DROP TABLE IF EXISTS public.bookings CASCADE;
DROP TABLE IF EXISTS public.vehicles CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.admins CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.services CASCADE;
DROP TABLE IF EXISTS public.service_categories CASCADE;
DROP TABLE IF EXISTS public.banners CASCADE;
DROP TABLE IF EXISTS public.gallery CASCADE;
DROP TABLE IF EXISTS public.offers CASCADE;
DROP TABLE IF EXISTS public.settings CASCADE;

-- 3. DROP CUSTOM FUNCTIONS
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.set_updated_at();

-- 4. CREATE FUNCTION FOR UPDATED_AT TIMESTAMP
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. CREATE TABLES

-- Profiles Table (Core Auth Association)
CREATE TABLE public.profiles (
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
CREATE TABLE public.admins (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Customers Table
CREATE TABLE public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Vehicles Table
CREATE TABLE public.vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    vehicle_number TEXT NOT NULL,
    color TEXT NOT NULL,
    vehicle_type TEXT NOT NULL, -- Sedan, SUV, etc.
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Service Categories Table
CREATE TABLE public.service_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Services Table
CREATE TABLE public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category_id UUID REFERENCES public.service_categories(id) ON DELETE SET NULL,
    category TEXT, -- Text category for frontend filtering
    description TEXT,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    offer_price NUMERIC(10, 2) CHECK (offer_price >= 0),
    duration INTEGER NOT NULL, -- duration in minutes
    image_url TEXT,
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Bookings Table
CREATE TABLE public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
    vehicle_type TEXT NOT NULL, -- snapshot of type at booking
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    booking_date DATE NOT NULL,
    booking_time TEXT NOT NULL,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Accepted', 'In Progress', 'Completed', 'Cancelled')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Reviews Table
CREATE TABLE public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Banners Table
CREATE TABLE public.banners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT,
    image_url TEXT NOT NULL,
    is_visible BOOLEAN NOT NULL DEFAULT true,
    display_order INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Gallery Table
CREATE TABLE public.gallery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    image_url TEXT NOT NULL,
    title TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Offers Table
CREATE TABLE public.offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    discount TEXT NOT NULL,
    image_url TEXT,
    expiry_date DATE,
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Expired')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Notifications Table
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Settings Table (Single-row design)
CREATE TABLE public.settings (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    business_name TEXT NOT NULL DEFAULT 'RWash',
    phone_number TEXT,
    email TEXT,
    address TEXT,
    logo_url TEXT,
    working_hours TEXT,
    social_links JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ====================================================================
-- 6. INSERT SEED VALUE FOR SETTINGS
-- ====================================================================
INSERT INTO public.settings (id, business_name, phone_number, email, address, logo_url, working_hours, social_links)
VALUES (1, 'RWash', '+1 (555) 019-2834', 'support@rwash.com', '123 Clean Car Blvd, Auto City', NULL, 'Mon-Sat: 8 AM - 7 PM', '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ====================================================================
-- 7. CREATE INDEXES FOR FAST QUERY EXECUTION
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON public.bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_date ON public.bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_customers_profile_id ON public.customers(profile_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_customer_id ON public.vehicles(customer_id);
CREATE INDEX IF NOT EXISTS idx_services_category_id ON public.services(category_id);
CREATE INDEX IF NOT EXISTS idx_reviews_service_id ON public.reviews(service_id);
CREATE INDEX IF NOT EXISTS idx_notifications_customer_id ON public.notifications(customer_id);

-- ====================================================================
-- 8. ATTACH TRIGGERS
-- ====================================================================
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ====================================================================
-- 9. DEFINE PROFILE CREATION TRIGGER ON SIGNUP
-- ====================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    role_val TEXT := 'Customer';
BEGIN
    -- Check if it is the first user (make them Admin)
    IF (SELECT count(*) FROM auth.users) = 1 THEN
        role_val := 'Admin';
    END IF;

    -- 1. Create Profile
    INSERT INTO public.profiles (id, full_name, email, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Customer Account'),
        NEW.email,
        role_val
    )
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, email = EXCLUDED.email;

    -- 2. If Admin, also insert into Admins table
    IF role_val = 'Admin' THEN
        INSERT INTO public.admins (id, email)
        VALUES (NEW.id, NEW.email)
        ON CONFLICT (id) DO NOTHING;
    END IF;

    -- 3. Create Customer entry linked to profile
    INSERT INTO public.customers (profile_id, name, email, phone)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Customer Account'),
        NEW.email,
        NEW.raw_user_meta_data->>'phone'
    )
    ON CONFLICT (email) DO UPDATE SET profile_id = EXCLUDED.profile_id, phone = COALESCE(EXCLUDED.phone, customers.phone);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ====================================================================
-- 10. ENABLE ROW LEVEL SECURITY (RLS)
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
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- ====================================================================
-- 10.5 CREATE IS_ADMIN SECURITY DEFINER FUNCTION (PREVENTS RECURSION)
-- ====================================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'Admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================================
-- 11. CREATE SECURITY POLICIES FOR TABLES
-- ====================================================================

-- Profiles Policies
CREATE POLICY "Allow public select on profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Allow full access to profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

-- Admins Policies
CREATE POLICY "Allow full access to admins table" ON public.admins FOR ALL USING (true) WITH CHECK (true);

-- Customers Policies
CREATE POLICY "Allow public select on customers" ON public.customers FOR SELECT USING (true);
CREATE POLICY "Allow full access to customers" ON public.customers FOR ALL USING (true) WITH CHECK (true);

-- Vehicles Policies
CREATE POLICY "Allow public view vehicles" ON public.vehicles FOR SELECT USING (true);
CREATE POLICY "Allow full access to vehicles" ON public.vehicles FOR ALL USING (true) WITH CHECK (true);

-- Service Categories Policies
CREATE POLICY "Allow public read access to service_categories" ON public.service_categories FOR SELECT USING (true);
CREATE POLICY "Allow full access to service_categories" ON public.service_categories FOR ALL USING (true) WITH CHECK (true);

-- Services Policies
CREATE POLICY "Allow public read access to services" ON public.services FOR SELECT USING (true);
CREATE POLICY "Allow full access to services" ON public.services FOR ALL USING (true) WITH CHECK (true);

-- Bookings Policies
CREATE POLICY "Allow public view bookings" ON public.bookings FOR SELECT USING (true);
CREATE POLICY "Allow full access to bookings" ON public.bookings FOR ALL USING (true) WITH CHECK (true);

-- Reviews Policies
CREATE POLICY "Allow public read access to reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Allow full access to reviews" ON public.reviews FOR ALL USING (true) WITH CHECK (true);

-- Banners Policies
CREATE POLICY "Allow public read access to banners" ON public.banners FOR SELECT USING (true);
CREATE POLICY "Allow full access to banners" ON public.banners FOR ALL USING (true) WITH CHECK (true);

-- Gallery Policies
CREATE POLICY "Allow public read access to gallery" ON public.gallery FOR SELECT USING (true);
CREATE POLICY "Allow full access to gallery" ON public.gallery FOR ALL USING (true) WITH CHECK (true);

-- Offers Policies
CREATE POLICY "Allow public read access to offers" ON public.offers FOR SELECT USING (true);
CREATE POLICY "Allow full access to offers" ON public.offers FOR ALL USING (true) WITH CHECK (true);

-- Notifications Policies
CREATE POLICY "Allow public view notifications" ON public.notifications FOR SELECT USING (true);
CREATE POLICY "Allow full access to notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);

-- Settings Policies
CREATE POLICY "Allow public read access to settings" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Allow full access to settings" ON public.settings FOR ALL USING (true) WITH CHECK (true);

-- ====================================================================
-- 12. STORAGE BUCKET CONFIGURATION & SECURITY POLICIES
-- ====================================================================

-- Create Storage Bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('rwash-images', 'rwash-images', true)
ON CONFLICT (id) DO NOTHING;

-- Drop storage policies if exist
DROP POLICY IF EXISTS "Allow public read access to assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates to assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes to assets" ON storage.objects;

-- Create storage policies
CREATE POLICY "Allow public read access to assets" ON storage.objects FOR SELECT USING (bucket_id = 'rwash-images');
CREATE POLICY "Allow authenticated uploads to assets" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'rwash-images' AND auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated updates to assets" ON storage.objects FOR UPDATE USING (bucket_id = 'rwash-images' AND auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated deletes to assets" ON storage.objects FOR DELETE USING (bucket_id = 'rwash-images' AND auth.role() = 'authenticated');

-- ====================================================================
-- NOTIFICATION CAMPAIGNS TABLE
-- ====================================================================

-- Create Campaigns Table
CREATE TABLE public.campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    image_url TEXT,
    small_icon TEXT,
    action_buttons JSONB DEFAULT '[]'::jsonb,
    deep_link TEXT,
    timer_expiry TIMESTAMPTZ,
    target_audience TEXT NOT NULL DEFAULT 'all', -- 'all', 'individual', 'selected_users', 'groups', 'topics'
    target_user_ids UUID[],
    target_groups TEXT[] DEFAULT '{}',
    target_topics TEXT[] DEFAULT '{}',
    scheduled_time TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Scheduled', 'Sending', 'Sent', 'Failed')),
    created_by UUID REFERENCES public.admins(id) ON DELETE SET NULL,
    sent_at TIMESTAMPTZ,
    total_targeted INTEGER DEFAULT 0,
    successfully_sent INTEGER DEFAULT 0,
    failed_send INTEGER DEFAULT 0,
    clicked INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- Campaign policies
CREATE POLICY "Allow public read access to campaigns" ON public.campaigns FOR SELECT USING (true);
CREATE POLICY "Allow full access to campaigns" ON public.campaigns FOR ALL USING (true) WITH CHECK (true);

-- Update triggers
CREATE TRIGGER handle_campaigns_updated_at
    BEFORE UPDATE ON public.campaigns
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ====================================================================
-- CAMPAIGN LOG TABLE (for delivery tracking)
-- ====================================================================

CREATE TABLE public.campaign_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    fcm_token TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'clicked'
    delivered_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.campaign_logs ENABLE ROW LEVEL SECURITY;

-- Campaign logs policies
CREATE POLICY "Allow public read access to campaign logs" ON public.campaign_logs FOR SELECT USING (true);
CREATE POLICY "Allow full access to campaign logs" ON public.campaign_logs FOR ALL USING (true) WITH CHECK (true);

-- Update trigger
CREATE TRIGGER handle_campaign_logs_updated_at
    BEFORE UPDATE ON public.campaign_logs
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

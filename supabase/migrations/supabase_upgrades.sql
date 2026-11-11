-- 1. Link customers table to auth.users (allowing optional references for walk-ins)
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Create customer vehicles table
CREATE TABLE IF NOT EXISTS public.vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    vehicle_number VARCHAR(50) NOT NULL,
    color VARCHAR(50) NOT NULL,
    vehicle_type VARCHAR(50) NOT NULL, -- e.g. Sedan, SUV, Truck
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_booking_review UNIQUE (booking_id)
);

-- Enable RLS
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Set up permissive policies (as we did for other tables, to simplify development access)
CREATE POLICY "Allow public read of vehicles" ON public.vehicles FOR SELECT USING (true);
CREATE POLICY "Allow public insert of vehicles" ON public.vehicles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update of vehicles" ON public.vehicles FOR UPDATE USING (true);
CREATE POLICY "Allow public delete of vehicles" ON public.vehicles FOR DELETE USING (true);

CREATE POLICY "Allow public read of reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Allow public insert of reviews" ON public.reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update of reviews" ON public.reviews FOR UPDATE USING (true);
CREATE POLICY "Allow public delete of reviews" ON public.reviews FOR DELETE USING (true);

-- 4. Update bookings status check constraint
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_status_check CHECK (status IN ('Pending', 'Confirmed', 'Accepted', 'Assigned', 'In Progress', 'Completed', 'Cancelled'));

-- 5. Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    plan_name TEXT NOT NULL,
    price NUMERIC NOT NULL,
    billing_cycle TEXT NOT NULL DEFAULT 'Monthly',
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Cancelled', 'Expired')),
    start_date TIMESTAMPTZ DEFAULT now() NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Permissive policies for development
CREATE POLICY "Allow public read of subscriptions" ON public.subscriptions FOR SELECT USING (true);
CREATE POLICY "Allow public insert of subscriptions" ON public.subscriptions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update of subscriptions" ON public.subscriptions FOR UPDATE USING (true);
CREATE POLICY "Allow public delete of subscriptions" ON public.subscriptions FOR DELETE USING (true);

-- 6. Support 'Suspended' status for subscriptions & customers
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_status_check CHECK (status IN ('Active', 'Cancelled', 'Expired', 'Suspended'));

ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Active';
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_status_check;
ALTER TABLE public.customers ADD CONSTRAINT customers_status_check CHECK (status IN ('Active', 'Inactive', 'Suspended'));

-- 7. Create coupons table for offers & discounts
CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    discount_amount NUMERIC NOT NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    is_used BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS & Permissive Policies
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read of coupons" ON public.coupons FOR SELECT USING (true);
CREATE POLICY "Allow public insert of coupons" ON public.coupons FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update of coupons" ON public.coupons FOR UPDATE USING (true);
CREATE POLICY "Allow public delete of coupons" ON public.coupons FOR DELETE USING (true);

-- 8. Add Auto-Discount Settings to Settings table
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS auto_new_user_discount_enabled BOOLEAN DEFAULT true;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS auto_new_user_discount_amount NUMERIC DEFAULT 99;

-- 9. Add Coupon tracking columns to Bookings table
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS coupon_code TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0;

-- 10. Create blogs table for dynamic detailing academy articles
CREATE TABLE IF NOT EXISTS public.blogs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    image_url TEXT NOT NULL,
    description TEXT NOT NULL,
    stage_number TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS & Permissive Policies
ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read of blogs" ON public.blogs FOR SELECT USING (true);
CREATE POLICY "Allow public insert of blogs" ON public.blogs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update of blogs" ON public.blogs FOR UPDATE USING (true);
CREATE POLICY "Allow public delete of blogs" ON public.blogs FOR DELETE USING (true);

-- Insert seed data for blogs
INSERT INTO public.blogs (title, category, image_url, description, stage_number) VALUES
('The Science of Snow Foam Wash', 'Foam Wash', 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=1200&q=80', 'Traditional bucket washing drags micro-particles across your clear coat, leaving spiral scratches. Our clean snow foam technique works on a scientific level to lift dirt particles safely before any physical mitt contacts the surface.', 'Stage 01 — Foam Pre-Wash'),
('Paint Rubbing & Mirror Buffing', 'Rubbing & Polishing', 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=1200&q=80', 'Oxidation, swirl marks, and minor scratches scatter light rays, making your paint look dull and faded. Our multi-stage compounding uses precision orbital machine polishers to level clearcoat imperfections, restoring mirror gloss clarity.', 'Stage 02 — Paint Correction'),
('Interior Cabin Sanitization', 'Interior Detailing', 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=1200&q=80', 'Your car''s cabin gathers invisible mold, dust, and food oils over time. We use medical-grade dry steam vapor extraction at 120°C to deep-clean air conditioning vents, carpet fibers, and upholstery without soaking them.', 'Stage 03 — Cabin Deep Extraction')
ON CONFLICT DO NOTHING;

-- 11. Add image_url column to vehicles table for customer car photos
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 12. Add category column to services table for frontend category sorting/filtering
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS category TEXT;

-- 13. Enable Support Settings on Settings Table
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS whatsapp_support_number TEXT;

-- 14. Enable public uploads to rwash-images storage bucket for vehicles and user photos
DROP POLICY IF EXISTS "Allow public uploads to assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow public updates to assets" ON storage.objects;
CREATE POLICY "Allow public uploads to assets" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'rwash-images');
CREATE POLICY "Allow public updates to assets" ON storage.objects FOR UPDATE USING (bucket_id = 'rwash-images');

-- 15. Add location / address and coordinate tracking to bookings
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- 16. Add features column to services table
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS features TEXT;

-- 17. Enable permissive RLS policies on public.services so admin edits & image updates save to DB
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read of services" ON public.services;
DROP POLICY IF EXISTS "Allow public insert of services" ON public.services;
DROP POLICY IF EXISTS "Allow public update of services" ON public.services;
DROP POLICY IF EXISTS "Allow public delete of services" ON public.services;

CREATE POLICY "Allow public read of services" ON public.services FOR SELECT USING (true);
CREATE POLICY "Allow public insert of services" ON public.services FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update of services" ON public.services FOR UPDATE USING (true);
CREATE POLICY "Allow public delete of services" ON public.services FOR DELETE USING (true);

-- 18. Enable permissive RLS policies on public.customers and public.profiles so signups & edits save cleanly
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read of customers" ON public.customers;
DROP POLICY IF EXISTS "Allow public insert of customers" ON public.customers;
DROP POLICY IF EXISTS "Allow public update of customers" ON public.customers;
DROP POLICY IF EXISTS "Allow public delete of customers" ON public.customers;

CREATE POLICY "Allow public read of customers" ON public.customers FOR SELECT USING (true);
CREATE POLICY "Allow public insert of customers" ON public.customers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update of customers" ON public.customers FOR UPDATE USING (true);
CREATE POLICY "Allow public delete of customers" ON public.customers FOR DELETE USING (true);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read of profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow public insert of profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow public update of profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow public delete of profiles" ON public.profiles;

CREATE POLICY "Allow public read of profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Allow public insert of profiles" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update of profiles" ON public.profiles FOR UPDATE USING (true);
CREATE POLICY "Allow public delete of profiles" ON public.profiles FOR DELETE USING (true);




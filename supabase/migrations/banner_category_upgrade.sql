-- ====================================================================
-- MASTER FIX SQL — Run this ONCE in Supabase SQL Editor
-- Fixes: banners coupon/redirect, service_categories, features column,
--        storage policies for public image uploads
-- ====================================================================

-- ── BANNERS: Add coupon_code & redirect_url ──────────────────────────
ALTER TABLE public.banners
  ADD COLUMN IF NOT EXISTS coupon_code TEXT,
  ADD COLUMN IF NOT EXISTS redirect_url TEXT;

-- ── SERVICE CATEGORIES: Enhance + seed defaults ──────────────────────
ALTER TABLE public.service_categories
  ADD COLUMN IF NOT EXISTS icon    TEXT,
  ADD COLUMN IF NOT EXISTS color   TEXT DEFAULT '#6366f1',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Insert default categories (skip if already exist)
INSERT INTO public.service_categories (name, description, color) VALUES
  ('Basic',    'Entry-level wash packages',        '#10b981'),
  ('Standard', 'Mid-range detailing packages',     '#3b82f6'),
  ('Premium',  'Full-service luxury detailing',    '#8b5cf6'),
  ('Add-on',   'Optional enhancement services',    '#f59e0b')
ON CONFLICT (name) DO NOTHING;

-- ── SERVICES: Ensure features column exists ──────────────────────────
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS features TEXT;

-- ── STORAGE: Allow public (unauthenticated) uploads ──────────────────
-- This fixes the "https image not working" — services need storage access
DROP POLICY IF EXISTS "Allow public uploads to assets"  ON storage.objects;
DROP POLICY IF EXISTS "Allow public updates to assets"  ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates to assets" ON storage.objects;

CREATE POLICY "Allow public uploads to assets"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'rwash-images');

CREATE POLICY "Allow public updates to assets"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'rwash-images');

CREATE POLICY "Allow public read access to assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'rwash-images');

-- Make bucket public (idempotent)
UPDATE storage.buckets SET public = true WHERE id = 'rwash-images';

-- ── CUSTOMERS: Status column (if not added already) ──────────────────
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Active';

-- Done! All fixes applied.
SELECT 'Master fix applied successfully' AS result;

-- ====================================================================
-- FIX: Supabase Storage RLS Policies for "rwash-images" Bucket
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/ehwmwqqetgcbswzyhwod/sql/new
-- ====================================================================

-- 1. Ensure the bucket exists and is set to PUBLIC
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'rwash-images', 
  'rwash-images', 
  true, 
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];

-- 2. Drop any restricting or old policies on storage.objects
DROP POLICY IF EXISTS "Allow public read access to assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates to assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes to assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow public uploads to assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow public updates to assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow all for rwash-images" ON storage.objects;
DROP POLICY IF EXISTS "Public Read rwash-images" ON storage.objects;
DROP POLICY IF EXISTS "Public Insert rwash-images" ON storage.objects;
DROP POLICY IF EXISTS "Public Update rwash-images" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete rwash-images" ON storage.objects;

-- 3. Create permissive policies for "rwash-images" (allows SELECT, INSERT, UPDATE, DELETE)
-- Public read (anyone can view uploaded images via URL)
CREATE POLICY "Public Read rwash-images" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'rwash-images');

-- Public insert (allows services, banners, and profile uploads)
CREATE POLICY "Public Insert rwash-images" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'rwash-images');

-- Public update (allows updating/replacing existing images)
CREATE POLICY "Public Update rwash-images" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'rwash-images')
WITH CHECK (bucket_id = 'rwash-images');

-- Public delete (allows removing deleted service/banner images)
CREATE POLICY "Public Delete rwash-images" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'rwash-images');

-- 4. Verify bucket configuration
SELECT id, name, public, file_size_limit FROM storage.buckets WHERE id = 'rwash-images';


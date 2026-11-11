-- ====================================================================
-- ACTIVATE ADMIN: senak0709@gmail.com
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/ehwmwqqetgcbswzyhwod/sql/new
-- ====================================================================

-- 1. Confirm email so Supabase allows login immediately without email verification
UPDATE auth.users 
SET email_confirmed_at = COALESCE(email_confirmed_at, now())
WHERE email = 'senak0709@gmail.com';

-- 2. Make sure profile exists and set role to 'Admin'
INSERT INTO public.profiles (id, full_name, email, role)
SELECT id, 'Admin', email, 'Admin'
FROM auth.users
WHERE email = 'senak0709@gmail.com'
ON CONFLICT (id) DO UPDATE SET role = 'Admin';

-- 3. Register user in admins table
INSERT INTO public.admins (id, email)
SELECT id, email 
FROM public.profiles 
WHERE email = 'senak0709@gmail.com'
ON CONFLICT (id) DO NOTHING;

-- 4. Verify status
SELECT p.id, p.full_name, p.email, p.role, u.email_confirmed_at
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE p.email = 'senak0709@gmail.com';

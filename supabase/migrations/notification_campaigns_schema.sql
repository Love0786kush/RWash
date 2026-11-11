-- ==============================================================================
-- RWASH NOTIFICATION CAMPAIGN MANAGEMENT & FCM TOKEN SYSTEM
-- Migration: notification_campaigns_schema.sql
-- ==============================================================================

-- 1. Main notification campaigns table
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
  status TEXT DEFAULT 'Draft', -- 'Draft', 'Scheduled', 'Sending', 'Sent', 'Failed'
  total_targeted INTEGER DEFAULT 0,
  successfully_sent INTEGER DEFAULT 0,
  failed_send INTEGER DEFAULT 0,
  clicked INTEGER DEFAULT 0,
  error_log TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  sent_at TIMESTAMPTZ
);

-- 2. User FCM device tokens table (supports Android, iOS, and Web)
CREATE TABLE IF NOT EXISTS public.user_fcm_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  user_id UUID,
  fcm_token TEXT NOT NULL UNIQUE,
  device_type TEXT DEFAULT 'android', -- 'android', 'ios', 'web'
  device_model TEXT,
  app_version TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Individual notification dispatch / delivery logs
CREATE TABLE IF NOT EXISTS public.notification_campaign_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.notification_campaigns(id) ON DELETE CASCADE,
  customer_id UUID,
  fcm_token TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  error_message TEXT,
  sent_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create Indexes for performance
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.notification_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON public.notification_campaigns(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_customer_id ON public.user_fcm_tokens(customer_id);
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_active ON public.user_fcm_tokens(is_active);
CREATE INDEX IF NOT EXISTS idx_campaign_logs_campaign_id ON public.notification_campaign_logs(campaign_id);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.notification_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_fcm_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_campaign_logs ENABLE ROW LEVEL SECURITY;

-- 6. Comprehensive RLS Policies
-- Allow admin panel full access to notification_campaigns
DROP POLICY IF EXISTS "Public and Admin full access on notification_campaigns" ON public.notification_campaigns;
CREATE POLICY "Public and Admin full access on notification_campaigns"
  ON public.notification_campaigns
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Allow public and apps to register/update device FCM tokens
DROP POLICY IF EXISTS "Public and App token access on user_fcm_tokens" ON public.user_fcm_tokens;
CREATE POLICY "Public and App token access on user_fcm_tokens"
  ON public.user_fcm_tokens
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Allow admin and backend service access on campaign logs
DROP POLICY IF EXISTS "Public and Admin access on notification_campaign_logs" ON public.notification_campaign_logs;
CREATE POLICY "Public and Admin access on notification_campaign_logs"
  ON public.notification_campaign_logs
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 7. Ensure Storage bucket 'rwash-images' allows campaigns upload
INSERT INTO storage.buckets (id, name, public)
VALUES ('rwash-images', 'rwash-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage object policies for 'rwash-images'
DROP POLICY IF EXISTS "Public can view rwash-images" ON storage.objects;
CREATE POLICY "Public can view rwash-images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'rwash-images');

DROP POLICY IF EXISTS "Public can insert rwash-images" ON storage.objects;
CREATE POLICY "Public can insert rwash-images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'rwash-images');

DROP POLICY IF EXISTS "Public can update rwash-images" ON storage.objects;
CREATE POLICY "Public can update rwash-images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'rwash-images');

DROP POLICY IF EXISTS "Public can delete rwash-images" ON storage.objects;
CREATE POLICY "Public can delete rwash-images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'rwash-images');

-- 8. Seed sample starter notification campaign (optional template)
INSERT INTO public.notification_campaigns (
  name,
  description,
  title,
  body,
  image_url,
  category,
  priority,
  target_audience,
  target_topic,
  action_buttons,
  deep_link,
  status,
  total_targeted,
  successfully_sent
) VALUES (
  'Monsoon Special Wash Discount',
  'Seasonal promotional blast for car wash & foam bath discount',
  '🌧️ Monsoon Car Care Alert: Flat 20% OFF!',
  'Keep your car paint protected from acid rain & mud spots. Book premium foam wash today with coupon MONSOON20.',
  'https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&w=1200&q=80',
  'Promotional',
  'High',
  'all',
  'all_users',
  '[{"id":"b1","text":"BOOK WASH NOW","action_type":"deep_link","action_url":"/book"},{"id":"b2","text":"VIEW OFFERS","action_type":"deep_link","action_url":"/services"}]'::jsonb,
  '/book',
  'Draft',
  0,
  0
) ON CONFLICT DO NOTHING;


-- Enable subscription_plans table in Supabase
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  billing_cycle TEXT NOT NULL DEFAULT 'Monthly',
  offer_tag TEXT,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  popular BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS and add public policies
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public select on subscription_plans" ON public.subscription_plans;
CREATE POLICY "Allow public select on subscription_plans" ON public.subscription_plans FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert/update/delete on subscription_plans" ON public.subscription_plans;
CREATE POLICY "Allow public insert/update/delete on subscription_plans" ON public.subscription_plans FOR ALL USING (true);

-- Also ensure public permissions on subscriptions table
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public select on subscriptions" ON public.subscriptions;
CREATE POLICY "Allow public select on subscriptions" ON public.subscriptions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert/update/delete on subscriptions" ON public.subscriptions;
CREATE POLICY "Allow public insert/update/delete on subscriptions" ON public.subscriptions FOR ALL USING (true);

-- Insert Default Custom Subscription Plans
INSERT INTO public.subscription_plans (name, price, billing_cycle, offer_tag, features, is_active, popular)
VALUES 
  ('Basic Shield Plan', 999, 'Monthly', '🔥 20% OFF', '["2 Doorstep Steam Washes / Mo", "Exterior Wash & Polish", "Tire Shine & Rim Detailing", "10% Off Add-on Services"]'::jsonb, true, false),
  ('Pro Gloss Monthly', 1999, 'Monthly', '⭐ BEST VALUE', '["4 Doorstep Steam Washes / Mo", "Full Interior Deep Vacuuming", "Hydrophobic Ceramic Coating", "20% Off All Detailing Packages", "Priority Slot Booking"]'::jsonb, true, true),
  ('VIP Detailing Club', 3999, 'Quarterly', '👑 VIP SPECIAL', '["Unlimited Detailing Washes / Quarter", "Complete Engine & Leather Care", "Premium Carnauba Hand Wax", "Dedicated Mobile Detailer", "Free Emergency Cleanup"]'::jsonb, true, false);

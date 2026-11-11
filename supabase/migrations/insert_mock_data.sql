-- RWash Car Wash Mock Data Insertion Script

-- 1. INSERT SERVICES
INSERT INTO public.services (id, name, description, price, duration, category, image_url)
VALUES 
  ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Express Exterior Wash', 'Quick exterior rinse, foam shampoo wash, wheel cleaning, and hand blow dry. Done in 15 minutes.', 19.99, 15, 'Basic', 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=800&q=80'),
  ('b2c3d4e5-f67a-8b9c-0d1e-2f3a4b5c6d7e', 'Deluxe Interior Detail', 'Deep vacuuming, steam sanitization of seats, dashboard polish, glass cleaning, and deodorization.', 49.99, 45, 'Standard', 'https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&w=800&q=80'),
  ('c3d4e5f6-7a8b-9c0d-1e2f-3a4b5c6d7e8f', 'Full Ceramic Wax Coating', 'Premium foam wash, clay bar treatment, single-stage machine polish, and application of a 6-month protective ceramic wax.', 129.99, 90, 'Premium', 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=800&q=80'),
  ('d4e5f67a-8b9c-0d1e-2f3a-4b5c6d7e8f9a', 'Engine Bay Steam Clean', 'Degreasing of engine bay surfaces, safe low-pressure steam clean, and protective dressing of plastics.', 39.99, 30, 'Add-on', 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=800&q=80'),
  ('e5f67a8b-9c0d-1e2f-3a4b-5c6d7e8f9a0b', 'Eco Waterless Wash', 'Advanced polymer spray wash that lifts dirt away safely without water. Includes window clean and tire dressing.', 24.99, 20, 'Basic', 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=80'),
  ('f67a8b9c-0d1e-2f3a-4b5c-6d7e8f9a0b1c', 'Complete Cabin Extraction', 'Shampooing of all carpets and floor mats, deep hot-water soil extraction, and upholstery cleaning.', 59.99, 60, 'Standard', 'https://images.unsplash.com/photo-1517524008436-a3851f0d367f?auto=format&fit=crop&w=800&q=80'),
  ('7a8b9c0d-1e2f-3a4b-5c6d-7e8f9a0b1c2d', 'Premium Graphene Shield', 'Ultra-durable graphene nano-coating application providing unmatched depth of gloss, UV block, and hydrophobic shield for 12 months.', 199.99, 120, 'Premium', 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=800&q=80'),
  ('8b9c0d1e-2f3a-4b5c-6d7e-8f9a0b1c2d3e', 'Headlight Restoration', 'Multi-stage wet sanding, compound buffing, and application of a UV-resistant clear sealant to restore foggy lenses.', 34.99, 30, 'Add-on', 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=800&q=80')
ON CONFLICT (id) DO NOTHING;

-- 2. INSERT CUSTOMERS
INSERT INTO public.customers (id, name, email, phone, created_at)
VALUES 
  ('f1e2d3c4-b5a6-7f8e-9d0c-1b2a3f4e5d6c', 'John Doe', 'john.doe@gmail.com', '+1 (555) 123-4567', now() - interval '5 days'),
  ('e2d3c4b5-a67f-8e9d-0c1b-2a3f4e5d6c7b', 'Sarah Smith', 'sarah.smith@yahoo.com', '+1 (555) 987-6543', now() - interval '4 days'),
  ('d3c4b5a6-7f8e-9d0c-1b2a-3f4e5d6c7b8a', 'Michael Johnson', 'michael.j@outlook.com', '+1 (555) 456-7890', now() - interval '3 days')
ON CONFLICT (id) DO NOTHING;

-- 3. INSERT BOOKINGS (Spread across the last 6 days and today to populate the dashboard analytics chart)
INSERT INTO public.bookings (customer_id, vehicle_type, service_id, booking_date, booking_time, status, notes, created_at)
VALUES 
  (
    'f1e2d3c4-b5a6-7f8e-9d0c-1b2a3f4e5d6c', 
    'Honda Civic (Sedan)', 
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 
    CURRENT_DATE - 5, 
    '09:00 AM', 
    'Completed', 
    'Needs extra attention on front bumper bugs.',
    now() - interval '5 days'
  ),
  (
    'e2d3c4b5-a67f-8e9d-0c1b-2a3f4e5d6c7b', 
    'Tesla Model Y (SUV)', 
    'b2c3d4e5-f67a-8b9c-0d1e-2f3a4b5c6d7e', 
    CURRENT_DATE - 4, 
    '11:30 AM', 
    'Completed', 
    'Pet hair removal requested.',
    now() - interval '4 days'
  ),
  (
    'd3c4b5a6-7f8e-9d0c-1b2a-3f4e5d6c7b8a', 
    'Ford F-150 (Truck)', 
    'c3d4e5f6-7a8b-9c0d-1e2f-3a4b5c6d7e8f', 
    CURRENT_DATE - 3, 
    '02:00 PM', 
    'Completed', 
    'Please wax the utility cover too.',
    now() - interval '3 days'
  ),
  (
    'f1e2d3c4-b5a6-7f8e-9d0c-1b2a3f4e5d6c', 
    'Honda Civic (Sedan)', 
    'd4e5f67a-8b9c-0d1e-2f3a-4b5c6d7e8f9a', 
    CURRENT_DATE - 2, 
    '10:00 AM', 
    'Completed', 
    'Engine cover cleaning.',
    now() - interval '2 days'
  ),
  (
    'e2d3c4b5-a67f-8e9d-0c1b-2a3f4e5d6c7b', 
    'Tesla Model Y (SUV)', 
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 
    CURRENT_DATE - 1, 
    '03:30 PM', 
    'Cancelled', 
    'Rescheduled by client.',
    now() - interval '1 day'
  ),
  (
    'd3c4b5a6-7f8e-9d0c-1b2a-3f4e5d6c7b8a', 
    'Ford F-150 (Truck)', 
    'b2c3d4e5-f67a-8b9c-0d1e-2f3a4b5c6d7e', 
    CURRENT_DATE, 
    '09:30 AM', 
    'Confirmed', 
    'Clean floor mats thoroughly.',
    now()
  ),
  (
    'f1e2d3c4-b5a6-7f8e-9d0c-1b2a3f4e5d6c', 
    'Audi A4 (Sedan)', 
    'c3d4e5f6-7a8b-9c0d-1e2f-3a4b5c6d7e8f', 
    CURRENT_DATE, 
    '01:00 PM', 
    'Pending', 
    'Interested in monthly subscription.',
    now()
  );

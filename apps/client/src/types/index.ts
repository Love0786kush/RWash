// RWash Client Types Definition matching Supabase Master Schema v2.0

export interface Customer {
  id: string
  profile_id?: string | null
  user_id?: string | null
  name: string
  email?: string | null
  phone?: string | null
  avatar_url?: string | null
  status: 'Active' | 'Inactive' | 'Suspended'
  total_bookings: number
  total_spent: number
  loyalty_points: number
  created_at: string
}

export interface ServiceCategory {
  id: string
  name: string
  description?: string | null
  icon?: string | null
  color: string
  sort_order: number
  created_at: string
}

export interface Service {
  id: string
  name: string
  category_id?: string | null
  category?: string | null
  description?: string | null
  features: string[]
  price: number
  offer_price?: number | null
  duration: number
  image_url?: string | null
  vehicle_types?: string[]
  status: 'Active' | 'Inactive'
  created_at: string
  updated_at: string
}

export interface Vehicle {
  id: string
  customer_id: string
  brand: string
  model: string
  vehicle_number: string
  color: string
  vehicle_type: 'Sedan' | 'SUV' | 'Hatchback' | 'Luxury' | 'Bike' | 'Commercial'
  image_url?: string | null
  is_default: boolean
  created_at: string
  updated_at?: string
}

export interface Booking {
  id: string
  customer_id?: string | null
  vehicle_id?: string | null
  vehicle_type: string
  service_id?: string | null
  worker_id?: string | null
  booking_date: string
  booking_time: string
  address?: string | null
  latitude?: number | null
  longitude?: number | null
  notes?: string | null
  coupon_code?: string | null
  base_amount: number
  discount_amount: number
  final_amount: number
  payment_status: 'Unpaid' | 'Partial' | 'Paid' | 'Refunded'
  status: 'Pending' | 'Confirmed' | 'Accepted' | 'Assigned' | 'In Progress' | 'Completed' | 'Cancelled'
  created_at: string
  updated_at: string
  services?: Service
  customers?: Customer
}

export interface SubscriptionPlan {
  id: string
  name: string
  price: number
  billing_cycle: 'Monthly' | 'Quarterly' | 'Yearly'
  offer_tag?: string | null
  features: string[]
  washes_per_month?: number | null
  discount_percent: number
  is_active: boolean
  popular: boolean
  sort_order: number
  created_at: string
}

export interface Subscription {
  id: string
  customer_id: string
  plan_id?: string | null
  plan_name: string
  price: number
  billing_cycle: string
  washes_used: number
  washes_total?: number | null
  status: 'Active' | 'Cancelled' | 'Expired' | 'Suspended' | 'Pending'
  start_date: string
  end_date: string
  created_at: string
  subscription_plans?: SubscriptionPlan
}

export interface Banner {
  id: string
  title?: string | null
  image_url: string
  coupon_code?: string | null
  redirect_url?: string | null
  is_visible: boolean
  display_order: number
  created_at: string
}

export interface Coupon {
  id: string
  code: string
  description?: string | null
  discount_type: 'flat' | 'percent'
  discount_amount: number
  max_discount?: number | null
  min_order_amount: number
  customer_id?: string | null
  is_used: boolean
  valid_until?: string | null
  created_at: string
}

export interface FcmToken {
  id: string
  customer_id?: string | null
  user_id?: string | null
  fcm_token: string
  device_type: 'android' | 'ios' | 'web'
  device_model?: string | null
  app_version?: string | null
  is_active: boolean
  last_used_at: string
}

export interface AppNotification {
  id: string
  customer_id: string
  title: string
  body: string
  image_url?: string | null
  deep_link: string
  type: 'General' | 'Booking' | 'Offer' | 'Payment' | 'Review' | 'System'
  is_read: boolean
  created_at: string
}

export interface Database {
  public: {
    Tables: {
      customers: { Row: Customer }
      vehicles: { Row: Vehicle }
      services: { Row: Service }
      service_categories: { Row: ServiceCategory }
      bookings: { Row: Booking }
      subscriptions: { Row: Subscription }
      subscription_plans: { Row: SubscriptionPlan }
      banners: { Row: Banner }
      coupons: { Row: Coupon }
      user_fcm_tokens: { Row: FcmToken }
      notifications: { Row: AppNotification }
    }
  }
}


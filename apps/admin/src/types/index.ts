// RWash Types Definition matching Supabase Master Schema v2.0

export interface Profile {
  id: string
  full_name: string
  email: string
  phone_number?: string | null
  avatar_url?: string | null
  address?: string | null
  city?: string | null
  role: 'Admin' | 'Customer' | 'Worker'
  created_at: string
  updated_at: string
}

export interface Admin {
  id: string
  email: string
  created_at: string
}

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
  updated_at?: string
}

export interface Worker {
  id: string
  name: string
  phone?: string | null
  email?: string | null
  avatar_url?: string | null
  skill_level: 'Standard' | 'Premium' | 'Expert'
  status: 'Active' | 'Inactive' | 'On Leave'
  rating: number
  total_bookings: number
  created_at: string
  updated_at: string
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
  cancelled_at?: string | null
  cancel_reason?: string | null
  completed_at?: string | null
  created_at: string
  updated_at: string
  services?: Service
  customers?: Customer
  workers?: Worker
}

export interface Review {
  id: string
  booking_id: string
  customer_id: string
  service_id: string
  worker_id?: string | null
  rating: number
  comment?: string | null
  is_published: boolean
  created_at: string
}

export interface Payment {
  id: string
  booking_id?: string | null
  customer_id?: string | null
  amount: number
  currency: string
  payment_method?: 'UPI' | 'Card' | 'Cash' | 'Net Banking' | 'Wallet' | 'Subscription'
  payment_gateway?: 'Razorpay' | 'Cash' | 'Manual' | 'Subscription'
  gateway_order_id?: string | null
  gateway_payment_id?: string | null
  status: 'Pending' | 'Processing' | 'Success' | 'Failed' | 'Refunded' | 'Partially Refunded'
  paid_at?: string | null
  created_at: string
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
  updated_at: string
  subscription_plans?: SubscriptionPlan
  customers?: Customer
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
  usage_limit?: number | null
  usage_count: number
  is_used: boolean
  valid_from?: string | null
  valid_until?: string | null
  created_at: string
}

export interface NotificationCampaign {
  id: string
  name: string
  description?: string | null
  title: string
  body: string
  image_url?: string | null
  small_icon: string
  action_buttons: Array<{ text: string; url: string; type: string }>
  deep_link: string
  timer_expiry?: string | null
  category: string
  priority: 'High' | 'Normal' | 'Low'
  sound: boolean
  vibration: boolean
  target_audience: 'all' | 'selected_users' | 'segments' | 'topics'
  target_user_ids: string[]
  target_segment: string
  target_topic: string
  scheduled_time?: string | null
  status: 'Draft' | 'Scheduled' | 'Sending' | 'Sent' | 'Failed' | 'Cancelled'
  total_targeted: number
  successfully_sent: number
  failed_send: number
  clicked: number
  error_log?: string | null
  created_by?: string | null
  created_at: string
  sent_at?: string | null
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
  read_at?: string | null
  created_at: string
}

export interface Settings {
  id: number
  shop_name: string
  tagline?: string | null
  logo_url?: string | null
  contact_phone?: string | null
  contact_email?: string | null
  whatsapp_number?: string | null
  address?: string | null
  city?: string | null
  working_hours_start: string
  working_hours_end: string
  working_days: string[]
  auto_discount_new_user: boolean
  auto_discount_percent: number
  currency: string
  booking_buffer_hours: number
  maintenance_mode: boolean
  updated_at: string
}

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile }
      admins: { Row: Admin }
      customers: { Row: Customer }
      workers: { Row: Worker }
      vehicles: { Row: Vehicle }
      services: { Row: Service }
      service_categories: { Row: ServiceCategory }
      bookings: { Row: Booking }
      reviews: { Row: Review }
      payments: { Row: Payment }
      subscription_plans: { Row: SubscriptionPlan }
      subscriptions: { Row: Subscription }
      banners: { Row: Banner }
      coupons: { Row: Coupon }
      notification_campaigns: { Row: NotificationCampaign }
      user_fcm_tokens: { Row: FcmToken }
      notifications: { Row: AppNotification }
      settings: { Row: Settings }
    }
  }
}


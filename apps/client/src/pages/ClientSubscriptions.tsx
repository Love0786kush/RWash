import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, CheckCircle2, ShieldCheck, Calendar, IndianRupee, CreditCard, Tag } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useClientAuth } from '../context/ClientAuthContext'
import { useToast } from '../context/ToastContext'
import { Spinner } from '../components/Spinner'

interface Subscription {
  id: string;
  customer_id: string;
  plan_name: string;
  price: number;
  billing_cycle: string;
  status: 'Active' | 'Cancelled' | 'Expired';
  start_date: string;
  end_date: string;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  billing_cycle: string;
  offer_tag?: string;
  features: string[];
  is_active?: boolean;
  popular?: boolean;
}

const DEFAULT_CLIENT_PLANS: SubscriptionPlan[] = [
  {
    id: 'default-1',
    name: 'Basic Shield Plan',
    price: 999,
    billing_cycle: 'Monthly',
    offer_tag: '🔥 20% OFF',
    features: [
      '2 Doorstep Steam Washes / Mo',
      'Exterior Wash & Polish',
      'Tire Shine & Rim Detailing',
      '10% Off Add-on Services'
    ],
    popular: false
  },
  {
    id: 'default-2',
    name: 'Pro Gloss Monthly',
    price: 1999,
    billing_cycle: 'Monthly',
    offer_tag: '⭐ BEST VALUE',
    features: [
      '4 Doorstep Steam Washes / Mo',
      'Full Interior Deep Vacuuming',
      'Hydrophobic Ceramic Coating',
      '20% Off All Detailing Packages',
      'Priority Slot Booking'
    ],
    popular: true
  },
  {
    id: 'default-3',
    name: 'VIP Detailing Club',
    price: 3999,
    billing_cycle: 'Quarterly',
    offer_tag: '👑 VIP SPECIAL',
    features: [
      'Unlimited Detailing Washes / Quarter',
      'Complete Engine & Leather Care',
      'Premium Carnauba Hand Wax',
      'Dedicated Mobile Detailer',
      'Free Emergency Cleanup'
    ],
    popular: false
  }
]

export const ClientSubscriptions: React.FC = () => {
  const navigate = useNavigate()
  const { user, customer } = useClientAuth()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [activeSub, setActiveSub] = useState<Subscription | null>(null)
  const [availablePlans, setAvailablePlans] = useState<SubscriptionPlan[]>(DEFAULT_CLIENT_PLANS)

  const fetchSubscriptionAndPlans = async () => {
    setLoading(true)
    try {
      // 1. Fetch available custom plans created by admin
      const { data: plansData, error: plansErr } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (!plansErr && plansData && plansData.length > 0) {
        const parsedPlans = plansData.map((item: any) => ({
          ...item,
          features: Array.isArray(item.features)
            ? item.features
            : typeof item.features === 'string'
            ? JSON.parse(item.features)
            : []
        }))
        setAvailablePlans(parsedPlans)
      } else {
        setAvailablePlans(DEFAULT_CLIENT_PLANS)
      }

      // 2. Fetch customer active subscription if logged in
      if (customer) {
        const { data, error } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('customer_id', customer.id)
          .in('status', ['Active', 'Cancelled'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (!error && data) {
          setActiveSub(data)
        }
      }
    } catch (err: any) {
      console.warn('Fetch subscriptions error:', err)
      setAvailablePlans(DEFAULT_CLIENT_PLANS)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSubscriptionAndPlans()
  }, [customer])

  const handleOpenCheckout = (plan: SubscriptionPlan) => {
    showToast(`Redirecting to Booking Checkout for ${plan.name}...`, 'info')
    navigate('/dashboard/book')
  }

  const handleCancelSub = async () => {
    if (!activeSub) return
    if (!window.confirm('Are you sure you want to cancel your detailing pass? You will retain access until the end of your billing cycle.')) return

    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ status: 'Cancelled' })
        .eq('id', activeSub.id)

      if (error) throw error
      showToast('Subscription cancelled successfully.', 'info')
      fetchSubscriptionAndPlans()
    } catch (err: any) {
      showToast('Cancellation failed: ' + err.message, 'error')
    }
  }

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <Spinner size="large" />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in text-left">
      <div>
        <h1 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
          <ShieldCheck className="h-5.5 w-5.5 text-[#8B5E3C] dark:text-amber-400" />
          <span>My Detailing Subscription & Membership Passes</span>
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">Subscribe to detailing passes and unlock premium wash cycles with exclusive offer pricing.</p>
      </div>

      {activeSub ? (
        /* Active Subscription Details Card */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                activeSub.status === 'Active' 
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-450' 
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-450'
              }`}>
                {activeSub.status}
              </span>
              <h2 className="text-lg font-black text-slate-800 dark:text-white">{activeSub.plan_name}</h2>
            </div>
            
            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <IndianRupee className="h-4 w-4 text-slate-400" />
                <span>Price: <strong className="text-slate-700 dark:text-slate-200">₹{activeSub.price} / {activeSub.billing_cycle || 'month'}</strong></span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span>Renews: <strong className="text-slate-700 dark:text-slate-200">{new Date(activeSub.end_date).toLocaleDateString()}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 w-full md:w-auto">
            {activeSub.status === 'Active' ? (
              <button
                onClick={handleCancelSub}
                className="px-6 py-3 border border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-600 font-bold text-xs rounded-2xl transition-all cursor-pointer text-center"
              >
                Cancel Subscription
              </button>
            ) : (
              <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider md:text-right">
                Cancelled - active until {new Date(activeSub.end_date).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      ) : (
        /* Dynamic Subscription Plans Grid */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {availablePlans.map((plan) => (
            <div
              key={plan.id || plan.name}
              className={`bg-white dark:bg-slate-900 rounded-3xl border overflow-hidden flex flex-col justify-between transition-all relative ${
                plan.popular 
                  ? 'border-[#8B5E3C] dark:border-amber-500 shadow-md ring-2 ring-amber-500/10' 
                  : 'border-slate-200 dark:border-slate-800 shadow-xs'
              }`}
            >
              {/* Offer Tag Badge */}
              {plan.offer_tag && (
                <div className="absolute top-3 left-4 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  <span>{plan.offer_tag}</span>
                </div>
              )}

              {plan.popular && (
                <span className="absolute top-3 right-3 bg-[#8B5E3C] text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1 shadow-xs">
                  <Sparkles className="h-3 w-3" />
                  <span>Best Deal</span>
                </span>
              )}
              
              <div className="p-6 space-y-6 pt-10">
                <div className="space-y-2">
                  <h3 className="font-extrabold text-slate-800 dark:text-white text-base">{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-slate-900 dark:text-white">₹{plan.price}</span>
                    <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold">/{plan.billing_cycle || 'month'}</span>
                  </div>
                </div>

                <div className="space-y-3.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  {Array.isArray(plan.features) && plan.features.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 bg-slate-50/50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => handleOpenCheckout(plan)}
                  className={`w-full py-3 font-bold text-xs uppercase tracking-wider rounded-2xl transition-all cursor-pointer text-center ${
                    plan.popular
                      ? 'bg-[#8B5E3C] hover:bg-[#6D472B] text-white shadow-md'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  Subscribe Now
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

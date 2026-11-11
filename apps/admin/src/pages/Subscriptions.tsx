import React, { useEffect, useState, useRef } from 'react'
import { ShieldCheck, Search, Users, IndianRupee, Calendar, Sparkles, Plus, Edit2, Trash2, CheckCircle2, Tag, Layers } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from '../context/ToastContext'
import { SkeletonLoader } from '../components/Spinner'
import { Modal } from '../components/Modal'

interface Subscription {
  id: string;
  customer_id: string;
  plan_name: string;
  price: number;
  billing_cycle: string;
  status: 'Active' | 'Cancelled' | 'Expired' | 'Suspended';
  start_date: string;
  end_date: string;
  customers: {
    name: string;
    email: string;
  } | null;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  billing_cycle: string;
  offer_tag: string | null;
  features: string[];
  is_active: boolean;
  popular: boolean;
}

const DEFAULT_PLANS: SubscriptionPlan[] = [
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
    is_active: true,
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
    is_active: true,
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
    is_active: true,
    popular: false
  }
]

export const Subscriptions: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'members' | 'plans'>('members')
  const [loading, setLoading] = useState(true)
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [customPlans, setCustomPlans] = useState<SubscriptionPlan[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const { showToast } = useToast()

  // Plan Modal States
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null)
  const [planName, setPlanName] = useState('')
  const [planPrice, setPlanPrice] = useState('')
  const [billingCycle, setBillingCycle] = useState('Monthly')
  const [offerTag, setOfferTag] = useState('')
  const [featuresText, setFeaturesText] = useState('')
  const [isPopular, setIsPopular] = useState(false)
  const [isActive, setIsActive] = useState(true)
  const [savingPlan, setSavingPlan] = useState(false)

  const fetchSubscriptions = async () => {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          customers (
            name,
            email
          )
        `)
        .order('created_at', { ascending: false })

      if (!error && data) {
        setSubscriptions((data as unknown as Subscription[]) || [])
      }
    } catch (err: any) {
      console.error('Fetch subscriptions error:', err)
    }
  }

  const fetchPlans = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('created_at', { ascending: false })

      if (error || !data || data.length === 0) {
        setCustomPlans(DEFAULT_PLANS)
      } else {
        const parsed = data.map((item: any) => ({
          ...item,
          features: Array.isArray(item.features)
            ? item.features
            : typeof item.features === 'string'
            ? JSON.parse(item.features)
            : []
        }))
        setCustomPlans(parsed)
      }
    } catch (err: any) {
      console.warn('Fetch subscription plans error, fallback to defaults:', err)
      setCustomPlans(DEFAULT_PLANS)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSubscriptions()
    fetchPlans()

    const channel1 = supabase
      .channel('subs-realtime-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subscriptions' }, () => {
        fetchSubscriptions()
      })
      .subscribe()

    const channel2 = supabase
      .channel('plans-realtime-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subscription_plans' }, () => {
        fetchPlans(true)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel1)
      supabase.removeChannel(channel2)
    }
  }, [])

  const updateSubStatus = async (id: string, newStatus: string) => {
    setUpdatingId(id)
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ status: newStatus })
        .eq('id', id)

      if (error) throw error
      showToast(`Subscription status updated to ${newStatus}`, 'success')
      fetchSubscriptions()
    } catch (err: any) {
      showToast('Update failed: ' + err.message, 'error')
    } finally {
      setUpdatingId(null)
    }
  }

  // Open Modal for Create Plan
  const openCreatePlanModal = () => {
    setEditingPlan(null)
    setPlanName('')
    setPlanPrice('')
    setBillingCycle('Monthly')
    setOfferTag('')
    setFeaturesText('')
    setIsPopular(false)
    setIsActive(true)
    setIsPlanModalOpen(true)
  }

  // Open Modal for Edit Plan
  const openEditPlanModal = (plan: SubscriptionPlan) => {
    setEditingPlan(plan)
    setPlanName(plan.name)
    setPlanPrice(plan.price.toString())
    setBillingCycle(plan.billing_cycle || 'Monthly')
    setOfferTag(plan.offer_tag || '')
    setFeaturesText(Array.isArray(plan.features) ? plan.features.join('\n') : '')
    setIsPopular(plan.popular || false)
    setIsActive(plan.is_active ?? true)
    setIsPlanModalOpen(true)
  }

  // Save Custom Subscription Plan (Create or Update)
  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!planName.trim() || !planPrice || isNaN(Number(planPrice))) {
      showToast('Please enter a valid plan name and numeric price', 'warning')
      return
    }

    setSavingPlan(true)
    try {
      const featuresArray = featuresText
        .split('\n')
        .map(f => f.trim())
        .filter(f => f.length > 0)

      const payload = {
        name: planName.trim(),
        price: parseFloat(planPrice),
        billing_cycle: billingCycle,
        offer_tag: offerTag.trim() || null,
        features: featuresArray,
        popular: isPopular,
        is_active: isActive
      }

      if (editingPlan && !editingPlan.id.startsWith('default-')) {
        const { error } = await supabase
          .from('subscription_plans')
          .update(payload)
          .eq('id', editingPlan.id)

        if (error) {
          if (error.message.includes('subscription_plans')) {
            // Local state fallback if SQL table not run yet
            setCustomPlans(prev => prev.map(p => p.id === editingPlan.id ? { ...p, ...payload, features: featuresArray } : p))
            showToast(`Plan "${planName}" updated locally!`, 'success')
            setIsPlanModalOpen(false)
            return
          }
          throw error
        }
        showToast(`Plan "${planName}" updated successfully!`, 'success')
      } else {
        const { data, error } = await supabase
          .from('subscription_plans')
          .insert(payload)
          .select()

        if (error) {
          if (error.message.includes('subscription_plans')) {
            // Local state fallback if SQL table not run yet
            const newLocalPlan: SubscriptionPlan = {
              id: 'custom-' + Date.now(),
              ...payload,
              features: featuresArray
            }
            setCustomPlans(prev => [newLocalPlan, ...prev])
            showToast(`New Plan "${planName}" created! (Saved locally)`, 'success')
            setIsPlanModalOpen(false)
            return
          }
          throw error
        }
        showToast(`New Plan "${planName}" created with offer tag!`, 'success')
      }

      setIsPlanModalOpen(false)
      fetchPlans()
    } catch (err: any) {
      showToast('Error saving plan: ' + err.message, 'error')
    } finally {
      setSavingPlan(false)
    }
  }

  const handleDeletePlan = async (id: string, name: string) => {
    if (id.startsWith('default-')) {
      setCustomPlans(prev => prev.filter(p => p.id !== id))
      showToast(`Plan "${name}" removed.`, 'info')
      return
    }

    if (!window.confirm(`Are you sure you want to permanently delete plan "${name}" from database?`)) return

    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .delete()
        .eq('id', id)
        .select()

      if (error) throw error

      if (!data || data.length === 0) {
        const { error: retryError } = await supabase
          .from('subscription_plans')
          .delete()
          .match({ id: id })
        if (retryError) throw retryError
      }

      showToast(`Plan "${name}" permanently deleted from database!`, 'success')
      fetchPlans()
    } catch (err: any) {
      showToast('Delete failed: ' + err.message, 'error')
    }
  }

  // Toggle Plan Active Status
  const handleTogglePlanActive = async (plan: SubscriptionPlan) => {
    if (plan.id.startsWith('default-')) {
      setCustomPlans(prev => prev.map(p => p.id === plan.id ? { ...p, is_active: !p.is_active } : p))
      showToast(`Plan status updated to ${!plan.is_active ? 'Active' : 'Inactive'}`, 'info')
      return
    }

    try {
      const { error } = await supabase
        .from('subscription_plans')
        .update({ is_active: !plan.is_active })
        .eq('id', plan.id)

      if (error) throw error
      showToast(`Plan status updated!`, 'success')
      fetchPlans()
    } catch (err: any) {
      showToast('Toggle failed: ' + err.message, 'error')
    }
  }

  // Member Filter Logic
  const filteredSubscribers = subscriptions.filter((sub) => {
    const custName = sub.customers?.name?.toLowerCase() || ''
    const custEmail = sub.customers?.email?.toLowerCase() || ''
    const pName = sub.plan_name.toLowerCase()
    
    const matchesSearch = custName.includes(searchTerm.toLowerCase()) || 
                          custEmail.includes(searchTerm.toLowerCase()) ||
                          pName.includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'All' || sub.status === statusFilter

    return matchesSearch && matchesStatus
  })

  // Metric summaries
  const totalSubscribers = subscriptions.filter(s => s.status === 'Active' || s.status === 'Cancelled').length
  const activeSubs = subscriptions.filter(s => s.status === 'Active').length
  const mrr = subscriptions
    .filter(s => s.status === 'Active')
    .reduce((sum, s) => sum + parseFloat(s.price.toString()), 0)

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Detailing Subscriptions & Custom Offers</h1>
          <p className="text-slate-500 text-sm mt-0.5 font-medium">Manage customer membership passes, active cycles, and create custom subscription plans with special offer tags.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={openCreatePlanModal}
            className="px-4 py-2.5 bg-[#8B5E3C] hover:bg-[#6D472B] text-white font-extrabold rounded-xl shadow-md text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all"
          >
            <Plus className="h-4 w-4" /> Create Custom Plan
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 animate-fade-in">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Members</span>
            <span className="block text-2xl font-black text-slate-800">{activeSubs}</span>
          </div>
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
            <ShieldCheck className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Plans Available</span>
            <span className="block text-2xl font-black text-slate-800">{customPlans.filter(p => p.is_active).length}</span>
          </div>
          <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
            <Layers className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Monthly Recurring Revenue</span>
            <span className="block text-2xl font-black text-slate-800">₹{mrr.toFixed(2)}</span>
          </div>
          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
            <IndianRupee className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab('members')}
          className={`pb-3 text-xs font-black uppercase tracking-wider transition-all cursor-pointer relative ${
            activeTab === 'members'
              ? 'text-[#8B5E3C] border-b-2 border-[#8B5E3C]'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Active Member Passes ({subscriptions.length})
        </button>

        <button
          onClick={() => setActiveTab('plans')}
          className={`pb-3 text-xs font-black uppercase tracking-wider transition-all cursor-pointer relative ${
            activeTab === 'plans'
              ? 'text-[#8B5E3C] border-b-2 border-[#8B5E3C]'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Custom Subscription Plans & Offers ({customPlans.length})
        </button>
      </div>

      {/* TAB 1: Member Subscriptions */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="h-4.5 w-4.5" />
              </span>
              <input
                type="text"
                placeholder="Search member name, email or plan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-750 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all text-xs"
              />
            </div>

            <div className="flex items-center gap-2 min-w-max">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Cancelled">Cancelled</option>
                <option value="Suspended">Suspended</option>
              </select>
            </div>
          </div>

          {filteredSubscribers.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 py-16 text-center shadow-xs">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 mx-auto mb-4 border border-slate-100">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">No Active Members Found</h3>
              <p className="text-slate-450 text-sm mt-1 max-w-xs mx-auto">Member passes will appear here when clients subscribe to plans.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-black uppercase tracking-wider text-slate-450">
                      <th className="px-6 py-4">Customer Details</th>
                      <th className="px-6 py-4">Plan Name</th>
                      <th className="px-6 py-4">Pricing</th>
                      <th className="px-6 py-4">Next Renewal / Expiry</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {filteredSubscribers.map((sub) => (
                      <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-800">{sub.customers?.name || 'Customer'}</div>
                          <div className="text-[10px] text-slate-450 mt-0.5">{sub.customers?.email || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-800">{sub.plan_name}</td>
                        <td className="px-6 py-4">
                          <span className="font-bold text-slate-800">₹{sub.price}</span>
                          <span className="text-[10px] text-slate-450"> / {sub.billing_cycle || 'Monthly'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 font-semibold text-slate-600">
                            <Calendar className="h-4 w-4 text-slate-400" />
                            <span>{new Date(sub.end_date).toLocaleDateString()}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                            sub.status === 'Active' 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : sub.status === 'Cancelled'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}>
                            {sub.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex gap-2 justify-end">
                            {sub.status !== 'Active' && (
                              <button
                                onClick={() => updateSubStatus(sub.id, 'Active')}
                                disabled={updatingId === sub.id}
                                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded font-black text-[9px] uppercase tracking-wider cursor-pointer"
                              >
                                Activate
                              </button>
                            )}
                            {sub.status !== 'Suspended' && (
                              <button
                                onClick={() => updateSubStatus(sub.id, 'Suspended')}
                                disabled={updatingId === sub.id}
                                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded font-black text-[9px] uppercase tracking-wider cursor-pointer"
                              >
                                Suspend
                              </button>
                            )}
                            {sub.status !== 'Cancelled' && (
                              <button
                                onClick={() => updateSubStatus(sub.id, 'Cancelled')}
                                disabled={updatingId === sub.id}
                                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded font-black text-[9px] uppercase tracking-wider cursor-pointer"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Subscription Plans & Offers Manager */}
      {activeTab === 'plans' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {customPlans.map((plan) => (
            <div
              key={plan.id}
              className={`bg-white rounded-3xl border p-6 flex flex-col justify-between transition-all relative ${
                plan.popular 
                  ? 'border-amber-500 shadow-md ring-2 ring-amber-500/20' 
                  : 'border-slate-200 shadow-xs'
              } ${!plan.is_active ? 'opacity-65 bg-slate-50/70' : ''}`}
            >
              {/* Offer Tag Badge */}
              {plan.offer_tag && (
                <div className="absolute -top-3 left-6 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  <span>{plan.offer_tag}</span>
                </div>
              )}

              {plan.popular && (
                <span className="absolute top-3 right-3 bg-amber-500 text-slate-950 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1 shadow-xs">
                  <Sparkles className="h-3 w-3" /> Popular
                </span>
              )}

              <div className="space-y-4 pt-2">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-slate-900 text-base">{plan.name}</h3>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                      plan.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {plan.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-3xl font-black text-slate-900">₹{plan.price}</span>
                    <span className="text-slate-500 text-xs font-semibold">/{plan.billing_cycle || 'Monthly'}</span>
                  </div>
                </div>

                {/* Features Checklist */}
                <div className="space-y-2.5 pt-3 border-t border-slate-100">
                  {Array.isArray(plan.features) && plan.features.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-6 border-t border-slate-100 mt-6 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleTogglePlanActive(plan)}
                  className={`px-3 py-1.5 rounded-xl font-extrabold text-[10px] uppercase tracking-wider transition-all cursor-pointer ${
                    plan.is_active
                      ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  {plan.is_active ? 'Deactivate' : 'Activate'}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEditPlanModal(plan)}
                    className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
                    title="Edit Plan"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeletePlan(plan.id, plan.name)}
                    className="p-2 text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition-all cursor-pointer"
                    title="Delete Plan"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE / EDIT PLAN MODAL */}
      <Modal
        isOpen={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
        title={editingPlan ? `Edit Subscription Plan: ${editingPlan.name}` : "Create Custom Subscription Plan & Offer"}
      >
        <form onSubmit={handleSavePlan} className="space-y-4 text-left">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-extrabold text-slate-700 uppercase mb-1">Plan Name *</label>
              <input
                type="text"
                required
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                placeholder="e.g. Royal Polish Pass"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-slate-700 uppercase mb-1">Price (₹) *</label>
              <input
                type="number"
                required
                value={planPrice}
                onChange={(e) => setPlanPrice(e.target.value)}
                placeholder="e.g. 1499"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-extrabold text-slate-700 uppercase mb-1">Billing Cycle</label>
              <select
                value={billingCycle}
                onChange={(e) => setBillingCycle(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]"
              >
                <option value="Monthly">Monthly</option>
                <option value="Quarterly">Quarterly</option>
                <option value="Yearly">Yearly</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-slate-700 uppercase mb-1">Offer Tag / Discount Badge</label>
              <input
                type="text"
                value={offerTag}
                onChange={(e) => setOfferTag(e.target.value)}
                placeholder="e.g. 🔥 SAVE 30% OFF or FLAT ₹500 OFF"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-extrabold text-slate-700 uppercase mb-1">
              Included Features List (One per line)
            </label>
            <textarea
              rows={4}
              value={featuresText}
              onChange={(e) => setFeaturesText(e.target.value)}
              placeholder="e.g.&#10;4 Doorstep Steam Washes / Mo&#10;Full Interior Deep Vacuuming&#10;Hydrophobic Ceramic Coating&#10;Priority Slot Booking"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]"
            />
          </div>

          <div className="flex items-center gap-6 pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
              <input
                type="checkbox"
                checked={isPopular}
                onChange={(e) => setIsPopular(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 accent-[#8B5E3C] cursor-pointer"
              />
              <span>Mark as Popular / Best Value</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 accent-[#8B5E3C] cursor-pointer"
              />
              <span>Active for Client Purchase</span>
            </label>
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsPlanModalOpen(false)}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingPlan}
              className="px-6 py-2.5 bg-[#8B5E3C] hover:bg-[#6D472B] text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              {savingPlan ? 'Saving Plan...' : editingPlan ? 'Update Plan' : 'Create Custom Plan'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

import React, { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, Ticket, ToggleLeft, ToggleRight, Sparkles, Search, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from '../context/ToastContext'
import { Spinner } from '../components/Spinner'

interface Coupon {
  id: string;
  code: string;
  discount_amount: number;
  customer_id: string | null;
  is_used: boolean;
  created_at: string;
  customers?: {
    name: string;
    email: string;
  } | null;
}

interface Customer {
  id: string;
  name: string;
  email: string;
}

export const Offers: React.FC = () => {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [savingSettings, setSavingSettings] = useState(false)
  const [creatingCoupon, setCreatingCoupon] = useState(false)
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  // Settings state
  const [autoDiscountEnabled, setAutoDiscountEnabled] = useState(true)
  const [autoDiscountAmount, setAutoDiscountAmount] = useState(99)

  // New Coupon Form state
  const [newCode, setNewCode] = useState('')
  const [newAmount, setNewAmount] = useState(99)
  const [selectedCustomerId, setSelectedCustomerId] = useState('')

  const fetchOffersData = async (silent = false) => {
    try {
      if (!silent) setLoading(true)

      // Fetch Settings
      const { data: settingsData } = await supabase
        .from('settings')
        .select('auto_new_user_discount_enabled, auto_new_user_discount_amount')
        .eq('id', 1)
        .single()

      if (settingsData) {
        setAutoDiscountEnabled(!!settingsData.auto_new_user_discount_enabled)
        setAutoDiscountAmount(settingsData.auto_new_user_discount_amount || 99)
      }

      // Fetch Customers
      const { data: customersData } = await supabase
        .from('customers')
        .select('id, name, email')
        .order('name', { ascending: true })

      setCustomers(customersData || [])

      // Fetch Coupons
      const { data: couponsData, error: couponsError } = await supabase
        .from('coupons')
        .select(`
          id, code, discount_amount, customer_id, is_used, created_at,
          customers ( name, email )
        `)
        .order('created_at', { ascending: false })

      if (couponsError && couponsError.message.includes('relation "public.coupons" does not exist')) {
        showToast('Coupons table does not exist. Please run migration SQL in your Supabase SQL Editor!', 'error')
      } else {
        // Supabase untyped client infers `customers` as an array; normalize to the
        // single-object shape declared on Coupon before storing in state.
        setCoupons((couponsData || []) as unknown as Coupon[])
      }

    } catch (err: any) {
      console.error('Offers fetch error:', err)
      if (!silent) showToast('Error loading offers: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOffersData()

    const channel = supabase
      .channel('coupons-realtime-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'coupons' }, () => {
        fetchOffersData(true)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleSaveSettings = async () => {
    try {
      setSavingSettings(true)
      const { error } = await supabase
        .from('settings')
        .update({
          auto_new_user_discount_enabled: autoDiscountEnabled,
          auto_new_user_discount_amount: autoDiscountAmount
        })
        .eq('id', 1)

      if (error) throw error
      showToast('Offer settings saved successfully', 'success')
    } catch (err: any) {
      showToast('Failed to save settings: ' + err.message, 'error')
    } finally {
      setSavingSettings(false)
    }
  }

  const handleGenerateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = 'RWASH'
    for (let i = 0; i < 5; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setNewCode(result)
  }

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCode.trim()) {
      showToast('Please enter a coupon code', 'warning')
      return
    }

    try {
      setCreatingCoupon(true)
      const couponCodeVal = newCode.trim().toUpperCase()
      const { error } = await supabase
        .from('coupons')
        .insert({
          code: couponCodeVal,
          discount_amount: newAmount,
          customer_id: selectedCustomerId || null,
          is_used: false
        })

      if (error) throw error

      // Dispatch real-time push notification for the shared offer
      try {
        const notiTitle = selectedCustomerId ? "Special Offer For You!" : "New Promo Code Shared!"
        const notiMsg = selectedCustomerId
          ? `Exclusive coupon code "${couponCodeVal}" has been assigned to you. Get ₹${newAmount} off on checkout!`
          : `A new public offer "${couponCodeVal}" is active! Use it on checkout to get ₹${newAmount} discount.`;

        await supabase.from('notifications').insert({
          title: notiTitle,
          message: notiMsg,
          customer_id: selectedCustomerId || null,
          is_read: false
        })
      } catch (notiErr) {
        console.warn('Failed to dispatch notification:', notiErr)
      }

      showToast(`Coupon ${couponCodeVal} created successfully`, 'success')
      setNewCode('')
      setSelectedCustomerId('')
      fetchOffersData()
    } catch (err: any) {
      showToast('Failed to create coupon: ' + err.message, 'error')
    } finally {
      setCreatingCoupon(false)
    }
  }

  const handleDeleteCoupon = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this coupon from the database?')) return

    try {
      const { data, error } = await supabase
        .from('coupons')
        .delete()
        .eq('id', id)
        .select()

      if (error) throw error

      if (!data || data.length === 0) {
        const { error: retryError } = await supabase
          .from('coupons')
          .delete()
          .match({ id: id })
        if (retryError) throw retryError
      }

      showToast('Coupon permanently deleted from database!', 'info')
      fetchOffersData()
    } catch (err: any) {
      showToast('Failed to delete coupon: ' + err.message, 'error')
    }
  }

  const filteredCoupons = coupons.filter(c => 
    c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.customers?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.customers?.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="py-24 flex justify-center">
        <Spinner size="large" />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight uppercase">Offers & Discounts</h1>
          <p className="text-xs text-slate-500 font-bold mt-1">Manage customer coupons and automatic registration gifts.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Auto Discount & Coupon Maker Forms */}
        <div className="lg:col-span-1 space-y-8">
          
          {/* Automatic Sign Up Gift Settings Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 shadow-xs">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <Sparkles className="h-5 w-5 text-primary-600 dark:text-sky-400" />
              <h2 className="font-extrabold text-base text-slate-900 dark:text-white">Auto Sign-up Gift</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Automatic Coupon Status</span>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Toggle new user gift coupons ON/OFF.</p>
                </div>
                <button 
                  onClick={() => setAutoDiscountEnabled(!autoDiscountEnabled)}
                  className="focus:outline-none transition-colors cursor-pointer"
                >
                  {autoDiscountEnabled ? (
                    <ToggleRight className="h-10 w-10 text-emerald-500" />
                  ) : (
                    <ToggleLeft className="h-10 w-10 text-slate-400 dark:text-slate-600" />
                  )}
                </button>
              </div>

              {autoDiscountEnabled && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Discount Amount (₹)</label>
                  <input 
                    type="number" 
                    value={autoDiscountAmount}
                    onChange={(e) => setAutoDiscountAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g. 99"
                  />
                </div>
              )}

              <button
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 active:scale-[0.98] text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-primary-600/20"
              >
                {savingSettings ? <RefreshCw className="h-4.5 w-4.5 animate-spin" /> : 'Save Settings'}
              </button>
            </div>
          </div>

          {/* Create Coupon Form Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 shadow-xs">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <Ticket className="h-5 w-5 text-primary-600 dark:text-sky-400" />
              <h2 className="font-extrabold text-base text-slate-900 dark:text-white">Create New Coupon</h2>
            </div>

            <form onSubmit={handleCreateCoupon} className="space-y-4">
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Coupon Code</label>
                  <button 
                    type="button" 
                    onClick={handleGenerateRandomCode}
                    className="text-[10px] text-primary-600 dark:text-sky-400 font-bold hover:underline cursor-pointer"
                  >
                    Generate Random
                  </button>
                </div>
                <input 
                  type="text" 
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g. WELCOME99"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Discount Value (₹)</label>
                <input 
                  type="number" 
                  value={newAmount}
                  onChange={(e) => setNewAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="99"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Assign Customer (Optional)</label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Public / Any Customer</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={creatingCoupon}
                className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 active:scale-[0.98] text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-primary-600/20"
              >
                {creatingCoupon ? <RefreshCw className="h-4.5 w-4.5 animate-spin" /> : <><Plus className="h-4.5 w-4.5" /> Create Coupon</>}
              </button>
            </form>
          </div>

        </div>

        {/* Right Side: Active Coupons List */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search coupons by code or customer details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:outline-none font-medium shadow-xs"
            />
          </div>

          {/* Coupons Table List */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
                    <th className="px-6 py-4 text-[10px] font-extrabold uppercase text-slate-600 dark:text-slate-400 tracking-wider">Coupon Code</th>
                    <th className="px-6 py-4 text-[10px] font-extrabold uppercase text-slate-600 dark:text-slate-400 tracking-wider">Discount Value</th>
                    <th className="px-6 py-4 text-[10px] font-extrabold uppercase text-slate-600 dark:text-slate-400 tracking-wider">Customer Link</th>
                    <th className="px-6 py-4 text-[10px] font-extrabold uppercase text-slate-600 dark:text-slate-400 tracking-wider">Usage Status</th>
                    <th className="px-6 py-4 text-right text-[10px] font-extrabold uppercase text-slate-600 dark:text-slate-400 tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredCoupons.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-xs text-slate-400 font-bold">
                        No active coupons found.
                      </td>
                    </tr>
                  ) : (
                    filteredCoupons.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 bg-primary-50 dark:bg-sky-950/40 text-primary-700 dark:text-sky-300 text-xs font-black rounded-lg border border-primary-200 dark:border-sky-900/50">
                            {c.code}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-black text-xs text-slate-900 dark:text-white">
                          ₹{parseFloat(c.discount_amount.toString()).toFixed(2)}
                        </td>
                        <td className="px-6 py-4">
                          {c.customers ? (
                            <div className="flex flex-col">
                              <span className="text-xs font-extrabold text-slate-900 dark:text-slate-200">{c.customers.name}</span>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">{c.customers.email}</span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-wider px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700">
                              Public Code
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {c.is_used ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold rounded-full border border-emerald-200 dark:border-emerald-900/50">
                              <CheckCircle className="h-3 w-3" /> Used / Expired
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[10px] font-bold rounded-full border border-amber-200 dark:border-amber-900/50">
                              <XCircle className="h-3 w-3" /> Active / Unused
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleDeleteCoupon(c.id)}
                            className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-600 dark:text-slate-300 hover:text-rose-600 rounded-xl transition-all cursor-pointer"
                            title="Delete / Revoke Coupon"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

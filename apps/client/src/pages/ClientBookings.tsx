import React, { useEffect, useState } from 'react'
import { CalendarDays, AlertCircle, FileText, CheckCircle2, Clock, MapPin, Phone, User, X, Star } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useClientAuth } from '../context/ClientAuthContext'
import { SkeletonLoader } from '../components/Spinner'
import { useToast } from '../context/ToastContext'
import { Modal } from '../components/Modal'
import { ConfirmDialog } from '../components/ConfirmDialog'

interface Booking {
  id: string;
  booking_date: string;
  booking_time: string;
  status: 'Pending' | 'Confirmed' | 'Assigned' | 'In Progress' | 'Completed' | 'Cancelled';
  vehicle_type: string;
  notes: string | null;
  coupon_code: string | null;
  discount_amount: number | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  services?: {
    id: string;
    name: string;
    price: number;
    description: string | null;
  } | null;
}

export const ClientBookings: React.FC = () => {
  const { user } = useClientAuth()
  const { showToast } = useToast()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)

  // Review modal state
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)

  // Cancel dialog state
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null)
  const [cancelling, setCancelling] = useState(false)

  const fetchBookings = async () => {
    if (!user) return
    try {
      setLoading(true)
 
      const { data: custData } = await supabase
        .from('customers')
        .select('id')
        .or(`profile_id.eq.${user.id},id.eq.${user.id}${user.phone ? `,phone.eq.${user.phone}` : ''}`)
        .maybeSingle()

      if (!custData) {
        setBookings([])
        return
      }

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          booking_time,
          status,
          vehicle_type,
          notes,
          coupon_code,
          discount_amount,
          address,
          latitude,
          longitude,
          services (
            id,
            name,
            price,
            description
          )
        `)
        .eq('customer_id', custData.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setBookings((data as any[]) || [])
    } catch (err: any) {
      console.error('Client bookings fetch error:', err)
      showToast('Error loading bookings: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBookings()

    if (!user) return
    const channel = supabase
      .channel('client-bookings-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        fetchBookings()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  const triggerCancel = (b: Booking) => {
    setCancelTarget(b)
  }

  const confirmCancel = async () => {
    if (!cancelTarget) return
    try {
      setCancelling(true)
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'Cancelled' })
        .eq('id', cancelTarget.id)

      if (error) throw error
      showToast('Booking cancelled successfully', 'info')
      setCancelTarget(null)
      fetchBookings()
    } catch (err: any) {
      showToast('Failed to cancel: ' + err.message, 'error')
    } finally {
      setCancelling(false)
    }
  }

  const openReviewModal = (b: Booking) => {
    setReviewBooking(b)
    setRating(5)
    setComment('')
  }

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reviewBooking || !user) return

    try {
      setSubmittingReview(true)
      const { data: custData } = await supabase
        .from('customers')
        .select('id')
        .eq('profile_id', user.id)
        .single()

      const { error } = await supabase
        .from('reviews')
        .insert({
          customer_id: custData?.id || null,
          service_id: reviewBooking.services?.id || null,
          rating,
          comment
        })

      if (error) throw error

      showToast('Thank you! Review submitted successfully.', 'success')
      setReviewBooking(null)
    } catch (err: any) {
      showToast('Failed to submit review: ' + err.message, 'error')
    } finally {
      setSubmittingReview(false)
    }
  }

  const downloadInvoice = (b: Booking) => {
    const priceVal = b.services?.price ? `₹${parseFloat(b.services.price.toString()).toFixed(2)}` : 'N/A'
    const discountVal = b.discount_amount ? `₹${parseFloat(b.discount_amount.toString()).toFixed(2)}` : '₹0.00'
    const invoiceContent = `
==============================================
               RWASH CAR DETAILING
                INVOICE RECEIPT
==============================================
Booking Reference ID : ${b.id}
Date & Time          : ${b.booking_date} at ${b.booking_time}
Service Name         : ${b.services?.name || 'Wash Package'}
Vehicle Details      : ${b.vehicle_type}
Booking Status       : ${b.status}
----------------------------------------------
Service Price        : ${priceVal}
Coupon Code          : ${b.coupon_code || 'None'}
Discount Amount      : ${discountVal}
Doorstep Location    : ${b.address || 'Standard Wash Center'}
==============================================
Thank you for choosing RWash Detailing Services!
==============================================
`
    const element = document.createElement('a')
    const file = new Blob([invoiceContent], { type: 'text/plain' })
    element.href = URL.createObjectURL(file)
    element.download = `Invoice_${b.id.substring(0, 8)}.txt`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
    showToast('Invoice downloaded successfully', 'success')
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      Pending: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/50',
      Confirmed: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900/50',
      Assigned: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/50',
      Completed: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50',
      Cancelled: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700',
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${badges[status] || badges.Pending}`}>
        {status}
      </span>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in text-left">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Booking History</h1>
        <p className="text-slate-600 dark:text-slate-400 text-xs mt-0.5 font-medium">Track detailing schedules and write service reviews.</p>
      </div>

      {loading ? (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <SkeletonLoader rows={4} />
        </div>
      ) : bookings.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 py-16 text-center shadow-xs">
          <div className="w-14 h-14 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 mx-auto mb-4 border border-slate-200 dark:border-slate-700">
            <CalendarDays className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">No Detailing History</h3>
          <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-1 max-w-xs mx-auto font-medium">
            You haven't scheduled any wash appointments yet.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase">
                  <th className="px-6 py-4">Service</th>
                  <th className="px-6 py-4">Vehicle Detail</th>
                  <th className="px-6 py-4">Scheduled Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                {bookings.map((b) => {
                  const servPrice = b.services?.price ? `₹${parseFloat(b.services.price.toString()).toFixed(2)}` : '-'
                  return (
                    <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">
                        {b.services?.name || 'Walk-in'}
                      </td>
                      <td className="px-6 py-4">{b.vehicle_type}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 dark:text-white">{b.booking_date}</span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{b.booking_time}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{servPrice}</td>
                      <td className="px-6 py-4">{getStatusBadge(b.status)}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => setSelectedBooking(b)}
                            className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-[10px] font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                          >
                            Details
                          </button>

                          <button
                            onClick={() => downloadInvoice(b)}
                            className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-[10px] font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                          >
                            Invoice
                          </button>

                          {b.status === 'Completed' && (
                            <button
                              onClick={() => openReviewModal(b)}
                              className="px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Star className="h-3 w-3 fill-amber-500 stroke-amber-500" />
                              Review
                            </button>
                          )}

                          {(b.status === 'Pending' || b.status === 'Confirmed' || b.status === 'Assigned') && (
                            <button
                              onClick={() => triggerCancel(b)}
                              className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 rounded-lg text-[10px] font-bold cursor-pointer"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Booking Details Modal */}
      <Modal
        isOpen={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
        title="Appointment Detailing Card"
      >
        {selectedBooking && (
          <div className="space-y-5 text-left">
            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Detailing Package</span>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base mt-0.5">
                {selectedBooking.services?.name || 'Custom Package'}
              </h3>
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <span className="text-xs text-slate-500 font-medium">Service Charge</span>
                <span className="font-black text-slate-900 dark:text-white text-base">
                  {selectedBooking.services?.price ? `₹${parseFloat(selectedBooking.services.price.toString()).toFixed(2)}` : '-'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Vehicle</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedBooking.vehicle_type}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Date & Slot</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedBooking.booking_date} ({selectedBooking.booking_time})</span>
              </div>
            </div>

            {selectedBooking.address && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Doorstep Service Location</span>
                <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">{selectedBooking.address}</p>
              </div>
            )}

            {selectedBooking.notes && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Special Notes</span>
                <p className="text-xs text-slate-600 dark:text-slate-400 italic font-medium">{selectedBooking.notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Review Modal */}
      <Modal
        isOpen={!!reviewBooking}
        onClose={() => setReviewBooking(null)}
        title="Leave Detailing Feedback"
      >
        {reviewBooking && (
          <form onSubmit={submitReview} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Rating</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 cursor-pointer focus:outline-none"
                  >
                    <Star
                      className={`h-6 w-6 ${
                        star <= rating
                          ? 'fill-amber-500 text-amber-500'
                          : 'text-slate-300 dark:text-slate-700'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Your Feedback</label>
              <textarea
                rows={4}
                required
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your experience with our wash team..."
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none font-medium"
              />
            </div>

            <button
              type="submit"
              disabled={submittingReview}
              className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md shadow-primary-600/20"
            >
              {submittingReview ? 'Submitting...' : 'Post Review'}
            </button>
          </form>
        )}
      </Modal>

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={confirmCancel}
        title="Cancel Wash Appointment"
        message={`Are you sure you want to cancel your booking for ${cancelTarget?.booking_date}?`}
        confirmText={cancelling ? 'Cancelling...' : 'Yes, Cancel Appointment'}
        isDanger
      />
    </div>
  )
}

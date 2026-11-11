import React, { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { CalendarDays, Search, Clock, User, Car, Check, Eye, ChevronLeft, ChevronRight, UserCheck, CheckSquare, Bell, FileText, CreditCard } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from '../context/ToastContext'
import { SkeletonLoader } from '../components/Spinner'
import { Modal } from '../components/Modal'
import { playNewBookingAlertSound, requestNotificationPermission, triggerDesktopNotification } from '../utils/audioAlert'
import { downloadInvoicePDF, InvoiceData } from '../utils/invoiceGenerator'
import { sendBookingConfirmationEmail, sendBookingStatusUpdateEmail } from '../utils/emailService'

interface Customer {
  name: string;
  email: string | null;
  phone: string | null;
}

interface Service {
  name: string;
  price: number;
  category: string | null;
}

interface Booking {
  id: string;
  vehicle_type: string;
  booking_date: string;
  booking_time: string;
  status: 'Pending' | 'Confirmed' | 'Assigned' | 'Completed' | 'Cancelled';
  notes: string | null;
  created_at: string;
  customers: Customer | null;
  services: Service | null;
  coupon_code?: string | null;
  discount_amount?: number | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export const Bookings: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('All')
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const ITEMS_PER_PAGE = 8
  
  // Modal for detail inspection
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const { showToast } = useToast()
  const statusOptions = ['All', 'Pending', 'Confirmed', 'Assigned', 'Completed', 'Cancelled']

  const fetchBookings = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const from = (currentPage - 1) * ITEMS_PER_PAGE
      const to = from + ITEMS_PER_PAGE - 1

      let query = supabase
        .from('bookings')
        .select(`
          *,
          customers!left (
            name,
            email,
            phone
          ),
          services!left (
            name,
            price,
            category
          )
        `, { count: 'exact' })
        
      if (selectedStatus !== 'All') {
        query = query.eq('status', selectedStatus)
      }

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) throw error
      setBookings((data as unknown as Booking[]) || [])
      setTotalCount(count || 0)
    } catch (err: any) {
      showToast('Error fetching bookings: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBookings()
  }, [currentPage, selectedStatus])

  // Setup Realtime Sync & Audio Alerts (no polling — realtime handles updates)
  useEffect(() => {
    requestNotificationPermission()

    const channel = supabase
      .channel('bookings-live-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        fetchBookings(true)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentPage, selectedStatus])

  // Route highlight handler
  const location = useLocation()
  useEffect(() => {
    const query = new URLSearchParams(location.search)
    const highlightId = query.get('highlightId')
    if (highlightId) {
      const fetchSpecificBooking = async () => {
        try {
          const { data, error } = await supabase
            .from('bookings')
            .select(`
              *,
              customers!left (
                name,
                email,
                phone
              ),
              services!left (
                name,
                price,
                category
              )
            `)
            .eq('id', highlightId)
            .single()

          if (data && !error) {
            setSelectedBooking(data as unknown as Booking)
          }
        } catch (err) {
          console.error('Error fetching highlighted booking:', err)
        }
      }
      fetchSpecificBooking()
    }
  }, [location.search])

  const updateBookingStatus = async (id: string, newStatus: Booking['status']) => {
    setUpdatingId(id)
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: newStatus })
        .eq('id', id)

      if (error) throw error
      
      // Dispatch status update notification to database & automatic email to client
      try {
        const { data: bookingDetail } = await supabase
          .from('bookings')
          .select('id, booking_date, booking_time, vehicle_type, customer_id, customers(name, email), services(name)')
          .eq('id', id)
          .single()

        if (bookingDetail && bookingDetail.customer_id) {
          await supabase.from('notifications').insert({
            title: `Wash Status Update`,
            message: `Your booking for "${(bookingDetail.services as any)?.name || 'Wash'}" (${bookingDetail.vehicle_type}) has been marked as ${newStatus}.`,
            customer_id: bookingDetail.customer_id,
            is_read: false
          })
        }

        if (bookingDetail && (bookingDetail.customers as any)?.email) {
          sendBookingStatusUpdateEmail({
            customerEmail: (bookingDetail.customers as any).email,
            customerName: (bookingDetail.customers as any).name || 'Valued Customer',
            bookingId: bookingDetail.id,
            newStatus: newStatus as any,
            serviceName: (bookingDetail.services as any)?.name || 'Detailing Wash',
            bookingDate: bookingDetail.booking_date,
            bookingTime: bookingDetail.booking_time,
            vehicleInfo: bookingDetail.vehicle_type
          })
        }
      } catch (notiErr) {
        console.warn('Failed to post status notification/email:', notiErr)
      }
      
      showToast(`Booking marked as ${newStatus} & update email dispatched`, 'success')
      
      setBookings((prev) =>
          prev.map((b) => (b.id === id ? { ...b, status: newStatus } : b))
      )

      if (selectedBooking && selectedBooking.id === id) {
        setSelectedBooking((prev) => prev ? { ...prev, status: newStatus } : null)
      }
    } catch (err: any) {
      showToast('Failed to update status: ' + err.message, 'error')
    } finally {
      setUpdatingId(null)
    }
  }

  const filteredBookings = bookings.filter((b) => {
    const customerName = b.customers?.name || ''
    const vehicleType = b.vehicle_type || ''
    const serviceName = b.services?.name || ''
    
    return (
      customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicleType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      serviceName.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

  const getStatusBadge = (status: Booking['status']) => {
    const badges = {
      Pending: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      Confirmed: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
      Assigned: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      Completed: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      Cancelled: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${badges[status] || badges.Pending}`}>
        {status}
      </span>
    )
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-black text-[#3D1E0B] dark:text-[#FFF5EB] tracking-tight">Wash Bookings</h1>
        <p className="text-[#542E16] dark:text-[#E8C8AE] text-sm mt-0.5 font-semibold">Track, schedule, and update status of client wash orders.</p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-[#210E04] p-4 rounded-2xl border border-[#E6CBB2] dark:border-[#52270D] shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 animate-fade-in transition-colors">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C471E] dark:text-[#E69D62]" />
          <input
            type="text"
            placeholder="Search by customer name, vehicle, or service..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#FFF8F0] dark:bg-[#120702] border border-[#E6CBB2] dark:border-[#52270D] rounded-xl text-[#3D1E0B] dark:text-[#FFF5EB] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#8C471E] font-medium transition-all"
          />
        </div>

        {/* Status filters */}
        <div className="flex overflow-x-auto gap-1.5 pb-2 lg:pb-0 scrollbar-none">
          {statusOptions.map((status) => (
            <button
              key={status}
              onClick={() => {
                setSelectedStatus(status)
                setCurrentPage(1)
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedStatus === status
                  ? 'bg-[#8C471E] dark:bg-[#A65D2E] text-white shadow-xs'
                  : 'bg-[#FFF8F0] dark:bg-[#120702] text-[#542E16] dark:text-[#E8C8AE] border border-[#E6CBB2] dark:border-[#52270D] hover:bg-[#E6CBB2]/40 dark:hover:bg-[#2A1307]'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table Content */}
      {loading ? (
        <div className="bg-white dark:bg-[#210E04] p-8 rounded-2xl border border-[#E6CBB2] dark:border-[#52270D] shadow-xs">
          <SkeletonLoader rows={6} />
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="bg-white dark:bg-[#210E04] rounded-3xl border border-[#E6CBB2] dark:border-[#52270D] py-16 text-center shadow-xs">
          <div className="w-16 h-16 bg-[#FFF8F0] dark:bg-[#120702] rounded-2xl flex items-center justify-center text-[#8C471E] dark:text-[#E69D62] mx-auto mb-4 border border-[#E6CBB2] dark:border-[#52270D]">
            <CalendarDays className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-bold text-[#3D1E0B] dark:text-[#FFF5EB]">No Bookings Found</h3>
          <p className="text-[#542E16] dark:text-[#E8C8AE] text-sm mt-1 max-w-xs mx-auto">
            There are no booking entries matching the current filter.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white dark:bg-[#210E04] rounded-2xl border border-[#E6CBB2] dark:border-[#52270D] shadow-xs overflow-hidden transition-colors">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#FDF0E6] dark:bg-[#2A1307] border-b border-[#E6CBB2] dark:border-[#52270D] text-[#8C471E] dark:text-[#E69D62] text-xs font-black uppercase tracking-wider">
                    <th className="px-6 py-4">Customer Name</th>
                    <th className="px-6 py-4">Vehicle Type</th>
                    <th className="px-6 py-4">Requested Service</th>
                    <th className="px-6 py-4">Date & Time</th>
                    <th className="px-6 py-4">Payment & Deposit</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6CBB2]/40 dark:divide-[#52270D]/40 text-xs text-[#3D1E0B] dark:text-[#FFF5EB]">
                  {filteredBookings.map((booking) => {
                    const custName = booking.customers?.name || 'Walk-in Customer'
                    const servName = booking.services?.name || 'Custom Wash'
                    const servPrice = booking.services?.price ? `₹${parseFloat(booking.services.price.toString()).toFixed(2)}` : '-'

                    return (
                      <tr key={booking.id} className="hover:bg-[#FFF8F0]/80 dark:hover:bg-[#2A1307]/60 transition-colors">
                        <td className="px-6 py-4 font-black text-[#3D1E0B] dark:text-[#FFF5EB]">{custName}</td>
                        <td className="px-6 py-4 font-semibold text-[#542E16] dark:text-[#E8C8AE]">
                          {booking.vehicle_type}
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-bold text-[#3D1E0B] dark:text-[#FFF5EB]">{servName}</p>
                            <p className="text-xs text-[#8C471E] dark:text-[#E69D62] font-black mt-0.5">{servPrice}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-[#3D1E0B] dark:text-[#FFF5EB]">{booking.booking_date}</span>
                            <span className="text-xs text-[#542E16] dark:text-[#E8C8AE] font-semibold mt-0.5 inline-flex items-center gap-1">
                              <Clock className="h-3 w-3 text-[#8C471E] dark:text-[#E69D62]" />
                              {booking.booking_time}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {(() => {
                            const notesStr = booking.notes || ''
                            const isPayOnService = notesStr.includes('Pay on Service')
                            const paidMatch = notesStr.match(/Paid Today:\s*₹(\d+)/)
                            const dueMatch = notesStr.match(/Due at Doorstep:\s*₹(\d+)/)
                            const utrMatch = notesStr.match(/UTR:\s*([A-Za-z0-9]+)/)

                            const paidAmt = paidMatch ? paidMatch[1] : (isPayOnService ? '99' : 'Full')
                            const dueAmt = dueMatch ? dueMatch[1] : '0'
                            const utrVal = utrMatch ? utrMatch[1] : null

                            return (
                              <div className="space-y-1">
                                <div className="text-xs font-black text-[#3D1E0B] dark:text-[#FFF5EB]">
                                  Paid: <span className="text-emerald-600 dark:text-emerald-400 font-black">₹{paidAmt}</span>
                                  <span className="mx-1.5 text-slate-400">•</span>
                                  Due: <span className="text-[#8C471E] dark:text-[#E69D62] font-black">₹{dueAmt}</span>
                                </div>
                                {utrVal && (
                                  <span className="text-[10px] text-[#542E16] dark:text-[#E8C8AE] font-mono font-bold block">
                                    UTR: {utrVal}
                                  </span>
                                )}
                              </div>
                            )
                          })()}
                        </td>
                        <td className="px-6 py-4">{getStatusBadge(booking.status)}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedBooking(booking)}
                              className="p-1.5 text-[#8C471E] dark:text-[#E69D62] hover:bg-[#FFF8F0] dark:hover:bg-[#120702] rounded-lg border border-[#E6CBB2] dark:border-[#52270D] transition-colors cursor-pointer"
                              title="Inspect Details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                const invData: InvoiceData = {
                                  invoiceNumber: `INV-${booking.id.slice(0, 6).toUpperCase()}`,
                                  bookingId: booking.id,
                                  customerName: booking.customers?.name || 'Customer User',
                                  customerEmail: booking.customers?.email || 'customer@example.com',
                                  customerPhone: booking.customers?.phone || undefined,
                                  customerAddress: booking.address || undefined,
                                  vehicleInfo: booking.vehicle_type || undefined,
                                  serviceName: booking.services?.name || 'Detailing Wash Pack',
                                  servicePrice: booking.services?.price || 499,
                                  discountAmount: booking.discount_amount || 0,
                                  couponCode: booking.coupon_code || undefined,
                                  bookingDate: booking.booking_date,
                                  bookingTime: booking.booking_time,
                                  status: booking.status || 'Confirmed',
                                  createdAt: booking.created_at || new Date().toISOString()
                                }
                                downloadInvoicePDF(invData)
                                sendBookingConfirmationEmail(invData)
                                showToast(`📄 PDF Invoice generated & emailed to ${invData.customerEmail}`, 'success')
                              }}
                              className="p-1.5 text-amber-600 dark:text-amber-400 hover:bg-[#FFF8F0] dark:hover:bg-[#120702] rounded-lg border border-[#E6CBB2] dark:border-[#52270D] transition-colors cursor-pointer"
                              title="Download & Send PDF Tax Invoice"
                            >
                              <FileText className="h-4 w-4" />
                            </button>
                             {booking.status === 'Pending' && (
                               <button
                                 onClick={() => updateBookingStatus(booking.id, 'Confirmed')}
                                 disabled={updatingId === booking.id}
                                 className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-[#FFF8F0] dark:hover:bg-[#120702] rounded-lg border border-[#E6CBB2] dark:border-[#52270D] transition-colors cursor-pointer"
                                 title="Confirm Appointment"
                               >
                                 <Check className="h-4 w-4" />
                               </button>
                             )}
                             {booking.status === 'Confirmed' && (
                               <button
                                 onClick={() => updateBookingStatus(booking.id, 'Assigned')}
                                 disabled={updatingId === booking.id}
                                 className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-[#FFF8F0] dark:hover:bg-[#120702] rounded-lg border border-[#E6CBB2] dark:border-[#52270D] transition-colors cursor-pointer"
                                 title="Assign Detailer"
                               >
                                 <UserCheck className="h-4 w-4" />
                               </button>
                             )}
                             {booking.status === 'Assigned' && (
                               <button
                                 onClick={() => updateBookingStatus(booking.id, 'Completed')}
                                 disabled={updatingId === booking.id}
                                 className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-[#FFF8F0] dark:hover:bg-[#120702] rounded-lg border border-[#E6CBB2] dark:border-[#52270D] transition-colors cursor-pointer"
                                 title="Complete Wash"
                               >
                                 <CheckSquare className="h-4 w-4" />
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

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 pt-2">
              <span className="text-xs text-[#542E16] dark:text-[#E8C8AE] font-semibold">
                Showing {bookings.length} of {totalCount} bookings
              </span>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-2 border border-[#E6CBB2] dark:border-[#52270D] rounded-xl text-[#3D1E0B] dark:text-[#FFF5EB] hover:bg-[#FFF8F0] dark:hover:bg-[#120702] disabled:opacity-50 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: totalPages }).map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentPage(idx + 1)}
                    className={`h-8.5 w-8.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      currentPage === idx + 1
                        ? 'bg-[#8C471E] dark:bg-[#A65D2E] border-[#8C471E] dark:border-[#A65D2E] text-white shadow-xs'
                        : 'border-[#E6CBB2] dark:border-[#52270D] text-[#542E16] dark:text-[#E8C8AE] hover:bg-[#FFF8F0] dark:hover:bg-[#120702]'
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-2 border border-[#E6CBB2] dark:border-[#52270D] rounded-xl text-[#3D1E0B] dark:text-[#FFF5EB] hover:bg-[#FFF8F0] dark:hover:bg-[#120702] disabled:opacity-50 transition-colors cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Booking Inspector Modal */}
      <Modal
        isOpen={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
        title="Booking Details"
      >
        {selectedBooking && (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl">
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Booking ID</p>
                <p className="text-xs font-bold text-slate-700 truncate max-w-[200px]" title={selectedBooking.id}>
                  {selectedBooking.id}
                </p>
              </div>
              <div>{getStatusBadge(selectedBooking.status)}</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Customer Info
                </h4>
                <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 text-sm space-y-2">
                  <p className="font-bold text-slate-800">{selectedBooking.customers?.name || 'Walk-in'}</p>
                  <p className="text-slate-500">
                    <span className="font-medium text-slate-400 mr-1">Email:</span>
                    {selectedBooking.customers?.email || 'N/A'}
                  </p>
                  <p className="text-slate-500">
                    <span className="font-medium text-slate-400 mr-1">Phone:</span>
                    {selectedBooking.customers?.phone || 'N/A'}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Vehicle & Service
                </h4>
                <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 text-sm space-y-2">
                  <p className="font-bold text-slate-800">{selectedBooking.services?.name || 'Custom Wash'}</p>
                  <p className="text-slate-500">
                    <span className="font-medium text-slate-400 mr-1">Vehicle Type:</span>
                    {selectedBooking.vehicle_type}
                  </p>
                  <p className="text-slate-500">
                    <span className="font-medium text-slate-400 mr-1">Original Price:</span>
                    {selectedBooking.services?.price ? `₹${parseFloat(selectedBooking.services.price.toString()).toFixed(2)}` : 'N/A'}
                  </p>
                  {selectedBooking.coupon_code && (
                    <>
                      <p className="text-red-500 font-semibold">
                        <span className="font-medium text-slate-400 mr-1">Coupon:</span>
                        {selectedBooking.coupon_code} (-₹{parseFloat((selectedBooking.discount_amount || 0).toString()).toFixed(2)})
                      </p>
                      <p className="text-emerald-600 font-bold">
                        <span className="font-medium text-slate-400 mr-1">Final Price:</span>
                        ₹{parseFloat((parseFloat((selectedBooking.services?.price || 0).toString()) - parseFloat((selectedBooking.discount_amount || 0).toString())).toString()).toFixed(2)}
                      </p>
                    </>
                  )}
                  {!selectedBooking.coupon_code && (
                    <p className="text-primary-600 font-bold">
                      Price: {selectedBooking.services?.price ? `₹${parseFloat(selectedBooking.services.price.toString()).toFixed(2)}` : 'N/A'}
                    </p>
                  )}
                </div>
              </div>

              {/* Payment & Deposit Summary Box */}
              <div className="col-span-2 space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Payment & Deposit Details
                </h4>
                {(() => {
                  const notesStr = selectedBooking.notes || ''
                  const isPayOnService = notesStr.includes('Pay on Service')
                  const paidMatch = notesStr.match(/Paid Today:\s*₹(\d+)/)
                  const dueMatch = notesStr.match(/Due at Doorstep:\s*₹(\d+)/)
                  const utrMatch = notesStr.match(/UTR:\s*([A-Za-z0-9]+)/)

                  const paidAmt = paidMatch ? paidMatch[1] : (isPayOnService ? '99' : 'Full')
                  const dueAmt = dueMatch ? dueMatch[1] : '0'
                  const utrVal = utrMatch ? utrMatch[1] : null

                  return (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-600">Selected Payment Method:</span>
                        <span className="font-extrabold text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                          {isPayOnService ? '🛡️ Pay on Service (₹99 Token Advance)' : '⚡ 100% Full Online Payment'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 font-semibold text-slate-700">
                        <div>Paid Online Today: <strong className="text-amber-600 font-extrabold text-sm">₹{paidAmt}</strong></div>
                        <div>Balance Due at Doorstep: <strong className="text-blue-600 font-extrabold text-sm">₹{dueAmt}</strong></div>
                      </div>
                      {utrVal && (
                        <div className="pt-2 border-t border-slate-200 text-slate-500 font-medium">
                          Client UTR / Transaction Ref No: <strong className="text-slate-900 font-mono font-extrabold">{utrVal}</strong>
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>

              <div className="col-span-2 space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" /> Scheduling & Notes
                </h4>
                <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 text-sm space-y-3">
                  <div className="flex items-center gap-6">
                    <p className="text-slate-600">
                      <span className="font-medium text-slate-400 mr-1">Date:</span>
                      {selectedBooking.booking_date}
                    </p>
                    <p className="text-slate-600">
                      <span className="font-medium text-slate-400 mr-1">Time:</span>
                      {selectedBooking.booking_time}
                    </p>
                  </div>
                  {selectedBooking.address && (
                    <div className="pt-2.5 border-t border-slate-100">
                      <p className="font-bold text-slate-500 text-xs font-semibold">doorstep address:</p>
                      <p className="text-slate-700 mt-1 text-xs leading-normal">
                        {selectedBooking.address}
                      </p>
                      {selectedBooking.latitude && selectedBooking.longitude && (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${selectedBooking.latitude},${selectedBooking.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-indigo-600 hover:underline font-bold mt-1 inline-flex items-center gap-1"
                        >
                          📍 Open in Google Maps
                        </a>
                      )}
                    </div>
                  )}
                  {selectedBooking.notes && (
                    <div className="pt-2.5 border-t border-slate-100">
                      <p className="font-bold text-slate-500 text-xs">Customer Notes:</p>
                      <p className="text-slate-600 mt-1 italic text-xs leading-relaxed">
                        "{selectedBooking.notes}"
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-slate-400">
                Received on {new Date(selectedBooking.created_at).toLocaleDateString()}
              </span>

              <div className="flex gap-2">
                 {selectedBooking.status === 'Pending' && (
                  <>
                    <button
                      onClick={() => updateBookingStatus(selectedBooking.id, 'Cancelled')}
                      disabled={updatingId === selectedBooking.id}
                      className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all"
                    >
                      Cancel Booking
                    </button>
                    <button
                      onClick={() => updateBookingStatus(selectedBooking.id, 'Confirmed')}
                      disabled={updatingId === selectedBooking.id}
                      className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all"
                    >
                      Confirm Appointment
                    </button>
                  </>
                )}
                {selectedBooking.status === 'Confirmed' && (
                  <>
                    <button
                      onClick={() => updateBookingStatus(selectedBooking.id, 'Cancelled')}
                      disabled={updatingId === selectedBooking.id}
                      className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all"
                    >
                      Cancel Booking
                    </button>
                    <button
                      onClick={() => updateBookingStatus(selectedBooking.id, 'Assigned')}
                      disabled={updatingId === selectedBooking.id}
                      className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all"
                    >
                      Assign Detailer
                    </button>
                  </>
                )}
                {selectedBooking.status === 'Assigned' && (
                  <>
                    <button
                      onClick={() => updateBookingStatus(selectedBooking.id, 'Cancelled')}
                      disabled={updatingId === selectedBooking.id}
                      className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all"
                    >
                      Cancel Booking
                    </button>
                    <button
                      onClick={() => updateBookingStatus(selectedBooking.id, 'Completed')}
                      disabled={updatingId === selectedBooking.id}
                      className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all"
                    >
                      Complete Wash
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

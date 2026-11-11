import React, { useState, useEffect, useRef } from 'react'
import { Search, User, Phone, Mail, Calendar, Eye, ShieldAlert, History, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from '../context/ToastContext'
import { Spinner, SkeletonLoader } from '../components/Spinner'
import { Modal } from '../components/Modal'

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status?: 'Active' | 'Inactive' | 'Suspended';
  created_at: string;
}

interface BookingHistoryItem {
  id: string;
  vehicle_type: string;
  booking_date: string;
  booking_time: string;
  status: string;
  services: {
    name: string;
    price: number;
  } | null;
}

export const Customers: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const ITEMS_PER_PAGE = 8

  // Inspection states
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customerHistory, setCustomerHistory] = useState<BookingHistoryItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const [suspendingId, setSuspendingId] = useState<string | null>(null)
  const { showToast } = useToast()

  const toggleCustomerSuspension = async (c: Customer) => {
    setSuspendingId(c.id)
    const newStatus = c.status === 'Suspended' ? 'Active' : 'Suspended'
    try {
      const { error } = await supabase
        .from('customers')
        .update({ status: newStatus })
        .eq('id', c.id)

      if (error) throw error
      showToast(`Customer account ${newStatus === 'Suspended' ? 'suspended' : 'activated'} successfully!`, 'success')
      fetchCustomers()
    } catch (err: any) {
      showToast('Action failed: ' + err.message, 'error')
    } finally {
      setSuspendingId(null)
    }
  }

  const fetchCustomers = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const from = (currentPage - 1) * ITEMS_PER_PAGE
      const to = from + ITEMS_PER_PAGE - 1

      const { data, count, error } = await supabase
        .from('customers')
        .select('*', { count: 'exact' })
        .order('name', { ascending: true })
        .range(from, to)

      if (error) throw error
      setCustomers((data as Customer[]) || [])
      setTotalCount(count || 0)
    } catch (err: any) {
      if (!silent) showToast('Failed to load customers: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCustomers()

    const channel = supabase
      .channel('customers-realtime-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => {
        fetchCustomers(true)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentPage])

  const handleInspectCustomer = async (customer: Customer) => {
    setSelectedCustomer(customer)
    setHistoryLoading(true)
    try {
      let query = supabase
        .from('bookings')
        .select(`
          id,
          vehicle_type,
          booking_date,
          booking_time,
          status,
          services!left (
            name,
            price
          )
        `)

      if (customer.id) {
        query = query.eq('customer_id', customer.id)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) {
        if (customer.email) {
          const fallbackRes = await supabase
            .from('bookings')
            .select(`
              id,
              vehicle_type,
              booking_date,
              booking_time,
              status,
              services!left (
                name,
                price
              )
            `)
            .eq('customer_email', customer.email)
            .order('created_at', { ascending: false })

          if (!fallbackRes.error) {
            setCustomerHistory((fallbackRes.data as unknown as BookingHistoryItem[]) || [])
            return
          }
        }
        throw error
      }

      setCustomerHistory((data as unknown as BookingHistoryItem[]) || [])
    } catch (err: any) {
      console.warn('Customer history fetch note:', err)
      setCustomerHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }

  const filteredCustomers = customers.filter((c) => {
    const name = c.name?.toLowerCase() || ''
    const email = c.email?.toLowerCase() || ''
    const phone = c.phone || ''
    const query = searchTerm.toLowerCase()

    return name.includes(query) || email.includes(query) || phone.includes(query)
  })

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

  return (
    <div className="space-y-6 font-sans">
      <div>
        <h1 className="text-2xl font-black text-[#3D1E0B] dark:text-[#FFF5EB] tracking-tight">Customer Database</h1>
        <p className="text-[#542E16] dark:text-[#E8C8AE] text-sm mt-0.5 font-semibold">Manage customer records and inspect scheduling history.</p>
      </div>

      <div className="bg-white dark:bg-[#210E04] p-4 rounded-2xl border border-[#E6CBB2] dark:border-[#52270D] shadow-xs flex flex-col md:flex-row gap-4 transition-colors">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C471E] dark:text-[#E69D62]" />
          <input
            type="text"
            placeholder="Search by customer name, email, or telephone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#FFF8F0] dark:bg-[#120702] border border-[#E6CBB2] dark:border-[#52270D] rounded-xl text-[#3D1E0B] dark:text-[#FFF5EB] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#8C471E] font-medium transition-all"
          />
        </div>
      </div>

      {loading ? (
        <div className="bg-white dark:bg-[#210E04] p-8 rounded-2xl border border-[#E6CBB2] dark:border-[#52270D] shadow-xs">
          <SkeletonLoader rows={5} />
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="bg-white dark:bg-[#210E04] rounded-3xl border border-[#E6CBB2] dark:border-[#52270D] py-16 text-center shadow-xs">
          <div className="w-16 h-16 bg-[#FFF8F0] dark:bg-[#120702] rounded-2xl flex items-center justify-center text-[#8C471E] dark:text-[#E69D62] mx-auto mb-4 border border-[#E6CBB2] dark:border-[#52270D]">
            <User className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-bold text-[#3D1E0B] dark:text-[#FFF5EB]">No Customers</h3>
          <p className="text-[#542E16] dark:text-[#E8C8AE] text-sm mt-1 max-w-xs mx-auto">Customer list is currently empty.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white dark:bg-[#210E04] rounded-2xl border border-[#E6CBB2] dark:border-[#52270D] shadow-xs overflow-hidden transition-colors">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#FDF0E6] dark:bg-[#2A1307] border-b border-[#E6CBB2] dark:border-[#52270D] text-[#8C471E] dark:text-[#E69D62] text-xs font-black uppercase tracking-wider">
                    <th className="px-6 py-4">Customer Name</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Phone Number</th>
                    <th className="px-6 py-4">Joined Date</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6CBB2]/40 dark:divide-[#52270D]/40 text-xs text-[#3D1E0B] dark:text-[#FFF5EB]">
                  {filteredCustomers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-[#FFF8F0]/80 dark:hover:bg-[#2A1307]/60 transition-colors">
                      <td className="px-6 py-4 font-black text-[#3D1E0B] dark:text-[#FFF5EB] flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-[#8C471E] text-white flex items-center justify-center text-[10px] font-black shrink-0">
                          {customer.name.substring(0, 2).toUpperCase()}
                        </div>
                        <span>{customer.name}</span>
                      </td>
                      <td className="px-6 py-4 font-medium text-[#542E16] dark:text-[#E8C8AE]">
                        {customer.email || 'No email'}
                      </td>
                      <td className="px-6 py-4 font-semibold text-[#542E16] dark:text-[#E8C8AE]">
                        {customer.phone || 'No phone'}
                      </td>
                      <td className="px-6 py-4 text-[#7A3B14] dark:text-[#E8C8AE] font-semibold">
                        {new Date(customer.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          customer.status === 'Suspended'
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                        }`}>
                          {customer.status || 'Active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleInspectCustomer(customer)}
                            className="p-1.5 text-[#8C471E] dark:text-[#E69D62] hover:bg-[#FFF8F0] dark:hover:bg-[#120702] rounded-lg border border-[#E6CBB2] dark:border-[#52270D] transition-colors cursor-pointer"
                            title="View Customer Profile & History"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => toggleCustomerSuspension(customer)}
                            disabled={suspendingId === customer.id}
                            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                              customer.status === 'Suspended'
                                ? 'text-emerald-600 dark:text-emerald-400 hover:bg-[#FFF8F0] dark:hover:bg-[#120702] border-[#E6CBB2] dark:border-[#52270D]'
                                : 'text-rose-600 dark:text-rose-400 hover:bg-[#FFF8F0] dark:hover:bg-[#120702] border-[#E6CBB2] dark:border-[#52270D]'
                            }`}
                            title={customer.status === 'Suspended' ? 'Unsuspend Customer Account' : 'Suspend Customer Account'}
                          >
                            <ShieldAlert className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 pt-2">
              <span className="text-xs text-[#542E16] dark:text-[#E8C8AE] font-semibold">
                Showing {customers.length} of {totalCount} customers
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

      {/* Customer Profile & History Modal */}
      <Modal
        isOpen={!!selectedCustomer}
        onClose={() => {
          setSelectedCustomer(null)
          setCustomerHistory([])
        }}
        title="Customer Profile & History"
        size="lg"
      >
        {selectedCustomer && (
          <div className="space-y-6 font-sans">
            <div className="bg-gradient-to-r from-[#8C471E] to-[#6D3412] rounded-2xl p-5 text-white shadow-md">
              <div className="flex items-center gap-4">
                <div className="w-13 h-13 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-lg font-black border border-white/20">
                  {selectedCustomer.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-black">{selectedCustomer.name}</h3>
                  <p className="text-xs text-amber-200 mt-0.5 font-bold">
                    Registered {new Date(selectedCustomer.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5 pt-4 border-t border-white/15 text-xs font-semibold">
                <div className="flex items-center gap-2 text-amber-100">
                  <Mail className="h-4 w-4 text-amber-300" />
                  <span>{selectedCustomer.email || 'No email registered'}</span>
                </div>
                <div className="flex items-center gap-2 text-amber-100">
                  <Phone className="h-4 w-4 text-amber-300" />
                  <span>{selectedCustomer.phone || 'No phone registered'}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-black text-[#3D1E0B] dark:text-[#FFF5EB] mb-4 flex items-center gap-2 uppercase tracking-widest">
                <History className="h-4 w-4 text-[#8C471E] dark:text-[#E69D62]" />
                <span>Wash Appointment History</span>
              </h4>

              {historyLoading ? (
                <div className="py-10 flex justify-center">
                  <Spinner size="medium" />
                </div>
              ) : customerHistory.length === 0 ? (
                <div className="py-8 bg-[#FFF8F0] dark:bg-[#120702] border border-dashed border-[#E6CBB2] dark:border-[#52270D] text-center rounded-xl">
                  <ShieldAlert className="h-6 w-6 text-[#8C471E] dark:text-[#E69D62] mx-auto mb-2" />
                  <p className="text-[#542E16] dark:text-[#E8C8AE] text-xs font-semibold">No bookings registered for this customer.</p>
                </div>
              ) : (
                <div className="border border-[#E6CBB2] dark:border-[#52270D] rounded-xl overflow-hidden bg-white dark:bg-[#210E04] shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#FDF0E6] dark:bg-[#2A1307] border-b border-[#E6CBB2] dark:border-[#52270D] text-[#8C471E] dark:text-[#E69D62] font-black uppercase">
                          <th className="px-4 py-3">Service Name</th>
                          <th className="px-4 py-3">Vehicle</th>
                          <th className="px-4 py-3">Scheduled Date</th>
                          <th className="px-4 py-3">Price</th>
                          <th className="px-4 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E6CBB2]/40 dark:divide-[#52270D]/40 text-[#3D1E0B] dark:text-[#FFF5EB] font-semibold">
                        {customerHistory.map((history) => {
                          const servName = history.services?.name || 'Custom Wash'
                          const price = history.services?.price ? `₹${parseFloat(history.services.price.toString()).toFixed(2)}` : '-'
                          
                          const badges = {
                            Pending: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
                            Confirmed: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
                            Completed: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
                            Cancelled: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
                          }

                          return (
                            <tr key={history.id} className="hover:bg-[#FFF8F0] dark:hover:bg-[#2A1307]/60">
                              <td className="px-4 py-3 font-bold text-[#3D1E0B] dark:text-[#FFF5EB]">{servName}</td>
                              <td className="px-4 py-3">{history.vehicle_type}</td>
                              <td className="px-4 py-3">
                                {history.booking_date} • {history.booking_time}
                              </td>
                              <td className="px-4 py-3 font-black text-[#8C471E] dark:text-[#E69D62]">{price}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2.5 py-0.5 rounded-full font-bold border ${badges[history.status as keyof typeof badges] || 'bg-slate-50'}`}>
                                  {history.status}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

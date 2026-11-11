import React, { useState, useEffect } from 'react'
import { FileText, Download, TrendingUp, Calendar, CalendarDays, CheckCircle2, XCircle, Users, Clock, Wrench } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from '../context/ToastContext'
import { Spinner, SkeletonLoader } from '../components/Spinner'
import { downloadCSV } from '../utils/csvExport'
import { downloadPDF } from '../utils/pdfExport'

interface PopularService {
  name: string;
  count: number;
  price: number;
}

interface ReportData {
  timeframe: string;
  totalBookings: number;
  completedBookings: number;
  pendingBookings: number;
  cancelledBookings: number;
  revenue: number;
  customers: number;
  popularServices: PopularService[];
}

export const Reports: React.FC = () => {
  const [timeframe, setTimeframe] = useState<'Daily' | 'Weekly' | 'Monthly' | 'Yearly'>('Monthly')
  const [loading, setLoading] = useState(true)
  const [reportData, setReportData] = useState<ReportData | null>(null)
  
  const { showToast } = useToast()

  const fetchReportData = async () => {
    setLoading(true)
    try {
      const now = new Date()
      let startDate = new Date()

      // Calculate date boundary based on selected timeframe
      if (timeframe === 'Daily') {
        startDate.setHours(0, 0, 0, 0)
      } else if (timeframe === 'Weekly') {
        startDate.setDate(now.getDate() - 7)
      } else if (timeframe === 'Monthly') {
        startDate.setMonth(now.getMonth() - 1)
      } else if (timeframe === 'Yearly') {
        startDate.setFullYear(now.getFullYear() - 1)
      }

      const startDateStr = startDate.toISOString().split('T')[0]

      // Fetch bookings within range
      const { data: bookingsRaw, error: bookingsErr } = await supabase
        .from('bookings')
        .select(`
          id,
          status,
          customer_id,
          booking_date,
          services (
            name,
            price
          )
        `)
        .gte('booking_date', startDateStr)

      if (bookingsErr) throw bookingsErr

      const bookings = bookingsRaw || []

      // Calculate Statistics
      const totalBookings = bookings.length
      const completedBookings = bookings.filter((b: any) => b.status === 'Completed').length
      const pendingBookings = bookings.filter((b: any) => b.status === 'Pending').length
      const cancelledBookings = bookings.filter((b: any) => b.status === 'Cancelled').length

      let revenue = 0
      const customerIds = new Set<string>()
      const serviceSummary: { [key: string]: { count: number; price: number } } = {}

      bookings.forEach((b: any) => {
        if (b.customer_id) {
          customerIds.add(b.customer_id)
        }
        
        if (b.status === 'Completed' && b.services?.price) {
          revenue += parseFloat(b.services.price)
        }

        const servName = b.services?.name || 'Custom Wash'
        const servPrice = b.services?.price ? parseFloat(b.services.price) : 0
        
        if (!serviceSummary[servName]) {
          serviceSummary[servName] = { count: 0, price: servPrice }
        }
        serviceSummary[servName].count += 1
      })

      const popularServices: PopularService[] = Object.keys(serviceSummary)
        .map((k) => ({
          name: k,
          count: serviceSummary[k].count,
          price: serviceSummary[k].price,
        }))
        .sort((a, b) => b.count - a.count)

      setReportData({
        timeframe: `${timeframe} Report`,
        totalBookings,
        completedBookings,
        pendingBookings,
        cancelledBookings,
        revenue,
        customers: customerIds.size,
        popularServices,
      })

    } catch (err: any) {
      showToast('Error compiling report details: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReportData()
  }, [timeframe])

  const handleDownloadCSV = () => {
    if (!reportData) return
    const headers = ['Metric', 'Value']
    const rows = [
      ['Report Timeframe', reportData.timeframe],
      ['Total Appointments Booked', reportData.totalBookings.toString()],
      ['Washes Completed', reportData.completedBookings.toString()],
      ['Pending Appts', reportData.pendingBookings.toString()],
      ['Cancelled Appts', reportData.cancelledBookings.toString()],
      ['Gross Sales Revenue (₹)', `₹${reportData.revenue.toFixed(2)}`],
      ['Unique Customers Served', reportData.customers.toString()],
    ]

    // Append popular services headers and rows
    rows.push(['', ''])
    rows.push(['Service Breakdown', 'Wash Bookings Count'])
    reportData.popularServices.forEach((s) => {
      rows.push([s.name, `${s.count} orders (₹${(s.count * s.price).toFixed(2)})`])
    })

    downloadCSV(headers, rows, `RWash_${timeframe}_Report.csv`)
    showToast('CSV spreadsheet downloaded successfully', 'success')
  }

  const handleDownloadPDF = () => {
    if (!reportData) return
    downloadPDF(reportData, 'RWash')
    showToast('Print window launched for PDF download', 'success')
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Business Reports</h1>
          <p className="text-slate-500 text-sm mt-0.5 font-medium">Analyze sales performance and customer appointments metrics.</p>
        </div>
        
        {reportData && (
          <div className="flex gap-2.5">
            <button
              onClick={handleDownloadCSV}
              className="flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-750 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Export CSV (Excel)</span>
            </button>
            <button
              onClick={handleDownloadPDF}
              className="flex items-center justify-center gap-2 px-4.5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-primary-600/10"
            >
              <FileText className="h-4 w-4" />
              <span>Download PDF</span>
            </button>
          </div>
        )}
      </div>

      {/* Selector Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <span className="text-xs font-bold text-slate-450 uppercase tracking-widest">Select Report Range:</span>
        <div className="flex bg-slate-100 p-1.5 rounded-xl gap-1">
          {(['Daily', 'Weekly', 'Monthly', 'Yearly'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTimeframe(t)}
              className={`px-4.5 py-2 rounded-lg text-xs font-bold transition-all ${
                timeframe === t
                  ? 'bg-white text-slate-850 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Statistics Content */}
      {loading ? (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xs">
          <SkeletonLoader rows={6} />
        </div>
      ) : !reportData ? (
        <div className="py-20 flex justify-center text-slate-400 text-sm">Failed to generate report summaries.</div>
      ) : (
        <div className="space-y-6 animate-fade-in">
          {/* KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: 'Total Bookings', value: reportData.totalBookings, icon: <CalendarDays className="h-5 w-5 text-primary-600" />, bg: 'bg-primary-50' },
              { title: 'Completed Appts', value: reportData.completedBookings, icon: <CheckCircle2 className="h-5 w-5 text-emerald-600" />, bg: 'bg-emerald-50' },
              { title: 'Cancelled Appts', value: reportData.cancelledBookings, icon: <XCircle className="h-5 w-5 text-rose-600" />, bg: 'bg-rose-50' },
              { title: 'Gross Revenue', value: `₹${reportData.revenue.toFixed(2)}`, icon: <TrendingUp className="h-5 w-5 text-indigo-600" />, bg: 'bg-indigo-50' },
            ].map((card) => (
              <div key={card.title} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{card.title}</p>
                  <h3 className="text-2xl font-black text-slate-800 mt-1.5">{card.value}</h3>
                </div>
                <div className={`p-3 rounded-xl border border-slate-100 ${card.bg}`}>{card.icon}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Breakdown counts */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-sm font-extrabold text-slate-800 mb-1 border-b border-slate-50 pb-2">Report Summary</h3>
              <div className="space-y-3.5 text-xs font-semibold text-slate-550">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-slate-400" /> Pending Orders</span>
                  <span className="text-slate-800 font-bold">{reportData.pendingBookings}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><Users className="h-4 w-4 text-slate-400" /> Unique Clients Served</span>
                  <span className="text-slate-800 font-bold">{reportData.customers}</span>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                  <span className="flex items-center gap-1.5 font-bold text-[#8C471E] dark:text-[#E69D62]">Completed Gross Revenue</span>
                  <span className="text-[#8C471E] dark:text-[#E69D62] font-black text-sm">₹{reportData.revenue.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Popular Services Table */}
            <div className="bg-white dark:bg-[#210E04] p-6 rounded-2xl border border-[#E6CBB2] dark:border-[#52270D] shadow-xs lg:col-span-2 space-y-4">
              <h3 className="text-sm font-extrabold text-[#3D1E0B] dark:text-[#FFF5EB] border-b border-[#E6CBB2]/50 dark:border-[#52270D]/50 pb-2 flex items-center gap-2">
                <Wrench className="h-4.5 w-4.5 text-[#8C471E] dark:text-[#E69D62]" />
                <span>Services Performance Breakdown</span>
              </h3>

              {reportData.popularServices.length === 0 ? (
                <div className="py-10 text-center text-[#542E16] dark:text-[#E8C8AE] text-xs">No services booked within range.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#E6CBB2] dark:border-[#52270D] text-[#8C471E] dark:text-[#E69D62] font-black uppercase pb-2">
                        <th className="pb-3">Service Name</th>
                        <th className="pb-3 text-center">Bookings Count</th>
                        <th className="pb-3 text-right">Unit Rate</th>
                        <th className="pb-3 text-right">Gross Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6CBB2]/40 dark:divide-[#52270D]/40 text-[#3D1E0B] dark:text-[#FFF5EB] font-semibold">
                      {reportData.popularServices.map((s) => (
                        <tr key={s.name}>
                          <td className="py-3 font-bold text-[#3D1E0B] dark:text-[#FFF5EB]">{s.name}</td>
                          <td className="py-3 text-center">{s.count} washes</td>
                          <td className="py-3 text-right">₹{s.price.toFixed(2)}</td>
                          <td className="py-3 text-right text-[#8C471E] dark:text-[#E69D62] font-black">
                            ₹{(s.count * s.price).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

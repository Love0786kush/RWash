import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CalendarRange, CheckCircle2 } from 'lucide-react'
import { BookingForm } from '../components/BookingForm'

export const ClientBookNow: React.FC = () => {
  const query = new URLSearchParams(useLocation().search)
  const preselectedServiceId = query.get('serviceId') || ''
  const navigate = useNavigate()
  const [success, setSuccess] = useState(false)

  if (success) {
    return (
      <div className="max-w-lg mx-auto px-6 py-12 min-h-[55vh] flex flex-col items-center justify-center text-center space-y-6 animate-fade-in text-left">
        <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20 shadow-lg shadow-emerald-500/10 animate-bounce">
          <CheckCircle2 className="h-10 w-10 stroke-[2.5]" />
        </div>
        <div className="space-y-3 text-center">
          <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">Booking Confirmed!</h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm leading-relaxed max-w-sm mx-auto font-medium">
            Your wash slot has been successfully scheduled. You can monitor its live progress directly on your bookings dashboard!
          </p>
        </div>
        <div className="flex gap-3 w-full max-w-xs pt-4">
          <button
            onClick={() => navigate('/dashboard/bookings')}
            className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-250 font-bold text-xs rounded-full transition-all cursor-pointer"
          >
            My Bookings
          </button>
          <button
            onClick={() => {
              setSuccess(false)
            }}
            className="flex-1 py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs rounded-full transition-all shadow-md shadow-primary-600/10 cursor-pointer"
          >
            Book Another
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 text-left animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
          <CalendarRange className="h-5.5 w-5.5 text-primary-600" />
          <span>Book Detailing Appointment</span>
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">Select your vehicle, choose package, and choose slot. Your booking updates live.</p>
      </div>

      <BookingForm
        preselectedServiceId={preselectedServiceId}
        onSuccess={() => setSuccess(true)}
      />
    </div>
  )
}

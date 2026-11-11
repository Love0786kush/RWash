import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CalendarRange, Sparkles, User, Mail, Phone, Car, FileText, Calendar, Lock, MapPin, Plus, Ticket, QrCode, CreditCard, ShieldAlert, CheckCircle2, Download, ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from '../context/ToastContext'
import { Spinner } from '../components/Spinner'
import { Alert } from '../components/Alert'
import { useClientAuth } from '../context/ClientAuthContext'
import { LocationPicker } from './LocationPicker'
import { Modal } from './Modal'
import { sendBookingConfirmationEmail, openGmailComposer } from '../utils/emailService'
import { InvoiceData, downloadInvoicePDF } from '../utils/invoiceGenerator'

interface Service {
  id: string;
  name: string;
  price: number;
}

interface BookingFormProps {
  preselectedServiceId?: string;
  preselectedVehicleType?: string;
  preselectedVehicleModel?: string;
  onSuccess?: () => void;
}

export const BookingForm: React.FC<BookingFormProps> = ({ 
  preselectedServiceId = '', 
  preselectedVehicleType = 'Sedan',
  preselectedVehicleModel = '',
  onSuccess 
}) => {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { user, customer } = useClientAuth()

  // 3-Step Wizard Flow State: 1 = Form, 2 = Payment/QR, 3 = Confirmation & Invoice
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1)

  // Form states
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [vehicleType, setVehicleType] = useState(preselectedVehicleType)
  const [vehicleModel, setVehicleModel] = useState(preselectedVehicleModel)
  const [serviceId, setServiceId] = useState(preselectedServiceId)
  const [bookingDate, setBookingDate] = useState('')
  const [bookingTime, setBookingTime] = useState('09:00 AM')
  const [notes, setNotes] = useState('')
  const [userVehicles, setUserVehicles] = useState<any[]>([])
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('')
  const [address, setAddress] = useState('')
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)

  // Payment & Checkout states
  const [paymentOption, setPaymentOption] = useState<'pay_on_service' | 'full_advance'>('pay_on_service')
  const [utrNumber, setUtrNumber] = useState('')
  const [upiId, setUpiId] = useState('rwash@ybl')
  const [lastConfirmedInvoice, setLastConfirmedInvoice] = useState<InvoiceData | null>(null)

  // Coupon Drawer & Offers state
  const [couponCodeInput, setCouponCodeInput] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null)
  const [availableCoupons, setAvailableCoupons] = useState<any[]>([])
  const [isCouponsDrawerOpen, setIsCouponsDrawerOpen] = useState(false)
  const [validatingCoupon, setValidatingCoupon] = useState(false)

  // Service list for dropdown
  const [services, setServices] = useState<Service[]>([])
  const [loadingServices, setLoadingServices] = useState(true)

  // Submission & Alert states
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    const fetchBusinessUpiId = async () => {
      try {
        const { data } = await supabase.from('settings').select('social_links').eq('id', 1).maybeSingle()
        if (data?.social_links?.upi_id) {
          setUpiId(data.social_links.upi_id)
        }
      } catch (err) {
        console.warn('Fetch upi_id notice:', err)
      }
    }
    fetchBusinessUpiId()
  }, [])

  useEffect(() => {
    if (user) {
      setName(customer?.name || user.user_metadata?.full_name || '')
      setEmail(user.email || '')
      setPhone(customer?.phone || '')
    }
  }, [user, customer])

  useEffect(() => {
    const fetchUserVehicles = async () => {
      if (!user) return
      try {
        let customerRowId = customer?.id
        if (!customerRowId) {
          const { data: custData } = await supabase
            .from('customers')
            .select('id')
            .eq('profile_id', user.id)
            .maybeSingle()
          if (custData) customerRowId = custData.id
        }

        const queryOr = customerRowId
          ? `customer_id.eq.${user.id},customer_id.eq.${customerRowId}`
          : `customer_id.eq.${user.id}`

        const { data } = await supabase
          .from('vehicles')
          .select('*')
          .or(queryOr)

        if (data && data.length > 0) {
          setUserVehicles(data)
          if (!preselectedVehicleModel) {
            setSelectedVehicleId(data[0].id)
            const carName = [data[0].make, data[0].model].filter(Boolean).join(' ') || 'Saved Vehicle'
            const plateStr = data[0].plate_number ? `(${data[0].plate_number})` : ''
            setVehicleModel(`${carName} ${plateStr}`.trim())
            setVehicleType(data[0].vehicle_type || 'Sedan')
          }
        }
      } catch (vErr) {
        console.warn('Fetch vehicles error:', vErr)
      }
    }
    fetchUserVehicles()
  }, [user, customer, preselectedVehicleModel])

  useEffect(() => {
    const fetchCoupons = async () => {
      try {
        const { data } = await supabase
          .from('coupons')
          .select('*')
          .eq('is_used', false)
        if (data) setAvailableCoupons(data)
      } catch (cErr) {
        console.warn('Fetch coupons notice:', cErr)
      }
    }
    fetchCoupons()
  }, [])

  useEffect(() => {
    const fetchServices = async () => {
      try {
        setLoadingServices(true)
        const { data, error } = await supabase
          .from('services')
          .select('id, name, price')
          .order('price', { ascending: true })

        if (error) throw error
        if (data && data.length > 0) {
          setServices(data)
          if (!preselectedServiceId) {
            setServiceId(data[0].id)
          }
        }
      } catch (err) {
        console.error('Fetch services error:', err)
      } finally {
        setLoadingServices(false)
      }
    }

    fetchServices()
  }, [preselectedServiceId])

  const timeSlots = [
    '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', 
    '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', 
    '04:00 PM', '05:00 PM', '06:00 PM'
  ]

  const handleApplyCoupon = async (codeToApply?: string) => {
    const targetCode = (codeToApply || couponCodeInput).trim().toUpperCase()
    if (!targetCode) return

    setValidatingCoupon(true)
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', targetCode)
        .single()

      if (error || !data) {
        showToast('Invalid or expired coupon code', 'error')
        return
      }

      if (data.is_used) {
        showToast('This coupon code has already been redeemed', 'warning')
        return
      }

      setAppliedCoupon(data)
      showToast(`🎟️ Coupon '${data.code}' applied! Saved ₹${data.discount_amount}`, 'success')
      setIsCouponsDrawerOpen(false)
    } catch (err: any) {
      showToast('Coupon validation error: ' + err.message, 'error')
    } finally {
      setValidatingCoupon(false)
    }
  }

  const handleGoToStep2 = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!user) {
      showToast('Please login to create a booking', 'warning')
      navigate('/login')
      return
    }

    if (!serviceId) {
      setErrorMsg('Please select a wash service package.')
      return
    }

    if (!bookingDate) {
      setErrorMsg('Please select a preferred date.')
      return
    }

    if (!vehicleModel) {
      setErrorMsg('Please select or enter your vehicle model.')
      return
    }

    setCurrentStep(2)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleFinalConfirmBooking = async () => {
    if (!user) {
      showToast('Please sign in to continue', 'warning')
      return
    }
    try {
      setSubmitting(true)

      let customerId = customer?.id

      if (!customerId) {
        const { data: existingCust } = await supabase
          .from('customers')
          .select('id')
          .eq('profile_id', user.id)
          .maybeSingle()

        if (existingCust) {
          customerId = existingCust.id
        }
      }

      if (!customerId) {
        const { data: newCust, error: customerError } = await supabase
          .from('customers')
          .insert({
            profile_id: user.id,
            name: customer?.name || name || 'Customer User',
            email: user.email?.toLowerCase(),
            phone: customer?.phone || phone || null,
          })
          .select('id')
          .single()
        
        if (customerError) throw customerError
        customerId = newCust.id
      }

      const selectedServiceObj = services.find(s => s.id === serviceId)
      const basePrice = selectedServiceObj ? parseFloat(selectedServiceObj.price.toString()) : 0
      const discountAmt = appliedCoupon ? appliedCoupon.discount_amount : 0
      const finalTotalPrice = Math.max(0, basePrice - discountAmt)
      const advanceAmount = paymentOption === 'pay_on_service' ? Math.min(99, finalTotalPrice) : finalTotalPrice
      const doorstepDueAmount = paymentOption === 'pay_on_service' ? Math.max(0, finalTotalPrice - advanceAmount) : 0

      const paymentSummaryNotes = `[Payment Mode: ${paymentOption === 'pay_on_service' ? 'Pay on Service (₹99 Token Advance)' : '100% Full Advance'} | Paid Today: ₹${advanceAmount} | Due at Doorstep: ₹${doorstepDueAmount}${utrNumber ? ' | UTR: ' + utrNumber : ''}] ${notes ? ' - ' + notes : ''}`
      const vehicleDesc = `${vehicleModel} (${vehicleType})`

      const { data: insertedBooking, error: bookingError } = await supabase
        .from('bookings')
        .insert([
          {
            customer_id: customerId,
            vehicle_type: vehicleDesc,
            service_id: serviceId,
            booking_date: bookingDate,
            booking_time: bookingTime,
            status: 'Pending',
            notes: paymentSummaryNotes,
            coupon_code: appliedCoupon ? appliedCoupon.code : null,
            discount_amount: appliedCoupon ? appliedCoupon.discount_amount : 0,
            address: address || null,
            latitude: latitude || null,
            longitude: longitude || null
          },
        ])
        .select('id')
        .single()

      if (bookingError) throw bookingError

      const bookingIdStr = insertedBooking?.id ? `RW-${insertedBooking.id.slice(0, 6).toUpperCase()}` : `RW-${Math.floor(100000 + Math.random() * 900000)}`
      const userEmail = user.email || 'customer@example.com'

      const invoiceData: InvoiceData = {
        invoiceNumber: `INV-${Math.floor(100000 + Math.random() * 900000)}`,
        bookingId: bookingIdStr,
        customerName: name || customer?.name || 'Customer User',
        customerEmail: userEmail,
        customerPhone: phone || customer?.phone || undefined,
        customerAddress: address || 'Doorstep Location',
        vehicleInfo: vehicleDesc,
        serviceName: selectedServiceObj?.name || 'Detailing Wash Pack',
        servicePrice: basePrice,
        discountAmount: discountAmt,
        couponCode: appliedCoupon ? appliedCoupon.code : undefined,
        bookingDate,
        bookingTime,
        status: 'Confirmed (Slot Reserved)',
        createdAt: new Date().toISOString(),
        paymentMode: paymentOption === 'pay_on_service' ? 'Pay on Service (₹99 Advance Token Paid)' : '100% Full Online Payment',
        paidAmount: advanceAmount,
        dueAtDoorstep: doorstepDueAmount,
        utrNumber: utrNumber || undefined
      }

      if (appliedCoupon) {
        try {
          await supabase
            .from('coupons')
            .update({ is_used: true })
            .eq('code', appliedCoupon.code)
        } catch (couponErr) {
          console.warn('Coupon mark notice:', couponErr)
        }
      }

      // Send Email Invoice
      try {
        await sendBookingConfirmationEmail(invoiceData)
      } catch (eErr) {
        console.warn('Email notice:', eErr)
      }

      // Trigger PDF Invoice Download
      try {
        downloadInvoicePDF(invoiceData)
      } catch (pdfErr) {
        console.warn('PDF notice:', pdfErr)
      }

      setLastConfirmedInvoice(invoiceData)
      setCurrentStep(3)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      showToast('🎉 Appointment Confirmed! Tax Invoice PDF generated.', 'success')

      if (onSuccess) onSuccess()
    } catch (err: any) {
      showToast('Booking failed: ' + (err.message || 'Please check input details'), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (!user) {
    return (
      <div className="animate-slide-up bg-slate-900 border border-slate-800 rounded-3xl p-8 md:p-10 text-center space-y-6 shadow-xl relative overflow-hidden">
        {/* Brand gradient accent strip — fully dynamic theme */}
        <div
          className="absolute inset-x-0 top-0 h-1.5"
          style={{ background: 'linear-gradient(90deg, var(--theme-p, #8C471E), var(--theme-accent, #A65D2E), var(--theme-btn, #8C471E))' }}
        />
        {/* Soft brand glow */}
        <div
          className="absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ backgroundColor: 'var(--theme-p, #8C471E)' }}
        />

        <div
          className="relative w-14 h-14 rounded-2xl flex items-center justify-center mx-auto shadow-lg"
          style={{ backgroundColor: 'var(--theme-p, #8C471E)' }}
        >
          <Lock className="h-6 w-6 text-white" />
        </div>
        <div className="relative space-y-2 max-w-sm mx-auto">
          <h3 className="text-lg font-black text-white tracking-tight">Login Required to Book</h3>
          <p className="text-white/70 text-xs leading-relaxed font-medium">
            Please sign in to schedule your detailing wash. Logging in allows you to save your vehicles, track progress live, and view offers!
          </p>
        </div>
        <div className="relative flex flex-col sm:flex-row gap-3 justify-center max-w-xs mx-auto">
          <Link
            to="/login"
            className="flex-grow py-3 bg-[#8C471E] hover:bg-[#6D3412] text-white font-extrabold text-xs rounded-full transition-all text-center shadow-md cursor-pointer hover:scale-[1.03] active:scale-95"
          >
            Sign In
          </Link>
          <Link
            to="/signup"
            className="flex-grow py-3 bg-white/10 hover:bg-white/15 text-white font-extrabold text-xs rounded-full transition-all border border-white/15 text-center cursor-pointer hover:scale-[1.03] active:scale-95"
          >
            Create Account
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 text-left max-w-6xl mx-auto">
      {/* PRO 3-STEP WIZARD PROGRESS BAR */}
      <div className="bg-white dark:bg-slate-900 p-4 md:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg">
        <div className="grid grid-cols-3 gap-2 text-center">
          {/* Step 1 Indicator */}
          <div className={`flex flex-col items-center gap-1.5 transition-all ${currentStep >= 1 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`}>
            <div className={`w-8 h-8 rounded-full font-black text-xs flex items-center justify-center transition-all ${
              currentStep === 1
                ? 'bg-amber-500 text-slate-950 ring-4 ring-amber-500/20'
                : currentStep > 1
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
            }`}>
              {currentStep > 1 ? <Check className="h-4 w-4 stroke-[3]" /> : '1'}
            </div>
            <span className="text-[10px] md:text-xs font-black uppercase tracking-wider">1. Appointment</span>
          </div>

          {/* Step 2 Indicator */}
          <div className={`flex flex-col items-center gap-1.5 transition-all ${currentStep >= 2 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`}>
            <div className={`w-8 h-8 rounded-full font-black text-xs flex items-center justify-center transition-all ${
              currentStep === 2
                ? 'bg-amber-500 text-slate-950 ring-4 ring-amber-500/20'
                : currentStep > 2
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
            }`}>
              {currentStep > 2 ? <Check className="h-4 w-4 stroke-[3]" /> : '2'}
            </div>
            <span className="text-[10px] md:text-xs font-black uppercase tracking-wider">2. Payment & QR</span>
          </div>

          {/* Step 3 Indicator */}
          <div className={`flex flex-col items-center gap-1.5 transition-all ${currentStep === 3 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`}>
            <div className={`w-8 h-8 rounded-full font-black text-xs flex items-center justify-center transition-all ${
              currentStep === 3
                ? 'bg-emerald-500 text-white ring-4 ring-emerald-500/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
            }`}>
              3
            </div>
            <span className="text-[10px] md:text-xs font-black uppercase tracking-wider">3. Tax Invoice</span>
          </div>
        </div>
      </div>

      {errorMsg && <Alert type="error" message={errorMsg} onClose={() => setErrorMsg(null)} />}

      {/* ========================================================= */}
      {/* STEP 1: APPOINTMENT & VEHICLE DETAILS FORM */}
      {/* ========================================================= */}
      {currentStep === 1 && (
        <form onSubmit={handleGoToStep2} className="space-y-6 bg-white dark:bg-slate-900 p-6 md:p-10 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl transition-colors duration-300 animate-fade-in">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
            <h2 className="text-base md:text-lg font-extrabold text-slate-900 dark:text-white">
              Step 1: Enter Wash Appointment Details
            </h2>
          </div>

          {/* Customer Personal Info */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              Customer Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="rahul@example.com"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all font-semibold"
                />
              </div>
            </div>
          </div>

          {/* MY SAVED VEHICLES INTERACTIVE CARDS */}
          <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                My Vehicle Profile
              </h3>
              {userVehicles.length > 0 && (
                <span className="text-[9px] font-extrabold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full uppercase">
                  {userVehicles.length} Saved in My Garage
                </span>
              )}
            </div>

            {userVehicles.length > 0 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {userVehicles.map((v) => {
                    const isSelected = selectedVehicleId === v.id
                    const carName = [v.make, v.model].filter(Boolean).join(' ') || 'Saved Vehicle'
                    const plateStr = v.plate_number ? v.plate_number : 'No Plate'

                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => {
                          setSelectedVehicleId(v.id)
                          setVehicleModel(`${carName} (${plateStr})`)
                          setVehicleType(v.vehicle_type || 'Sedan')
                        }}
                        className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/30 text-slate-900 dark:text-white shadow-md'
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            🚗 {v.vehicle_type || 'Car'}
                          </span>
                          {isSelected && (
                            <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 text-xs font-black flex items-center justify-center shadow-xs">✓</span>
                          )}
                        </div>
                        <div>
                          <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">{carName}</h4>
                          <p className="text-[10px] text-slate-400 font-mono font-bold mt-0.5">{plateStr}</p>
                        </div>
                      </button>
                    )
                  })}

                  {/* "+ Other / New Car" Card */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedVehicleId('other')
                      setVehicleModel('')
                    }}
                    className={`p-4 rounded-2xl border border-dashed text-left transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                      selectedVehicleId === 'other'
                        ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/30 text-slate-900 dark:text-white'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <Plus className="h-5 w-5 text-amber-500" />
                    <span className="text-xs font-black text-slate-700 dark:text-slate-300">+ Other / New Car</span>
                  </button>
                </div>

                {selectedVehicleId === 'other' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">Vehicle Category</label>
                      <select
                        value={vehicleType}
                        onChange={(e) => setVehicleType(e.target.value)}
                        className="w-full px-3 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all font-semibold"
                      >
                        <option value="Hatchback">Hatchback (Swift, i20, Polo)</option>
                        <option value="Sedan">Sedan (City, Verna, Ciaz)</option>
                        <option value="Compact SUV">Compact SUV (Brezza, Nexon, Creta)</option>
                        <option value="Luxury SUV">Luxury SUV / 7-Seater (Fortuner, Endeavour)</option>
                        <option value="Bike/Scooter">Bike / Superbike</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">Vehicle Model & Registration No.</label>
                      <input
                        type="text"
                        required
                        value={vehicleModel}
                        onChange={(e) => setVehicleModel(e.target.value)}
                        placeholder="e.g. Maruti Brezza (HR26 RE 3456)"
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all font-semibold"
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">Vehicle Category</label>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    className="w-full px-3 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all font-semibold"
                  >
                    <option value="Hatchback">Hatchback (Swift, i20, Polo)</option>
                    <option value="Sedan">Sedan (City, Verna, Ciaz)</option>
                    <option value="Compact SUV">Compact SUV (Brezza, Nexon, Creta)</option>
                    <option value="Luxury SUV">Luxury SUV / 7-Seater (Fortuner, Endeavour)</option>
                    <option value="Bike/Scooter">Bike / Superbike</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">Vehicle Model & Registration No.</label>
                  <input
                    type="text"
                    required
                    value={vehicleModel}
                    onChange={(e) => setVehicleModel(e.target.value)}
                    placeholder="e.g. Hyundai Creta (DL 01 AB 1234)"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all font-semibold"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Wash Package Selection (DROPDOWN SELECTOR) */}
          <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
              Wash Service Package
            </label>
            
            {loadingServices ? (
              <div className="py-4 flex justify-center">
                <Spinner size="small" />
              </div>
            ) : (
              <select
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all font-extrabold"
              >
                {services.map((srv) => (
                  <option key={srv.id} value={srv.id}>
                    {srv.name} — ₹{srv.price}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Date & Time Selection */}
          <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              Preferred Date & Time Slot
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">Preferred Date</label>
                <input
                  type="date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">Time Slot</label>
                <select
                  value={bookingTime}
                  onChange={(e) => setBookingTime(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all font-semibold"
                >
                  {timeSlots.map((ts) => (
                    <option key={ts} value={ts}>{ts}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Doorstep Location Picker */}
          <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <LocationPicker
              address={address}
              setAddress={setAddress}
              latitude={latitude}
              setLatitude={setLatitude}
              longitude={longitude}
              setLongitude={setLongitude}
            />
          </div>

          {/* 1-Click Coupon Code & Offers Section */}
          <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase flex items-center gap-1.5">
                <Ticket className="h-4 w-4 text-emerald-500" /> Apply Coupon Offer
              </label>
              <button
                type="button"
                onClick={() => setIsCouponsDrawerOpen(true)}
                className="text-[10px] font-black text-amber-600 dark:text-amber-400 hover:underline uppercase flex items-center gap-1 cursor-pointer"
              >
                🎟️ View Offers ({availableCoupons.length})
              </button>
            </div>

            {appliedCoupon ? (
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                    🎉 Coupon '{appliedCoupon.code}' Applied!
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    Flat ₹{appliedCoupon.discount_amount} Discount Applied
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setAppliedCoupon(null)}
                  className="text-[10px] font-bold text-rose-500 hover:underline cursor-pointer"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCodeInput}
                  onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                  placeholder="Enter Coupon Code (e.g. RWASH50)"
                  className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => handleApplyCoupon()}
                  disabled={validatingCoupon || !couponCodeInput}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {validatingCoupon ? <Spinner size="small" /> : 'Apply'}
                </button>
              </div>
            )}
          </div>

          {/* Special Instructions */}
          <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-2 flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-primary-600 dark:text-sky-400" /> Special Instructions
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Let us know about pet hair removal, stain spots or specific instructions..."
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all font-semibold"
            />
          </div>

          {/* Step 1 -> Step 2 Button */}
          <button
            type="submit"
            disabled={submitting || loadingServices}
            className="w-full py-4 bg-[#8B5E3C] hover:bg-[#6D472B] text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <span>Continue to Payment & Checkout (Step 2)</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      )}

      {/* ========================================================= */}
      {/* STEP 2: CHECKOUT & DYNAMIC UPI QR CODE */}
      {/* ========================================================= */}
      {currentStep === 2 && (() => {
        const selectedServiceObj = services.find(s => s.id === serviceId)
        const basePrice = selectedServiceObj ? parseFloat(selectedServiceObj.price.toString()) : 0
        const discountAmt = appliedCoupon ? appliedCoupon.discount_amount : 0
        const finalTotalPrice = Math.max(0, basePrice - discountAmt)
        const advanceAmount = paymentOption === 'pay_on_service' ? Math.min(99, finalTotalPrice) : finalTotalPrice
        const doorstepDueAmount = paymentOption === 'pay_on_service' ? Math.max(0, finalTotalPrice - advanceAmount) : 0
        const dynamicUpiUrl = `upi://pay?pa=${upiId}&pn=RWash%20Auto%20Detailing&am=${advanceAmount}&cu=INR`
        const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(dynamicUpiUrl)}`

        return (
          <div className="space-y-6 animate-fade-in text-left">
            <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="flex items-center gap-1.5 text-xs font-black text-slate-500 hover:text-amber-500 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" /> Back to Step 1 Details
                </button>
                <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full uppercase tracking-wider">
                  Step 2 of 3
                </span>
              </div>

              {/* 2-Column Responsive Layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column: Summary */}
                <div className="space-y-4">
                  <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5" /> Appointment Summary
                      </span>
                      <span className="text-[9px] font-extrabold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-full uppercase">
                        Slot Reserved
                      </span>
                    </div>

                    <div className="space-y-2 text-xs font-semibold text-slate-700 dark:text-slate-300 pt-2 border-t border-slate-200 dark:border-slate-800">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 dark:text-slate-400">Package:</span>
                        <strong className="text-slate-900 dark:text-white font-extrabold">{selectedServiceObj?.name}</strong>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 dark:text-slate-400">Vehicle:</span>
                        <strong className="text-slate-900 dark:text-white font-extrabold">{vehicleModel}</strong>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 dark:text-slate-400">Date & Slot:</span>
                        <strong className="text-slate-900 dark:text-white font-bold">{bookingDate} @ {bookingTime}</strong>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 dark:text-slate-400">Client:</span>
                        <strong className="text-slate-900 dark:text-white font-bold">{name || customer?.name} ({phone || 'N/A'})</strong>
                      </div>
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Doorstep Address</span>
                        <strong className="text-slate-900 dark:text-white block text-xs truncate">{address || 'Specified Doorstep Location'}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Payment Mode Selector */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                      Choose Payment Method
                    </label>
                    <div className="grid grid-cols-1 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setPaymentOption('pay_on_service')}
                        className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                          paymentOption === 'pay_on_service'
                            ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/30 text-slate-900 dark:text-white shadow-md'
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <ShieldAlert className="h-3 w-3" /> Pay on Service + Token
                          </span>
                          {paymentOption === 'pay_on_service' && (
                            <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 text-xs font-black flex items-center justify-center">✓</span>
                          )}
                        </div>
                        <div>
                          <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">Pay ₹99 Token Today</h4>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                            Pay <strong>₹99 Token</strong> now. Pay remaining <strong>₹{doorstepDueAmount}</strong> at doorstep!
                          </p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentOption('full_advance')}
                        className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                          paymentOption === 'full_advance'
                            ? 'bg-emerald-500/10 border-emerald-500 ring-2 ring-emerald-500/30 text-slate-900 dark:text-white shadow-md'
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                            ⚡ 100% Full Payment
                          </span>
                          {paymentOption === 'full_advance' && (
                            <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 text-xs font-black flex items-center justify-center">✓</span>
                          )}
                        </div>
                        <div>
                          <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">Full Online Payment (₹{finalTotalPrice})</h4>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                            Pay <strong>₹{finalTotalPrice}</strong> now via UPI QR. Pay <strong>₹0</strong> at doorstep!
                          </p>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right Column: Dynamic Vector UPI QR & Confirm Order Button */}
                <div className="space-y-4">
                  <div className="p-5 bg-slate-50 dark:bg-slate-950 border border-amber-500/30 rounded-3xl shadow-sm text-center space-y-4">
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-extrabold uppercase tracking-wider">
                      <QrCode className="h-4 w-4" /> Scan & Pay via GPay / PhonePe / Paytm
                    </span>

                    <div className="flex flex-col items-center justify-center gap-4">
                      <div className="p-3 bg-white rounded-2xl border-2 border-dashed border-amber-500 shadow-md flex flex-col items-center">
                        <img
                          src={qrCodeImageUrl}
                          alt="RWash Live UPI QR Code"
                          className="w-40 h-40 object-contain rounded-lg"
                        />
                        <span className="text-[9px] font-black text-slate-900 uppercase mt-1.5 tracking-wider">
                          SCAN WITH ANY UPI APP
                        </span>
                      </div>

                      <div className="w-full space-y-2 text-left">
                        <div className="space-y-1 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
                          <div className="flex justify-between text-slate-600 dark:text-slate-400 font-semibold">
                            <span>Package Cost:</span>
                            <span>₹{basePrice.toFixed(2)}</span>
                          </div>
                          {appliedCoupon && (
                            <div className="flex justify-between font-extrabold text-emerald-600 dark:text-emerald-400">
                              <span>Coupon ({appliedCoupon.code}):</span>
                              <span>-₹{discountAmt.toFixed(2)}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-black text-amber-600 dark:text-amber-400 pt-1.5 border-t border-slate-200 dark:border-slate-800">
                            <span>Pay Today (UPI):</span>
                            <span className="text-sm font-black">₹{advanceAmount.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
                            <span>Due at Doorstep:</span>
                            <span>₹{doorstepDueAmount.toFixed(2)}</span>
                          </div>
                        </div>

                        <a
                          href={dynamicUpiUrl}
                          className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Sparkles className="h-4 w-4" /> Open PhonePe / GPay (₹{advanceAmount})
                        </a>
                      </div>
                    </div>

                    <div>
                      <input
                        type="text"
                        value={utrNumber}
                        onChange={(e) => setUtrNumber(e.target.value)}
                        placeholder="Enter 12-digit UPI UTR / Ref Number (Optional)"
                        className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-amber-500 shadow-xs"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleFinalConfirmBooking}
                    disabled={submitting}
                    className="w-full py-4 bg-[#8B5E3C] hover:bg-[#6D472B] text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Spinner size="small" />
                        <span>Confirming Appointment Slot...</span>
                      </>
                    ) : (
                      <>
                        <span>Confirm Appointment & Reserve Slot</span>
                        <Sparkles className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ========================================================= */}
      {/* STEP 3: BOOKING CONFIRMED & INSTANT PDF TAX INVOICE */}
      {/* ========================================================= */}
      {currentStep === 3 && lastConfirmedInvoice && (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl text-center space-y-6 animate-fade-in text-left">
          <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20 shadow-lg shadow-emerald-500/10 animate-bounce">
            <CheckCircle2 className="h-10 w-10 stroke-[2.5]" />
          </div>

          <div className="space-y-2 text-center">
            <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full">
              Booking ID: #{lastConfirmedInvoice.bookingId}
            </span>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight pt-2">
              Appointment Reserved Successfully!
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm max-w-md mx-auto">
              Your doorstep detailing slot is locked in. Your official Tax Invoice PDF has been generated and emailed to <strong>{lastConfirmedInvoice.customerEmail}</strong>.
            </p>
          </div>

          {/* Receipt Breakdown Card */}
          <div className="p-5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 text-left space-y-3 max-w-lg mx-auto text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
              <span className="font-extrabold text-slate-900 dark:text-white uppercase text-[10px] tracking-wider">Service Summary</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">{lastConfirmedInvoice.invoiceNumber}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 font-semibold text-slate-700 dark:text-slate-300">
              <div>Package: <strong className="text-slate-900 dark:text-white block">{lastConfirmedInvoice.serviceName}</strong></div>
              <div>Vehicle: <strong className="text-slate-900 dark:text-white block">{lastConfirmedInvoice.vehicleInfo}</strong></div>
              <div>Date & Slot: <strong className="text-slate-900 dark:text-white block">{lastConfirmedInvoice.bookingDate} ({lastConfirmedInvoice.bookingTime})</strong></div>
              <div>Location: <strong className="text-slate-900 dark:text-white block truncate">{lastConfirmedInvoice.customerAddress}</strong></div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Total Package Price:</span>
                <span>₹{lastConfirmedInvoice.servicePrice}</span>
              </div>
              {lastConfirmedInvoice.discountAmount ? (
                <div className="flex justify-between font-bold text-emerald-600 dark:text-emerald-400">
                  <span>Discount Coupon ({lastConfirmedInvoice.couponCode}):</span>
                  <span>-₹{lastConfirmedInvoice.discountAmount}</span>
                </div>
              ) : null}
              <div className="flex justify-between font-black text-amber-600 dark:text-amber-400 pt-1 border-t border-slate-200 dark:border-slate-800 text-sm">
                <span>Paid Today (UPI Token):</span>
                <span>₹{lastConfirmedInvoice.paidAmount}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-500 dark:text-slate-400">
                <span>Balance Due at Doorstep:</span>
                <span>₹{lastConfirmedInvoice.dueAtDoorstep}</span>
              </div>
              {lastConfirmedInvoice.utrNumber && (
                <div className="text-[10px] text-slate-400 font-medium pt-1">
                  UPI UTR / Ref No: <strong className="text-slate-700 dark:text-slate-300">{lastConfirmedInvoice.utrNumber}</strong>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-lg mx-auto pt-2">
            <button
              type="button"
              onClick={() => downloadInvoicePDF(lastConfirmedInvoice)}
              className="flex-1 py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="h-4 w-4" /> Download PDF Tax Invoice
            </button>

            <button
              type="button"
              onClick={() => openGmailComposer(lastConfirmedInvoice)}
              className="flex-1 py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <Mail className="h-4 w-4" /> Send to my Gmail
            </button>

            <button
              type="button"
              onClick={() => navigate('/dashboard/bookings')}
              className="flex-1 py-3.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      )}

      {/* OFFERS DRAWER MODAL */}
      <Modal
        isOpen={isCouponsDrawerOpen}
        onClose={() => setIsCouponsDrawerOpen(false)}
        title="🎟️ Exclusive Detailing Offers"
        size="md"
      >
        <div className="space-y-3 text-left">
          {availableCoupons.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-4">No active offer coupons available right now.</p>
          ) : (
            availableCoupons.map((cp) => (
              <div
                key={cp.id}
                className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between"
              >
                <div>
                  <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider block">
                    {cp.code}
                  </span>
                  <span className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400">
                    Flat ₹{cp.discount_amount} OFF
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleApplyCoupon(cp.code)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  1-Click Apply
                </button>
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  )
}

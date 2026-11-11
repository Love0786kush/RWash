import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText, CheckCircle2, AlertTriangle, Calendar, ShieldAlert, CreditCard, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabase'

export const TermsConditions: React.FC = () => {
  const [businessName, setBusinessName] = useState('RWash')

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await supabase
          .from('settings')
          .select('business_name')
          .eq('id', 1)
          .single()
        if (data?.business_name) {
          setBusinessName(data.business_name)
        }
      } catch (err) {
        console.error('Settings fetch error:', err)
      }
    }
    fetchSettings()
  }, [])

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-12 animate-fade-in font-sans text-left">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-[#553118] via-[#724628] to-[#341B0A] rounded-3xl p-8 md:p-12 text-white shadow-xl relative overflow-hidden border border-amber-500/20">
        <div className="absolute top-0 right-0 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="relative z-10 space-y-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 text-amber-300 text-[10px] font-bold rounded-full uppercase tracking-wider border border-amber-400/20">
            <FileText className="h-3.5 w-3.5" /> Service Agreement
          </span>
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight uppercase">
            Terms & Conditions
          </h1>
          <p className="text-amber-100/90 text-xs md:text-sm max-w-2xl font-medium">
            Please read these Terms and Conditions carefully before booking any car wash or detailing service with {businessName}.
          </p>
          <p className="text-[11px] text-amber-200/60 font-semibold pt-2">
            Effective Date: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* TERMS SECTIONS */}
      <div className="space-y-8 text-slate-700 dark:text-amber-100/80">
        
        {/* Section 1 */}
        <section className="bg-white dark:bg-[#221105] p-6 md:p-8 rounded-2xl border border-amber-900/10 dark:border-amber-800/30 shadow-sm space-y-4">
          <div className="flex items-center gap-3 text-[#724628] dark:text-amber-300">
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200/30">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-black uppercase tracking-tight text-[#221105] dark:text-white">
              1. Doorstep Detailing Service Terms
            </h2>
          </div>
          <p className="text-xs leading-relaxed text-slate-600 dark:text-amber-200/70 font-medium">
            By placing a booking through our portal or app, you agree that:
          </p>
          <ul className="list-disc list-inside text-xs space-y-2 pl-2 text-slate-600 dark:text-amber-200/70 font-medium">
            <li>You own or have legal authority over the vehicle requested for cleaning.</li>
            <li>You will ensure safe access to the vehicle location (driveway, apartment parking, or approved slot) and electrical/water access if specified.</li>
            <li>All valuable personal belongings inside the vehicle should be removed prior to interior steam or vacuum detailing.</li>
          </ul>
        </section>

        {/* Section 2 */}
        <section className="bg-white dark:bg-[#221105] p-6 md:p-8 rounded-2xl border border-amber-900/10 dark:border-amber-800/30 shadow-sm space-y-4">
          <div className="flex items-center gap-3 text-[#724628] dark:text-amber-300">
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200/30">
              <Calendar className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-black uppercase tracking-tight text-[#221105] dark:text-white">
              2. Booking, Rescheduling & Cancellations
            </h2>
          </div>
          <p className="text-xs leading-relaxed text-slate-600 dark:text-amber-200/70 font-medium">
            We value your time and allocate dedicated detailing teams for every scheduled slot:
          </p>
          <ul className="list-disc list-inside text-xs space-y-2 pl-2 text-slate-600 dark:text-amber-200/70 font-medium">
            <li><strong>Free Rescheduling:</strong> You can reschedule or modify your appointment up to 2 hours prior to the slot time without any penalty.</li>
            <li><strong>Cancellation Window:</strong> Cancellations made at least 3 hours before arrival will receive a 100% full refund to the original payment source.</li>
            <li><strong>Weather Delays:</strong> In case of heavy rain or severe weather, {businessName} reserves the right to re-align your slot with prior confirmation for safety.</li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="bg-white dark:bg-[#221105] p-6 md:p-8 rounded-2xl border border-amber-900/10 dark:border-amber-800/30 shadow-sm space-y-4">
          <div className="flex items-center gap-3 text-[#724628] dark:text-amber-300">
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200/30">
              <CreditCard className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-black uppercase tracking-tight text-[#221105] dark:text-white">
              3. Payments, Pricing & Subscriptions
            </h2>
          </div>
          <p className="text-xs leading-relaxed text-slate-600 dark:text-amber-200/70 font-medium">
            All prices listed on the RWash portal are transparent with no hidden surcharges. For monthly subscription plans:
          </p>
          <ul className="list-disc list-inside text-xs space-y-2 pl-2 text-slate-600 dark:text-amber-200/70 font-medium">
            <li>Subscriptions auto-renew according to your chosen cycle (Monthly/Quarterly).</li>
            <li>You can pause or cancel your subscription plan at any time through the Client Portal dashboard.</li>
            <li>Invoices are automatically generated and downloadable after every completed service.</li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className="bg-white dark:bg-[#221105] p-6 md:p-8 rounded-2xl border border-amber-900/10 dark:border-amber-800/30 shadow-sm space-y-4">
          <div className="flex items-center gap-3 text-[#724628] dark:text-amber-300">
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200/30">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-black uppercase tracking-tight text-[#221105] dark:text-white">
              4. Pre-Inspection & Liability
            </h2>
          </div>
          <p className="text-xs leading-relaxed text-slate-600 dark:text-amber-200/70 font-medium">
            Our detailing experts perform a quick digital pre-wash inspection. {businessName} takes extreme care with pH-neutral products. Pre-existing paint chips, deep scratches, or mechanical flaws noted prior to service will be logged in the booking record.
          </p>
        </section>

      </div>

      {/* FOOTER CALLOUT */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-black text-[#221105] dark:text-white uppercase tracking-tight">Questions Regarding Terms?</h4>
          <p className="text-xs text-slate-600 dark:text-amber-200/70 mt-0.5">Reach out to our customer support desk for assistance.</p>
        </div>
        <Link
          to="/contact"
          className="px-6 py-2.5 bg-[#724628] hover:bg-[#553118] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-2"
        >
          <span>Contact Us</span>
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}

import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ShieldCheck, Lock, Eye, FileText, UserCheck, Bell, ChevronRight, Sparkles } from 'lucide-react'
import { supabase } from '../lib/supabase'

export const PrivacyPolicy: React.FC = () => {
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
            <ShieldCheck className="h-3.5 w-3.5" /> Legal & Trust
          </span>
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight uppercase">
            Privacy Policy
          </h1>
          <p className="text-amber-100/90 text-xs md:text-sm max-w-2xl font-medium">
            Your trust is our most valuable asset. Learn how {businessName} collects, protects, and handles your personal information for our doorstep detailing services.
          </p>
          <p className="text-[11px] text-amber-200/60 font-semibold pt-2">
            Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* PRIVACY SECTIONS */}
      <div className="space-y-8 text-slate-700 dark:text-amber-100/80">
        
        {/* Section 1 */}
        <section className="bg-white dark:bg-[#221105] p-6 md:p-8 rounded-2xl border border-amber-900/10 dark:border-amber-800/30 shadow-sm space-y-4">
          <div className="flex items-center gap-3 text-[#724628] dark:text-amber-300">
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200/30">
              <Eye className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-black uppercase tracking-tight text-[#221105] dark:text-white">
              1. Information We Collect
            </h2>
          </div>
          <p className="text-xs leading-relaxed text-slate-600 dark:text-amber-200/70 font-medium">
            When you create an account, schedule a car wash, or subscribe to an RWash detailing plan, we collect necessary personal details to deliver premium service right to your doorstep:
          </p>
          <ul className="list-disc list-inside text-xs space-y-2 pl-2 text-slate-600 dark:text-amber-200/70 font-medium">
            <li><strong>Personal Identity:</strong> Full Name, Email Address, Phone Number.</li>
            <li><strong>Vehicle Details:</strong> Car Make, Model, License Plate Number, Vehicle Type (Hatchback, Sedan, SUV, Luxury).</li>
            <li><strong>Location & Address:</strong> Home/Office GPS location, address details for mobile doorstep service dispatch.</li>
            <li><strong>Payment Logs:</strong> Transaction references and payment method preferences (card/UPI/cash logs encrypted securely).</li>
          </ul>
        </section>

        {/* Section 2 */}
        <section className="bg-white dark:bg-[#221105] p-6 md:p-8 rounded-2xl border border-amber-900/10 dark:border-amber-800/30 shadow-sm space-y-4">
          <div className="flex items-center gap-3 text-[#724628] dark:text-amber-300">
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200/30">
              <Lock className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-black uppercase tracking-tight text-[#221105] dark:text-white">
              2. How We Use Your Data
            </h2>
          </div>
          <p className="text-xs leading-relaxed text-slate-600 dark:text-amber-200/70 font-medium">
            We strictly use your information to ensure seamless detailing service execution:
          </p>
          <ul className="list-disc list-inside text-xs space-y-2 pl-2 text-slate-600 dark:text-amber-200/70 font-medium">
            <li>To dispatch certified detailing crews to your specified location on time.</li>
            <li>To send real-time SMS & email notifications regarding booking updates, washer arrival, and invoices.</li>
            <li>To manage your active recurring subscription plans and vehicle maintenance schedules.</li>
            <li>To continuously improve our eco-friendly washing formulas and service efficiency.</li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="bg-white dark:bg-[#221105] p-6 md:p-8 rounded-2xl border border-amber-900/10 dark:border-amber-800/30 shadow-sm space-y-4">
          <div className="flex items-center gap-3 text-[#724628] dark:text-amber-300">
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200/30">
              <UserCheck className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-black uppercase tracking-tight text-[#221105] dark:text-white">
              3. Data Security & Confidentiality
            </h2>
          </div>
          <p className="text-xs leading-relaxed text-slate-600 dark:text-amber-200/70 font-medium">
            We enforce industry-standard Row Level Security (RLS), SSL 256-bit encryption, and secure cloud databases. We never sell, rent, or lease your personal credentials or address data to third-party advertisers under any circumstances.
          </p>
        </section>

        {/* Section 4 */}
        <section className="bg-white dark:bg-[#221105] p-6 md:p-8 rounded-2xl border border-amber-900/10 dark:border-amber-800/30 shadow-sm space-y-4">
          <div className="flex items-center gap-3 text-[#724628] dark:text-amber-300">
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200/30">
              <Bell className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-black uppercase tracking-tight text-[#221105] dark:text-white">
              4. Your Privacy Rights
            </h2>
          </div>
          <p className="text-xs leading-relaxed text-slate-600 dark:text-amber-200/70 font-medium">
            You maintain full control over your information. At any point, you can:
          </p>
          <ul className="list-disc list-inside text-xs space-y-2 pl-2 text-slate-600 dark:text-amber-200/70 font-medium">
            <li>Update your profile, phone number, and vehicle list directly inside the Client Portal.</li>
            <li>Request a complete export of your detailing service history and invoices.</li>
            <li>Request account deletion or data erasure by writing to support@rwash.com.</li>
          </ul>
        </section>
      </div>

      {/* FOOTER NEED HELP BOX */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-black text-[#221105] dark:text-white uppercase tracking-tight">Have Privacy Concerns?</h4>
          <p className="text-xs text-slate-600 dark:text-amber-200/70 mt-0.5">Our compliance team is ready to answer any questions.</p>
        </div>
        <Link
          to="/contact"
          className="px-6 py-2.5 bg-[#724628] hover:bg-[#553118] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-2"
        >
          <span>Contact Support</span>
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}

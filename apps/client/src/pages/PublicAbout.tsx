import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, CalendarDays, Award, Clock, ArrowRight, ShieldCheck, Heart, Droplets, CheckCircle2, Car, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Spinner } from '../components/Spinner'

export const PublicAbout: React.FC = () => {
  const [businessName, setBusinessName] = useState('RWash')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('settings')
          .select('business_name')
          .eq('id', 1)
          .single()
        
        if (data && !error) {
          setBusinessName(data.business_name)
        }
      } catch (err) {
        console.error('Settings load error:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchSettings()
  }, [])

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <Spinner size="large" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-16 animate-fade-in font-sans text-left">
      {/* HERO SECTION */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#F3E9DC] dark:bg-amber-950/60 border border-[#E5D3B8] dark:border-amber-800/40 text-[#724628] dark:text-amber-300 text-[10px] font-black rounded-full uppercase tracking-widest shadow-xs">
            <Sparkles className="h-3.5 w-3.5" /> About {businessName}
          </span>
          <h1 className="text-3xl md:text-5xl font-black text-[#221105] dark:text-white tracking-tight leading-tight uppercase">
            We Redefine Doorstep Detailing Excellence
          </h1>
          <p className="text-slate-600 dark:text-amber-100/80 text-sm leading-relaxed font-medium">
            At <strong>{businessName}</strong>, we bring ultra-premium mobile car washing and ceramic protection right to your home or office. Founded on precision, eco-friendly steam technology, and craftsmanship, we treat every vehicle like a masterpiece.
          </p>
          <p className="text-slate-600 dark:text-amber-100/80 text-sm leading-relaxed font-medium">
            Our certified detailing specialists use biodegradable formulas, high-pressure micro-foam, and interior sanitization systems to deliver a mirror-gloss shine without wasting water.
          </p>
          <div className="pt-2 flex flex-wrap gap-4">
            <Link
              to="/book"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-[#724628] hover:bg-[#553118] text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg hover:scale-[1.02]"
            >
              <span>Book Appointment</span> <ArrowRight className="h-4.5 w-4.5 text-amber-300" />
            </Link>
            <Link
              to="/services"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-white dark:bg-[#221105] hover:bg-amber-50 dark:hover:bg-[#341B0A] text-[#724628] dark:text-amber-200 border border-amber-900/20 font-extrabold text-xs uppercase tracking-wider rounded-2xl transition-all shadow-xs"
            >
              <span>Explore Services</span>
            </Link>
          </div>
        </div>

        {/* HERO IMAGE */}
        <div className="h-96 rounded-3xl overflow-hidden bg-amber-950/20 relative border border-amber-900/20 shadow-xl group">
          <div className="absolute inset-0 bg-gradient-to-t from-[#221105]/60 via-transparent to-transparent z-10" />
          <img
            src="https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=1000&q=80"
            alt="Car detailing"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute bottom-6 left-6 z-20 space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-300 bg-[#221105]/80 backdrop-blur-md px-3 py-1 rounded-full border border-amber-500/20">
              Certified Detailing Crew
            </span>
            <p className="text-white font-bold text-sm">100% Water-Conscious Eco Foam Tech</p>
          </div>
        </div>
      </section>

      {/* STATS GRID */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { label: 'Happy Vehicle Owners', val: '12,500+', icon: <Users className="h-5 w-5 text-amber-500" /> },
          { label: 'Washes & Detailings', val: '28,000+', icon: <Car className="h-5 w-5 text-amber-500" /> },
          { label: 'Water Saved (Liters)', val: '1.2M+', icon: <Droplets className="h-5 w-5 text-amber-500" /> },
          { label: 'Rating & Feedback', val: '4.95 ★', icon: <Award className="h-5 w-5 text-amber-500" /> },
        ].map((s) => (
          <div key={s.label} className="p-6 bg-white dark:bg-[#221105] rounded-2xl border border-amber-900/10 dark:border-amber-800/30 shadow-sm flex flex-col items-center text-center space-y-2">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/50 rounded-xl">{s.icon}</div>
            <h3 className="text-2xl font-black text-[#221105] dark:text-white tracking-tight">{s.val}</h3>
            <p className="text-xs text-slate-500 dark:text-amber-200/70 font-semibold">{s.label}</p>
          </div>
        ))}
      </section>

      {/* CORPORATE VALUES */}
      <section className="bg-gradient-to-br from-[#221105] via-[#341B0A] to-[#140903] text-amber-100/90 py-14 px-8 md:px-12 rounded-3xl border border-amber-500/20 space-y-10 shadow-2xl relative overflow-hidden">
        <div className="text-center max-w-xl mx-auto space-y-2 z-10 relative">
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">Our Promise</span>
          <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">The Core Principles Driving RWash</h2>
          <p className="text-amber-200/70 text-xs">Uncompromising quality for every car, sedan, and luxury SUV.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center relative z-10">
          {[
            { 
              title: 'Meticulous Care', 
              desc: 'We clean every micro-vent, wheel rim, upholstery pore, and paint edge with professional precision.', 
              icon: <ShieldCheck className="h-6 w-6 text-amber-400" /> 
            },
            { 
              title: 'Doorstep Convenience', 
              desc: 'No waiting lines at wash stations. Pick your slot and our equipped mobile unit arrives on time.', 
              icon: <Clock className="h-6 w-6 text-amber-400" /> 
            },
            { 
              title: 'Eco-Shine Technology', 
              desc: 'Using 70% less water with bio-degradable shampoo formulas and high-performance microfiber finish.', 
              icon: <Award className="h-6 w-6 text-amber-400" /> 
            },
          ].map((v) => (
            <div key={v.title} className="p-7 bg-[#221105]/70 border border-amber-500/20 rounded-2xl flex flex-col items-center space-y-3 backdrop-blur-sm">
              <div className="p-3 bg-amber-500/20 rounded-xl mb-1">{v.icon}</div>
              <h3 className="font-extrabold text-white text-base uppercase tracking-tight">{v.title}</h3>
              <p className="text-amber-200/70 text-xs leading-relaxed font-medium">{v.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

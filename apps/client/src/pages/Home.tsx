import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Car, ShieldCheck, Clock, Award, ChevronRight, ChevronLeft, ChevronDown, CheckCircle2, MessageSquare, Star } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Spinner } from '../components/Spinner'
import { Modal } from '../components/Modal'
import { BookingForm } from '../components/BookingForm'
import { getCached, setCached, CACHE_KEYS } from '../utils/cache'

interface Banner {
  id: string;
  image_url: string;
  title: string | null;
  coupon_code: string | null;
  redirect_url: string | null;
}

interface Service {
  id: string;
  name: string;
  price: number;
  description: string | null;
  category: string | null;
  image_url: string | null;
}

interface BlogArticle {
  id: string;
  title: string;
  category: string;
  image_url: string;
  description: string;
  stage_number: string;
}

interface CustomerReview {
  id: string;
  rating: number;
  comment: string | null;
  customers: { name: string } | null;
  services: { name: string } | null;
}

export const Home: React.FC = () => {
  const [banners, setBanners] = useState<Banner[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [blogs, setBlogs] = useState<BlogArticle[]>([])
  const [reviews, setReviews] = useState<CustomerReview[]>([])
  const [loading, setLoading] = useState(true)
  const [activeBannerIdx, setActiveBannerIdx] = useState(0)
  const navigate = useNavigate()
  
  // Booking Modal States
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)
  const [modalServiceId, setModalServiceId] = useState('')
  
  // FAQ Collapsible States
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0)

  const fetchHomeContent = async () => {
    try {
      const [bannersRes, servicesRes, blogsRes, reviewsRes] = await Promise.all([
        supabase.from('banners').select('*').eq('is_visible', true).order('created_at', { ascending: false }),
        supabase.from('services').select('*').order('created_at', { ascending: false }).limit(3),
        supabase.from('blogs').select('*').order('stage_number', { ascending: true }),
        supabase.from('reviews').select(`
          id,
          rating,
          comment,
          customers (name),
          services (name)
        `).order('created_at', { ascending: false }).limit(3)
      ])

      setBanners((bannersRes.data as Banner[]) || [])
      setServices((servicesRes.data as Service[]) || [])
      setBlogs((blogsRes.data as BlogArticle[]) || [])
      setReviews((reviewsRes.data as any[]) || [])
    } catch (err) {
      console.error('Home content load error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHomeContent()

    const channel = supabase
      .channel('home-content-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, () => {
        fetchHomeContent()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'banners' }, () => {
        fetchHomeContent()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Auto scroll banners
  useEffect(() => {
    if (banners.length <= 1) return
    const interval = setInterval(() => {
      setActiveBannerIdx((prev) => (prev + 1) % banners.length)
    }, 6000)
    return () => clearInterval(interval)
  }, [banners])

  const faqs = [
    { q: 'How long does a detailing service take?', a: 'Depending on the package, our express exterior wash takes about 20-30 minutes, whereas full interior & exterior detailing can take up to 2-3 hours.' },
    { q: 'Do I need to book an appointment in advance?', a: 'While we welcome walk-ins, we highly recommend booking online in advance to secure your preferred date and time slot, avoiding any wait times.' },
    { q: 'What products do you use for ceramic coating?', a: 'We exclusively use professional-grade, high-silica (SiO2) ceramic coatings that offer long-lasting 6 to 12-month paint protection and chemical resistance.' },
    { q: 'Do you offer clean water treatments?', a: 'Yes, we use eco-friendly biodegradable shampoos and filtered water reclaiming systems to minimize chemical runoff and protect the environment.' }
  ]

  // Fallback / Default static articles if Supabase blogs table is empty
  const fallbackBlogs = [
    {
      id: 'default-1',
      title: "The Science of Snow Foam Wash",
      category: "Foam Wash",
      image_url: "https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&w=1200&q=80",
      description: "Traditional bucket washing drags micro-particles across your clear coat, leaving spiral scratches. Our clean snow foam technique works on a scientific level to lift dirt particles safely before any physical mitt contacts the surface.",
      stage_number: "Stage 01 — Foam Pre-Wash"
    },
    {
      id: 'default-2',
      title: "Paint Rubbing & Mirror Buffing",
      category: "Rubbing & Polishing",
      image_url: "https://images.unsplash.com/photo-1507136566006-cfc505b114fc?auto=format&fit=crop&w=1200&q=80",
      description: "Oxidation, swirl marks, and minor scratches scatter light rays, making your paint look dull and faded. Our multi-stage compounding uses precision orbital machine polishers to level clearcoat imperfections, restoring mirror gloss clarity.",
      stage_number: "Stage 02 — Paint Correction"
    },
    {
      id: 'default-3',
      title: "Interior Cabin Sanitization",
      category: "Interior Detailing",
      image_url: "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=1200&q=80",
      description: "Your car's cabin gathers invisible mold, dust, and food oils over time. We use medical-grade dry steam vapor extraction at 120°C to deep-clean air conditioning vents, carpet fibers, and upholstery without soaking them.",
      stage_number: "Stage 03 — Cabin Deep Extraction"
    }
  ]

  // Fallback static reviews if database reviews table is empty
  const fallbackReviews: CustomerReview[] = [
    { id: '1', rating: 5, comment: 'The full ceramic coating exceeded my expectations. Water just slides off, and the shine is unbelievable. Great online booking service!', customers: { name: 'David Miller' }, services: { name: 'Ceramic Coating' } },
    { id: '2', rating: 5, comment: 'Interior detail got rid of all dog hairs and milk stains from kids. The steam sanitization left the car smelling fresh.', customers: { name: 'Jessica Taylor' }, services: { name: 'Interior Detail' } },
    { id: '3', rating: 5, comment: 'Very meticulous exterior wash. Clean wheels, no water spots left behind. The admin system live-notified me once completed.', customers: { name: 'Adam Vance' }, services: { name: 'Express Wash' } }
  ]

  const activeBlogsList = blogs.length > 0 ? blogs : fallbackBlogs
  const activeReviewsList = reviews.length > 0 ? reviews : fallbackReviews

  return (
    <div className="space-y-24 pb-20 animate-fade-in relative overflow-hidden transition-colors duration-300">
      {/* 1. HERO SLIDER */}
      <section className="max-w-8xl mx-auto px-3 sm:px-6 md:px-8 w-full">
        <div className="hero-slider relative h-[25vh] sm:h-[42vh] md:h-[58vh] min-h-[150px] sm:min-h-[300px] max-h-[520px] w-full overflow-hidden bg-[#1A0C04] rounded-2xl sm:rounded-3xl border border-[#E6CBB2]/20 dark:border-[#52270D]/40 shadow-2xl">
        {loading ? (
          // SKELETON LOADER FOR HERO BANNER
          <div className="w-full h-full bg-[#2A1408] relative overflow-hidden animate-pulse animate-shimmer flex flex-col items-center justify-center p-6 text-center">
            <div className="max-w-2xl w-full flex flex-col items-center gap-4">
              <div className="h-4 w-28 sm:w-36 bg-[#E6CBB2]/15 rounded-full" />
              <div className="h-8 sm:h-14 w-4/5 sm:w-2/3 bg-[#E6CBB2]/25 rounded-2xl" />
              <div className="h-3 sm:h-4 w-3/5 sm:w-1/2 bg-[#E6CBB2]/10 rounded-full hidden sm:block" />
              <div className="h-9 sm:h-11 w-32 sm:w-44 bg-[#8C471E]/40 rounded-full mt-2" />
            </div>
            {/* Corner subtle shimmer indicator */}
            <div className="absolute bottom-4 right-4 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-[#E6CBB2]/40 animate-ping" />
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#E6CBB2]/40">Loading</span>
            </div>
          </div>
        ) : banners.length > 0 ? (
          // Active Banners from Database
          <div className="relative w-full h-full">
            {banners.map((b, idx) => (
              <div
                key={b.id}
                onClick={() => {
                  if (b.redirect_url) {
                    if (b.redirect_url.startsWith('http')) {
                      window.open(b.redirect_url, '_blank')
                    } else {
                      navigate(b.redirect_url)
                    }
                  } else {
                    setModalServiceId('')
                    setIsBookingModalOpen(true)
                  }
                }}
                className={`absolute inset-0 transition-opacity duration-700 flex items-center justify-center text-center cursor-pointer group ${
                  idx === activeBannerIdx ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
                }`}
              >
                {/* Background Image */}
                <img
                  src={b.image_url}
                  alt={b.title || 'RWash Banner'}
                  className="absolute inset-0 w-full h-full object-cover object-center"
                />
                {/* Coupon Badge */}
                {b.coupon_code && (
                  <div className="absolute top-4 right-4 z-20 bg-amber-500/90 backdrop-blur-sm text-white text-[11px] font-black px-3 py-1.5 rounded-full shadow-lg border border-amber-400/30 flex items-center gap-1.5">
                    <span>🏷️</span>
                    <span>{b.coupon_code}</span>
                  </div>
                )}
                {b.title && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex items-end justify-center p-6 pb-12">
                    <h2 className="text-white text-xl sm:text-3xl font-black tracking-tight uppercase">
                      {b.title}
                    </h2>
                  </div>
                )}
              </div>
            ))}

            {/* Navigation Arrows */}
            {banners.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveBannerIdx((prev) => (prev - 1 + banners.length) % banners.length);
                  }}
                  className="absolute left-2 sm:left-4 md:left-6 top-1/2 -translate-y-1/2 z-30 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black/40 backdrop-blur-md border border-white/20 hover:bg-black/60 text-white flex items-center justify-center transition-all cursor-pointer"
                  aria-label="Previous slide"
                >
                  <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveBannerIdx((prev) => (prev + 1) % banners.length);
                  }}
                  className="absolute right-2 sm:right-4 md:right-6 top-1/2 -translate-y-1/2 z-30 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black/40 backdrop-blur-md border border-white/20 hover:bg-black/60 text-white flex items-center justify-center transition-all cursor-pointer"
                  aria-label="Next slide"
                >
                  <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
                </button>

                {/* Dots indicator */}
                <div className="absolute bottom-3 sm:bottom-6 left-1/2 -translate-x-1/2 z-30 flex gap-1.5 sm:gap-2">
                  {banners.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveBannerIdx(idx);
                      }}
                      className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 ${
                        idx === activeBannerIdx ? 'w-5 sm:w-6 bg-[#E69D62]' : 'w-1.5 sm:w-2 bg-white/40 hover:bg-white/60'
                      }`}
                      aria-label={`Go to slide ${idx + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          // Minimal Brand Booking CTA when no banner is created yet
          <div
            onClick={() => { setModalServiceId(''); setIsBookingModalOpen(true); }}
            className="absolute inset-0 flex items-center justify-center px-4 sm:px-6 text-center cursor-pointer group bg-gradient-to-r from-[#210E04] via-[#381403] to-[#210E04]"
          >
            <div className="max-w-2xl space-y-3 sm:space-y-4 z-20 flex flex-col items-center">
              <span className="text-[#E69D62] text-[10px] sm:text-xs font-black tracking-widest uppercase">
                Premium Doorstep Detailing
              </span>
              <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-white leading-tight uppercase">
                Professional Car Care
              </h2>
              <div className="pt-2">
                <button
                  className="px-6 py-2.5 sm:px-8 sm:py-3.5 bg-[#8C471E] dark:bg-[#A65D2E] text-white font-black text-[10px] sm:text-xs uppercase tracking-wider rounded-full transition-all shadow-lg cursor-pointer hover:opacity-90"
                >
                  Book Wash Now
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </section>

      {/* 2. WHY CHOOSE US */}
      <section className="max-w-8xl mx-auto px-6 md:px-8 space-y-12">
        <div className="text-center max-w-xl mx-auto space-y-3">
          <span className="text-[#A65D2E] dark:text-[#E69D62] text-xs font-extrabold uppercase tracking-widest">
            Excellence Guaranteed
          </span>
          <h2 className="text-3xl md:text-5xl font-black text-[#3D1E0B] dark:text-[#FFF5EB] tracking-tight uppercase">
            Why Choose RWash
          </h2>
          <p className="text-[#542E16] dark:text-[#E8C8AE] text-xs md:text-sm max-w-md mx-auto font-semibold">
            We provide high-definition detailing to match your vehicle's standards with professional care.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              title: 'Eco Friendly Clean',
              desc: 'We utilize safe biodegradable products and filtered water treatment setups to keep your car and the environment clean.',
              icon: <ShieldCheck className="h-7 w-7 text-[#8C471E] dark:text-[#E69D62]" />,
              badge: 'Safe & Clean'
            },
            {
              title: 'Expert Detailing Staff',
              desc: 'Our technicians undergo rigorous certifications and continuous training to clean and restore high-end vehicles.',
              icon: <Award className="h-7 w-7 text-[#8C471E] dark:text-[#E69D62]" />,
              badge: 'Certified Pro'
            },
            {
              title: 'Save Scheduling Time',
              desc: 'Book in under 2 minutes, get instant confirmation, and track your vehicle status in real time via dashboard.',
              icon: <Clock className="h-7 w-7 text-[#8C471E] dark:text-[#E69D62]" />,
              badge: 'Realtime Booking'
            },
          ].map((item) => (
            <div key={item.title} className="group relative p-8 bg-white dark:bg-[#210E04] text-[#3D1E0B] dark:text-[#FFF5EB] rounded-3xl border border-[#E6CBB2] dark:border-[#52270D] shadow-xs hover:border-[#8C471E] hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="w-14 h-14 rounded-2xl bg-[#FDF0E6] dark:bg-[#2E1002] flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-[#E6CBB2]/50 dark:border-[#52270D]">
                    {item.icon}
                  </div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#8C471E] dark:text-[#E69D62] px-3 py-1 bg-[#FDF0E6] dark:bg-[#2E1002] rounded-full border border-[#E6CBB2] dark:border-[#52270D]">
                    {item.badge}
                  </span>
                </div>
                <div className="space-y-2">
                  <h3 className="font-extrabold text-xl text-[#3D1E0B] dark:text-[#FFF5EB] tracking-tight">{item.title}</h3>
                  <p className="text-[#542E16] dark:text-[#E8C8AE] text-xs leading-relaxed font-medium">{item.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. FEATURED SERVICES */}
      <section className="max-w-8xl mx-auto px-6 md:px-8 space-y-12">
        <div className="flex items-end justify-between border-b border-[#E6CBB2] dark:border-[#52270D] pb-4">
          <div>
            <h2 className="text-2xl font-black text-[#3D1E0B] dark:text-[#FFF5EB] tracking-tight uppercase">Featured Service Packages</h2>
            <p className="text-[#542E16] dark:text-[#E8C8AE] text-xs mt-0.5 font-semibold">Our most popular wash solutions.</p>
          </div>
          <Link to="/services" className="text-xs font-bold text-[#8C471E] dark:text-[#E69D62] hover:underline flex items-center gap-1">
            <span>View Catalog</span> <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="bg-white dark:bg-[#210E04] rounded-3xl border border-[#E6CBB2]/50 dark:border-[#52270D]/50 overflow-hidden shadow-xs p-5 flex flex-col justify-between h-[360px] animate-pulse animate-shimmer"
              >
                <div className="space-y-4">
                  <div className="h-44 bg-[#E6CBB2]/20 dark:bg-[#52270D]/30 rounded-2xl w-full" />
                  <div className="h-5 bg-[#E6CBB2]/30 dark:bg-[#52270D]/40 rounded-full w-2/3" />
                  <div className="space-y-2">
                    <div className="h-3 bg-[#E6CBB2]/15 dark:bg-[#52270D]/20 rounded-full w-full" />
                    <div className="h-3 bg-[#E6CBB2]/15 dark:bg-[#52270D]/20 rounded-full w-4/5" />
                  </div>
                </div>
                <div className="pt-4 border-t border-[#E6CBB2]/30 dark:border-[#52270D]/30 flex items-center justify-between">
                  <div className="h-6 w-20 bg-[#8C471E]/20 dark:bg-[#A65D2E]/20 rounded-lg" />
                  <div className="h-9 w-24 bg-[#8C471E]/30 dark:bg-[#A65D2E]/30 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {services.slice(0, 3).map((s) => (
              <div key={s.id} className="bg-white dark:bg-[#210E04] rounded-3xl border border-[#E6CBB2] dark:border-[#52270D] overflow-hidden shadow-xs hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
                <div>
                  <div className="h-44 bg-[#FDF0E6] dark:bg-[#120702] relative overflow-hidden flex items-center justify-center">
                    <img
                      src={s.image_url || 'https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&w=800&q=80'}
                      alt={s.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const img = e.target as HTMLImageElement;
                        if (!img.dataset.failed) {
                          img.dataset.failed = 'true';
                          img.src = 'https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&w=800&q=80';
                        }
                      }}
                    />
                    <span className="absolute top-3 left-3 bg-[#3D1E0B]/90 backdrop-blur-xs text-[#FFF5EB] text-[10px] font-bold px-3 py-1 rounded-full border border-amber-500/20">
                      {s.category || 'Standard'}
                    </span>
                  </div>
                  <div className="p-5 space-y-2 text-left">
                    <h3 className="font-bold text-[#3D1E0B] dark:text-[#FFF5EB] text-base truncate">{s.name}</h3>
                    <p className="text-[#542E16] dark:text-[#E8C8AE] text-xs leading-relaxed line-clamp-2 h-9 font-semibold">
                      {s.description || 'No description provided.'}
                    </p>
                  </div>
                </div>
                <div className="px-5 pb-5 pt-3 border-t border-[#E6CBB2] dark:border-[#52270D] flex items-center justify-between">
                  <span className="text-xl font-black text-[#8C471E] dark:text-[#E69D62]">₹{parseFloat(s.price.toString()).toFixed(2)}</span>
                  <button
                    onClick={() => { setModalServiceId(s.id); setIsBookingModalOpen(true); }}
                    className="px-4 py-2 bg-[#8C471E] hover:bg-[#6D3412] dark:bg-[#A65D2E] dark:hover:bg-[#8C471E] text-white font-bold text-[10px] rounded-xl transition-all cursor-pointer uppercase shadow-xs"
                  >
                    Book Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 4. DETAILING ACADEMY - DYNAMIC FROM SUPABASE */}
      <section className="max-w-8xl mx-auto px-6 md:px-8 space-y-20">
        <div className="text-center max-w-xl mx-auto space-y-3">
          <span className="text-[#A65D2E] dark:text-[#E69D62] text-xs font-extrabold uppercase tracking-widest">
            Detailing Academy
          </span>
          <h2 className="text-3xl md:text-5xl font-black text-[#3D1E0B] dark:text-[#FFF5EB] tracking-tight uppercase">
            Professional Procedures
          </h2>
          <p className="text-[#542E16] dark:text-[#E8C8AE] text-xs md:text-sm max-w-sm mx-auto font-semibold">
            Explore the specialized workflows we apply to wash, refine, and protect your vehicle.
          </p>
        </div>

        <div className="space-y-24">
          {activeBlogsList.map((b, idx) => (
            <div 
              key={b.id} 
              className={`flex flex-col ${idx % 2 === 1 ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-12 lg:gap-16`}
            >
              <div className="w-full lg:w-1/2 h-[260px] sm:h-[350px] md:h-[450px] rounded-3xl overflow-hidden shadow-2xl relative border border-[#E6CBB2] dark:border-[#52270D]">
                <img 
                  src={b.image_url} 
                  alt={b.title} 
                  className="w-full h-full object-cover"
                />
                <span className="absolute top-4 left-4 bg-[#8C471E] dark:bg-[#A65D2E] text-white text-[9px] font-black uppercase px-3.5 py-1.5 rounded-full tracking-wider shadow-md border border-amber-400/20">
                  {b.stage_number}
                </span>
              </div>
              <div className="w-full lg:w-1/2 space-y-6 text-left">
                <span className="text-[#A65D2E] dark:text-[#E69D62] text-xs font-bold uppercase tracking-widest">{b.category}</span>
                <h3 className="text-3xl md:text-4xl font-black text-[#3D1E0B] dark:text-[#FFF5EB] leading-tight uppercase">
                  {b.title}
                </h3>
                <p className="text-[#542E16] dark:text-[#E8C8AE] text-xs md:text-sm leading-relaxed font-semibold">
                  {b.description}
                </p>
                
                <ul className="space-y-3.5 text-xs text-[#542E16] dark:text-[#E8C8AE] font-semibold">
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#8C471E] dark:bg-[#A65D2E] text-white flex items-center justify-center text-[10px] font-bold mt-0.5 flex-shrink-0">✓</span>
                    <span className="text-[#3D1E0B] dark:text-[#FFF5EB] font-bold">Professional grade eco-cleansers designed to suspend dirt and minimize contact scratching.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#8C471E] dark:bg-[#A65D2E] text-white flex items-center justify-center text-[10px] font-bold mt-0.5 flex-shrink-0">✓</span>
                    <span className="text-[#3D1E0B] dark:text-[#FFF5EB] font-bold">Detailed inspections of finish thickness and texture before any treatment.</span>
                  </li>
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. REVIEWS - DYNAMIC FROM SUPABASE */}
      <section className="bg-white dark:bg-[#210E04] text-[#3D1E0B] dark:text-[#FFF5EB] py-16 rounded-3xl border border-[#E6CBB2] dark:border-[#52270D] max-w-8xl mx-auto px-6 md:px-8 shadow-xs">
        <div className="text-center max-w-lg mx-auto mb-12 space-y-2">
          <span className="text-xs font-extrabold text-[#A65D2E] dark:text-[#E69D62] uppercase tracking-widest">Client Testimonials</span>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight uppercase text-[#3D1E0B] dark:text-[#FFF5EB]">What Our Customers Say</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {activeReviewsList.map((item) => (
            <div key={item.id} className="p-6 bg-[#FDF0E6] dark:bg-[#120702] rounded-2xl border border-[#E6CBB2] dark:border-[#52270D] space-y-4 text-left">
              <div className="flex gap-1">
                {Array.from({ length: item.rating }).map((_, rIdx) => (
                  <Star key={rIdx} className="h-4.5 w-4.5 fill-amber-500 text-amber-500" />
                ))}
              </div>
              <p className="text-xs italic leading-relaxed text-[#542E16] dark:text-[#E8C8AE] font-semibold">
                "{item.comment || 'Awesome car wash and detailing service! Highly recommended.'}"
              </p>
              <div className="pt-2 border-t border-[#E6CBB2] dark:border-[#52270D] flex justify-between items-center">
                <div>
                  <div className="font-black text-xs text-[#3D1E0B] dark:text-[#FFF5EB]">{item.customers?.name || 'Customer'}</div>
                  <span className="text-[9px] font-extrabold uppercase text-[#8C471E] dark:text-[#E69D62]">{item.services?.name || 'Wash Package'}</span>
                </div>
                <MessageSquare className="h-4 w-4 text-[#A65D2E] dark:text-[#E69D62]" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. FAQs */}
      <section className="max-w-4xl mx-auto px-6 space-y-8">
        <div className="text-center space-y-2">
          <span className="text-xs font-extrabold text-[#A65D2E] dark:text-[#E69D62] uppercase tracking-widest">Common Inquiries</span>
          <h2 className="text-2xl font-black text-[#3D1E0B] dark:text-[#FFF5EB] tracking-tight uppercase">Frequently Asked Questions</h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div key={idx} className="bg-white dark:bg-[#210E04] rounded-2xl border border-[#E6CBB2] dark:border-[#52270D] overflow-hidden transition-all duration-300 shadow-xs">
              <button
                onClick={() => setOpenFaqIdx(openFaqIdx === idx ? null : idx)}
                className="w-full px-6 py-4 text-left flex justify-between items-center font-bold text-[#3D1E0B] dark:text-[#FFF5EB] hover:text-[#8C471E] dark:hover:text-[#E69D62] transition-colors focus:outline-none cursor-pointer"
              >
                <span className="text-sm font-extrabold">{faq.q}</span>
                <ChevronDown className={`h-4 w-4 text-[#8C471E] dark:text-[#E69D62] transition-transform duration-300 ${openFaqIdx === idx ? 'transform rotate-180' : ''}`} />
              </button>
              {openFaqIdx === idx && (
                <div className="px-6 pb-5 text-xs text-[#542E16] dark:text-[#E8C8AE] leading-relaxed border-t border-[#E6CBB2] dark:border-[#52270D] pt-4 font-semibold text-left">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* BOOKING MODAL GATE */}
      <Modal isOpen={isBookingModalOpen} onClose={() => setIsBookingModalOpen(false)} title="Book Your Wash Slot">
        <BookingForm preselectedServiceId={modalServiceId} onSuccess={() => setIsBookingModalOpen(false)} />
      </Modal>
    </div>
  )
}

import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Car, Phone, Mail, MapPin, ChevronRight, Heart, ArrowUp, Droplets } from 'lucide-react'
import { supabase } from '../lib/supabase'

// Custom SVG Social Icons (Unified 20x20 icons)
const InstagramIcon: React.FC<{ className?: string }> = ({ className = "h-5 w-5" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
)

const FacebookIcon: React.FC<{ className?: string }> = ({ className = "h-5 w-5" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M9 8H6v4h3v12h5V12h3.642L18 8h-4V6.333C14 5.374 14.5 5 15.5 5H18V0h-3.808C10.592 0 9 1.592 9 4.615V8z"/>
  </svg>
)

const YoutubeIcon: React.FC<{ className?: string }> = ({ className = "h-5 w-5" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
  </svg>
)

const TwitterIcon: React.FC<{ className?: string }> = ({ className = "h-5 w-5" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
)

export const Footer: React.FC = () => {
  const [businessName, setBusinessName] = useState('RWash – Premium Car Detailing')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [socialLinks, setSocialLinks] = useState({
    instagram: 'https://instagram.com/rwash_official',
    facebook: 'https://facebook.com/rwashdetailing',
    youtube: 'https://youtube.com',
    twitter: 'https://twitter.com'
  })

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await supabase
          .from('settings')
          .select('*')
          .eq('id', 1)
          .maybeSingle()

        if (data) {
          if (data.business_name) setBusinessName(data.business_name)
          if (data.support_phone) setPhone(data.support_phone)
          if (data.address && data.address.trim().length > 5) setAddress(data.address)
          if (data.social_links) {
            setSocialLinks(prev => ({
              ...prev,
              ...data.social_links
            }))
          }
        }
      } catch (err) {
        console.error('Footer fetch settings error:', err)
      }
    }

    fetchSettings()
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Valid address fallback
  const displayAddress = (address && address.trim().length > 6 && !address.toLowerCase().includes('wssso')) 
    ? address 
    : 'Jhalana Doongri, near RIICO, Jaipur'

  return (
    <div className="relative mt-28 font-sans overflow-hidden">

      {/* DYNAMIC THEME WAVES — 100% Theme Driven (Zero Hardcoded Brown) */}
      <div className="w-full overflow-hidden leading-none relative z-10 -mb-1 pointer-events-none h-28 md:h-40">
        
        {/* Layer 1: Primary ribbon */}
        <div className="absolute inset-0 w-full h-full animate-wave-bob opacity-80">
          <svg viewBox="0 0 1440 200" preserveAspectRatio="none" className="w-full h-full">
            <defs>
              <linearGradient id="footerThemeGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: 'var(--theme-p, #3b82f6)' }} stopOpacity="0.85" />
                <stop offset="50%" style={{ stopColor: 'var(--theme-dp, #2563eb)' }} stopOpacity="0.9" />
                <stop offset="100%" style={{ stopColor: 'var(--theme-dbg, #0f172a)' }} stopOpacity="1" />
              </linearGradient>
            </defs>
            <path
              d="M0,90 C360,10 720,170 1080,30 C1260,-10 1380,50 1440,80 L1440,200 L0,200 Z"
              fill="url(#footerThemeGrad1)"
            />
          </svg>
        </div>

        {/* Layer 2: Soft accent ribbon */}
        <div className="absolute inset-0 w-full h-full animate-wave-bob-slow opacity-90">
          <svg viewBox="0 0 1440 200" preserveAspectRatio="none" className="w-full h-full">
            <defs>
              <linearGradient id="footerThemeGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: 'var(--theme-accent, #60a5fa)' }} stopOpacity="0.75" />
                <stop offset="60%" style={{ stopColor: 'var(--theme-dp, #2563eb)' }} stopOpacity="0.95" />
                <stop offset="100%" style={{ stopColor: 'var(--theme-dbg, #0f172a)' }} stopOpacity="1" />
              </linearGradient>
            </defs>
            <path
              d="M0,50 C320,150 680,10 1020,130 C1248,170 1360,60 1440,100 L1440,200 L0,200 Z"
              fill="url(#footerThemeGrad2)"
            />
          </svg>
        </div>

        {/* Layer 3: Solid dark base */}
        <div className="absolute inset-0 w-full h-full" style={{ color: 'var(--theme-dbg, #0f172a)' }}>
          <svg viewBox="0 0 1440 200" preserveAspectRatio="none" className="w-full h-full fill-current">
            <path d="M0,110 C360,170 720,60 1080,140 C1260,170 1380,90 1440,110 L1440,200 L0,200 Z"></path>
          </svg>
        </div>

      </div>

      {/* FOOTER CONTAINER — 100% Theme Driven */}
      <footer
        className="pt-6 pb-12 transition-colors duration-300 relative z-10 border-t"
        style={{
          backgroundColor: 'var(--theme-dbg, #0f172a)',
          borderColor: 'var(--theme-dborder, rgba(255, 255, 255, 0.1))',
          color: 'var(--theme-dtext, #f8fafc)',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-8 space-y-10 relative z-10">
          
          {/* Quick CTA Bar */}
          <div
            className="flex flex-col md:flex-row items-center justify-between gap-4 backdrop-blur-md px-6 py-5 rounded-2xl border shadow-xl"
            style={{
              backgroundColor: 'var(--theme-dcard, #1e293b)',
              borderColor: 'var(--theme-dborder, rgba(255, 255, 255, 0.12))',
            }}
          >
            <div className="flex items-center gap-3.5 text-left">
              {/* Droplets Themed Icon Card */}
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-md transition-transform"
                style={{ backgroundColor: 'var(--theme-dp, #3b82f6)', color: '#ffffff' }}
              >
                <Droplets className="h-5 w-5 text-white" />
              </div>
              <div>
                <h4 className="font-display text-sm md:text-base font-bold uppercase tracking-tight text-white">
                  Doorstep Detailing & Eco Car Wash
                </h4>
                <p className="text-xs font-medium" style={{ color: 'var(--theme-dtext2, #94a3b8)' }}>
                  Book your wash slot online in under 60 seconds.
                </p>
              </div>
            </div>

            <Link
              to="/book"
              className="px-6 py-3.5 text-white font-display font-bold text-xs uppercase tracking-[0.12em] rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer whitespace-nowrap hover:scale-105 active:scale-95"
              style={{ backgroundColor: 'var(--theme-dp, #3b82f6)' }}
            >
              <span>Book Appointment</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {/* 3-Column Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 text-left pt-2">

            {/* Column 1: Brand, Description & Social Media */}
            <div className="space-y-4">
              <Link to="/" className="flex items-center gap-3 group">
                {/* Brand Car Themed Icon Card — exact same color as Droplets */}
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-md group-hover:scale-105 transition-transform duration-300"
                  style={{ backgroundColor: 'var(--theme-dp, #3b82f6)', color: '#ffffff' }}
                >
                  <Car className="h-6 w-6 text-white" />
                </div>
                <span className="font-display text-lg md:text-xl font-bold tracking-tight uppercase text-white">
                  {businessName}
                </span>
              </Link>
              <p className="text-xs leading-relaxed font-medium max-w-sm" style={{ color: 'var(--theme-dtext2, #94a3b8)' }}>
                Premium eco-friendly doorstep car detailing. Restoring paint clarity, showroom mirror gloss, and interior decontamination.
              </p>

              {/* Social Media Buttons — Unified Themed Icon Cards */}
              <div className="pt-2 space-y-2">
                <p className="font-display text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--theme-dp, #60a5fa)' }}>
                  Follow Us On Social Media
                </p>
                <div className="flex items-center gap-3">
                  {[
                    { href: socialLinks.instagram, label: 'Instagram', Icon: InstagramIcon },
                    { href: socialLinks.facebook, label: 'Facebook', Icon: FacebookIcon },
                    { href: socialLinks.youtube, label: 'YouTube', Icon: YoutubeIcon },
                    { href: socialLinks.twitter, label: 'Twitter', Icon: TwitterIcon },
                  ].map(({ href, label, Icon }) => (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      className="w-11 h-11 rounded-2xl border flex items-center justify-center transition-all duration-200 shadow-sm hover:scale-110 active:scale-95 group cursor-pointer"
                      style={{
                        backgroundColor: 'var(--theme-dcard, #1e293b)',
                        borderColor: 'var(--theme-dborder, rgba(255, 255, 255, 0.12))',
                        color: 'var(--theme-dp, #3b82f6)',
                      }}
                      title={label}
                    >
                      <Icon className="h-5 w-5 transition-transform group-hover:scale-110" />
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* Column 2: Essential Links */}
            <div className="space-y-3">
              <h4
                className="font-display text-xs font-bold uppercase tracking-[0.16em] border-b pb-1.5"
                style={{
                  color: 'var(--theme-dp, #60a5fa)',
                  borderColor: 'var(--theme-dborder, rgba(255, 255, 255, 0.1))',
                }}
              >
                Essential Navigation
              </h4>
              <div className="grid grid-cols-2 gap-2.5 text-xs font-semibold" style={{ color: 'var(--theme-dtext, #f8fafc)' }}>
                {[
                  { to: '/', label: 'Home' },
                  { to: '/about', label: 'About Us' },
                  { to: '/services', label: 'Services' },
                  { to: '/privacy', label: 'Privacy Policy' },
                  { to: '/book', label: 'Book Slot' },
                  { to: '/terms', label: 'Terms & Conditions' },
                ].map((l) => (
                  <Link
                    key={l.to}
                    to={l.to}
                    onClick={scrollToTop}
                    className="transition-colors py-1 flex items-center gap-1 hover:opacity-80"
                  >
                    <ChevronRight className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--theme-dp, #60a5fa)' }} />
                    <span>{l.label}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Column 3: Contact & Hub Info */}
            <div className="space-y-3">
              <h4
                className="font-display text-xs font-bold uppercase tracking-[0.16em] border-b pb-1.5"
                style={{
                  color: 'var(--theme-dp, #60a5fa)',
                  borderColor: 'var(--theme-dborder, rgba(255, 255, 255, 0.1))',
                }}
              >
                Contact & Hub Info
              </h4>
              <ul className="space-y-3 text-xs font-semibold" style={{ color: 'var(--theme-dtext, #f8fafc)' }}>
                <li className="flex items-center gap-3">
                  {/* Themed Icon Box */}
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border"
                    style={{
                      backgroundColor: 'var(--theme-dcard, #1e293b)',
                      borderColor: 'var(--theme-dborder, rgba(255, 255, 255, 0.12))',
                      color: 'var(--theme-dp, #60a5fa)',
                    }}
                  >
                    <Phone className="h-4 w-4" />
                  </div>
                  <span>{phone || '+91 7852081659'}</span>
                </li>
                <li className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border"
                    style={{
                      backgroundColor: 'var(--theme-dcard, #1e293b)',
                      borderColor: 'var(--theme-dborder, rgba(255, 255, 255, 0.12))',
                      color: 'var(--theme-dp, #60a5fa)',
                    }}
                  >
                    <Mail className="h-4 w-4" />
                  </div>
                  <span>rwash.care@gmail.com</span>
                </li>
                <li className="flex items-start gap-3">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border mt-0.5"
                    style={{
                      backgroundColor: 'var(--theme-dcard, #1e293b)',
                      borderColor: 'var(--theme-dborder, rgba(255, 255, 255, 0.12))',
                      color: 'var(--theme-dp, #60a5fa)',
                    }}
                  >
                    <MapPin className="h-4 w-4" />
                  </div>
                  <span className="leading-relaxed">{displayAddress}</span>
                </li>
              </ul>
            </div>

          </div>

          {/* Bottom Bar: Copyright & Scroll to Top */}
          <div
            className="pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold"
            style={{
              borderColor: 'var(--theme-dborder, rgba(255, 255, 255, 0.1))',
              color: 'var(--theme-dtext2, #94a3b8)',
            }}
          >
            <p className="flex items-center gap-1.5">
              © {new Date().getFullYear()} {businessName}. Built with{' '}
              <Heart
                className="h-3.5 w-3.5 inline"
                style={{ color: 'var(--theme-dp, #3b82f6)', fill: 'var(--theme-dp, #3b82f6)' }}
              />{' '}
              for Car Lovers.
            </p>

            <button
              onClick={scrollToTop}
              className="flex items-center gap-2 px-5 py-2.5 border rounded-2xl text-white font-bold text-xs transition-all shadow-sm hover:scale-105 active:scale-95 cursor-pointer"
              style={{
                backgroundColor: 'var(--theme-dcard, #1e293b)',
                borderColor: 'var(--theme-dborder, rgba(255, 255, 255, 0.12))',
              }}
            >
              <span>Back to top</span>
              <ArrowUp className="h-4 w-4" style={{ color: 'var(--theme-dp, #3b82f6)' }} />
            </button>
          </div>

        </div>
      </footer>
    </div>
  )
}

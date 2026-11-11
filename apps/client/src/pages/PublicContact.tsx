import React, { useEffect, useState } from 'react'
import { Phone, Mail, MapPin, Sparkles, Send, CheckCircle2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from '../context/ToastContext'
import { Spinner } from '../components/Spinner'
import { Alert } from '../components/Alert'

export const PublicContact: React.FC = () => {
  const [businessName, setBusinessName] = useState('RWash')
  const [phone, setPhone] = useState('7852081659')
  const [address, setAddress] = useState('Jhalana Doongri, near RIICO, Jaipur')
  const [loading, setLoading] = useState(true)

  // Form states
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const { showToast } = useToast()

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('settings')
          .select('business_name, phone_number, address')
          .eq('id', 1)
          .single()
        
        if (data && !error) {
          if (data.business_name) setBusinessName(data.business_name)
          if (data.phone_number) setPhone(data.phone_number)
          if (data.address) setAddress(data.address)
        }
      } catch (err) {
        console.error('Settings load error:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchSettings()
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !email || !message) {
      showToast('Please fill in all fields', 'warning')
      return
    }

    setSubmitting(true)
    setTimeout(() => {
      setSubmitting(false)
      setSuccess(true)
      showToast('Message sent successfully! We will reply shortly.', 'success')
      setName('')
      setEmail('')
      setMessage('')
    }, 1200)
  }

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <Spinner size="large" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-12 animate-fade-in">
      {/* Header */}
      <div className="text-center max-w-xl mx-auto space-y-2">
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Contact Our Team</h1>
        <p className="text-slate-500 text-sm">Have questions? Send us an inquiry or visit our wash center.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Contact Info & Map */}
        <div className="space-y-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-primary-500" />
              <span>Wash Center Details</span>
            </h3>

            <div className="space-y-4 text-xs font-semibold text-slate-600 dark:text-slate-400">
              {phone && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary-50 border border-primary-100 flex items-center justify-center text-primary-600 flex-shrink-0">
                    <Phone className="h-4 w-4" />
                  </div>
                  <span>+91 {phone}</span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 flex-shrink-0">
                  <Mail className="h-4 w-4" />
                </div>
                <span>rwash.care@gmail.com</span>
              </div>
              {address && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-650 flex-shrink-0">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <span className="leading-relaxed">{address}</span>
                </div>
              )}
            </div>
          </div>

          {/* Embedded Google Map (Jhalana Doongri RIICO Jaipur) */}
          <div className="h-72 rounded-2xl border border-slate-200 overflow-hidden shadow-xs relative bg-slate-100">
            <iframe
              title="Google Map"
              src="https://maps.google.com/maps?q=Jhalana%20Doongri%20RIICO%20Jaipur&t=&z=15&ie=UTF8&iwloc=&output=embed"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen={false}
              loading="lazy"
            />
          </div>
        </div>

        {/* Contact Form */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div>
            <h3 className="text-sm font-extrabold text-slate-800">Send an Inquiry</h3>
            <p className="text-slate-400 text-xs mt-0.5">We reply within 24 business hours.</p>
          </div>

          {success && (
            <Alert
              type="success"
              message="Your inquiry message was sent successfully! Our representative will reply shortly."
              onClose={() => setSuccess(false)}
            />
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                Your Full Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all text-xs"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. john@gmail.com"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all text-xs"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                Message Inquiry *
              </label>
              <textarea
                rows={4}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter detail descriptions of your questions..."
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-primary-600/10 flex items-center justify-center gap-1.5"
            >
              {submitting ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Send Message</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

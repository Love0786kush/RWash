import React, { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { MessageSquare, X, Send, User, Phone, Mail, ArrowRight, Sparkles, Clock, MapPin, Calendar } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useClientAuth } from '../context/ClientAuthContext'

interface Message {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  timestamp: Date;
  options?: string[];
}

export const SupportChat: React.FC = () => {
  const location = useLocation()
  const { user, customer } = useClientAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMsg, setInputMsg] = useState('')
  const [supportPhone, setSupportPhone] = useState('')
  const [businessAddress, setBusinessAddress] = useState('')
  const [businessTimings, setBusinessTimings] = useState('')

  // Guest details form state
  const [showGuestForm, setShowGuestForm] = useState(false)
  const [guestName, setGuestName] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [pendingQuery, setPendingQuery] = useState('')

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Fetch business details
  useEffect(() => {
    const fetchSupportDetails = async () => {
      try {
        const { data } = await supabase
          .from('settings')
          .select('whatsapp_support_number, phone_number, address, working_hours')
          .eq('id', 1)
          .single()
        
        if (data) {
          // Fallback to primary phone if dedicated whatsapp number is missing
          setSupportPhone(data.whatsapp_support_number || data.phone_number || '')
          setBusinessAddress(data.address || '123 Clean Car Blvd, Auto City')
          setBusinessTimings(data.working_hours || 'Mon-Sat: 8 AM - 7 PM')
        }
      } catch (err) {
        console.error('Failed to load support config:', err)
      }
    }
    fetchSupportDetails()
  }, [])

  // Initialize bot greeting
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: '1',
          sender: 'bot',
          text: `Hi there! 👋 Welcome to RWash Support. How can we help you today?`,
          timestamp: new Date(),
          options: [
            '🚗 Services & Pricing',
            '📍 Timings & Location',
            '📅 Book detailing slot',
            '💬 Talk to support agent'
          ]
        }
      ])
    }
  }, [messages])

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, showGuestForm])

  const handleSendMessage = async (text: string, isFromInput = false) => {
    if (!text.trim()) return

    // 1. Add user message
    const userMsg: Message = {
      id: Math.random().toString(),
      sender: 'user',
      text,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMsg])
    setInputMsg('')

    // 2. Bot reply simulation
    setTimeout(async () => {
      let botReplyText = ''
      let options: string[] = []

      const queryClean = text.toLowerCase()

      if (queryClean.includes('service') || queryClean.includes('price') || queryClean.includes('pricing')) {
        botReplyText = 'Fetching detailing packages...'
        setMessages(prev => [...prev, {
          id: Math.random().toString(),
          sender: 'bot',
          text: botReplyText,
          timestamp: new Date()
        }])

        try {
          const { data } = await supabase
            .from('services')
            .select('name, price')
            .eq('status', 'Active')
            .limit(5)

          if (data && data.length > 0) {
            const list = data.map(s => `• ${s.name}: ₹${s.price}`).join('\n')
            botReplyText = `Here are our popular services:\n\n${list}\n\nWould you like to book an appointment?`
          } else {
            botReplyText = 'Our service packages are currently being updated. You can check them directly on the "Services" catalog page.'
          }
        } catch {
          botReplyText = 'Could not load services at the moment. Please try again.'
        }
        options = ['📅 Book detailing slot', '💬 Talk to support agent']

      } else if (queryClean.includes('timing') || queryClean.includes('location') || queryClean.includes('address') || queryClean.includes('hour')) {
        botReplyText = `📍 **Address:**\n${businessAddress}\n\n⏰ **Timings:**\n${businessTimings}`
        options = ['🚗 Services & Pricing', '💬 Talk to support agent']

      } else if (queryClean.includes('book') || queryClean.includes('appointment') || queryClean.includes('slot')) {
        botReplyText = 'Great choice! Click the link below to book a wash slot:\n\n👉 [Book Detailing Slot](/book-now)\n\nAlternatively, you can schedule it from your customer dashboard.'
        options = ['💬 Talk to support agent', '🔙 Main Menu']

      } else if (queryClean.includes('agent') || queryClean.includes('support') || queryClean.includes('talk') || isFromInput) {
        // Escalate to WhatsApp
        setPendingQuery(text)
        triggerWhatsAppEscalation(text)
        return

      } else {
        botReplyText = "I didn't quite catch that. Would you like to check our services, timings, or connect directly to support?"
        options = ['🚗 Services & Pricing', '📍 Timings & Location', '💬 Talk to support agent']
      }

      setMessages(prev => [...prev, {
        id: Math.random().toString(),
        sender: 'bot',
        text: botReplyText,
        timestamp: new Date(),
        options: options.length > 0 ? options : undefined
      }])
    }, 1000)
  }

  const triggerWhatsAppEscalation = (queryText: string) => {
    // Check if user is logged in
    if (user && customer) {
      // Auto-grab details and open WhatsApp
      const phoneNum = customer.phone || 'N/A'
      redirectToWhatsApp(customer.name, customer.email || 'N/A', phoneNum, queryText)
    } else {
      // Show guest form to collect contact info
      setMessages(prev => [...prev, {
        id: Math.random().toString(),
        sender: 'bot',
        text: 'Please provide your contact details so our support agent can reach you.',
        timestamp: new Date()
      }])
      setShowGuestForm(true)
    }
  }

  const handleGuestFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!guestName || !guestPhone || !guestEmail) return
    setShowGuestForm(false)
    redirectToWhatsApp(guestName, guestEmail, guestPhone, pendingQuery)
  }

  const redirectToWhatsApp = (name: string, email: string, phone: string, query: string) => {
    const formattedPhone = supportPhone.replace(/[^0-9]/g, '')
    const whatsappMessage = `Hi Support! I have a detailing query.\n\n👤 Name: ${name}\n📞 Mobile: ${phone}\n✉️ Email: ${email}\n💬 Message: ${query}`
    const encodedMessage = encodeURIComponent(whatsappMessage)
    
    // Fallback number if not set in DB
    const finalNumber = formattedPhone || '919876543210' 
    const url = `https://wa.me/${finalNumber}?text=${encodedMessage}`

    // Display redirect notification
    setMessages(prev => [...prev, {
      id: Math.random().toString(),
      sender: 'bot',
      text: `Opening WhatsApp chat with our support team... 💬`,
      timestamp: new Date()
    }])

    setTimeout(() => {
      window.open(url, '_blank')
    }, 1500)
  }

  const handleOptionClick = (option: string) => {
    // Strip emojis for clean match checking
    const textOnly = option.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, '').trim()
    
    if (textOnly === 'Main Menu') {
      setMessages(prev => [...prev, {
        id: Math.random().toString(),
        sender: 'bot',
        text: 'Back to Main Menu. How can we help you?',
        timestamp: new Date(),
        options: [
          '🚗 Services & Pricing',
          '📍 Timings & Location',
          '📅 Book detailing slot',
          '💬 Talk to support agent'
        ]
      }])
    } else {
      handleSendMessage(textOnly)
    }
  }

  // Only show the chat widget on the public Home page
  const isHome = location.pathname === '/'
  useEffect(() => {
    if (!isHome) setIsOpen(false)
  }, [isHome])

  return (
    !isHome ? null : (
    <div className="fixed bottom-6 right-6 z-50 text-left font-sans">
      {/* Floating Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 text-white rounded-full flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer relative border border-white/10"
          style={{ backgroundColor: 'var(--theme-btn, #8C471E)', boxShadow: '0 20px 25px -5px color-mix(in srgb, var(--theme-btn, #8C471E) 30%, transparent)' }}
        >
          <MessageSquare className="h-6 w-6" />
          <span className="absolute top-0 right-0 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="w-[360px] max-w-[calc(105vw-32px)] h-[500px] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-up border" style={{ backgroundColor: 'var(--theme-card, #fff)', borderColor: 'var(--theme-border, #E6CBB2)' }}>
          {/* Header */}
          <div className="px-5 py-4 text-white flex items-center justify-between" style={{ background: 'linear-gradient(135deg, var(--theme-btn, #8C471E), var(--theme-text, #5C270C))' }}>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white bg-white/15 border border-white/20">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm">RWash Assistant</h3>
                <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Online Support
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ backgroundColor: 'var(--theme-bg, #FFF8F0)' }}>
            {messages.map((m) => (
              <div key={m.id} className="space-y-2">
                <div className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                      m.sender === 'user'
                        ? 'text-white rounded-tr-none'
                        : 'rounded-tl-none shadow-xs border'
                    }`}
                    style={
                      m.sender === 'user'
                        ? { backgroundColor: 'var(--theme-btn, #8C471E)', whiteSpace: 'pre-line' }
                        : { backgroundColor: 'var(--theme-card, #fff)', borderColor: 'var(--theme-border, #E6CBB2)', color: 'var(--theme-text, #3D1E0B)', whiteSpace: 'pre-line' }
                    }
                  >
                    {m.text}
                  </div>
                </div>

                {/* Render Quick-reply Options */}
                {m.options && m.sender === 'bot' && (
                  <div className="flex flex-col gap-1.5 pl-2 pt-1 max-w-[85%]">
                    {m.options.map((opt, oIdx) => (
                      <button
                        key={oIdx}
                        onClick={() => handleOptionClick(opt)}
                        className="text-left px-3 py-2 border rounded-xl text-xs font-semibold transition-colors shadow-xs"
                        style={{ backgroundColor: 'var(--theme-card, #fff)', borderColor: 'var(--theme-border, #E6CBB2)', color: 'var(--theme-btn, #8C471E)' }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Guest Form Inside Chat */}
            {showGuestForm && (
              <form onSubmit={handleGuestFormSubmit} className="p-4 rounded-2xl border space-y-3 shadow-sm max-w-[85%] animate-fade-in" style={{ backgroundColor: 'var(--theme-card, #fff)', borderColor: 'var(--theme-border, #E6CBB2)', color: 'var(--theme-text, #3D1E0B)' }}>
                <div className="flex items-center gap-1.5 font-bold text-xs pb-1 border-b" style={{ color: 'var(--theme-text, #3D1E0B)', borderColor: 'var(--theme-border, #E6CBB2)' }}>
                  <User className="h-4.5 w-4.5" style={{ color: 'var(--theme-btn, #8C471E)' }} />
                  <span>Enter Details</span>
                </div>
                <div className="space-y-2">
                  <input
                    type="text"
                    required
                    placeholder="Your Full Name"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-xs"
                    style={{ backgroundColor: 'var(--theme-bg, #FFF8F0)', borderColor: 'var(--theme-border, #E6CBB2)', color: 'var(--theme-text, #3D1E0B)' }}
                  />
                  <input
                    type="tel"
                    required
                    placeholder="Mobile Number"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-xs"
                    style={{ backgroundColor: 'var(--theme-bg, #FFF8F0)', borderColor: 'var(--theme-border, #E6CBB2)', color: 'var(--theme-text, #3D1E0B)' }}
                  />
                  <input
                    type="email"
                    required
                    placeholder="Email Address"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-xs"
                    style={{ backgroundColor: 'var(--theme-bg, #FFF8F0)', borderColor: 'var(--theme-border, #E6CBB2)', color: 'var(--theme-text, #3D1E0B)' }}
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  style={{ backgroundColor: 'var(--theme-btn, #8C471E)' }}
                >
                  <span>Connect WhatsApp</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </form>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <div className="p-3 border-t flex items-center gap-2" style={{ borderColor: 'var(--theme-border, #E6CBB2)', backgroundColor: 'var(--theme-card, #fff)' }}>
            <input
              type="text"
              placeholder="Ask anything or request agent..."
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(inputMsg, true)}
              disabled={showGuestForm}
              className="flex-1 px-4 py-2 text-xs border rounded-xl focus:outline-none focus:ring-1 disabled:opacity-50"
              style={{ backgroundColor: 'var(--theme-bg, #FFF8F0)', borderColor: 'var(--theme-border, #E6CBB2)', color: 'var(--theme-text, #3D1E0B)', ['--tw-ring-color' as any]: 'var(--theme-btn, #8C471E)' }}
            />
            <button
              onClick={() => handleSendMessage(inputMsg, true)}
              disabled={showGuestForm}
              className="p-2.5 rounded-xl transition-colors disabled:opacity-50 cursor-pointer text-white"
              style={{ backgroundColor: 'var(--theme-btn, #8C471E)' }}
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
    )
  )
}

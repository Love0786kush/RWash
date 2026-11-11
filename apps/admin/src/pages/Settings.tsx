import React, { useState, useEffect } from 'react'
import { 
  Save, 
  Upload, 
  Sparkles, 
  Globe, 
  Image as ImageIcon, 
  Link as LinkIcon, 
  CheckCircle2, 
  Eye, 
  EyeOff,
  Sun, 
  Moon,
  Laptop,
  Car,
  MessageSquare,
  Smartphone,
  Palette,
  Send,
  ShieldCheck,
  RefreshCw,
  Check,
  Type,
  Square,
  Sliders,
  AlertTriangle,
  Layers,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from '../context/ToastContext'
import { Spinner } from '../components/Spinner'
import { compressImage } from '../utils/imageCompressor'
import { 
  THEME_PRESETS, 
  AVAILABLE_HEADING_FONTS,
  AVAILABLE_BODY_FONTS,
  DEFAULT_TYPOGRAPHY,
  DEFAULT_CARD_STYLE,
  applyTheme, 
  buildCustomConfig, 
  ThemeConfig,
  TypographyConfig,
  CardStyleConfig,
  ThemeColors
} from '../utils/themeHelper'

export const Settings: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)

  // Settings values
  const [businessName, setBusinessName] = useState('RWash')
  const [tagline, setTagline] = useState('The Art of Detailing at Your Doorstep')
  const [phoneNumber, setPhoneNumber] = useState('7852081659')
  const [whatsappSupportNumber, setWhatsappSupportNumber] = useState('917852081659')
  const [address, setAddress] = useState('Jhalana Doongri, near RIICO, Jaipur')
  const [logoUrl, setLogoUrl] = useState('')
  const [faviconUrl, setFaviconUrl] = useState('')
  const [upiId, setUpiId] = useState('rwash@ybl')
  const [socialLinks, setSocialLinks] = useState<any>({})

  // OmniOTP Cloud Gateway values (POST request API)
  const [omniOtpEnabled, setOmniOtpEnabled] = useState(true)
  const [omniOtpApiUrl, setOmniOtpApiUrl] = useState('https://omniotp.onrender.com')
  const [omniOtpApiKey, setOmniOtpApiKey] = useState('sk_live_omni_7a9f4c82b1d3e6')
  const [omniOtpAppName, setOmniOtpAppName] = useState('RWash')
  const [smsTemplate, setSmsTemplate] = useState('RWash: Your verification code is {otp}. Valid for 5 minutes. Do not share.')
  const [showApiKey, setShowApiKey] = useState(false)
  const [testSmsPhone, setTestSmsPhone] = useState('')
  const [sendingTestSms, setSendingTestSms] = useState(false)
  const [checkingHealth, setCheckingHealth] = useState(false)
  const [healthStatus, setHealthStatus] = useState<{ status: 'idle' | 'ok' | 'err'; message: string }>({ status: 'idle', message: '' })

  // Active theme preset
  const [themePreset, setThemePreset] = useState('Brown')

  // Light Mode Colors (Every element)
  const [lightPrimary, setLightPrimary] = useState('#8C471E')
  const [lightBg, setLightBg] = useState('#FFF8F0')
  const [lightCard, setLightCard] = useState('#FFFFFF')
  const [lightBorder, setLightBorder] = useState('#E6CBB2')
  const [lightTextPrimary, setLightTextPrimary] = useState('#3D1E0B')
  const [lightTextSecondary, setLightTextSecondary] = useState('#542E16')
  const [lightAccent, setLightAccent] = useState('#A65D2E')
  const [lightBtn, setLightBtn] = useState('#8C471E')
  const [lightHeaderBg, setLightHeaderBg] = useState('#FFFFFF')
  const [lightSidebarBg, setLightSidebarBg] = useState('#FFF8F0')

  // Dark Mode Colors (Every element)
  const [darkPrimary, setDarkPrimary] = useState('#E69D62')
  const [darkBg, setDarkBg] = useState('#120702')
  const [darkCard, setDarkCard] = useState('#210E04')
  const [darkBorder, setDarkBorder] = useState('#52270D')
  const [darkTextPrimary, setDarkTextPrimary] = useState('#FFF5EB')
  const [darkTextSecondary, setDarkTextSecondary] = useState('#E8C8AE')
  const [darkAccent, setDarkAccent] = useState('#E69D62')
  const [darkBtn, setDarkBtn] = useState('#A65D2E')
  const [darkHeaderBg, setDarkHeaderBg] = useState('#210E04')
  const [darkSidebarBg, setDarkSidebarBg] = useState('#120702')

  // Typography Settings
  const [headingFont, setHeadingFont] = useState(DEFAULT_TYPOGRAPHY.headingFont)
  const [bodyFont, setBodyFont] = useState(DEFAULT_TYPOGRAPHY.bodyFont)
  const [fontScale, setFontScale] = useState<'compact' | 'normal' | 'spacious'>('normal')
  const [headingWeight, setHeadingWeight] = useState<'700' | '800' | '900'>('800')
  const [letterSpacing, setLetterSpacing] = useState<'tight' | 'normal' | 'wide'>('tight')

  // Card Styling Settings
  const [cardRadius, setCardRadius] = useState<'sharp' | 'rounded' | 'extra-rounded' | 'ultra' | 'pill'>('extra-rounded')
  const [cardBorderWidth, setCardBorderWidth] = useState<'none' | 'thin' | 'normal' | 'thick'>('thin')
  const [cardShadow, setCardShadow] = useState<'none' | 'soft' | 'elevated' | 'glow'>('soft')
  const [cardGlassmorphism, setCardGlassmorphism] = useState(false)

  // Expandable sections & UI mode
  const [showAdvancedColors, setShowAdvancedColors] = useState(false)
  const [logoInputMode, setLogoInputMode] = useState<'upload' | 'url'>('upload')
  const [previewTheme, setPreviewTheme] = useState<'light' | 'dark'>('light')

  const { showToast } = useToast()

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('id', 1)
        .single()

      if (data && !error) {
        setBusinessName(data.business_name || 'RWash')
        setPhoneNumber(data.phone_number || '7852081659')
        setWhatsappSupportNumber(data.whatsapp_support_number || '917852081659')
        setAddress(data.address || 'Jhalana Doongri, near RIICO, Jaipur')
        setLogoUrl(data.logo_url || '')
        setSocialLinks(data.social_links || {})
        setTagline(data.social_links?.tagline || 'The Art of Detailing at Your Doorstep')
        setFaviconUrl(data.social_links?.favicon_url || '')
        setUpiId(data.social_links?.upi_id || 'rwash@ybl')

        // Load OmniOTP configuration
        const omni = data.social_links?.omni_otp
        if (omni) {
          setOmniOtpEnabled(omni.enabled !== false)
          setOmniOtpApiUrl(omni.api_url || 'https://omniotp.onrender.com')
          setOmniOtpApiKey(omni.api_key || 'sk_live_omni_7a9f4c82b1d3e6')
          setOmniOtpAppName(omni.app_name || 'RWash')
          if (omni.message_template) setSmsTemplate(omni.message_template)
        }

        // Load Theme Configuration
        const tConfig: ThemeConfig = data.social_links?.theme_config
        const tColor = data.social_links?.theme_color || 'Brown'
        
        if (tConfig && tConfig.light && tConfig.dark) {
          setThemePreset(tConfig.presetName || 'Custom')
          
          // Light
          setLightPrimary(tConfig.light.primary || '#8C471E')
          setLightBg(tConfig.light.bg || '#FFF8F0')
          setLightCard(tConfig.light.card || '#FFFFFF')
          setLightBorder(tConfig.light.border || '#E6CBB2')
          setLightTextPrimary(tConfig.light.textPrimary || '#3D1E0B')
          setLightTextSecondary(tConfig.light.textSecondary || '#542E16')
          setLightAccent(tConfig.light.accent || tConfig.light.primary || '#8C471E')
          setLightBtn(tConfig.light.btn || tConfig.light.primary || '#8C471E')
          setLightHeaderBg(tConfig.light.headerBg || tConfig.light.card || '#FFFFFF')
          setLightSidebarBg(tConfig.light.sidebarBg || tConfig.light.bg || '#FFF8F0')

          // Dark
          setDarkPrimary(tConfig.dark.primary || '#E69D62')
          setDarkBg(tConfig.dark.bg || '#120702')
          setDarkCard(tConfig.dark.card || '#210E04')
          setDarkBorder(tConfig.dark.border || '#52270D')
          setDarkTextPrimary(tConfig.dark.textPrimary || '#FFF5EB')
          setDarkTextSecondary(tConfig.dark.textSecondary || '#E8C8AE')
          setDarkAccent(tConfig.dark.accent || tConfig.dark.primary || '#E69D62')
          setDarkBtn(tConfig.dark.btn || tConfig.dark.primary || '#A65D2E')
          setDarkHeaderBg(tConfig.dark.headerBg || tConfig.dark.card || '#210E04')
          setDarkSidebarBg(tConfig.dark.sidebarBg || tConfig.dark.bg || '#120702')

          // Typography
          if (tConfig.typography) {
            setHeadingFont(tConfig.typography.headingFont || DEFAULT_TYPOGRAPHY.headingFont)
            setBodyFont(tConfig.typography.bodyFont || DEFAULT_TYPOGRAPHY.bodyFont)
            setFontScale(tConfig.typography.fontScale || 'normal')
            setHeadingWeight(tConfig.typography.headingWeight || '800')
            setLetterSpacing(tConfig.typography.letterSpacing || 'tight')
          }

          // Card Style
          if (tConfig.cardStyle) {
            setCardRadius(tConfig.cardStyle.radius || 'extra-rounded')
            setCardBorderWidth(tConfig.cardStyle.borderWidth || 'thin')
            setCardShadow(tConfig.cardStyle.shadow || 'soft')
            setCardGlassmorphism(!!tConfig.cardStyle.glassmorphism)
          }

          applyTheme(tConfig)
        } else if (THEME_PRESETS[tColor]) {
          const p = THEME_PRESETS[tColor]
          setThemePreset(tColor)
          loadPresetIntoState(p)
          applyTheme(p)
        }
      }
    } catch (err: any) {
      showToast('Failed to fetch settings: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  // Helper to load preset values into state
  const loadPresetIntoState = (p: ThemeConfig) => {
    setLightPrimary(p.light.primary)
    setLightBg(p.light.bg)
    setLightCard(p.light.card)
    setLightBorder(p.light.border)
    setLightTextPrimary(p.light.textPrimary)
    setLightTextSecondary(p.light.textSecondary)
    setLightAccent(p.light.accent)
    setLightBtn(p.light.btn)
    setLightHeaderBg(p.light.headerBg || p.light.card)
    setLightSidebarBg(p.light.sidebarBg || p.light.bg)

    setDarkPrimary(p.dark.primary)
    setDarkBg(p.dark.bg)
    setDarkCard(p.dark.card)
    setDarkBorder(p.dark.border)
    setDarkTextPrimary(p.dark.textPrimary)
    setDarkTextSecondary(p.dark.textSecondary)
    setDarkAccent(p.dark.accent)
    setDarkBtn(p.dark.btn)
    setDarkHeaderBg(p.dark.headerBg || p.dark.card)
    setDarkSidebarBg(p.dark.sidebarBg || p.dark.bg)

    if (p.typography) {
      setHeadingFont(p.typography.headingFont)
      setBodyFont(p.typography.bodyFont)
      setFontScale(p.typography.fontScale)
      setHeadingWeight(p.typography.headingWeight)
      setLetterSpacing(p.typography.letterSpacing)
    }

    if (p.cardStyle) {
      setCardRadius(p.cardStyle.radius)
      setCardBorderWidth(p.cardStyle.borderWidth)
      setCardShadow(p.cardStyle.shadow)
      setCardGlassmorphism(p.cardStyle.glassmorphism)
    }
  }

  // Preset Selection Handler
  const handleSelectPreset = (key: string) => {
    const preset = THEME_PRESETS[key]
    if (!preset) return
    setThemePreset(key)
    loadPresetIntoState(preset)
    applyTheme(preset)
    showToast(`Applied ${preset.presetName} preview! Click Save to apply everywhere.`, 'info')
  }

  // Build current active ThemeConfig from state
  const getCurrentConfig = (): ThemeConfig => {
    const typography: TypographyConfig = {
      headingFont,
      bodyFont,
      fontScale,
      headingWeight,
      letterSpacing,
    }

    const cardStyle: CardStyleConfig = {
      radius: cardRadius,
      borderWidth: cardBorderWidth,
      shadow: cardShadow,
      glassmorphism: cardGlassmorphism,
    }

    const light: ThemeColors = {
      primary: lightPrimary,
      bg: lightBg,
      card: lightCard,
      border: lightBorder,
      textPrimary: lightTextPrimary,
      textSecondary: lightTextSecondary,
      accent: lightAccent,
      btn: lightBtn,
      headerBg: lightHeaderBg,
      sidebarBg: lightSidebarBg,
    }

    const dark: ThemeColors = {
      primary: darkPrimary,
      bg: darkBg,
      card: darkCard,
      border: darkBorder,
      textPrimary: darkTextPrimary,
      textSecondary: darkTextSecondary,
      accent: darkAccent,
      btn: darkBtn,
      headerBg: darkHeaderBg,
      sidebarBg: darkSidebarBg,
    }

    return {
      presetName: themePreset,
      light,
      dark,
      typography,
      cardStyle,
    }
  }

  // Trigger live preview when any appearance control changes
  const applyLivePreview = (overrides?: Partial<ThemeConfig>) => {
    const base = getCurrentConfig()
    const merged = { ...base, ...overrides }
    applyTheme(merged)
  }

  // Check OmniOTP Gateway Health via POST request
  const handleCheckHealth = async () => {
    if (!omniOtpApiUrl.trim()) {
      setHealthStatus({ status: 'err', message: 'OmniOTP API URL is empty. Please enter your service URL.' })
      return
    }
    setCheckingHealth(true)
    try {
      const url = omniOtpApiUrl.trim().replace(/\/+$/, '') + '/api/v1/otp/send'
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'x-api-key': omniOtpApiKey.trim(),
        },
        body: JSON.stringify({
          phone: '+919999999999',
          app_name: omniOtpAppName.trim() || 'RWash',
        }),
      })

      const data = await res.json().catch(() => ({}))

      if (res.ok || data?.success || data?.session_id) {
        setHealthStatus({
          status: 'ok',
          message: 'OmniOTP Server connected successfully via POST request! Ready to dispatch SMS.',
        })
      } else {
        setHealthStatus({
          status: 'err',
          message: data?.error || data?.message || `OmniOTP server responded with status ${res.status}`,
        })
      }
    } catch (err: any) {
      setHealthStatus({
        status: 'err',
        message: `Connection failed: ${err?.message || 'Could not reach OmniOTP server.'}`,
      })
    } finally {
      setCheckingHealth(false)
    }
  }

  // Test SMS Dispatcher via OmniOTP POST API
  const handleSendTestSms = async () => {
    if (!testSmsPhone.trim()) {
      showToast('Please enter a recipient mobile number for the test SMS.', 'warning')
      return
    }
    let to = testSmsPhone.trim().replace(/[\s-]/g, '')
    if (/^\d{10}$/.test(to)) to = '+91' + to

    setSendingTestSms(true)
    try {
      const url = omniOtpApiUrl.trim().replace(/\/+$/, '') + '/api/v1/otp/send'
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'x-api-key': omniOtpApiKey.trim(),
        },
        body: JSON.stringify({
          phone: to,
          app_name: omniOtpAppName.trim() || 'RWash',
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || data?.error || `OmniOTP status ${res.status}`)
      }

      showToast(`Test OTP dispatched successfully to ${to} via OmniOTP! (Session: ${data.session_id})`, 'success')
    } catch (err: any) {
      showToast('Test SMS failed: ' + err.message, 'error')
    } finally {
      setSendingTestSms(false)
    }
  }

  // Handle Logo Upload
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
    if (!allowedTypes.includes(file.type)) {
      showToast('Unsupported format! Please upload JPG, PNG, WEBP or SVG.', 'warning')
      return
    }

    setUploadingLogo(true)
    try {
      const compressed = await compressImage(file, 400, 400, 0.85)
      let uploadedUrl = ''

      try {
        const fileExt = file.name.split('.').pop() || 'png'
        const fileName = `brand_logo_${Date.now()}.${fileExt}`
        const filePath = `logos/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('rwash-images')
          .upload(filePath, compressed, { cacheControl: '3600', upsert: false })

        if (!uploadError) {
          const { data } = supabase.storage.from('rwash-images').getPublicUrl(filePath)
          if (data?.publicUrl) {
            uploadedUrl = data.publicUrl
          }
        }
      } catch (storageErr) {
        console.warn('Storage fallback to data URL', storageErr)
      }

      if (!uploadedUrl) {
        uploadedUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.readAsDataURL(compressed)
        })
      }

      setLogoUrl(uploadedUrl)
      if (!faviconUrl) {
        setFaviconUrl(uploadedUrl)
      }
      showToast('Brand Logo loaded! Click "Save All Settings" to publish.', 'success')
    } catch (err: any) {
      showToast('Logo upload failed: ' + err.message, 'error')
    } finally {
      setUploadingLogo(false)
    }
  }

  // Save Settings to Supabase DB
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!businessName.trim()) {
      showToast('Business Name is required', 'warning')
      return
    }

    setSaving(true)
    try {
      const finalConfig = getCurrentConfig()

      const updatedSocialLinks = {
        ...socialLinks,
        tagline: tagline.trim(),
        favicon_url: faviconUrl.trim() || logoUrl.trim(),
        theme_color: themePreset,
        theme_config: finalConfig,
        upi_id: upiId.trim(),
        omni_otp: {
          enabled: omniOtpEnabled,
          api_url: omniOtpApiUrl.trim(),
          api_key: omniOtpApiKey.trim(),
          app_name: omniOtpAppName.trim(),
          message_template: smsTemplate.trim(),
        },
      }

      const { error } = await supabase
        .from('settings')
        .upsert({
          id: 1,
          business_name: businessName.trim(),
          phone_number: phoneNumber || null,
          whatsapp_support_number: whatsappSupportNumber || null,
          address: address || null,
          logo_url: logoUrl.trim() || null,
          social_links: updatedSocialLinks,
          updated_at: new Date().toISOString(),
        })

      if (error) throw error

      // Apply locally and update page title/favicon
      applyTheme(finalConfig)
      document.title = `${businessName.trim()} – Admin Control Panel`
      if (logoUrl) {
        let fav = document.querySelector("link[rel*='icon']") as HTMLLinkElement
        if (!fav) {
          fav = document.createElement('link')
          fav.rel = 'icon'
          document.head.appendChild(fav)
        }
        fav.href = faviconUrl.trim() || logoUrl.trim()
      }

      showToast('All Settings, Dynamic Themes, Typography, Card Styles & SMS Config saved successfully!', 'success')
    } catch (err: any) {
      showToast('Failed to save settings: ' + err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <Spinner size="large" />
        <p className="text-xs font-semibold text-slate-500">Loading Brand & System Settings...</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in font-sans pb-20">
      
      {/* Page Header */}
      <div className="border-b border-[#E6CBB2] dark:border-[#52270D] pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#3D1E0B] dark:text-[#FFF5EB] tracking-tight flex items-center gap-2">
            <Palette className="h-6 w-6 text-[#8C471E] dark:text-[#E69D62]" />
            Brand, Theme, Typography & SMS Control Center
          </h1>
          <p className="text-xs text-[#542E16] dark:text-[#E8C8AE] font-semibold mt-1">
            Dynamic light & dark colors for every element, custom fonts, card styling, and SMS HTTP OTP Gateway synced across Client & Admin.
          </p>
        </div>

        <button
          onClick={handleFormSubmit}
          disabled={saving || uploadingLogo}
          className="px-6 py-3 bg-[#8C471E] dark:bg-[#A65D2E] hover:opacity-90 active:scale-[0.98] text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer self-start md:self-auto"
        >
          <Save className="h-4 w-4" />
          <span>{saving ? 'Saving...' : 'Save All Settings'}</span>
        </button>
      </div>

      <form onSubmit={handleFormSubmit} className="space-y-8">

        {/* ══════════════════════════════════════════════════════════════════════════
            1. DYNAMIC COLOR PALETTE FOR EVERY ELEMENT
        ══════════════════════════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-[#210E04] p-6 sm:p-8 rounded-3xl border border-[#E6CBB2] dark:border-[#52270D] shadow-sm space-y-6">
          <div className="border-b border-[#E6CBB2]/50 dark:border-[#52270D]/50 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-[#3D1E0B] dark:text-[#FFF5EB] flex items-center gap-2 tracking-tight">
                <Palette className="h-5 w-5 text-[#8C471E] dark:text-[#E69D62]" />
                Brand Color Palette (Every Element Dynamic)
              </h2>
              <p className="text-xs text-[#542E16] dark:text-[#E8C8AE] font-medium mt-1">
                Pick a luxury preset or customize exact hex colors for primary, page background, card surfaces, borders, text, header & sidebar.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border"
                style={{ backgroundColor: lightPrimary + '14', color: lightPrimary, borderColor: lightPrimary + '30' }}
              >
                Active: {themePreset}
              </span>
            </div>
          </div>

          {/* Preset Swatches */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-[#3D1E0B] dark:text-[#FFF5EB] uppercase tracking-widest">
              Quick Luxury Presets
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {Object.entries(THEME_PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleSelectPreset(key)}
                  style={
                    themePreset === key
                      ? { borderColor: preset.light.primary, backgroundColor: preset.light.bg, boxShadow: `0 0 0 3px ${preset.light.primary}26` }
                      : undefined
                  }
                  className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                    themePreset === key
                      ? 'shadow-md'
                      : 'border-slate-200 dark:border-[#52270D] hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-[#1A0B04]'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span 
                      className="w-4 h-4 rounded-full shadow-xs border border-white" 
                      style={{ backgroundColor: preset.light.primary }}
                    />
                    <span 
                      className="w-4 h-4 rounded-full shadow-xs border border-white" 
                      style={{ backgroundColor: preset.dark.bg }}
                    />
                    <span
                      className="ml-auto h-5 px-1.5 rounded-md text-[9px] font-bold uppercase tracking-wider flex items-center"
                      style={{ backgroundColor: preset.light.primary, color: '#fff' }}
                    >
                      Aa
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#3D1E0B] dark:text-[#FFF5EB] truncate">
                      {preset.presetName}
                    </span>
                    {themePreset === key && <Check className="h-3.5 w-3.5 shrink-0" style={{ color: preset.light.primary }} />}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Primary & Background Color Pickers (Core) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            
            {/* Light Mode Box */}
            <div className="p-5 rounded-2xl bg-[#FFF8F0] dark:bg-[#1A0B04] border border-[#E6CBB2] dark:border-[#52270D] space-y-4">
              <div className="flex items-center justify-between border-b border-[#E6CBB2]/50 dark:border-[#52270D]/50 pb-2">
                <span className="text-xs font-black uppercase tracking-wider text-[#3D1E0B] dark:text-[#FFF5EB] flex items-center gap-1.5">
                  <Sun className="h-4 w-4 text-amber-500" /> Light Mode (Day Theme)
                </span>
                <span className="text-[10px] text-slate-500 font-bold">Base Canvas</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Primary Brand Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={lightPrimary}
                      onChange={(e) => {
                        setThemePreset('Custom')
                        setLightPrimary(e.target.value)
                        setLightBtn(e.target.value)
                        applyLivePreview({ light: { ...getCurrentConfig().light, primary: e.target.value, btn: e.target.value } })
                      }}
                      className="w-9 h-9 rounded-xl border border-slate-300 cursor-pointer p-0.5 bg-white shrink-0"
                    />
                    <input
                      type="text"
                      value={lightPrimary}
                      onChange={(e) => {
                        setThemePreset('Custom')
                        setLightPrimary(e.target.value)
                        setLightBtn(e.target.value)
                        applyLivePreview({ light: { ...getCurrentConfig().light, primary: e.target.value, btn: e.target.value } })
                      }}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-[#120702] border border-slate-300 dark:border-[#52270D] rounded-xl text-xs font-mono font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Page Background
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={lightBg}
                      onChange={(e) => {
                        setThemePreset('Custom')
                        setLightBg(e.target.value)
                        applyLivePreview({ light: { ...getCurrentConfig().light, bg: e.target.value } })
                      }}
                      className="w-9 h-9 rounded-xl border border-slate-300 cursor-pointer p-0.5 bg-white shrink-0"
                    />
                    <input
                      type="text"
                      value={lightBg}
                      onChange={(e) => {
                        setThemePreset('Custom')
                        setLightBg(e.target.value)
                        applyLivePreview({ light: { ...getCurrentConfig().light, bg: e.target.value } })
                      }}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-[#120702] border border-slate-300 dark:border-[#52270D] rounded-xl text-xs font-mono font-bold"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Dark Mode Box */}
            <div className="p-5 rounded-2xl bg-[#170903] border border-[#52270D] space-y-4">
              <div className="flex items-center justify-between border-b border-[#52270D]/50 pb-2">
                <span className="text-xs font-black uppercase tracking-wider text-[#FFF5EB] flex items-center gap-1.5">
                  <Moon className="h-4 w-4 text-indigo-400" /> Dark Mode (Night Theme)
                </span>
                <span className="text-[10px] text-slate-400 font-bold">Base Canvas</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Primary Accent Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={darkPrimary}
                      onChange={(e) => {
                        setThemePreset('Custom')
                        setDarkPrimary(e.target.value)
                        setDarkBtn(e.target.value)
                        applyLivePreview({ dark: { ...getCurrentConfig().dark, primary: e.target.value, btn: e.target.value } })
                      }}
                      className="w-9 h-9 rounded-xl border border-slate-600 cursor-pointer p-0.5 bg-slate-900 shrink-0"
                    />
                    <input
                      type="text"
                      value={darkPrimary}
                      onChange={(e) => {
                        setThemePreset('Custom')
                        setDarkPrimary(e.target.value)
                        setDarkBtn(e.target.value)
                        applyLivePreview({ dark: { ...getCurrentConfig().dark, primary: e.target.value, btn: e.target.value } })
                      }}
                      className="w-full px-2.5 py-1.5 bg-[#120702] border border-[#52270D] rounded-xl text-xs font-mono font-bold text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Page Background
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={darkBg}
                      onChange={(e) => {
                        setThemePreset('Custom')
                        setDarkBg(e.target.value)
                        applyLivePreview({ dark: { ...getCurrentConfig().dark, bg: e.target.value } })
                      }}
                      className="w-9 h-9 rounded-xl border border-slate-600 cursor-pointer p-0.5 bg-slate-900 shrink-0"
                    />
                    <input
                      type="text"
                      value={darkBg}
                      onChange={(e) => {
                        setThemePreset('Custom')
                        setDarkBg(e.target.value)
                        applyLivePreview({ dark: { ...getCurrentConfig().dark, bg: e.target.value } })
                      }}
                      className="w-full px-2.5 py-1.5 bg-[#120702] border border-[#52270D] rounded-xl text-xs font-mono font-bold text-white"
                    />
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Toggle for Advanced Element Colors */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowAdvancedColors(!showAdvancedColors)}
              className="text-xs font-extrabold flex items-center gap-1.5 text-[#8C471E] dark:text-[#E69D62] hover:underline cursor-pointer"
            >
              <Sliders className="h-3.5 w-3.5" />
              <span>{showAdvancedColors ? 'Hide Advanced Element Colors' : 'Customize Individual Elements (Cards, Borders, Text, Header, Sidebar)'}</span>
              {showAdvancedColors ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          </div>

          {/* Advanced Element Pickers (Card, Border, Text Primary, Secondary, Header, Sidebar) */}
          {showAdvancedColors && (
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-[#120702] border border-[#E6CBB2] dark:border-[#52270D] space-y-6 animate-fade-in">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#3D1E0B] dark:text-[#FFF5EB]">
                Fine-Grained Element Color Controls
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Advanced Light Elements */}
                <div className="space-y-3">
                  <span className="text-[11px] font-bold text-amber-600 flex items-center gap-1">
                    <Sun className="h-3.5 w-3.5" /> Light Mode Elements
                  </span>

                  <div className="grid grid-cols-2 gap-3 text-[11px]">
                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Card / Surface</label>
                      <input type="color" value={lightCard} onChange={(e) => { setLightCard(e.target.value); applyLivePreview({ light: { ...getCurrentConfig().light, card: e.target.value } }) }} className="w-8 h-8 rounded border p-0.5 cursor-pointer" />
                    </div>
                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Border Color</label>
                      <input type="color" value={lightBorder} onChange={(e) => { setLightBorder(e.target.value); applyLivePreview({ light: { ...getCurrentConfig().light, border: e.target.value } }) }} className="w-8 h-8 rounded border p-0.5 cursor-pointer" />
                    </div>
                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Heading Text</label>
                      <input type="color" value={lightTextPrimary} onChange={(e) => { setLightTextPrimary(e.target.value); applyLivePreview({ light: { ...getCurrentConfig().light, textPrimary: e.target.value } }) }} className="w-8 h-8 rounded border p-0.5 cursor-pointer" />
                    </div>
                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Body Text</label>
                      <input type="color" value={lightTextSecondary} onChange={(e) => { setLightTextSecondary(e.target.value); applyLivePreview({ light: { ...getCurrentConfig().light, textSecondary: e.target.value } }) }} className="w-8 h-8 rounded border p-0.5 cursor-pointer" />
                    </div>
                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Header Background</label>
                      <input type="color" value={lightHeaderBg} onChange={(e) => { setLightHeaderBg(e.target.value); applyLivePreview({ light: { ...getCurrentConfig().light, headerBg: e.target.value } }) }} className="w-8 h-8 rounded border p-0.5 cursor-pointer" />
                    </div>
                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Sidebar Background</label>
                      <input type="color" value={lightSidebarBg} onChange={(e) => { setLightSidebarBg(e.target.value); applyLivePreview({ light: { ...getCurrentConfig().light, sidebarBg: e.target.value } }) }} className="w-8 h-8 rounded border p-0.5 cursor-pointer" />
                    </div>
                  </div>
                </div>

                {/* Advanced Dark Elements */}
                <div className="space-y-3">
                  <span className="text-[11px] font-bold text-indigo-400 flex items-center gap-1">
                    <Moon className="h-3.5 w-3.5" /> Dark Mode Elements
                  </span>

                  <div className="grid grid-cols-2 gap-3 text-[11px]">
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Card / Surface</label>
                      <input type="color" value={darkCard} onChange={(e) => { setDarkCard(e.target.value); applyLivePreview({ dark: { ...getCurrentConfig().dark, card: e.target.value } }) }} className="w-8 h-8 rounded border p-0.5 cursor-pointer" />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Border Color</label>
                      <input type="color" value={darkBorder} onChange={(e) => { setDarkBorder(e.target.value); applyLivePreview({ dark: { ...getCurrentConfig().dark, border: e.target.value } }) }} className="w-8 h-8 rounded border p-0.5 cursor-pointer" />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Heading Text</label>
                      <input type="color" value={darkTextPrimary} onChange={(e) => { setDarkTextPrimary(e.target.value); applyLivePreview({ dark: { ...getCurrentConfig().dark, textPrimary: e.target.value } }) }} className="w-8 h-8 rounded border p-0.5 cursor-pointer" />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Body Text</label>
                      <input type="color" value={darkTextSecondary} onChange={(e) => { setDarkTextSecondary(e.target.value); applyLivePreview({ dark: { ...getCurrentConfig().dark, textSecondary: e.target.value } }) }} className="w-8 h-8 rounded border p-0.5 cursor-pointer" />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Header Background</label>
                      <input type="color" value={darkHeaderBg} onChange={(e) => { setDarkHeaderBg(e.target.value); applyLivePreview({ dark: { ...getCurrentConfig().dark, headerBg: e.target.value } }) }} className="w-8 h-8 rounded border p-0.5 cursor-pointer" />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Sidebar Background</label>
                      <input type="color" value={darkSidebarBg} onChange={(e) => { setDarkSidebarBg(e.target.value); applyLivePreview({ dark: { ...getCurrentConfig().dark, sidebarBg: e.target.value } }) }} className="w-8 h-8 rounded border p-0.5 cursor-pointer" />
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════════════════════
            2. DYNAMIC TYPOGRAPHY (FONTS, SCALE, LETTER SPACING)
        ══════════════════════════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-[#210E04] p-6 sm:p-8 rounded-3xl border border-[#E6CBB2] dark:border-[#52270D] shadow-sm space-y-6">
          <div className="border-b border-[#E6CBB2]/50 dark:border-[#52270D]/50 pb-4">
            <h2 className="text-base font-bold text-[#3D1E0B] dark:text-[#FFF5EB] flex items-center gap-2 tracking-tight">
              <Type className="h-5 w-5 text-[#8C471E] dark:text-[#E69D62]" />
              Typography & Font Family (Dynamic Google Fonts)
            </h2>
            <p className="text-xs text-[#542E16] dark:text-[#E8C8AE] font-medium mt-1">
              Choose fonts for headings and body content. Automatically loads web fonts and applies across both Client and Admin interfaces.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Heading Font */}
            <div>
              <label className="block text-xs font-bold text-[#3D1E0B] dark:text-[#FFF5EB] uppercase tracking-wider mb-2">
                Heading Font Family
              </label>
              <select
                value={headingFont}
                onChange={(e) => {
                  setHeadingFont(e.target.value)
                  applyLivePreview({ typography: { ...getCurrentConfig().typography!, headingFont: e.target.value } })
                }}
                className="w-full px-3.5 py-2.5 bg-[#FFF8F0] dark:bg-[#120702] border border-[#E6CBB2] dark:border-[#52270D] rounded-xl text-xs font-bold cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#8C471E]"
              >
                {AVAILABLE_HEADING_FONTS.map((font) => (
                  <option key={font} value={font}>{font}</option>
                ))}
              </select>
            </div>

            {/* Body Font */}
            <div>
              <label className="block text-xs font-bold text-[#3D1E0B] dark:text-[#FFF5EB] uppercase tracking-wider mb-2">
                Body Font Family
              </label>
              <select
                value={bodyFont}
                onChange={(e) => {
                  setBodyFont(e.target.value)
                  applyLivePreview({ typography: { ...getCurrentConfig().typography!, bodyFont: e.target.value } })
                }}
                className="w-full px-3.5 py-2.5 bg-[#FFF8F0] dark:bg-[#120702] border border-[#E6CBB2] dark:border-[#52270D] rounded-xl text-xs font-bold cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#8C471E]"
              >
                {AVAILABLE_BODY_FONTS.map((font) => (
                  <option key={font} value={font}>{font}</option>
                ))}
              </select>
            </div>

            {/* Font Scale */}
            <div>
              <label className="block text-xs font-bold text-[#3D1E0B] dark:text-[#FFF5EB] uppercase tracking-wider mb-2">
                Text Scaling
              </label>
              <select
                value={fontScale}
                onChange={(e) => {
                  const val = e.target.value as any
                  setFontScale(val)
                  applyLivePreview({ typography: { ...getCurrentConfig().typography!, fontScale: val } })
                }}
                className="w-full px-3.5 py-2.5 bg-[#FFF8F0] dark:bg-[#120702] border border-[#E6CBB2] dark:border-[#52270D] rounded-xl text-xs font-bold cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#8C471E]"
              >
                <option value="compact">Compact (92%)</option>
                <option value="normal">Standard (100%)</option>
                <option value="spacious">Spacious (108%)</option>
              </select>
            </div>

            {/* Heading Weight & Tracking */}
            <div>
              <label className="block text-xs font-bold text-[#3D1E0B] dark:text-[#FFF5EB] uppercase tracking-wider mb-2">
                Heading Weight & Tracking
              </label>
              <div className="flex gap-2">
                <select
                  value={headingWeight}
                  onChange={(e) => {
                    const val = e.target.value as any
                    setHeadingWeight(val)
                    applyLivePreview({ typography: { ...getCurrentConfig().typography!, headingWeight: val } })
                  }}
                  className="w-1/2 px-2.5 py-2.5 bg-[#FFF8F0] dark:bg-[#120702] border border-[#E6CBB2] dark:border-[#52270D] rounded-xl text-xs font-bold cursor-pointer"
                >
                  <option value="700">Bold 700</option>
                  <option value="800">ExtraBold 800</option>
                  <option value="900">Black 900</option>
                </select>
                <select
                  value={letterSpacing}
                  onChange={(e) => {
                    const val = e.target.value as any
                    setLetterSpacing(val)
                    applyLivePreview({ typography: { ...getCurrentConfig().typography!, letterSpacing: val } })
                  }}
                  className="w-1/2 px-2.5 py-2.5 bg-[#FFF8F0] dark:bg-[#120702] border border-[#E6CBB2] dark:border-[#52270D] rounded-xl text-xs font-bold cursor-pointer"
                >
                  <option value="tight">Tight</option>
                  <option value="normal">Normal</option>
                  <option value="wide">Wide</option>
                </select>
              </div>
            </div>

          </div>

          {/* Live Typography Preview Box */}
          <div 
            className="p-5 rounded-2xl border space-y-2 transition-colors"
            style={{ backgroundColor: lightBg, borderColor: lightBorder }}
          >
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Live Typography Preview</span>
            <h4 
              className="text-xl font-black"
              style={{ fontFamily: `"${headingFont}", sans-serif`, color: lightTextPrimary }}
            >
              The Art of Premium Doorstep Detailing
            </h4>
            <p 
              className="text-xs leading-relaxed"
              style={{ fontFamily: `"${bodyFont}", sans-serif`, color: lightTextSecondary }}
            >
              RWash delivers showroom finish right at your home or office parking with eco-friendly steam gloss wash and certified ceramic coat protection.
            </p>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════════
            3. DYNAMIC CARD STYLING (CORNER RADIUS, BORDER, SHADOW, GLASSMORPHISM)
        ══════════════════════════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-[#210E04] p-6 sm:p-8 rounded-3xl border border-[#E6CBB2] dark:border-[#52270D] shadow-sm space-y-6">
          <div className="border-b border-[#E6CBB2]/50 dark:border-[#52270D]/50 pb-4">
            <h2 className="text-base font-bold text-[#3D1E0B] dark:text-[#FFF5EB] flex items-center gap-2 tracking-tight">
              <Square className="h-5 w-5 text-[#8C471E] dark:text-[#E69D62]" />
              Card & Container Styling (Dynamic Curves, Borders & Shadows)
            </h2>
            <p className="text-xs text-[#542E16] dark:text-[#E8C8AE] font-medium mt-1">
              Customize the shape, border thickness, ambient shadows, and glassmorphism of all cards and widgets in the application.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Corner Radius */}
            <div>
              <label className="block text-xs font-bold text-[#3D1E0B] dark:text-[#FFF5EB] uppercase tracking-wider mb-2">
                Card Corner Radius
              </label>
              <select
                value={cardRadius}
                onChange={(e) => {
                  const val = e.target.value as any
                  setCardRadius(val)
                  applyLivePreview({ cardStyle: { ...getCurrentConfig().cardStyle!, radius: val } })
                }}
                className="w-full px-3.5 py-2.5 bg-[#FFF8F0] dark:bg-[#120702] border border-[#E6CBB2] dark:border-[#52270D] rounded-xl text-xs font-bold cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#8C471E]"
              >
                <option value="sharp">Sharp (6px)</option>
                <option value="rounded">Rounded (12px)</option>
                <option value="extra-rounded">Modern (22px)</option>
                <option value="ultra">Ultra Curved (32px)</option>
                <option value="pill">Pill (Full Round)</option>
              </select>
            </div>

            {/* Border Width */}
            <div>
              <label className="block text-xs font-bold text-[#3D1E0B] dark:text-[#FFF5EB] uppercase tracking-wider mb-2">
                Card Border Width
              </label>
              <select
                value={cardBorderWidth}
                onChange={(e) => {
                  const val = e.target.value as any
                  setCardBorderWidth(val)
                  applyLivePreview({ cardStyle: { ...getCurrentConfig().cardStyle!, borderWidth: val } })
                }}
                className="w-full px-3.5 py-2.5 bg-[#FFF8F0] dark:bg-[#120702] border border-[#E6CBB2] dark:border-[#52270D] rounded-xl text-xs font-bold cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#8C471E]"
              >
                <option value="none">None (0px)</option>
                <option value="thin">Thin (1px)</option>
                <option value="normal">Standard (2px)</option>
                <option value="thick">Bold (3px)</option>
              </select>
            </div>

            {/* Shadow Depth */}
            <div>
              <label className="block text-xs font-bold text-[#3D1E0B] dark:text-[#FFF5EB] uppercase tracking-wider mb-2">
                Card Shadow Depth
              </label>
              <select
                value={cardShadow}
                onChange={(e) => {
                  const val = e.target.value as any
                  setCardShadow(val)
                  applyLivePreview({ cardStyle: { ...getCurrentConfig().cardStyle!, shadow: val } })
                }}
                className="w-full px-3.5 py-2.5 bg-[#FFF8F0] dark:bg-[#120702] border border-[#E6CBB2] dark:border-[#52270D] rounded-xl text-xs font-bold cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#8C471E]"
              >
                <option value="none">Flat / No Shadow</option>
                <option value="soft">Clean & Soft</option>
                <option value="elevated">Luxury Elevated</option>
                <option value="glow">Ambient Brand Glow</option>
              </select>
            </div>

            {/* Glassmorphism Toggle */}
            <div>
              <label className="block text-xs font-bold text-[#3D1E0B] dark:text-[#FFF5EB] uppercase tracking-wider mb-2">
                Glassmorphism Effect
              </label>
              <label className="flex items-center gap-2.5 px-3.5 py-2.5 bg-[#FFF8F0] dark:bg-[#120702] border border-[#E6CBB2] dark:border-[#52270D] rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={cardGlassmorphism}
                  onChange={(e) => {
                    setCardGlassmorphism(e.target.checked)
                    applyLivePreview({ cardStyle: { ...getCurrentConfig().cardStyle!, glassmorphism: e.target.checked } })
                  }}
                  className="w-4 h-4 rounded accent-[#8C471E] cursor-pointer"
                />
                <span className="text-xs font-bold text-[#3D1E0B] dark:text-[#FFF5EB]">
                  Frosted Glass Blur
                </span>
              </label>
            </div>

          </div>

          {/* Live Card Sample Widget */}
          <div 
            className="p-6 transition-all border flex flex-col sm:flex-row items-center justify-between gap-4"
            style={{
              backgroundColor: lightCard,
              borderColor: lightBorder,
              borderRadius: cardRadius === 'sharp' ? '6px' : cardRadius === 'rounded' ? '12px' : cardRadius === 'extra-rounded' ? '22px' : cardRadius === 'ultra' ? '32px' : '9999px',
              borderWidth: cardBorderWidth === 'none' ? '0px' : cardBorderWidth === 'thin' ? '1px' : cardBorderWidth === 'normal' ? '2px' : '3px',
              boxShadow: cardShadow === 'none' ? 'none' : cardShadow === 'soft' ? '0 4px 16px -2px rgba(0,0,0,0.06)' : cardShadow === 'elevated' ? '0 14px 34px -4px rgba(0,0,0,0.14)' : `0 8px 30px ${lightPrimary}33`,
            }}
          >
            <div className="flex items-center gap-3">
              <div 
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-base shadow-sm"
                style={{ backgroundColor: lightPrimary }}
              >
                RW
              </div>
              <div>
                <h5 className="font-bold text-sm" style={{ color: lightTextPrimary }}>Dynamic Preview Card</h5>
                <p className="text-xs" style={{ color: lightTextSecondary }}>Card styling adjusts across all app widgets</p>
              </div>
            </div>
            <button
              type="button"
              className="px-5 py-2.5 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-xs"
              style={{ backgroundColor: lightPrimary }}
            >
              Action Button
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════════
            4. OMNI-OTP CLOUD GATEWAY SETTINGS (POST API)
        ══════════════════════════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-[#210E04] p-6 sm:p-8 rounded-3xl border border-[#E6CBB2] dark:border-[#52270D] shadow-sm space-y-6">
          <div className="border-b border-[#E6CBB2]/50 dark:border-[#52270D]/50 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[#3D1E0B] dark:text-[#FFF5EB] flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-[#8C471E] dark:text-[#E69D62]" />
                OmniOTP Cloud Gateway (POST Request API)
              </h2>
              <p className="text-xs text-[#542E16] dark:text-[#E8C8AE] font-semibold mt-0.5">
                Dispatches real OTPs via POST requests to your OmniOTP service with instant session verification.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer bg-[#FFF8F0] dark:bg-[#120702] px-3.5 py-1.5 rounded-xl border border-[#E6CBB2] dark:border-[#52270D]">
                <input
                  type="checkbox"
                  checked={omniOtpEnabled}
                  onChange={(e) => setOmniOtpEnabled(e.target.checked)}
                  className="w-4 h-4 rounded accent-[#8C471E] cursor-pointer"
                />
                <span className="text-xs font-bold text-[#3D1E0B] dark:text-[#FFF5EB]">
                  {omniOtpEnabled ? 'OmniOTP Active' : 'OmniOTP Disabled'}
                </span>
              </label>
            </div>
          </div>

          {/* OmniOTP Configuration Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            <div className="md:col-span-2">
              <label className="block text-xs font-black text-[#3D1E0B] dark:text-[#FFF5EB] uppercase tracking-wider mb-2">
                OmniOTP Service URL (POST Endpoint) *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Globe className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  value={omniOtpApiUrl}
                  onChange={(e) => setOmniOtpApiUrl(e.target.value)}
                  placeholder="https://omniotp.onrender.com"
                  className="w-full pl-10 pr-4 py-3 bg-[#FFF8F0] dark:bg-[#120702] border border-[#E6CBB2] dark:border-[#52270D] rounded-2xl text-[#3D1E0B] dark:text-[#FFF5EB] text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#8C471E]"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Dispatches to <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">/api/v1/otp/send</code> and verifies at <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">/api/v1/otp/verify</code>
              </p>
            </div>

            <div>
              <label className="block text-xs font-black text-[#3D1E0B] dark:text-[#FFF5EB] uppercase tracking-wider mb-2">
                App Name Tag
              </label>
              <input
                type="text"
                value={omniOtpAppName}
                onChange={(e) => setOmniOtpAppName(e.target.value)}
                placeholder="RWash"
                className="w-full px-4 py-3 bg-[#FFF8F0] dark:bg-[#120702] border border-[#E6CBB2] dark:border-[#52270D] rounded-2xl text-[#3D1E0B] dark:text-[#FFF5EB] text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#8C471E]"
              />
              <p className="text-[10px] text-slate-500 mt-1">Sent in payload as app_name</p>
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-black text-[#3D1E0B] dark:text-[#FFF5EB] uppercase tracking-wider mb-2">
                OmniOTP API Key (x-api-key) *
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={omniOtpApiKey}
                  onChange={(e) => setOmniOtpApiKey(e.target.value)}
                  placeholder="sk_live_omni_..."
                  className="w-full pl-4 pr-11 py-3 bg-[#FFF8F0] dark:bg-[#120702] border border-[#E6CBB2] dark:border-[#52270D] rounded-2xl text-[#3D1E0B] dark:text-[#FFF5EB] text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#8C471E]"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Health Check and Test SMS */}
          <div className="pt-4 border-t border-[#E6CBB2]/50 dark:border-[#52270D]/50 flex flex-col sm:flex-row items-center gap-3">
            <button
              type="button"
              disabled={checkingHealth}
              onClick={handleCheckHealth}
              className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${checkingHealth ? 'animate-spin' : ''}`} />
              <span>{checkingHealth ? 'Testing OmniOTP...' : 'Test OmniOTP Connection'}</span>
            </button>

            <div className="relative flex-1 w-full">
              <input
                type="tel"
                value={testSmsPhone}
                onChange={(e) => setTestSmsPhone(e.target.value)}
                placeholder="Mobile number to dispatch test OTP (e.g. 8290866520)"
                className="w-full px-4 py-2.5 bg-[#FFF8F0] dark:bg-[#120702] border border-[#E6CBB2] dark:border-[#52270D] rounded-xl text-xs font-bold"
              />
            </div>

            <button
              type="button"
              disabled={sendingTestSms}
              onClick={handleSendTestSms}
              className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{sendingTestSms ? 'Dispatching...' : 'Send Test OTP via POST'}</span>
            </button>
          </div>

          {/* Health Status Result Notice */}
          {healthStatus.status !== 'idle' && (
            <div className={`p-3.5 rounded-xl text-xs font-semibold flex items-start gap-2 ${
              healthStatus.status === 'ok' 
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800' 
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800'
            }`}>
              {healthStatus.status === 'ok' ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" /> : <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />}
              <span>{healthStatus.message}</span>
            </div>
          )}

          {/* OTP Message Template */}
          <div className="pt-2 border-t border-[#E6CBB2]/50 dark:border-[#52270D]/50 space-y-2">
            <label className="block text-xs font-black text-[#3D1E0B] dark:text-[#FFF5EB] uppercase tracking-wider">
              OTP SMS Message Template
              <span className="ml-2 text-[10px] font-bold normal-case text-slate-500">
                (use <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded text-rose-600">{'{'+'otp}'}</code> for dynamic OTP)
              </span>
            </label>
            <textarea
              value={smsTemplate}
              onChange={(e) => setSmsTemplate(e.target.value)}
              rows={2}
              className="w-full px-4 py-2.5 bg-[#FFF8F0] dark:bg-[#120702] border border-[#E6CBB2] dark:border-[#52270D] rounded-2xl text-xs font-mono font-bold resize-none"
            />
            <p className="text-[11px] text-slate-500 font-semibold">
              Preview: <span className="text-[#8C471E] dark:text-[#E69D62] font-black">{smsTemplate.replace('{otp}', '749216')}</span>
            </p>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════════
            5. BUSINESS PROFILE, LOGO & IDENTITY
        ══════════════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Logo Management */}
          <div className="lg:col-span-5 bg-white dark:bg-[#210E04] p-6 rounded-3xl border border-[#E6CBB2] dark:border-[#52270D] shadow-sm space-y-4">
            <h3 className="font-bold text-base text-[#3D1E0B] dark:text-[#FFF5EB] flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-[#8C471E] dark:text-[#E69D62]" />
              Brand Logo & Favicon
            </h3>

            <div className="flex flex-col items-center justify-center p-6 bg-[#FFF8F0] dark:bg-[#120702] border border-[#E6CBB2] dark:border-[#52270D] rounded-2xl">
              {logoUrl ? (
                <img src={logoUrl} alt="Brand Logo" className="max-h-24 max-w-full object-contain mb-3" />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-700 font-black mb-3">
                  RW
                </div>
              )}
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Live Brand Symbol</span>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Upload New Logo File
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                disabled={uploadingLogo}
                className="w-full text-xs file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#8C471E] file:text-white hover:file:opacity-90 cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Or Logo Image URL
              </label>
              <input
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 bg-[#FFF8F0] dark:bg-[#120702] border border-[#E6CBB2] dark:border-[#52270D] rounded-xl text-xs font-mono font-bold"
              />
            </div>
          </div>

          {/* Business Details */}
          <div className="lg:col-span-7 bg-white dark:bg-[#210E04] p-6 rounded-3xl border border-[#E6CBB2] dark:border-[#52270D] shadow-sm space-y-4">
            <h3 className="font-bold text-base text-[#3D1E0B] dark:text-[#FFF5EB]">
              General Business Info
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Business Name *
                </label>
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FFF8F0] dark:bg-[#120702] border border-[#E6CBB2] dark:border-[#52270D] rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tagline
                </label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FFF8F0] dark:bg-[#120702] border border-[#E6CBB2] dark:border-[#52270D] rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Helpline Mobile
                </label>
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FFF8F0] dark:bg-[#120702] border border-[#E6CBB2] dark:border-[#52270D] rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  WhatsApp Support
                </label>
                <input
                  type="text"
                  value={whatsappSupportNumber}
                  onChange={(e) => setWhatsappSupportNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FFF8F0] dark:bg-[#120702] border border-[#E6CBB2] dark:border-[#52270D] rounded-xl text-xs font-bold"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Service Address / Head Office
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FFF8F0] dark:bg-[#120702] border border-[#E6CBB2] dark:border-[#52270D] rounded-xl text-xs font-bold"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  UPI ID for QR Payments
                </label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="rwash@upi"
                  className="w-full px-3.5 py-2.5 bg-[#FFF8F0] dark:bg-[#120702] border border-[#E6CBB2] dark:border-[#52270D] rounded-xl text-xs font-mono font-bold"
                />
              </div>
            </div>
          </div>

        </div>

        {/* Floating Bottom Save Bar */}
        <div className="sticky bottom-4 z-30 p-4 bg-white/90 dark:bg-[#210E04]/90 backdrop-blur-md rounded-2xl border border-[#E6CBB2] dark:border-[#52270D] shadow-xl flex items-center justify-between gap-4">
          <div className="text-xs font-bold text-slate-600 dark:text-slate-300">
            Current Preset: <span className="text-[#8C471E] dark:text-[#E69D62] font-black">{themePreset}</span>
          </div>
          <button
            type="submit"
            disabled={saving || uploadingLogo}
            className="px-8 py-3 bg-[#8C471E] dark:bg-[#A65D2E] hover:opacity-95 active:scale-[0.98] text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? 'Publishing Settings...' : 'Save & Publish All Changes'}</span>
          </button>
        </div>

      </form>
    </div>
  )
}


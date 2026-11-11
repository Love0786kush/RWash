// OmniOTP Backend Gateway Integration
// POST https://omniotp.onrender.com/api/v1/otp/send with { phone, app_name }
// POST https://omniotp.onrender.com/api/v1/otp/verify with { session_id, otp }

import { supabase } from '../lib/supabase'

export interface OmniOtpConfig {
  apiUrl: string
  apiKey: string
  appName: string
  enabled: boolean
}

export interface SendOtpResult {
  success: boolean
  sessionId?: string
  sentViaSms?: boolean
  message?: string
  devOtp?: string
}

export interface VerifyOtpResult {
  success: boolean
  verified: boolean
  message?: string
}

const DEFAULT_API_URL = 'https://omniotp.onrender.com'
const DEFAULT_API_KEY = 'sk_live_omni_7a9f4c82b1d3e6'
const DEFAULT_APP_NAME = 'RWash'

let cachedConfig: OmniOtpConfig | null = null
let cacheTime = 0
const CACHE_TTL = 15 * 1000 // 15 seconds

export async function getOmniOtpConfig(): Promise<OmniOtpConfig> {
  const now = Date.now()
  if (cachedConfig && now - cacheTime < CACHE_TTL) {
    return cachedConfig
  }

  try {
    const { data } = await supabase
      .from('settings')
      .select('social_links')
      .eq('id', 1)
      .maybeSingle()

    const omni = data?.social_links?.omni_otp
    if (omni) {
      cachedConfig = {
        apiUrl: (omni.api_url || DEFAULT_API_URL).trim().replace(/\/+$/, ''),
        apiKey: (omni.api_key || DEFAULT_API_KEY).trim(),
        appName: (omni.app_name || DEFAULT_APP_NAME).trim(),
        enabled: omni.enabled !== false,
      }
      cacheTime = now
      return cachedConfig
    }
  } catch (err) {
    console.warn('[OmniOTP] Could not load DB config, using default:', err)
  }

  // Fallback to defaults
  cachedConfig = {
    apiUrl: (import.meta.env.VITE_OMNI_OTP_URL || DEFAULT_API_URL).trim().replace(/\/+$/, ''),
    apiKey: (import.meta.env.VITE_OMNI_OTP_KEY || DEFAULT_API_KEY).trim(),
    appName: DEFAULT_APP_NAME,
    enabled: true,
  }
  cacheTime = now
  return cachedConfig
}

export function normalizePhone(raw: string): string {
  let p = (raw || '').replace(/[\s-]/g, '')
  if (/^\d{10}$/.test(p)) p = '+91' + p
  return p
}

export function isValidPhone(raw: string): boolean {
  const p = normalizePhone(raw)
  return /^\+\d{10,15}$/.test(p)
}

export function generateOtp(length = 6): string {
  let otp = ''
  for (let i = 0; i < length; i++) {
    otp += Math.floor(Math.random() * 10).toString()
  }
  if (otp.startsWith('0')) otp = '1' + otp.slice(1)
  return otp
}

/**
 * Send OTP via OmniOTP POST API
 * POST /api/v1/otp/send
 */
export async function sendOtpSms(to: string): Promise<SendOtpResult> {
  const toNumber = normalizePhone(to)
  if (!isValidPhone(toNumber)) {
    throw new Error('Please enter a valid 10-digit mobile number (+91XXXXXXXXXX).')
  }

  const config = await getOmniOtpConfig()
  const endpoint = `${config.apiUrl}/api/v1/otp/send`

  try {
    console.log(`[OmniOTP] Sending OTP POST request to ${endpoint} for ${toNumber}`)

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'x-api-key': config.apiKey,
      },
      body: JSON.stringify({
        phone: toNumber,
        app_name: config.appName,
      }),
    })

    const data = await res.json().catch(() => ({}))

    if (res.ok && data?.success) {
      console.log(`[OmniOTP] OTP dispatched successfully! Session ID: ${data.session_id}`)
      return {
        success: true,
        sessionId: data.session_id,
        sentViaSms: true,
        message: data.message || 'OTP sent successfully to your mobile number via SMS.',
      }
    }

    const errMsg = data?.message || data?.error || `OmniOTP service returned status ${res.status}`
    console.warn('[OmniOTP Error]:', errMsg)

    return {
      success: false,
      sentViaSms: false,
      message: errMsg,
    }
  } catch (err: any) {
    console.error('[OmniOTP Network Error]:', err)
    return {
      success: false,
      sentViaSms: false,
      message: err?.message || 'Could not reach OmniOTP server. Please check internet connection.',
    }
  }
}

/**
 * Verify OTP via OmniOTP POST API
 * POST /api/v1/otp/verify
 */
export async function verifyOtpSms(sessionId: string, otp: string): Promise<VerifyOtpResult> {
  const config = await getOmniOtpConfig()
  const endpoint = `${config.apiUrl}/api/v1/otp/verify`

  try {
    console.log(`[OmniOTP] Verifying OTP POST request to ${endpoint} for session ${sessionId}`)

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'x-api-key': config.apiKey,
      },
      body: JSON.stringify({
        session_id: sessionId,
        otp: otp.trim(),
      }),
    })

    const data = await res.json().catch(() => ({}))

    if (res.ok && (data?.verified || data?.success)) {
      console.log('[OmniOTP] OTP verified successfully!')
      return {
        success: true,
        verified: true,
        message: 'Phone number verified successfully.',
      }
    }

    const errMsg = data?.error || data?.message || 'Invalid or expired OTP code.'
    return {
      success: false,
      verified: false,
      message: errMsg,
    }
  } catch (err: any) {
    return {
      success: false,
      verified: false,
      message: err?.message || 'Verification connection failed.',
    }
  }
}

export function isHttpsmsConfigured(): boolean {
  return true
}

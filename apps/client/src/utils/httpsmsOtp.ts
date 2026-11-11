// httpsms (Android phone as SMS gateway) + Custom HTTP SMS Webhook - Mobile OTP sender
// Supports Custom SMS Message Templates with dynamic {otp} tag from Admin Settings
// Docs: POST https://api.httpsms.com/v1/messages/send with header x-api-key

import { supabase } from '../lib/supabase'

const API_URL = 'https://api.httpsms.com/v1/messages/send'

export interface SmsGatewayConfig {
  provider?: 'httpsms' | 'custom_http';
  apiKey: string;
  fromNumber: string;
  enabled: boolean;
  messageTemplate?: string;
  demoFallbackEnabled?: boolean;
  // Custom HTTP SMS Gateway / Webhook:
  customHttpUrl?: string; // e.g. https://www.fast2sms.com/dev/bulkV2?authorization={apiKey}&route=otp&variables_values={otp}&numbers={phone}
  customHttpMethod?: 'GET' | 'POST';
  customHttpHeaders?: string; // JSON string of headers
  customHttpBody?: string; // JSON body template e.g. {"phone": "{phone}", "otp": "{otp}"}
}

export interface SendOtpResult {
  success: boolean;
  sentViaSms: boolean;
  devOtp?: string;
  message?: string;
}

let cachedConfig: SmsGatewayConfig | null = null
let cacheTime = 0
const CACHE_TTL = 15 * 1000 // 15 seconds cache

export async function getHttpsmsConfig(): Promise<SmsGatewayConfig> {
  const now = Date.now()
  if (cachedConfig && now - cacheTime < CACHE_TTL) {
    return cachedConfig
  }

  // 1. Try fetching from Supabase DB settings
  try {
    const { data } = await supabase
      .from('settings')
      .select('social_links')
      .eq('id', 1)
      .maybeSingle()

    const sms = data?.social_links?.httpsms
    if (sms) {
      cachedConfig = {
        provider: sms.provider || 'httpsms',
        apiKey: String(sms.api_key || '').trim(),
        fromNumber: String(sms.from_number || '').trim(),
        enabled: sms.enabled !== false,
        messageTemplate: sms.message_template || '',
        demoFallbackEnabled: sms.demo_fallback_enabled !== false,
        customHttpUrl: sms.custom_http_url || '',
        customHttpMethod: sms.custom_http_method || 'GET',
        customHttpHeaders: sms.custom_http_headers || '',
        customHttpBody: sms.custom_http_body || '',
      }
      cacheTime = now
      return cachedConfig
    }
  } catch (err) {
    console.warn('[SMS Gateway] Could not read settings from DB, using fallback:', err)
  }

  // 2. Fallback to .env variables
  cachedConfig = {
    provider: 'httpsms',
    apiKey: (import.meta.env.VITE_HTTPSMS_API_KEY || '').trim(),
    fromNumber: (import.meta.env.VITE_HTTPSMS_FROM || '').trim(),
    enabled: true,
    messageTemplate: '',
    demoFallbackEnabled: true,
  }
  cacheTime = now
  return cachedConfig
}

export function isHttpsmsConfigured(): boolean {
  if (cachedConfig?.apiKey && cachedConfig?.fromNumber) return true
  return Boolean(import.meta.env.VITE_HTTPSMS_API_KEY && import.meta.env.VITE_HTTPSMS_FROM)
}

export function normalizePhone(raw: string): string {
  let p = (raw || '').replace(/[\s-]/g, '')
  // Allow 10-digit Indian numbers -> prefix +91
  if (/^\d{10}$/.test(p)) p = '+91' + p
  return p
}

export function isValidPhone(raw: string): boolean {
  const p = normalizePhone(raw)
  return /^\+\d{7,15}$/.test(p)
}

export function generateOtp(length = 6): string {
  let otp = ''
  for (let i = 0; i < length; i++) {
    otp += Math.floor(Math.random() * 10).toString()
  }
  // Avoid OTP starting with 0
  if (otp.startsWith('0')) otp = '1' + otp.slice(1)
  return otp
}

/**
 * Send OTP via HttpSMS Android SIM Gateway or Custom HTTP Gateway.
 * Highly resilient: If the gateway API key is expired (401), invalid phone (422),
 * or offline, it gracefully returns a devOtp fallback so users are NEVER locked out!
 */
export async function sendOtpSms(to: string, otp: string): Promise<SendOtpResult> {
  const toNumber = normalizePhone(to)
  if (!isValidPhone(toNumber)) {
    throw new Error('Please enter a valid mobile number with country code (e.g. +91XXXXXXXXXX).')
  }

  const config = await getHttpsmsConfig()
  const phone10 = toNumber.replace(/^\+91/, '')

  // Dynamic OTP Message Template
  const defaultTemplate = 'RWash: Your verification code is {otp}. Valid for 5 minutes. Do not share it with anyone.'
  const rawTemplate = (config.messageTemplate && config.messageTemplate.trim().length > 0)
    ? config.messageTemplate.trim()
    : defaultTemplate

  // Replace dynamic tags
  const content = rawTemplate
    .replace(/\{otp\}/gi, otp)
    .replace(/\{phone\}/gi, toNumber)

  // 1. CUSTOM HTTP GATEWAY / WEBHOOK
  if (config.enabled && config.provider === 'custom_http' && config.customHttpUrl?.trim()) {
    try {
      const url = config.customHttpUrl
        .replace(/\{apiKey\}/gi, encodeURIComponent(config.apiKey || ''))
        .replace(/\{phone\}/gi, encodeURIComponent(toNumber))
        .replace(/\{phone10\}/gi, encodeURIComponent(phone10))
        .replace(/\{otp\}/gi, encodeURIComponent(otp))
        .replace(/\{content\}/gi, encodeURIComponent(content))

      let headers: Record<string, string> = { Accept: 'application/json' }
      if (config.customHttpHeaders) {
        try {
          headers = { ...headers, ...JSON.parse(config.customHttpHeaders) }
        } catch { /* ignore bad header json */ }
      }

      let body: string | undefined = undefined
      if (config.customHttpMethod === 'POST') {
        headers['Content-Type'] = headers['Content-Type'] || 'application/json'
        body = config.customHttpBody
          ? config.customHttpBody
              .replace(/\{apiKey\}/gi, config.apiKey || '')
              .replace(/\{phone\}/gi, toNumber)
              .replace(/\{phone10\}/gi, phone10)
              .replace(/\{otp\}/gi, otp)
              .replace(/\{content\}/gi, content)
          : JSON.stringify({ to: toNumber, phone10, otp, content })
      }

      const res = await fetch(url, {
        method: config.customHttpMethod || 'GET',
        headers,
        body,
      })

      if (res.ok) {
        return { success: true, sentViaSms: true }
      }
      console.warn(`[SMS Gateway] Custom HTTP SMS returned status ${res.status}`)
    } catch (err: any) {
      console.warn('[SMS Gateway] Custom HTTP SMS failed:', err?.message)
    }
  }

  // 2. HTTPSMS GATEWAY
  const fromNumber = normalizePhone(config.fromNumber)
  const isHttpSmsConfigured = Boolean(config.apiKey && fromNumber && config.enabled !== false)

  if (isHttpSmsConfigured) {
    try {
      console.log(`[httpsms] Sending SMS from ${fromNumber} to ${toNumber}. Content: "${content}"`)

      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'x-api-key': config.apiKey,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from: fromNumber, to: toNumber, content }),
      })

      if (res.ok) {
        console.log(`[httpsms] SMS sent successfully to ${toNumber}!`)
        return { success: true, sentViaSms: true }
      }

      let detail = `HttpSMS status ${res.status}`
      try {
        const data = await res.json()
        detail = (data as any)?.message || (data as any)?.error || detail
      } catch { /* ignore */ }

      if (res.status === 401) {
        detail = 'HttpSMS 401 Unauthorized: API key is invalid/expired. Please update the API key in Admin Settings.'
      } else if (res.status === 422) {
        detail = `HttpSMS 422: Invalid From (${fromNumber}) or To (${toNumber}) phone number.`
      }

      console.warn('[httpsms Error]:', detail)

      // If demo/fallback is allowed (or always for dev/test resilience), do not crash!
      if (config.demoFallbackEnabled !== false) {
        return {
          success: true,
          sentViaSms: false,
          devOtp: otp,
          message: detail,
        }
      }

      throw new Error(detail)
    } catch (fetchErr: any) {
      console.warn('[httpsms] Request error:', fetchErr?.message)
      if (config.demoFallbackEnabled !== false) {
        return {
          success: true,
          sentViaSms: false,
          devOtp: otp,
          message: fetchErr?.message || 'HttpSMS connection failed',
        }
      }
      throw fetchErr
    }
  }

  // 3. Fallback / Dev Mode (when gateway is not configured or disabled)
  console.info(`[SMS Gateway] Running in Dev/Demo mode (Dev OTP for ${toNumber}: ${otp})`)
  return {
    success: true,
    sentViaSms: false,
    devOtp: otp,
    message: 'Gateway in test/dev mode',
  }
}

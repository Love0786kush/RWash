// supabase/functions/send-notification/index.ts
// Server-side only — Firebase Admin credentials NEVER reach the frontend.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const FIREBASE_PROJECT_ID = Deno.env.get('FIREBASE_PROJECT_ID') ?? 'carwash-7c308'
const FCM_URL = `https://fcm.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/messages:send`

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return errorResponse('Unauthorized', 401)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Validate caller is an authenticated Supabase user (admin)
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authError || !user) return errorResponse('Unauthorized', 401)

    const body = await req.json()
    const {
      type,
      userId,
      userIds,     // multiple user targeting
      topic,
      title,
      body: msgBody,
      imageUrl,
      deepLink,
      campaignId,
      actionButtons = [],
      sound = true,
      vibration = true,
      priority = 'High',
      timerExpiry,
      category,
    } = body

    let results: { success: number; failed: number; invalid: string[] }

    if (type === 'topic') {
      results = await sendToTopic(
        topic ?? 'all_users', title, msgBody, imageUrl, deepLink,
        actionButtons, sound, vibration, priority
      )
    } else if (type === 'user') {
      // Support both single userId and array userIds
      const ids: string[] = userIds ?? (userId ? [userId] : [])
      results = await sendToUsers(supabase, ids, title, msgBody, imageUrl, deepLink, actionButtons, sound, vibration, priority)
    } else if (type === 'broadcast') {
      results = await sendBroadcast(supabase, title, msgBody, imageUrl, deepLink, actionButtons, sound, vibration, priority)
    } else {
      return errorResponse('Invalid type. Use: broadcast | topic | user', 400)
    }

    // Update campaign record if campaignId provided
    if (campaignId) {
      await supabase
        .from('notification_campaigns')
        .update({
          status: results.success > 0 ? 'Sent' : 'Failed',
          successfully_sent: results.success,
          total_targeted: results.success + results.failed,
          failed_send: results.failed,
          sent_at: new Date().toISOString(),
          error_log: results.failed > 0 ? `${results.failed} tokens failed / ${results.invalid.length} invalid tokens cleaned up` : null,
        })
        .eq('id', campaignId)
    }

    return new Response(JSON.stringify(results), {
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    })

  } catch (err: any) {
    console.error('send-notification error:', err)
    return errorResponse(err?.message ?? 'Internal server error', 500)
  }
})

// ─── Send to FCM Topic ───────────────────────────────────────────────────────

async function sendToTopic(
  topic: string,
  title: string,
  body: string,
  imageUrl?: string,
  deepLink?: string,
  actionButtons: any[] = [],
  sound = true,
  vibration = true,
  priority = 'High',
) {
  const result = await fcmSend({
    message: {
      topic,
      ...buildNotificationPayload(title, body, imageUrl, deepLink, actionButtons, sound, vibration, priority),
    }
  })
  return { success: result ? 1 : 0, failed: result ? 0 : 1, invalid: [] }
}

// ─── Send to Specific Users (by user_id list from user_fcm_tokens) ───────────

async function sendToUsers(
  supabase: any,
  userIds: string[],
  title: string,
  body: string,
  imageUrl?: string,
  deepLink?: string,
  actionButtons: any[] = [],
  sound = true,
  vibration = true,
  priority = 'High',
) {
  if (!userIds.length) return { success: 0, failed: 0, invalid: [] }

  const { data: tokens } = await supabase
    .from('user_fcm_tokens')
    .select('fcm_token')
    .in('user_id', userIds)
    .eq('is_active', true)

  return await sendToTokenList(
    supabase,
    tokens?.map((t: any) => t.fcm_token) ?? [],
    title, body, imageUrl, deepLink, actionButtons, sound, vibration, priority
  )
}

// ─── Broadcast to All Active Tokens ──────────────────────────────────────────

async function sendBroadcast(
  supabase: any,
  title: string,
  body: string,
  imageUrl?: string,
  deepLink?: string,
  actionButtons: any[] = [],
  sound = true,
  vibration = true,
  priority = 'High',
) {
  const { data: tokens } = await supabase
    .from('user_fcm_tokens')
    .select('fcm_token')
    .eq('is_active', true)

  const tokenList = tokens?.map((t: any) => t.fcm_token) ?? []

  // If no registered tokens yet, fall back to topic 'all_users'
  if (tokenList.length === 0) {
    console.log('No active FCM tokens found — falling back to topic all_users')
    return sendToTopic('all_users', title, body, imageUrl, deepLink, actionButtons, sound, vibration, priority)
  }

  return await sendToTokenList(
    supabase, tokenList,
    title, body, imageUrl, deepLink, actionButtons, sound, vibration, priority
  )
}

// ─── Batch Token Sender ───────────────────────────────────────────────────────

async function sendToTokenList(
  supabase: any,
  tokens: string[],
  title: string,
  body: string,
  imageUrl?: string,
  deepLink?: string,
  actionButtons: any[] = [],
  sound = true,
  vibration = true,
  priority = 'High',
) {
  let success = 0
  let failed  = 0
  const invalid: string[] = []

  const BATCH = 500
  for (let i = 0; i < tokens.length; i += BATCH) {
    const batch = tokens.slice(i, i + BATCH)

    const promises = batch.map(token =>
      fcmSend({
        message: {
          token,
          ...buildNotificationPayload(title, body, imageUrl, deepLink, actionButtons, sound, vibration, priority),
        }
      })
      .then(() => { success++ })
      .catch((err: any) => {
        failed++
        const msg = err?.message ?? ''
        if (msg.includes('UNREGISTERED') || msg.includes('NOT_FOUND')) {
          invalid.push(token)
        }
      })
    )

    await Promise.allSettled(promises)
  }

  // Deactivate invalid tokens
  if (invalid.length > 0) {
    await supabase
      .from('user_fcm_tokens')
      .update({ is_active: false })
      .in('fcm_token', invalid)
  }

  return { success, failed, invalid }
}

// ─── Build FCM Notification Payload ──────────────────────────────────────────

function buildNotificationPayload(
  title: string,
  body: string,
  imageUrl?: string,
  deepLink?: string,
  actionButtons: Array<{ text: string; action_type: string; action_url: string }> = [],
  sound = true,
  vibration = true,
  priority = 'High',
) {
  // Map action buttons → Android notification actions
  const androidActions = actionButtons.slice(0, 3).map((btn) => ({
    action: btn.action_url,
    title: btn.text,
  }))

  return {
    notification: {
      title,
      body,
      ...(imageUrl ? { image: imageUrl } : {}),
    },
    data: {
      deepLink: deepLink ?? '/',
      sentAt: new Date().toISOString(),
      actionButtons: JSON.stringify(actionButtons),
      clickAction: 'FLUTTER_NOTIFICATION_CLICK',
    },
    android: {
      priority: priority === 'High' ? ('high' as const) : ('normal' as const),
      notification: {
        sound: sound ? 'default' : undefined,
        default_vibrate_timings: vibration,
        channel_id: 'rwash_bookings',
        ...(imageUrl ? { image_url: imageUrl } : {}),
        // Android action buttons
        ...(androidActions.length > 0 ? { click_action: 'FLUTTER_NOTIFICATION_CLICK' } : {}),
      },
    },
    webpush: {
      headers: { Urgency: priority === 'High' ? 'high' : 'normal' },
      notification: {
        icon: '/logo192.png',
        badge: '/badge72.png',
        ...(imageUrl ? { image: imageUrl } : {}),
        actions: androidActions.map((a) => ({ action: a.action, title: a.title })),
        vibrate: vibration ? [200, 100, 200] : undefined,
      },
      fcm_options: {
        link: deepLink ?? '/',
      },
    },
    apns: {
      payload: {
        aps: {
          sound: sound ? 'default' : undefined,
          'mutable-content': 1,
        },
      },
    },
  }
}

// ─── Firebase FCM HTTP v1 Sender ──────────────────────────────────────────────

async function fcmSend(payload: object): Promise<any> {
  const accessToken = await getFirebaseAccessToken()

  const res = await fetch(FCM_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error?.message ?? 'FCM send failed')
  }

  return res.json()
}

// ─── Firebase JWT / OAuth2 Token Generation ───────────────────────────────────

async function getFirebaseAccessToken(): Promise<string> {
  const rawServiceAccount = Deno.env.get('FIREBASE_SERVICE_ACCOUNT')
  if (!rawServiceAccount) {
    throw new Error('Missing FIREBASE_SERVICE_ACCOUNT secret in Supabase Edge Function secrets')
  }
  const serviceAccount = JSON.parse(rawServiceAccount)

  const now = Math.floor(Date.now() / 1000)
  const jwtPayload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
  }

  const jwt = await signJwt(jwtPayload, serviceAccount.private_key)

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  const tokenData = await tokenRes.json()
  if (!tokenData.access_token) {
    throw new Error('Failed to obtain Firebase access token: ' + JSON.stringify(tokenData))
  }
  return tokenData.access_token
}

async function signJwt(payload: object, privateKey: string): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' }

  const encodeBase64Url = (obj: object) =>
    btoa(JSON.stringify(obj))
      .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

  const signingInput = `${encodeBase64Url(header)}.${encodeBase64Url(payload)}`

  const keyData = privateKey
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '')

  const keyBuffer = Uint8Array.from(atob(keyData), c => c.charCodeAt(0))

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', keyBuffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign']
  )

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput)
  )

  const sigBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

  return `${signingInput}.${sigBase64}`
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function errorResponse(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}

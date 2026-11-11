// supabase/functions/register-fcm-token/index.ts
// Called by Android app after login to register the device FCM token.
// Android sends: { fcm_token, device_type, device_model, app_version }
// Header: Authorization: Bearer <supabase_access_token>
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    if (!authHeader) {
      return errorResponse('Authorization header required', 401)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Verify user identity from their Supabase JWT
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      return errorResponse('Unauthorized — invalid or expired token', 401)
    }

    const body = await req.json()
    const { fcm_token, device_type = 'android', device_model = 'unknown', app_version = null } = body

    if (!fcm_token || typeof fcm_token !== 'string') {
      return errorResponse('fcm_token is required', 400)
    }

    // Upsert token — if same token exists, update last_used_at and re-activate
    const { error: upsertError } = await supabase
      .from('user_fcm_tokens')
      .upsert(
        {
          user_id: user.id,
          customer_id: user.id,
          fcm_token,
          device_type: device_type.substring(0, 20),
          device_model: String(device_model).substring(0, 200),
          app_version: app_version ? String(app_version).substring(0, 20) : null,
          is_active: true,
          last_used_at: new Date().toISOString(),
        },
        { onConflict: 'fcm_token' }
      )

    if (upsertError) {
      console.error('Token upsert error:', upsertError)
      return errorResponse('Failed to register token: ' + upsertError.message, 500)
    }

    return new Response(
      JSON.stringify({ success: true, message: 'FCM token registered successfully' }),
      { headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    )
  } catch (err: any) {
    console.error('register-fcm-token error:', err)
    return errorResponse(err?.message ?? 'Internal server error', 500)
  }
})

function errorResponse(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}


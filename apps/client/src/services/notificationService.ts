// apps/client/src/services/notificationService.ts
// Manages FCM token registration for web and Android app users.
// Tokens saved here flow into Supabase → Edge Function → Firebase FCM.
import { supabase } from '../lib/supabase'

export type DeviceType = 'android' | 'ios' | 'web'

export interface FCMTokenPayload {
  fcmToken: string
  deviceType?: DeviceType
  deviceModel?: string
  appVersion?: string
}

export const notificationService = {
  /**
   * Register (upsert) an FCM token for the current user.
   * Called from:
   *   - Web: on page load after getting token from Firebase Messaging
   *   - Android: via WebView bridge or REST call when user logs in
   */
  async saveToken(payload: FCMTokenPayload | string): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    // Support both legacy string call and new object form
    const fcmToken = typeof payload === 'string' ? payload : payload.fcmToken
    const deviceType: DeviceType = typeof payload === 'object' ? (payload.deviceType ?? 'web') : 'web'
    const deviceModel =
      typeof payload === 'object'
        ? payload.deviceModel ?? navigator?.userAgent?.substring(0, 200) ?? 'unknown'
        : navigator?.userAgent?.substring(0, 200) ?? 'unknown'

    const tokenRecord = {
      user_id: user.id,
      customer_id: user.id,
      fcm_token: fcmToken,
      device_type: deviceType,
      device_model: deviceModel.substring(0, 200),
      app_version: typeof payload === 'object' ? payload.appVersion ?? null : null,
      is_active: true,
      last_used_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('user_fcm_tokens')
      .upsert(tokenRecord, { onConflict: 'fcm_token' })

    if (error) {
      console.warn('FCM token save failed:', error.message)
    }
  },

  /** Deactivate a token (called on logout or token refresh). */
  async removeToken(fcmToken: string): Promise<void> {
    await supabase
      .from('user_fcm_tokens')
      .update({ is_active: false })
      .eq('fcm_token', fcmToken)
  },

  /** Deactivate ALL tokens for the current user (called on logout). */
  async removeAllTokensForUser(): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('user_fcm_tokens')
      .update({ is_active: false })
      .eq('user_id', user.id)
  },

  /** Get all active FCM tokens for the current user. */
  async getMyTokens(): Promise<string[]> {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return []

    const { data } = await supabase
      .from('user_fcm_tokens')
      .select('fcm_token')
      .eq('user_id', user.id)
      .eq('is_active', true)

    return data?.map((t: any) => t.fcm_token) ?? []
  },

  /** Update the last_used_at timestamp to keep token fresh. */
  async refreshToken(fcmToken: string): Promise<void> {
    await supabase
      .from('user_fcm_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('fcm_token', fcmToken)
  },
}

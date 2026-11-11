import { supabase } from '../lib/supabase'

export interface SendNotificationPayload {
  type: 'broadcast' | 'topic' | 'user'
  topic?: string
  userId?: string
  title: string
  body: string
  imageUrl?: string
  deepLink?: string
  campaignId?: string
}

export const notificationService = {
  async sendNotification(payload: SendNotificationPayload): Promise<{ success: number; failed: number }> {
    const { data: session } = await supabase.auth.getSession()
    const token = session.session?.access_token

    const edgeFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-notification`

    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token ?? import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.error || 'Failed to dispatch notification')
    }

    return response.json()
  },
}


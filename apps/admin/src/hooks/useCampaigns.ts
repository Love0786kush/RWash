import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { notificationService, type SendNotificationPayload } from '../services/notificationService'
import type { NotificationCampaign } from '../types'

export function useCampaigns() {
  const [campaigns, setCampaigns] = useState<NotificationCampaign[]>([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function fetchCampaigns() {
    setLoading(true)
    const { data, error } = await supabase
      .from('notification_campaigns')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) setError(error.message)
    else setCampaigns((data as unknown as NotificationCampaign[]) ?? [])
    setLoading(false)
  }

  async function sendCampaign(payload: SendNotificationPayload): Promise<boolean> {
    setSending(true)
    setError(null)

    try {
      // 1. Campaign record create in Supabase
      const { data: campaign, error: dbError } = await supabase
        .from('notification_campaigns')
        .insert({
          name: payload.title,
          title: payload.title,
          body: payload.body,
          image_url: payload.imageUrl ?? null,
          deep_link: payload.deepLink ?? '/',
          status: 'Sending',
          target_audience: payload.type === 'broadcast' ? 'all' : 'topics',
          target_topic: payload.topic ?? 'all_users',
        } as any)
        .select()
        .single()

      if (dbError) throw dbError

      // 2. Dispatch via Edge Function
      await notificationService.sendNotification({
        ...payload,
        campaignId: (campaign as any).id,
      })

      await fetchCampaigns()
      return true
    } catch (err: any) {
      setError(err.message ?? 'Send failed')
      return false
    } finally {
      setSending(false)
    }
  }

  return { campaigns, loading, sending, error, fetchCampaigns, sendCampaign }
}


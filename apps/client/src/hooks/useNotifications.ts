import { useEffect, useState } from 'react'
import { getToken, onMessage } from 'firebase/messaging'
import { getFirebaseMessaging } from '../lib/firebase'
import { notificationService } from '../services/notificationService'
import { useAuth } from '../context/AuthContext'

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY

export function useNotifications() {
  const { user } = useAuth()
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  )
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    if (user && permission === 'granted') {
      setupFcm()
    }
  }, [user, permission])

  useEffect(() => {
    let unsub: (() => void) | undefined

    getFirebaseMessaging().then((messaging) => {
      if (!messaging) return
      unsub = onMessage(messaging, (payload) => {
        const { title, body } = payload.notification ?? {}
        if (title) showInAppToast(title, body ?? '')
      })
    })

    return () => {
      unsub?.()
    }
  }, [])

  async function requestPermission(): Promise<boolean> {
    if (typeof Notification === 'undefined') return false

    const result = await Notification.requestPermission()
    setPermission(result)

    if (result === 'granted') {
      await setupFcm()
      return true
    }
    return false
  }

  async function setupFcm() {
    try {
      const messaging = await getFirebaseMessaging()
      if (!messaging) return

      let registration: ServiceWorkerRegistration | undefined
      if ('serviceWorker' in navigator) {
        registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
      }

      const fcmToken = await getToken(messaging, {
        vapidKey: VAPID_KEY || undefined,
        serviceWorkerRegistration: registration,
      })

      if (fcmToken) {
        setToken(fcmToken)
        await notificationService.saveToken(fcmToken)
      }
    } catch (err) {
      console.warn('FCM setup notice:', err)
    }
  }

  function showInAppToast(title: string, body: string) {
    const event = new CustomEvent('rwash-notification', {
      detail: { title, body },
    })
    window.dispatchEvent(event)
  }

  return {
    permission,
    token,
    requestPermission,
    isSupported: typeof Notification !== 'undefined',
  }
}


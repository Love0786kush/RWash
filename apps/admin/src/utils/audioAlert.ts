// Audio chime alert using browser Web Audio API (zero external assets required)
export function playAlert(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContextClass) return

    const ctx = new AudioContextClass()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(587.33, ctx.currentTime) // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1) // A5

    gain.gain.setValueAtTime(0.2, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start()
    osc.stop(ctx.currentTime + 0.35)
  } catch {
    // Audio autoplay might be blocked before first user gesture
  }
}

export const playNewBookingAlertSound = playAlert

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof Notification === 'undefined') return false
  if (Notification.permission === 'granted') return true
  const res = await Notification.requestPermission()
  return res === 'granted'
}

export function triggerDesktopNotification(title: string, body: string, icon?: string): void {
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: icon || '/favicon.svg',
      })
    } catch {
      // Fallback
    }
  }
}

// test/services/notificationService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { notificationService } from '../../src/services/notificationService'

// Mock supabase client
vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'mock-token' } },
      }),
    },
  },
}))

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

beforeEach(() => {
  vi.clearAllMocks()
})

describe('notificationService.sendNotification', () => {
  it('calls the edge function with correct payload', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: 100, failed: 0, invalid: [] }),
    })

    const result = await notificationService.sendNotification({
      type: 'broadcast',
      title: 'Test Notification',
      body: 'Hello from tests',
    })

    expect(mockFetch).toHaveBeenCalledOnce()
    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toContain('/functions/v1/send-notification')
    expect(options.method).toBe('POST')
    const sentBody = JSON.parse(options.body)
    expect(sentBody.title).toBe('Test Notification')
    expect(sentBody.type).toBe('broadcast')
    expect(result.success).toBe(100)
  })

  it('throws error when edge function returns non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Unauthorized' }),
    })

    await expect(
      notificationService.sendNotification({
        type: 'topic',
        topic: 'all_users',
        title: 'Fail Test',
        body: 'Should throw',
      })
    ).rejects.toThrow('Unauthorized')
  })

  it('handles topic targeting correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: 1, failed: 0, invalid: [] }),
    })

    await notificationService.sendNotification({
      type: 'topic',
      topic: 'premium_users',
      title: 'Premium Only',
      body: 'VIP message',
    })

    const sentBody = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(sentBody.type).toBe('topic')
    expect(sentBody.topic).toBe('premium_users')
  })
})


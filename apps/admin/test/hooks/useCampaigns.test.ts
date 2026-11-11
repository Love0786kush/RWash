// test/hooks/useCampaigns.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// Mock supabase
const mockInsert = vi.fn()
const mockSelect = vi.fn()
const mockOrder = vi.fn()
const mockEq = vi.fn()
const mockFrom = vi.fn()

const chain = {
  select: mockSelect,
  order: mockOrder,
  insert: mockInsert,
  eq: mockEq,
  single: vi.fn(),
}

mockSelect.mockReturnValue(chain)
mockOrder.mockReturnValue(chain)
mockInsert.mockReturnValue(chain)
mockEq.mockReturnValue(chain)
chain.single.mockReturnValue({ data: { id: 'c-1' }, error: null })

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: mockFrom,
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    }),
    removeChannel: vi.fn(),
  },
}))

vi.mock('../../src/services/notificationService', () => ({
  notificationService: {
    sendNotification: vi.fn().mockResolvedValue({ success: 10, failed: 0 }),
  },
}))

import { useCampaigns } from '../../src/hooks/useCampaigns'

beforeEach(() => {
  vi.clearAllMocks()
  mockFrom.mockReturnValue(chain)
  mockSelect.mockReturnValue(chain)
  mockOrder.mockResolvedValue({ data: [], error: null })
})

describe('useCampaigns', () => {
  it('initializes with empty campaigns and not loading', () => {
    const { result } = renderHook(() => useCampaigns())
    expect(result.current.campaigns).toEqual([])
    expect(result.current.sending).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('fetchCampaigns populates campaigns state', async () => {
    const fakeCampaigns = [
      { id: 'c-1', name: 'Test Campaign', title: 'T', body: 'B', status: 'Draft' },
    ]
    mockOrder.mockResolvedValueOnce({ data: fakeCampaigns, error: null })

    const { result } = renderHook(() => useCampaigns())

    await act(async () => {
      await result.current.fetchCampaigns()
    })

    expect(result.current.campaigns).toHaveLength(1)
    expect(result.current.campaigns[0].name).toBe('Test Campaign')
  })

  it('fetchCampaigns sets error on failure', async () => {
    mockOrder.mockResolvedValueOnce({ data: null, error: { message: 'Table not found' } })

    const { result } = renderHook(() => useCampaigns())

    await act(async () => {
      await result.current.fetchCampaigns()
    })

    expect(result.current.error).toBe('Table not found')
  })
})


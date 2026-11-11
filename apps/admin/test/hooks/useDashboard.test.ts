// test/hooks/useDashboard.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

const mockSupabase = {
  from: vi.fn(),
  channel: vi.fn().mockReturnValue({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn(),
  }),
  removeChannel: vi.fn(),
}

vi.mock('../../src/lib/supabase', () => ({
  supabase: mockSupabase,
}))

import { useDashboard } from '../../src/hooks/useDashboard'

const makeChain = (data: any, count: number | null = null) => ({
  select: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  eq: vi.fn().mockResolvedValue({ data, count, error: null }),
})

beforeEach(() => {
  vi.clearAllMocks()
  mockSupabase.channel.mockReturnValue({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn(),
  })

  // Default: all queries return empty
  mockSupabase.from.mockReturnValue(makeChain([], 0))
})

describe('useDashboard', () => {
  it('starts in loading state', () => {
    const { result } = renderHook(() => useDashboard())
    expect(result.current.loading).toBe(true)
  })

  it('fetches stats and stops loading', async () => {
    const { result } = renderHook(() => useDashboard())

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.stats).toBeDefined()
    expect(typeof result.current.stats.totalBookings).toBe('number')
  })

  it('exposes refetch function', () => {
    const { result } = renderHook(() => useDashboard())
    expect(typeof result.current.refetch).toBe('function')
  })
})


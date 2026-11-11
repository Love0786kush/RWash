// test/services/bookingService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { bookingService } from '../../src/services/bookingService'

// --- Mock supabase ---
const mockOrder = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()
const mockFrom = vi.fn()

vi.mock('../../src/lib/supabase', () => ({
  supabase: { from: mockFrom },
}))

function makeChain(overrides: Record<string, any> = {}) {
  const chain: Record<string, any> = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    ...overrides,
  }
  return chain
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('bookingService.getAll', () => {
  it('returns empty array when no bookings', async () => {
    const chain = makeChain({ order: vi.fn().mockResolvedValue({ data: [], error: null }) })
    mockFrom.mockReturnValue(chain)

    const result = await bookingService.getAll()
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBe(0)
  })

  it('returns booking array on success', async () => {
    const fakeBookings = [
      { id: 'b-1', status: 'Pending', final_amount: 500 },
      { id: 'b-2', status: 'Completed', final_amount: 800 },
    ]
    const chain = makeChain({ order: vi.fn().mockResolvedValue({ data: fakeBookings, error: null }) })
    mockFrom.mockReturnValue(chain)

    const result = await bookingService.getAll()
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('b-1')
  })

  it('throws on supabase error', async () => {
    const chain = makeChain({
      order: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
    })
    mockFrom.mockReturnValue(chain)

    await expect(bookingService.getAll()).rejects.toThrow()
  })
})

describe('bookingService.updateStatus', () => {
  it('calls update and eq with correct args', async () => {
    const eqMock = vi.fn().mockResolvedValue({ error: null })
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock })
    mockFrom.mockReturnValue({ update: updateMock })

    await bookingService.updateStatus('b-1', 'Completed')

    expect(mockFrom).toHaveBeenCalledWith('bookings')
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'Completed' })
    )
    expect(eqMock).toHaveBeenCalledWith('id', 'b-1')
  })

  it('adds completed_at when status is Completed', async () => {
    const eqMock = vi.fn().mockResolvedValue({ error: null })
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock })
    mockFrom.mockReturnValue({ update: updateMock })

    await bookingService.updateStatus('b-1', 'Completed')

    const updateArg = updateMock.mock.calls[0][0]
    expect(updateArg).toHaveProperty('completed_at')
    expect(updateArg).toHaveProperty('payment_status', 'Paid')
  })

  it('adds cancelled_at when status is Cancelled', async () => {
    const eqMock = vi.fn().mockResolvedValue({ error: null })
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock })
    mockFrom.mockReturnValue({ update: updateMock })

    await bookingService.updateStatus('b-1', 'Cancelled')

    const updateArg = updateMock.mock.calls[0][0]
    expect(updateArg).toHaveProperty('cancelled_at')
  })
})

describe('bookingService.assignWorker', () => {
  it('updates booking with worker_id and Assigned status', async () => {
    const eqMock = vi.fn().mockResolvedValue({ error: null })
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock })
    mockFrom.mockReturnValue({ update: updateMock })

    await bookingService.assignWorker('b-1', 'w-99')

    expect(updateMock).toHaveBeenCalledWith({ worker_id: 'w-99', status: 'Assigned' })
    expect(eqMock).toHaveBeenCalledWith('id', 'b-1')
  })
})

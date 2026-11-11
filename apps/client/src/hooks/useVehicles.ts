import { useEffect, useState } from 'react'
import { vehicleService } from '../services/vehicleService'
import { useAuth } from '../context/AuthContext'
import type { Vehicle } from '../types'

export function useVehicles() {
  const { customer } = useAuth()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (customer?.id) {
      fetchVehicles(customer.id)
    } else {
      setLoading(false)
    }
  }, [customer?.id])

  async function fetchVehicles(customerId: string) {
    try {
      setLoading(true)
      const data = await vehicleService.getMyVehicles(customerId)
      setVehicles(data)
    } catch (e: any) {
      setError(e.message || 'Could not load vehicles.')
    } finally {
      setLoading(false)
    }
  }

  async function addVehicle(v: Partial<Vehicle>) {
    if (!customer?.id) return
    const newV = await vehicleService.addVehicle({ ...v, customer_id: customer.id })
    setVehicles((prev) => [newV, ...prev])
    return newV
  }

  async function deleteVehicle(id: string) {
    await vehicleService.deleteVehicle(id)
    setVehicles((prev) => prev.filter((v) => v.id !== id))
  }

  return {
    vehicles,
    loading,
    error,
    addVehicle,
    deleteVehicle,
    refetch: () => customer?.id && fetchVehicles(customer.id),
  }
}


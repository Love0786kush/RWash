import { useEffect, useState } from 'react'
import { serviceService } from '../services/serviceService'
import type { Service, ServiceCategory } from '../types'

export function useServices() {
  const [services, setServices] = useState<Service[]>([])
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      setLoading(true)
      const [svc, cat] = await Promise.all([
        serviceService.getAll(),
        serviceService.getCategories(),
      ])
      setServices(svc)
      setCategories(cat)
    } catch (e: any) {
      setError(e.message || 'Could not load services.')
    } finally {
      setLoading(false)
    }
  }

  return { services, categories, loading, error, refetch: fetchData }
}


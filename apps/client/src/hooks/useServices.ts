import { useEffect, useState } from 'react'
import { serviceService } from '../services/serviceService'
import type { Service, ServiceCategory } from '../types'

export function useServices(category?: string) {
  const [services, setServices] = useState<Service[]>([])
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [category])

  async function fetchData() {
    try {
      setLoading(true)
      setError(null)
      const [svc, cat] = await Promise.all([
        serviceService.getActiveServices(category),
        serviceService.getCategories(),
      ])
      setServices(svc)
      setCategories(cat)
    } catch {
      setError('Could not load services. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return { services, categories, loading, error, refetch: fetchData }
}


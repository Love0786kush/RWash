/**
 * RWash Admin LocalStorage Cache Utility
 * 
 * Stale-While-Revalidate pattern:
 *  1. Show cached data instantly (no skeleton flash on revisit)
 *  2. Fetch fresh data from Supabase in background
 *  3. Update cache + UI silently
 */

const CACHE_PREFIX = 'rwash_admin_cache_'

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

export function setCached<T>(key: string, data: T, ttlMinutes = 5): void {
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttlMinutes * 60 * 1000,
    }
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry))
  } catch {}
}

export function getCached<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key)
    if (!raw) return null

    const entry: CacheEntry<T> = JSON.parse(raw)
    const age = Date.now() - entry.timestamp

    if (age > entry.ttl) {
      localStorage.removeItem(CACHE_PREFIX + key)
      return null
    }

    return entry.data
  } catch {
    return null
  }
}

export function clearCached(key: string): void {
  try {
    localStorage.removeItem(CACHE_PREFIX + key)
  } catch {}
}

export function clearAllCache(): void {
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX))
    keys.forEach(k => localStorage.removeItem(k))
  } catch {}
}

export const CACHE_KEYS = {
  SERVICES: 'services',        // 5 min
  CATEGORIES: 'categories',   // 10 min
  BANNERS: 'banners',         // 5 min
  SETTINGS: 'settings',       // 15 min
  SUB_PLANS: 'sub_plans',     // 10 min
}


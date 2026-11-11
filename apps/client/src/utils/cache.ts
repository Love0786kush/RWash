/**
 * RWash LocalStorage Cache Utility
 * 
 * Stale-While-Revalidate pattern:
 *  1. Show cached data instantly (no loading flash)
 *  2. Fetch fresh data from Supabase in background
 *  3. Update cache + UI silently
 * 
 * Android compatible note:
 *  - For React Native, replace localStorage with AsyncStorage
 *  - API is identical — just swap the adapter below
 */

const CACHE_PREFIX = 'rwash_cache_'

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number // in milliseconds
}

/** Save data to cache */
export function setCached<T>(key: string, data: T, ttlMinutes = 5): void {
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttlMinutes * 60 * 1000,
    }
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry))
  } catch {
    // localStorage quota exceeded or unavailable — silently ignore
  }
}

/** Get cached data. Returns null if expired or missing. */
export function getCached<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key)
    if (!raw) return null

    const entry: CacheEntry<T> = JSON.parse(raw)
    const age = Date.now() - entry.timestamp

    if (age > entry.ttl) {
      localStorage.removeItem(CACHE_PREFIX + key) // Clean up expired
      return null
    }

    return entry.data
  } catch {
    return null
  }
}

/** Force-clear a specific cache key */
export function clearCached(key: string): void {
  try {
    localStorage.removeItem(CACHE_PREFIX + key)
  } catch {}
}

/** Clear ALL rwash cache keys */
export function clearAllCache(): void {
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX))
    keys.forEach(k => localStorage.removeItem(k))
  } catch {}
}

/** Cache keys used across the app */
export const CACHE_KEYS = {
  HOME_BANNERS: 'home_banners',      // 5 min
  HOME_SERVICES: 'home_services',    // 10 min
  HOME_REVIEWS: 'home_reviews',      // 15 min
  CLIENT_SERVICES: 'client_services',// 10 min
  SETTINGS: 'settings',              // 15 min
  SUBSCRIPTION_PLANS: 'sub_plans',   // 10 min
}


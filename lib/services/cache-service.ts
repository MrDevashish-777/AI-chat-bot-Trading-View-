/**
 * Cache Service for Market Data
 * Implements TTL-based caching for stock prices and historical data
 */

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class MarketDataCache {
  private cache = new Map<string, CacheEntry>();
  
  /**
   * Set cache entry with TTL
   * @param key Cache key (e.g., symbol)
   * @param data Data to cache
   * @param ttlSeconds TTL in seconds (default: 60)
   */
  set(key: string, data: any, ttlSeconds: number = 60) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000
    });
  }
  
  /**
   * Get cache entry if valid
   * @param key Cache key
   * @returns Cached data or null if expired/not found
   */
  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  /**
   * Clear specific entry or entire cache
   */
  clear(key?: string) {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Get cache size
   */
  get size(): number {
    return this.cache.size;
  }
}

// TTL Strategy:
// - Stock prices: 60 seconds
// - Historical data: 300 seconds (5 minutes)
// - Company info: 3600 seconds (1 hour)
// - News: 1800 seconds (30 minutes)

export const cacheService = new MarketDataCache();
export default cacheService;

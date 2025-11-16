import { Request, Response, NextFunction } from 'express';

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
  hits: number;
  lastAccessed: number;
  contentType: string;
  etag: string;
}

interface CacheConfig {
  defaultTTL: number;
  maxSize: number;
  cleanupInterval: number;
  compressionEnabled: boolean;
}

class AdvancedCache {
  private cache: Map<string, CacheEntry> = new Map();
  private config: CacheConfig;
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalRequests: 0
  };

  constructor() {
    this.config = {
      defaultTTL: 5 * 60 * 1000, // 5 minutes default
      maxSize: 1000, // Maximum number of cached entries
      cleanupInterval: 60 * 1000, // Cleanup every minute
      compressionEnabled: true
    };

    // Start periodic cleanup
    this.startCleanup();
  }

  // Generate cache key from request
  private generateKey(req: Request): string {
    const baseKey = `${req.method}:${req.path}`;
    const queryString = Object.keys(req.query).length > 0 ? 
      '?' + new URLSearchParams(req.query as any).toString() : '';
    
    // Include API key type in cache key for user-specific caching
    const apiKey = (Array.isArray(req.headers['x-api-key']) ? req.headers['x-api-key'][0] : req.headers['x-api-key']);
    const keyType = apiKey === process.env['API_KEY_ADMIN'] ? 'admin' : 
                   apiKey === process.env['API_KEY_FRONTEND'] ? 'frontend' : 'public';
    
    return `${keyType}:${baseKey}${queryString}`;
  }

  // Generate ETag for content
  private generateETag(data: any): string {
    const content = typeof data === 'string' ? data : JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `"${Math.abs(hash).toString(16)}"`;
  }

  // Check if entry is valid
  private isValid(entry: CacheEntry): boolean {
    const now = Date.now();
    return (now - entry.timestamp) < entry.ttl;
  }

  // Get from cache
  get(key: string): CacheEntry | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (!this.isValid(entry)) {
      this.cache.delete(key);
      this.stats.misses++;
      this.stats.evictions++;
      return null;
    }

    // Update access stats
    entry.hits++;
    entry.lastAccessed = Date.now();
    this.stats.hits++;
    
    return entry;
  }

  // Set in cache
  set(key: string, data: any, ttl?: number, contentType: string = 'application/json'): void {
    // Check cache size limit
    if (this.cache.size >= this.config.maxSize) {
      this.evictLeastRecentlyUsed();
    }

    const now = Date.now();
    const entry: CacheEntry = {
      data,
      timestamp: now,
      ttl: ttl || this.config.defaultTTL,
      hits: 0,
      lastAccessed: now,
      contentType,
      etag: this.generateETag(data)
    };

    this.cache.set(key, entry);
  }

  // Evict least recently used entry
  private evictLeastRecentlyUsed(): void {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  // Clear cache
  clear(): void {
    this.cache.clear();
    console.log('🗑️ Cache cleared');
  }

  // Delete specific key
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  // Invalidate cache by pattern
  invalidatePattern(pattern: string): number {
    let deleted = 0;
    const regex = new RegExp(pattern);
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deleted++;
      }
    }
    
    this.stats.evictions += deleted;
    console.log(`🗑️ Invalidated ${deleted} cache entries matching pattern: ${pattern}`);
    return deleted;
  }

  // Cache middleware
  middleware = (ttl?: number) => {
    return (req: Request, res: Response, next: NextFunction) => {
      // Skip caching for non-GET requests
      if (req.method !== 'GET') {
        return next();
      }

      // Skip caching for admin analytics (real-time data)
      if (req.path.includes('/analytics/') && req.path !== '/analytics/health') {
        return next();
      }

      const cacheKey = this.generateKey(req);
      const cachedEntry = this.get(cacheKey);

      this.stats.totalRequests++;

      // Check if client has valid cached version (ETag)
      const clientETag = req.headers['if-none-match'];
      if (cachedEntry && clientETag === cachedEntry.etag) {
        res.status(304).end();
        return;
      }

      // Return cached response if available
      if (cachedEntry) {
        res.set({
          'Content-Type': cachedEntry.contentType,
          'ETag': cachedEntry.etag,
          'X-Cache': 'HIT',
          'X-Cache-Hits': cachedEntry.hits.toString(),
          'Cache-Control': `max-age=${Math.floor((cachedEntry.ttl - (Date.now() - cachedEntry.timestamp)) / 1000)}`
        });

        return res.send(cachedEntry.data);
      }

      // Cache miss - intercept response
      const originalSend = res.send;
      const originalJson = res.json;

      res.send = function(data) {
        if (res.statusCode === 200) {
          const contentType = res.get('Content-Type') || 'text/html';
          advancedCache.set(cacheKey, data, ttl, contentType);
          
          const entry = advancedCache.get(cacheKey);
          if (entry) {
            res.set({
              'ETag': entry.etag,
              'X-Cache': 'MISS',
              'Cache-Control': `max-age=${Math.floor(entry.ttl / 1000)}`
            });
          }
        }
        return originalSend.call(this, data);
      };

      res.json = function(data) {
        if (res.statusCode === 200) {
          advancedCache.set(cacheKey, data, ttl, 'application/json');
          
          const entry = advancedCache.get(cacheKey);
          if (entry) {
            res.set({
              'ETag': entry.etag,
              'X-Cache': 'MISS',
              'Cache-Control': `max-age=${Math.floor(entry.ttl / 1000)}`
            });
          }
        }
        return originalJson.call(this, data);
      };

      next();
    };
  };

  // Periodic cleanup of expired entries
  private startCleanup(): void {
    setInterval(() => {
      let cleaned = 0;

      for (const [key, entry] of this.cache.entries()) {
        if (!this.isValid(entry)) {
          this.cache.delete(key);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        this.stats.evictions += cleaned;
        console.log(`🧹 Cache cleanup: Removed ${cleaned} expired entries`);
      }
    }, this.config.cleanupInterval);

    console.log(`🧹 Cache cleanup started (${this.config.cleanupInterval}ms interval)`);
  }

  // Get cache statistics
  getStats() {
    const hitRate = this.stats.totalRequests > 0 ? 
      (this.stats.hits / this.stats.totalRequests * 100).toFixed(2) : '0';

    return {
      config: this.config,
      stats: {
        ...this.stats,
        hitRate: hitRate + '%',
        currentSize: this.cache.size,
        maxSize: this.config.maxSize,
        memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024 // MB
      },
      topEntries: Array.from(this.cache.entries())
        .sort((a, b) => b[1].hits - a[1].hits)
        .slice(0, 10)
        .map(([key, entry]) => ({
          key,
          hits: entry.hits,
          age: Math.floor((Date.now() - entry.timestamp) / 1000) + 's',
          size: JSON.stringify(entry.data).length + ' bytes'
        }))
    };
  }

  // Configure cache settings
  configure(config: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('🔧 Cache configuration updated:', config);
  }

  // Warm up cache with common endpoints
  async warmUp(): Promise<void> {
    const commonEndpoints = [
      '/v0/services',
      '/v0/testimonials',
      '/v0/blog',
      '/v0/contact',
      '/v0/nav'
    ];

    console.log('🔥 Cache warm-up started...');
    
    for (const endpoint of commonEndpoints) {
      try {
        const response = await fetch(`${process.env['API_URL'] || 'https://api.packmovego.com'}${endpoint}`);
        if (response.ok) {
          const data = await response.json();
          this.set(`public:GET:${endpoint}`, data, this.config.defaultTTL, 'application/json');
        }
      } catch (error) {
        console.warn(`⚠️ Cache warm-up failed for ${endpoint}:`, error);
      }
    }
    
    console.log(`🔥 Cache warm-up completed: ${commonEndpoints.length} endpoints cached`);
  }
}

// Singleton instance
export const advancedCache = new AdvancedCache();

// Export middleware factory
export const cacheMiddleware = (ttl?: number) => advancedCache.middleware(ttl);

// Auto warm-up in production
if (process.env['NODE_ENV'] === 'production') {
  // Delay warm-up to let server start first
  setTimeout(() => {
    advancedCache.warmUp().catch(console.error);
  }, 10000);
} 
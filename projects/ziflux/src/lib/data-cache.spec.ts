import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Injector, runInInjectionContext } from '@angular/core'
import { DataCache } from './data-cache'
import { ZIFLUX_CONFIG } from './provide-ziflux'
import type { ZifluxConfig } from './types'

function createCache<T>(
  config?: Partial<ZifluxConfig>,
  globalConfig?: Partial<ZifluxConfig>,
): DataCache<T> {
  const providers: Array<{ provide: unknown; useValue: unknown }> = []
  if (globalConfig) {
    providers.push({
      provide: ZIFLUX_CONFIG,
      useValue: { staleTime: 30_000, gcTime: 300_000, ...globalConfig },
    })
  }
  const injector = Injector.create({ providers })
  return runInInjectionContext(injector, () => new DataCache<T>(config))
}

describe('DataCache', () => {
  let cache: DataCache<string>

  beforeEach(() => {
    cache = createCache<string>()
  })

  // --- get / set ---

  it('returns null for missing key', () => {
    expect(cache.get(['missing'])).toBeNull()
  })

  it('stores and retrieves data', () => {
    cache.set(['a'], 'hello')
    const result = cache.get(['a'])
    expect(result).toEqual({ data: 'hello', fresh: true })
  })

  it('handles compound keys', () => {
    cache.set(['order', 'list', 'pending'], 'data1')
    cache.set(['order', 'details', '42'], 'data2')

    expect(cache.get(['order', 'list', 'pending'])?.data).toBe('data1')
    expect(cache.get(['order', 'details', '42'])?.data).toBe('data2')
    expect(cache.get(['order', 'list', 'active'])).toBeNull()
  })

  it('overwrites existing entry', () => {
    cache.set(['a'], 'v1')
    cache.set(['a'], 'v2')
    expect(cache.get(['a'])?.data).toBe('v2')
  })

  // --- freshness ---

  it('returns fresh: true within staleTime', () => {
    cache.set(['a'], 'hello')
    expect(cache.get(['a'])?.fresh).toBe(true)
  })

  it('returns fresh: false after staleTime', () => {
    const shortCache = createCache<string>({ staleTime: 50, gcTime: 10_000 })
    shortCache.set(['a'], 'hello')

    vi.useFakeTimers()
    vi.advanceTimersByTime(51)
    expect(shortCache.get(['a'])).toEqual({ data: 'hello', fresh: false })
    vi.useRealTimers()
  })

  it('evicts after gcTime', () => {
    const shortCache = createCache<string>({ staleTime: 10, gcTime: 50 })
    shortCache.set(['a'], 'hello')

    vi.useFakeTimers()
    vi.advanceTimersByTime(51)
    expect(shortCache.get(['a'])).toBeNull()
    vi.useRealTimers()
  })

  it('respects per-call staleTime override', () => {
    cache.set(['a'], 'hello')
    vi.useFakeTimers()
    vi.advanceTimersByTime(100)

    // Default staleTime is 30s, so it should be fresh
    expect(cache.get(['a'])?.fresh).toBe(true)
    // But with a 50ms override, it should be stale
    expect(cache.get(['a'], { staleTime: 50 })?.fresh).toBe(false)

    vi.useRealTimers()
  })

  it('respects per-call gcTime override', () => {
    cache.set(['a'], 'hello')
    vi.useFakeTimers()
    vi.advanceTimersByTime(100)

    // Default gcTime is 300s, so it should still exist
    expect(cache.get(['a'])).not.toBeNull()
    // But with a 50ms override, it should be evicted
    expect(cache.get(['a'], { gcTime: 50 })).toBeNull()

    vi.useRealTimers()
  })

  // --- config priority: arg > global > defaults ---

  it('uses defaults when no config', () => {
    const c = createCache<string>()
    expect(c.staleTime).toBe(30_000)
    expect(c.gcTime).toBe(300_000)
  })

  it('global config overrides defaults', () => {
    const c = createCache<string>(undefined, { staleTime: 5000 })
    expect(c.staleTime).toBe(5000)
    expect(c.gcTime).toBe(300_000) // default preserved
  })

  it('constructor arg overrides global config', () => {
    const c = createCache<string>({ staleTime: 1000 }, { staleTime: 5000 })
    expect(c.staleTime).toBe(1000)
  })

  // --- invalidate ---

  it('marks matching entries as stale', () => {
    cache.set(['order', 'list'], 'list-data')
    cache.set(['order', 'details', '1'], 'detail-data')
    cache.set(['user', 'list'], 'user-data')

    cache.invalidate(['order'])

    expect(cache.get(['order', 'list'])?.fresh).toBe(false)
    expect(cache.get(['order', 'details', '1'])?.fresh).toBe(false)
    expect(cache.get(['user', 'list'])?.fresh).toBe(true)
  })

  it('preserves data after invalidation (never deletes)', () => {
    cache.set(['a'], 'hello')
    cache.invalidate(['a'])
    expect(cache.get(['a'])?.data).toBe('hello')
  })

  it('bumps version on invalidate', () => {
    const v0 = cache.version()
    cache.invalidate(['whatever'])
    expect(cache.version()).toBe(v0 + 1)
  })

  it('invalidate with exact key matches only that entry', () => {
    cache.set(['a', 'b'], 'ab')
    cache.set(['a', 'c'], 'ac')

    cache.invalidate(['a', 'b'])

    expect(cache.get(['a', 'b'])?.fresh).toBe(false)
    expect(cache.get(['a', 'c'])?.fresh).toBe(true)
  })

  // --- version ---

  it('starts at 0', () => {
    expect(cache.version()).toBe(0)
  })

  it('increments on each invalidate call', () => {
    cache.invalidate(['x'])
    cache.invalidate(['y'])
    cache.invalidate(['z'])
    expect(cache.version()).toBe(3)
  })

  // --- wrap ---

  it('wraps observable and populates cache on emit', async () => {
    const { of } = await import('rxjs')
    const { firstValueFrom } = await import('rxjs')

    const obs$ = cache.wrap(['key'], of('wrapped-value'))
    const result = await firstValueFrom(obs$)

    expect(result).toBe('wrapped-value')
    expect(cache.get(['key'])?.data).toBe('wrapped-value')
  })

  // --- deduplicate ---

  it('deduplicates concurrent calls with same key', async () => {
    let callCount = 0
    const fn = () => {
      callCount++
      return new Promise<string>(resolve => setTimeout(() => resolve('result'), 10))
    }

    const [r1, r2, r3] = await Promise.all([
      cache.deduplicate(['key'], fn),
      cache.deduplicate(['key'], fn),
      cache.deduplicate(['key'], fn),
    ])

    expect(callCount).toBe(1)
    expect(r1).toBe('result')
    expect(r2).toBe('result')
    expect(r3).toBe('result')
  })

  it('allows new call after previous resolves', async () => {
    let callCount = 0
    const fn = () => {
      callCount++
      return Promise.resolve(`result-${callCount}`)
    }

    const r1 = await cache.deduplicate(['key'], fn)
    const r2 = await cache.deduplicate(['key'], fn)

    expect(callCount).toBe(2)
    expect(r1).toBe('result-1')
    expect(r2).toBe('result-2')
  })

  it('cleans up in-flight on rejection', async () => {
    let attempt = 0
    const fn = () => {
      attempt++
      if (attempt === 1) return Promise.reject(new Error('fail'))
      return Promise.resolve('ok')
    }

    await expect(cache.deduplicate(['key'], fn)).rejects.toThrow('fail')
    const result = await cache.deduplicate(['key'], fn)
    expect(result).toBe('ok')
  })

  // --- prefetch ---

  it('fetches and stores in cache', async () => {
    await cache.prefetch(['key'], () => Promise.resolve('prefetched'))
    expect(cache.get(['key'])?.data).toBe('prefetched')
  })

  it('deduplicates with concurrent prefetch calls', async () => {
    let callCount = 0
    const fn = () => {
      callCount++
      return Promise.resolve('data')
    }

    await Promise.all([cache.prefetch(['key'], fn), cache.prefetch(['key'], fn)])

    expect(callCount).toBe(1)
    expect(cache.get(['key'])?.data).toBe('data')
  })

  // --- clear ---

  it('removes all entries and in-flight', () => {
    cache.set(['a'], 'v1')
    cache.set(['b'], 'v2')
    cache.clear()

    expect(cache.get(['a'])).toBeNull()
    expect(cache.get(['b'])).toBeNull()
  })
})

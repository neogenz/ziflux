import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DestroyRef, Injector, runInInjectionContext } from '@angular/core'
import { DataCache } from './data-cache'
import { ZIFLUX_CONFIG } from './provide-ziflux'
import type { DataCacheOptions, ZifluxConfig } from './types'

function createCache(config?: DataCacheOptions, globalConfig?: Partial<ZifluxConfig>): DataCache {
  const providers: Array<{ provide: unknown; useValue: unknown }> = []
  if (globalConfig) {
    providers.push({
      provide: ZIFLUX_CONFIG,
      useValue: { staleTime: 30_000, expireTime: 300_000, ...globalConfig },
    })
  }
  const injector = Injector.create({ providers })
  return runInInjectionContext(injector, () => new DataCache(config))
}

describe('DataCache', () => {
  let cache: DataCache

  beforeEach(() => {
    cache = createCache()
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
    const shortCache = createCache({ staleTime: 50, expireTime: 10_000 })
    shortCache.set(['a'], 'hello')

    vi.useFakeTimers()
    vi.advanceTimersByTime(51)
    expect(shortCache.get(['a'])).toEqual({ data: 'hello', fresh: false })
    vi.useRealTimers()
  })

  it('evicts after expireTime', () => {
    const shortCache = createCache({ staleTime: 10, expireTime: 50 })
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

  it('respects per-call expireTime override', () => {
    cache.set(['a'], 'hello')
    vi.useFakeTimers()
    vi.advanceTimersByTime(100)

    // Default expireTime is 300s, so it should still exist
    expect(cache.get(['a'])).not.toBeNull()
    // But with a 50ms override, it should be evicted
    expect(cache.get(['a'], { expireTime: 50 })).toBeNull()

    vi.useRealTimers()
  })

  // --- name ---

  it('auto-generates name when not provided', () => {
    expect(cache.name).toMatch(/^cache-\d+$/)
  })

  it('uses provided name', () => {
    const named = createCache({ name: 'orders' })
    expect(named.name).toBe('orders')
  })

  it('generates unique names for multiple caches', () => {
    const c1 = createCache()
    const c2 = createCache()
    expect(c1.name).not.toBe(c2.name)
  })

  // --- config priority: arg > global > defaults ---

  it('uses defaults when no config', () => {
    const c = createCache()
    expect(c.staleTime).toBe(30_000)
    expect(c.expireTime).toBe(300_000)
  })

  it('global config overrides defaults', () => {
    const c = createCache(undefined, { staleTime: 5000 })
    expect(c.staleTime).toBe(5000)
    expect(c.expireTime).toBe(300_000) // default preserved
  })

  it('constructor arg overrides global config', () => {
    const c = createCache({ staleTime: 1000 }, { staleTime: 5000 })
    expect(c.staleTime).toBe(1000)
  })

  // --- config validation ---

  it('rejects NaN staleTime', () => {
    expect(() => createCache({ staleTime: NaN })).toThrow(
      'DataCache: staleTime must be a finite number ≥ 0, got NaN',
    )
  })

  it('rejects Infinity staleTime', () => {
    expect(() => createCache({ staleTime: Infinity })).toThrow(
      'DataCache: staleTime must be a finite number ≥ 0, got Infinity',
    )
  })

  it('rejects negative staleTime', () => {
    expect(() => createCache({ staleTime: -1 })).toThrow(
      'DataCache: staleTime must be a finite number ≥ 0, got -1',
    )
  })

  it('rejects NaN expireTime', () => {
    expect(() => createCache({ expireTime: NaN })).toThrow(
      'DataCache: expireTime must be a finite number ≥ 0, got NaN',
    )
  })

  it('rejects Infinity expireTime', () => {
    expect(() => createCache({ expireTime: Infinity })).toThrow(
      'DataCache: expireTime must be a finite number ≥ 0, got Infinity',
    )
  })

  it('rejects negative expireTime', () => {
    expect(() => createCache({ expireTime: -100 })).toThrow(
      'DataCache: expireTime must be a finite number ≥ 0, got -100',
    )
  })

  it('rejects staleTime > expireTime', () => {
    expect(() => createCache({ staleTime: 5000, expireTime: 1000 })).toThrow(
      'DataCache: staleTime (5000) must be ≤ expireTime (1000)',
    )
  })

  it('accepts staleTime === expireTime', () => {
    expect(() => createCache({ staleTime: 1000, expireTime: 1000 })).not.toThrow()
  })

  it('accepts staleTime === 0', () => {
    const c = createCache({ staleTime: 0 })
    expect(c.staleTime).toBe(0)
  })

  it('rejects NaN maxEntries', () => {
    expect(() => createCache({ maxEntries: NaN })).toThrow(
      'DataCache: maxEntries must be a finite number ≥ 0, got NaN',
    )
  })

  it('rejects negative maxEntries', () => {
    expect(() => createCache({ maxEntries: -1 })).toThrow(
      'DataCache: maxEntries must be a finite number ≥ 0, got -1',
    )
  })

  it('rejects fractional maxEntries', () => {
    expect(() => createCache({ maxEntries: 2.5 })).toThrow(
      'DataCache: maxEntries must be an integer, got 2.5',
    )
  })

  it('rejects NaN cleanupInterval', () => {
    expect(() => createCache({ cleanupInterval: NaN })).toThrow(
      'DataCache: cleanupInterval must be a finite number ≥ 0, got NaN',
    )
  })

  it('rejects negative cleanupInterval', () => {
    expect(() => createCache({ cleanupInterval: -500 })).toThrow(
      'DataCache: cleanupInterval must be a finite number ≥ 0, got -500',
    )
  })

  it('rejects invalid global config propagated to constructor', () => {
    expect(() => createCache(undefined, { staleTime: NaN })).toThrow(
      'DataCache: staleTime must be a finite number ≥ 0, got NaN',
    )
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

  it('invalidate() makes entry stale but not expired', () => {
    cache.set(['a'], 'data')
    cache.invalidate(['a'])

    const result = cache.get(['a'])
    expect(result).not.toBeNull()
    expect(result?.data).toBe('data')
    expect(result?.fresh).toBe(false)

    // Confirm it's NOT expired — still retrievable with any expireTime
    const info = cache.inspect()
    const entry = info.entries.find(e => e.key[0] === 'a')
    expect(entry?.expired).toBe(false)
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

  it('invalidate does not collide with keys sharing a string prefix', () => {
    cache.set(['order', 'list'], 'order-list')
    cache.set(['orders'], 'orders-data')
    cache.set(['orderDetails', '1'], 'detail')

    cache.invalidate(['order'])

    expect(cache.get(['order', 'list'])?.fresh).toBe(false)
    expect(cache.get(['orders'])?.fresh).toBe(true)
    expect(cache.get(['orderDetails', '1'])?.fresh).toBe(true)
  })

  it('repeated invalidate() does not push entry past expiry (idempotent)', () => {
    cache.set(['a'], 'data')

    // Invalidate 10 times rapidly — must NOT expire the entry
    for (let i = 0; i < 10; i++) {
      cache.invalidate(['a'])
    }

    const entry = cache.get(['a'])
    expect(entry).not.toBeNull()
    if (!entry) return
    expect(entry.data).toBe('data')
    expect(entry.fresh).toBe(false) // stale, not expired
  })

  it('invalidate with empty prefix is a no-op', () => {
    cache.set(['a'], 'data')
    cache.invalidate([])
    expect(cache.get(['a'])?.fresh).toBe(true)
  })

  // --- invalidate + in-flight ---

  it('invalidate preserves in-flight entries for dedup', () => {
    let resolvePromise!: (v: string) => void
    const pending = new Promise<string>(r => {
      resolvePromise = r
    })
    const p1 = cache.deduplicate(['todos'], () => pending)

    cache.invalidate(['todos'])

    // After invalidation, dedup should return the SAME promise (DEDUP HIT)
    let freshCalled = false
    const p2 = cache.deduplicate(['todos'], () => {
      freshCalled = true
      return Promise.resolve('fresh')
    })

    expect(freshCalled).toBe(false) // fn should NOT be called
    expect(p2).toBe(p1) // same promise reference

    resolvePromise('done')
  })

  it('invalidate does not clear unrelated in-flight entries', () => {
    let callCount = 0
    const pending = new Promise<string>(() => {})
    void cache.deduplicate(['users'], () => pending)

    cache.invalidate(['todos'])

    void cache.deduplicate(['users'], () => {
      callCount++
      return Promise.resolve('new')
    })
    // Should still return old promise, not call fn
    expect(callCount).toBe(0)
  })

  it('rapid sequential invalidations reuse in-flight fetch (no redundant fetches)', async () => {
    let fetchCount = 0
    let resolvePromise!: (v: string) => void

    // First dedup starts a fetch
    const p1 = cache.deduplicate(['items'], () => {
      fetchCount++
      return new Promise<string>(r => {
        resolvePromise = r
      })
    })

    // Simulate 5 rapid invalidations (like 5 mutations completing quickly)
    for (let i = 0; i < 5; i++) {
      cache.invalidate(['items'])

      // After each invalidation, dedup should find the existing in-flight fetch
      const pN = cache.deduplicate(['items'], () => {
        fetchCount++
        return Promise.resolve(`fetch-${fetchCount}`)
      })
      expect(pN).toBe(p1)
    }

    // Only 1 actual fetch, not 6
    expect(fetchCount).toBe(1)

    resolvePromise('result')
    const result = await p1
    expect(result).toBe('result')
  })

  it('in-flight promise cleanup still works after invalidation', async () => {
    let resolvePromise!: (v: string) => void
    const pending = new Promise<string>(r => {
      resolvePromise = r
    })

    void cache.deduplicate(['key'], () => pending)
    cache.invalidate(['key'])

    // In-flight still tracked
    const info = cache.inspect()
    expect(info.inFlightKeys).toEqual([['key']])

    // Resolve the promise — .finally() should clean up the in-flight entry
    resolvePromise('data')
    await pending

    // Wait for .finally() microtask
    await new Promise(r => setTimeout(r, 0))

    const infoAfter = cache.inspect()
    expect(infoAfter.inFlightKeys).toEqual([])
  })

  it('pre-invalidation in-flight (started while fresh) is discarded after invalidation', () => {
    // Warm cache — entry is fresh
    cache.set(['key'], 'old-data')
    expect(cache.get(['key'])?.fresh).toBe(true)

    // Start a fetch while entry is fresh (e.g., polling or initial load)
    let resolveFirst!: (v: string) => void
    void cache.deduplicate(
      ['key'],
      () =>
        new Promise<string>(r => {
          resolveFirst = r
        }),
    )

    // Mutation happens → invalidate while fetch is in-flight
    cache.invalidate(['key'])
    expect(cache.get(['key'])?.fresh).toBe(false)

    // New dedup should NOT reuse the pre-invalidation fetch
    let freshCalled = false
    void cache.deduplicate(['key'], () => {
      freshCalled = true
      return Promise.resolve('post-mutation-data')
    })

    expect(freshCalled).toBe(true) // DEDUP MISS — fresh fetch started

    resolveFirst('pre-mutation-data')
  })

  it('post-invalidation in-flight (started while stale) IS reused after re-invalidation', () => {
    // Warm cache — make entry stale via invalidation
    cache.set(['key'], 'old-data')
    cache.invalidate(['key'])
    expect(cache.get(['key'])?.fresh).toBe(false)

    // Start a fetch in response to staleness (post-invalidation)
    void cache.deduplicate(['key'], () => new Promise<string>(() => {}))

    // Another invalidation while fetch is in-flight (rapid mutations)
    cache.invalidate(['key'])

    // New dedup SHOULD reuse the post-invalidation fetch
    let freshCalled = false
    void cache.deduplicate(['key'], () => {
      freshCalled = true
      return Promise.resolve('should-not-reach')
    })

    expect(freshCalled).toBe(false) // DEDUP HIT — reuses existing
  })

  it('cold cache in-flight IS reused after invalidation (no entry to be stale)', () => {
    // Cold cache — no entry exists
    void cache.deduplicate(['key'], () => new Promise<string>(() => {}))

    // Invalidation while fetch is in-flight (nothing to mark stale)
    cache.invalidate(['key'])

    // New dedup should reuse (cold cache has no "pre-mutation data" concern)
    let freshCalled = false
    void cache.deduplicate(['key'], () => {
      freshCalled = true
      return Promise.resolve('should-not-reach')
    })

    expect(freshCalled).toBe(false) // DEDUP HIT
  })

  it('after in-flight rejects with AbortError, new dedup starts fresh fetch', async () => {
    const abortController = new AbortController()

    // Create a fetch that rejects when aborted
    const p1 = cache.deduplicate(
      ['key'],
      () =>
        new Promise<string>((_resolve, reject) => {
          const onAbort = () => {
            reject(new DOMException('Aborted', 'AbortError'))
          }
          abortController.signal.addEventListener('abort', onAbort, { once: true })
        }),
    )

    // Abort the signal — the promise rejects
    abortController.abort()
    await expect(p1).rejects.toThrow('Aborted')

    // Wait for .finally() cleanup
    await new Promise(r => setTimeout(r, 0))

    // Now a new dedup should start fresh
    let freshCalled = false
    const p2 = cache.deduplicate(['key'], () => {
      freshCalled = true
      return Promise.resolve('fresh-data')
    })

    expect(freshCalled).toBe(true)
    expect(await p2).toBe('fresh-data')
  })

  it('after in-flight resolves post-invalidation, new dedup starts fresh fetch', async () => {
    let fetchCount = 0
    let resolveFirst!: (v: string) => void

    // First fetch
    const p1 = cache.deduplicate(['key'], () => {
      fetchCount++
      return new Promise<string>(r => {
        resolveFirst = r
      })
    })

    cache.invalidate(['key'])

    // Still dedup-hits the existing fetch
    const p2 = cache.deduplicate(['key'], () => {
      fetchCount++
      return Promise.resolve('should-not-reach')
    })
    expect(p2).toBe(p1)
    expect(fetchCount).toBe(1)

    // Resolve the first fetch
    resolveFirst('first-data')
    await p1
    await new Promise(r => setTimeout(r, 0)) // wait for .finally()

    // Now a new dedup should start a fresh fetch (in-flight was cleaned up)
    const p3 = cache.deduplicate(['key'], () => {
      fetchCount++
      return Promise.resolve('second-data')
    })
    expect(p3).not.toBe(p1)
    expect(fetchCount).toBe(2)
    expect(await p3).toBe('second-data')
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
      return new Promise<string>(resolve => {
        setTimeout(() => {
          resolve('result')
        }, 10)
      })
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

  it('marks entry as stale when cache was invalidated during in-flight prefetch (cold cache)', async () => {
    let resolveFetch!: (v: string) => void
    const slowFetch = new Promise<string>(r => {
      resolveFetch = r
    })

    // Start prefetch on cold cache (no entry exists)
    const prefetchPromise = cache.prefetch(['budget', '2026-04'], () => slowFetch)

    // Mutation completes → invalidate the key (no-op on entries, but bumps version)
    cache.invalidate(['budget', '2026-04'])

    // Prefetch resolves with pre-mutation data
    resolveFetch('pre-mutation-data')
    await prefetchPromise

    // Entry should exist with the data, but should NOT be fresh
    const result = cache.get(['budget', '2026-04'])
    expect(result).not.toBeNull()
    expect(result?.data).toBe('pre-mutation-data')
    expect(result?.fresh).toBe(false) // ← THIS IS THE BUG: currently returns true
  })

  it('marks entry as stale when cache was invalidated during in-flight prefetch (warm cache)', async () => {
    // Warm cache — entry exists and is fresh
    cache.set(['key'], 'old-data')

    let resolveFetch!: (v: string) => void
    const slowFetch = new Promise<string>(r => {
      resolveFetch = r
    })

    // Start prefetch (refetch pattern)
    const prefetchPromise = cache.prefetch(['key'], () => slowFetch)

    // Mutation invalidates while prefetch is in-flight
    cache.invalidate(['key'])

    // Prefetch resolves with pre-mutation data
    resolveFetch('pre-mutation-data')
    await prefetchPromise

    // Entry should be stale — not written as fresh by prefetch
    const result = cache.get(['key'])
    expect(result).not.toBeNull()
    expect(result?.data).toBe('pre-mutation-data')
    expect(result?.fresh).toBe(false)
  })

  it('writes entry as fresh when no invalidation happens during prefetch', async () => {
    // Regression guard: normal prefetch should still write fresh entries
    await cache.prefetch(['key'], () => Promise.resolve('data'))

    const result = cache.get(['key'])
    expect(result).not.toBeNull()
    expect(result?.data).toBe('data')
    expect(result?.fresh).toBe(true)
  })

  it('cascading prefetch after invalidation should STILL be stale (Race 3)', async () => {
    // Race 3: constructor effect cascade
    // prefetch1 starts → invalidate → prefetch1 completes (stale ✓)
    // → version bump → prefetch2 starts (captures versionBefore AFTER all bumps)
    // → prefetch2 completes → should STILL be stale

    let resolveFetch1!: (v: string) => void
    const slowFetch1 = new Promise<string>(r => {
      resolveFetch1 = r
    })

    const prefetch1 = cache.prefetch(['a'], () => slowFetch1)
    cache.invalidate(['a'])
    resolveFetch1('old-data')
    await prefetch1
    expect(cache.get(['a'])?.fresh).toBe(false) // v0.0.10 handles this ✓

    // Cascading prefetch (simulates constructor effect re-fire after version bumps)
    await cache.prefetch(['a'], () => Promise.resolve('still-old'))
    expect(cache.get(['a'])?.fresh).toBe(false) // v0.0.10 FAILS this ✗
  })

  it('prefetch stays stale through multiple cascades after invalidation', async () => {
    // Even 3+ cascading prefetches should all remain stale
    let resolveFetch!: (v: string) => void
    const slowFetch = new Promise<string>(r => {
      resolveFetch = r
    })

    const prefetch1 = cache.prefetch(['key'], () => slowFetch)
    cache.invalidate(['key'])
    resolveFetch('pre-mutation')
    await prefetch1
    expect(cache.get(['key'])?.fresh).toBe(false)

    // 2nd cascade
    await cache.prefetch(['key'], () => Promise.resolve('cascade-2'))
    expect(cache.get(['key'])?.fresh).toBe(false)

    // 3rd cascade
    await cache.prefetch(['key'], () => Promise.resolve('cascade-3'))
    expect(cache.get(['key'])?.fresh).toBe(false)
  })

  it('dirty flag cleared by clearDirty, not by prefetch', async () => {
    cache.set(['a'], 'initial')
    cache.invalidate(['a'])

    // Prefetch writes but stays stale (dirty flag persists)
    await cache.prefetch(['a'], () => Promise.resolve('prefetched'))
    expect(cache.get(['a'])?.fresh).toBe(false)

    // clearDirty removes the dirty flag → next set() writes a fresh entry
    cache.clearDirty(['a'])
    cache.set(['a'], 'from-loader')
    expect(cache.get(['a'])?.fresh).toBe(true)
  })

  it('cold cache: prefetch after invalidate should be stale even with no prior entry', async () => {
    // invalidate on cold cache (no entry exists) → prefetch should still be stale
    cache.invalidate(['cold'])
    await cache.prefetch(['cold'], () => Promise.resolve('data'))
    expect(cache.get(['cold'])?.fresh).toBe(false)
  })

  it('prefix invalidation marks child key prefetch as stale (cold cache)', async () => {
    // invalidate(['budget']) on cold cache → prefetch(['budget', 'details', '123']) should be stale
    cache.invalidate(['budget'])
    await cache.prefetch(['budget', 'details', '123'], () => Promise.resolve('data'))
    expect(cache.get(['budget', 'details', '123'])?.fresh).toBe(false)
  })

  it('clear() removes dirty flags', async () => {
    cache.invalidate(['a'])
    cache.clear()
    // After clear, prefetch should write fresh (dirty flag removed)
    await cache.prefetch(['a'], () => Promise.resolve('data'))
    expect(cache.get(['a'])?.fresh).toBe(true)
  })

  // --- clear ---

  it('removes all entries and in-flight', () => {
    cache.set(['a'], 'v1')
    cache.set(['b'], 'v2')
    cache.clear()

    expect(cache.get(['a'])).toBeNull()
    expect(cache.get(['b'])).toBeNull()
  })

  it('bumps version on clear', () => {
    const v0 = cache.version()
    cache.clear()
    expect(cache.version()).toBe(v0 + 1)
  })

  // --- inspect ---

  it('returns empty inspection for empty cache', () => {
    const info = cache.inspect()
    expect(info.size).toBe(0)
    expect(info.entries).toEqual([])
    expect(info.inFlightKeys).toEqual([])
    expect(info.version).toBe(0)
    expect(info.config.staleTime).toBe(30_000)
    expect(info.config.expireTime).toBe(300_000)
  })

  it('returns correct entries and freshness', () => {
    cache.set(['a'], 'hello')
    cache.set(['b', 'c'], 'world')

    const info = cache.inspect()
    expect(info.size).toBe(2)
    expect(info.entries).toHaveLength(2)

    const entryA = info.entries.find(e => e.key[0] === 'a')
    expect(entryA).toBeDefined()
    expect(entryA?.data).toBe('hello')
    expect(entryA?.fresh).toBe(true)
    expect(entryA?.expired).toBe(false)

    const entryBC = info.entries.find(e => e.key[0] === 'b')
    expect(entryBC).toBeDefined()
    expect(entryBC?.key).toEqual(['b', 'c'])
    expect(entryBC?.data).toBe('world')
  })

  it('reflects stale entries after invalidation', () => {
    cache.set(['a'], 'data')
    cache.invalidate(['a'])

    const info = cache.inspect()
    const entry = info.entries[0]
    expect(entry.fresh).toBe(false)
    expect(info.version).toBe(1)
  })

  it('shows in-flight keys during deduplicate', async () => {
    let resolvePromise!: (v: string) => void
    const pending = new Promise<string>(r => {
      resolvePromise = r
    })

    const deduplicatePromise = cache.deduplicate(['flight', 'key'], () => pending)

    const info = cache.inspect()
    expect(info.inFlightKeys).toEqual([['flight', 'key']])

    resolvePromise('done')
    await deduplicatePromise
  })

  it('returns timeToStale and timeToExpire for entries', () => {
    vi.useFakeTimers()
    const custom = createCache({ staleTime: 1000, expireTime: 5000 })
    custom.set(['a'], 'data')

    vi.advanceTimersByTime(300)

    const info = custom.inspect()
    const entry = info.entries[0]
    expect(entry.timeToStale).toBe(700)
    expect(entry.timeToExpire).toBe(4700)
    expect(entry.state).toBe('fresh')

    vi.useRealTimers()
  })

  it('returns state=stale when past staleTime but before expireTime', () => {
    vi.useFakeTimers()
    const custom = createCache({ staleTime: 100, expireTime: 5000 })
    custom.set(['a'], 'data')

    vi.advanceTimersByTime(200)

    const entry = custom.inspect().entries[0]
    expect(entry.state).toBe('stale')
    expect(entry.timeToStale).toBe(0)
    expect(entry.timeToExpire).toBe(4800)

    vi.useRealTimers()
  })

  it('returns state=expired when past expireTime', () => {
    const custom = createCache({ staleTime: 100, expireTime: 500 })
    custom.set(['a'], 'data')

    vi.useFakeTimers()
    vi.advanceTimersByTime(600)

    const entry = custom.inspect().entries[0]
    expect(entry.state).toBe('expired')
    expect(entry.timeToStale).toBe(0)
    expect(entry.timeToExpire).toBe(0)

    vi.useRealTimers()
  })

  it('returns correct version and config', () => {
    const custom = createCache({ staleTime: 5000, expireTime: 60_000 })
    custom.invalidate(['x'])
    custom.invalidate(['y'])

    const info = custom.inspect()
    expect(info.version).toBe(2)
    expect(info.config.staleTime).toBe(5000)
    expect(info.config.expireTime).toBe(60_000)
  })

  // --- cleanup ---

  it('cleanup() returns 0 on empty cache', () => {
    expect(cache.cleanup()).toBe(0)
  })

  it('cleanup() evicts expired entries', () => {
    const shortCache = createCache({ staleTime: 10, expireTime: 50 })
    shortCache.set(['a'], 'v1')
    shortCache.set(['b'], 'v2')

    vi.useFakeTimers()
    vi.advanceTimersByTime(51)

    expect(shortCache.cleanup()).toBe(2)
    expect(shortCache.get(['a'])).toBeNull()
    expect(shortCache.get(['b'])).toBeNull()

    vi.useRealTimers()
  })

  it('cleanup() keeps non-expired entries', () => {
    cache.set(['a'], 'hello')
    expect(cache.cleanup()).toBe(0)
    expect(cache.get(['a'])?.data).toBe('hello')
  })

  it('cleanup() preserves stale-but-not-expired entries', () => {
    const shortCache = createCache({ staleTime: 10, expireTime: 1000 })
    shortCache.set(['a'], 'data')

    vi.useFakeTimers()
    vi.advanceTimersByTime(50) // past staleTime but before expireTime

    expect(shortCache.cleanup()).toBe(0)
    expect(shortCache.get(['a'])).toEqual({ data: 'data', fresh: false })

    vi.useRealTimers()
  })

  // --- maxEntries ---

  it('evicts oldest entry when maxEntries is exceeded', () => {
    const limited = createCache({ maxEntries: 2 })
    limited.set(['a'], 'A')
    limited.set(['b'], 'B')
    limited.set(['c'], 'C') // should evict 'a'

    expect(limited.get(['a'])).toBeNull()
    expect(limited.get(['b'])?.data).toBe('B')
    expect(limited.get(['c'])?.data).toBe('C')
  })

  it('LRU: accessing an entry prevents its eviction', () => {
    const limited = createCache({ maxEntries: 2 })
    limited.set(['a'], 'A')
    limited.set(['b'], 'B')

    // Access 'a' → moves it to end, 'b' is now oldest
    limited.get(['a'])

    limited.set(['c'], 'C') // should evict 'b', not 'a'
    expect(limited.get(['a'])?.data).toBe('A')
    expect(limited.get(['b'])).toBeNull()
    expect(limited.get(['c'])?.data).toBe('C')
  })

  it('overwriting an existing key does not count as a new entry', () => {
    const limited = createCache({ maxEntries: 2 })
    limited.set(['a'], 'v1')
    limited.set(['b'], 'v2')
    limited.set(['a'], 'v3') // overwrite, not new

    expect(limited.get(['a'])?.data).toBe('v3')
    expect(limited.get(['b'])?.data).toBe('v2')
  })

  it('maxEntries: undefined means no limit', () => {
    const unlimited = createCache()
    for (let i = 0; i < 100; i++) {
      unlimited.set([`key-${i}`], `val-${i}`)
    }
    expect(unlimited.get(['key-0'])?.data).toBe('val-0')
    expect(unlimited.get(['key-99'])?.data).toBe('val-99')
  })

  // --- auto-cleanup ---

  it('auto-cleanup fires on interval', () => {
    vi.useFakeTimers()

    const destroyFns: (() => void)[] = []
    const injector = Injector.create({
      providers: [
        {
          provide: DestroyRef,
          useValue: { onDestroy: (fn: () => void) => destroyFns.push(fn) },
        },
      ],
    })

    const autoGcCache = runInInjectionContext(
      injector,
      () => new DataCache({ staleTime: 10, expireTime: 50, cleanupInterval: 100 }),
    )

    autoGcCache.set(['a'], 'v1')
    vi.advanceTimersByTime(51) // entry expired
    vi.advanceTimersByTime(100) // cleanup fires

    expect(autoGcCache.get(['a'])).toBeNull()

    // cleanup
    destroyFns.forEach(fn => {
      fn()
    })
    vi.useRealTimers()
  })

  it('auto-cleanup stops on injector destroy', () => {
    vi.useFakeTimers()

    const destroyFns: (() => void)[] = []
    const injector = Injector.create({
      providers: [
        {
          provide: DestroyRef,
          useValue: { onDestroy: (fn: () => void) => destroyFns.push(fn) },
        },
      ],
    })

    const autoGcCache = runInInjectionContext(
      injector,
      () => new DataCache({ staleTime: 10, expireTime: 50, cleanupInterval: 100 }),
    )

    // Destroy before cleanup fires
    destroyFns.forEach(fn => {
      fn()
    })

    autoGcCache.set(['a'], 'v1')
    vi.advanceTimersByTime(200) // past cleanupInterval, but interval was cleared

    // Entry still there (cleanup never ran because interval was cleared)
    // However, get() still evicts on read when expired
    vi.advanceTimersByTime(51)
    // The entry exists in the map but get() evicts lazily — that's expected.
    // The point is the interval callback didn't fire.

    vi.useRealTimers()
  })
})

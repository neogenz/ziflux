import { describe, it, expect, beforeEach } from 'vitest'
import type { ResourceStatus } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { of } from 'rxjs'
import { cachedResource } from './cached-resource'
import { DataCache } from './data-cache'
import type { CachedResourceRef } from './types'

function flushMicrotasks(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0))
}

async function waitForStatus(
  ref: CachedResourceRef<unknown>,
  targetStatus: ResourceStatus,
  maxAttempts = 100,
): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    if (ref.status() === targetStatus) return
    await flushMicrotasks()
    TestBed.flushEffects()
  }
  throw new Error(`Status never reached ${targetStatus}, stuck at ${ref.status()}`)
}

describe('cachedResource', () => {
  let cache: DataCache<string>

  beforeEach(() => {
    TestBed.configureTestingModule({})
    cache = TestBed.runInInjectionContext(() => new DataCache<string>())
  })

  // --- Cold cache (initial load) ---

  it('fetches from loader on cold cache', async () => {
    let loaderCalled = false

    const ref = TestBed.runInInjectionContext(() =>
      cachedResource<string, Record<string, never>>({
        cache,
        key: ['test'],
        params: () => ({}),
        loader: () => {
          loaderCalled = true
          return Promise.resolve('fetched')
        },
      }),
    )

    await waitForStatus(ref, 'resolved')
    expect(loaderCalled).toBe(true)
    expect(ref.value()).toBe('fetched')
  })

  it('populates cache after successful fetch', async () => {
    const ref = TestBed.runInInjectionContext(() =>
      cachedResource<string, Record<string, never>>({
        cache,
        key: ['test'],
        params: () => ({}),
        loader: () => Promise.resolve('data'),
      }),
    )

    await waitForStatus(ref, 'resolved')
    expect(cache.get(['test'])?.data).toBe('data')
  })

  it('isInitialLoading is true on cold cache', async () => {
    let resolveLoader!: (v: string) => void
    const loaderPromise = new Promise<string>(r => {
      resolveLoader = r
    })

    const ref = TestBed.runInInjectionContext(() =>
      cachedResource<string, Record<string, never>>({
        cache,
        key: ['test'],
        params: () => ({}),
        loader: () => loaderPromise,
      }),
    )

    await flushMicrotasks()
    TestBed.flushEffects()
    expect(ref.isInitialLoading()).toBe(true)
    expect(ref.isStale()).toBe(false)

    resolveLoader('data')
    await waitForStatus(ref, 'resolved')
    expect(ref.isInitialLoading()).toBe(false)
  })

  // --- Fresh cache (skip fetch) ---

  it('returns cached data without calling loader when fresh', async () => {
    cache.set(['test'], 'cached')

    let loaderCalled = false
    const ref = TestBed.runInInjectionContext(() =>
      cachedResource<string, Record<string, never>>({
        cache,
        key: ['test'],
        params: () => ({}),
        loader: () => {
          loaderCalled = true
          return Promise.resolve('fetched')
        },
      }),
    )

    await waitForStatus(ref, 'resolved')
    expect(ref.value()).toBe('cached')
    expect(loaderCalled).toBe(false)
  })

  // --- Stale cache (SWR) ---

  it('shows stale data during revalidation', async () => {
    cache.set(['test'], 'stale-data')
    cache.invalidate(['test'])

    let resolveLoader!: (v: string) => void
    const loaderPromise = new Promise<string>(r => {
      resolveLoader = r
    })

    const ref = TestBed.runInInjectionContext(() =>
      cachedResource<string, Record<string, never>>({
        cache,
        key: ['test'],
        params: () => ({}),
        loader: () => loaderPromise,
      }),
    )

    await flushMicrotasks()
    TestBed.flushEffects()

    // During loading: should show stale data
    expect(ref.value()).toBe('stale-data')
    expect(ref.isStale()).toBe(true)
    expect(ref.isInitialLoading()).toBe(false)

    // Resolve and verify fresh data
    resolveLoader('fresh-data')
    await waitForStatus(ref, 'resolved')
    expect(ref.value()).toBe('fresh-data')
    expect(ref.isStale()).toBe(false)
  })

  // --- Dynamic keys ---

  it('uses key function to derive cache key from params', async () => {
    cache.set(['order', 'details', '42'], 'order-42')

    const ref = TestBed.runInInjectionContext(() =>
      cachedResource<string, { id: string }>({
        cache,
        key: p => ['order', 'details', p.id],
        params: () => ({ id: '42' }),
        loader: () => Promise.resolve('fetched-42'),
      }),
    )

    await waitForStatus(ref, 'resolved')
    expect(ref.value()).toBe('order-42')
  })

  // --- Idle (undefined params) ---

  it('does not load when params returns undefined', async () => {
    let loaderCalled = false

    const ref = TestBed.runInInjectionContext(() =>
      cachedResource<string, { id: string }>({
        cache,
        key: p => ['item', p.id],
        params: () => undefined,
        loader: () => {
          loaderCalled = true
          return Promise.resolve('data')
        },
      }),
    )

    await flushMicrotasks()
    await flushMicrotasks()
    TestBed.flushEffects()
    expect(ref.status()).toBe('idle')
    expect(ref.value()).toBeUndefined()
    expect(loaderCalled).toBe(false)
  })

  // --- Observable loader ---

  it('handles Observable-based loader', async () => {
    const ref = TestBed.runInInjectionContext(() =>
      cachedResource<string, Record<string, never>>({
        cache,
        key: ['test'],
        params: () => ({}),
        loader: () => of('from-observable'),
      }),
    )

    await waitForStatus(ref, 'resolved')
    expect(ref.value()).toBe('from-observable')
  })

  // --- Deduplication ---

  it('deduplicates concurrent fetches for same key', async () => {
    let fetchCount = 0

    const ref = TestBed.runInInjectionContext(() =>
      cachedResource<string, Record<string, never>>({
        cache,
        key: ['test'],
        params: () => ({}),
        loader: () => {
          fetchCount++
          return new Promise(r => setTimeout(() => r('data'), 10))
        },
      }),
    )

    // Also prefetch the same key concurrently
    const prefetchPromise = cache.prefetch(['test'], () => {
      fetchCount++
      return new Promise(r => setTimeout(() => r('data'), 10))
    })

    await prefetchPromise
    await waitForStatus(ref, 'resolved')
    expect(fetchCount).toBe(1)
  })

  // --- set / update ---

  it('set() overrides the value', async () => {
    const ref = TestBed.runInInjectionContext(() =>
      cachedResource<string, Record<string, never>>({
        cache,
        key: ['test'],
        params: () => ({}),
        loader: () => Promise.resolve('original'),
      }),
    )

    await waitForStatus(ref, 'resolved')
    ref.set('overridden')
    TestBed.flushEffects()
    expect(ref.value()).toBe('overridden')
  })

  it('update() transforms the value', async () => {
    const ref = TestBed.runInInjectionContext(() =>
      cachedResource<string, Record<string, never>>({
        cache,
        key: ['test'],
        params: () => ({}),
        loader: () => Promise.resolve('hello'),
      }),
    )

    await waitForStatus(ref, 'resolved')
    ref.update(v => (v ?? '') + ' world')
    TestBed.flushEffects()
    expect(ref.value()).toBe('hello world')
  })

  // --- hasValue ---

  it('hasValue() returns false before load, true after', async () => {
    const ref = TestBed.runInInjectionContext(() =>
      cachedResource<string, Record<string, never>>({
        cache,
        key: ['test'],
        params: () => ({}),
        loader: () => Promise.resolve('data'),
      }),
    )

    expect(ref.hasValue()).toBe(false)

    await waitForStatus(ref, 'resolved')
    expect(ref.hasValue()).toBe(true)
  })

  // --- per-resource staleTime ---

  it('respects per-resource staleTime override', async () => {
    cache.set(['test'], 'cached')

    // Wait for the entry to exceed the per-resource staleTime of 50ms
    await new Promise(r => setTimeout(r, 60))

    let loaderCalled = false
    const ref = TestBed.runInInjectionContext(() =>
      cachedResource<string, Record<string, never>>({
        cache,
        key: ['test'],
        params: () => ({}),
        loader: () => {
          loaderCalled = true
          return Promise.resolve('fresh')
        },
        staleTime: 50, // entry is stale after 50ms (we waited 60ms)
      }),
    )

    await waitForStatus(ref, 'resolved')
    expect(loaderCalled).toBe(true)
  })

  // --- error handling ---

  it('transitions to error on loader failure', async () => {
    const ref = TestBed.runInInjectionContext(() =>
      cachedResource<string, Record<string, never>>({
        cache,
        key: ['test'],
        params: () => ({}),
        loader: () => Promise.reject(new Error('network error')),
      }),
    )

    await waitForStatus(ref, 'error')
    expect(ref.error()).toBeInstanceOf(Error)
    expect((ref.error() as Error).message).toBe('network error')
  })

  // --- destroy ---

  it('destroy() stops the resource', async () => {
    const ref = TestBed.runInInjectionContext(() =>
      cachedResource<string, Record<string, never>>({
        cache,
        key: ['test'],
        params: () => ({}),
        loader: () => Promise.resolve('data'),
      }),
    )

    ref.destroy()
    await flushMicrotasks()
    TestBed.flushEffects()
    expect(ref.status()).toBe('idle')
  })
})

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { signal, type ResourceStatus } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { of, throwError } from 'rxjs'
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
    TestBed.tick()
  }
  throw new Error(`Status never reached ${targetStatus}, stuck at ${ref.status()}`)
}

describe('cachedResource', () => {
  let cache: DataCache

  beforeEach(() => {
    TestBed.configureTestingModule({})
    cache = TestBed.runInInjectionContext(() => new DataCache())
  })

  // --- Cold cache (initial load) ---

  it('fetches from loader on cold cache', async () => {
    let loaderCalled = false

    const ref = TestBed.runInInjectionContext(() =>
      cachedResource<string, Record<string, never>>({
        cache,
        cacheKey: ['test'],
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
        cacheKey: ['test'],
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
        cacheKey: ['test'],
        params: () => ({}),
        loader: () => loaderPromise,
      }),
    )

    await flushMicrotasks()
    TestBed.tick()
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
        cacheKey: ['test'],
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
        cacheKey: ['test'],
        params: () => ({}),
        loader: () => loaderPromise,
      }),
    )

    await flushMicrotasks()
    TestBed.tick()

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

  it('uses cacheKey function to derive cache key from params', async () => {
    cache.set(['order', 'details', '42'], 'order-42')

    const ref = TestBed.runInInjectionContext(() =>
      cachedResource<string, { id: string }>({
        cache,
        cacheKey: p => ['order', 'details', p.id],
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
        cacheKey: p => ['item', p.id],
        params: () => undefined,
        loader: () => {
          loaderCalled = true
          return Promise.resolve('data')
        },
      }),
    )

    await flushMicrotasks()
    await flushMicrotasks()
    TestBed.tick()
    expect(ref.status()).toBe('idle')
    expect(ref.value()).toBeUndefined()
    expect(loaderCalled).toBe(false)
  })

  // --- Omitted params ---

  it('loads immediately when params is omitted', async () => {
    const ref = TestBed.runInInjectionContext(() =>
      cachedResource<string, Record<string, never>>({
        cache,
        cacheKey: ['no-params'],
        loader: () => Promise.resolve('loaded'),
      }),
    )
    await waitForStatus(ref, 'resolved')
    expect(ref.value()).toBe('loaded')
  })

  // --- Observable loader ---

  it('handles Observable-based loader', async () => {
    const ref = TestBed.runInInjectionContext(() =>
      cachedResource<string, Record<string, never>>({
        cache,
        cacheKey: ['test'],
        params: () => ({}),
        loader: () => of('from-observable'),
      }),
    )

    await waitForStatus(ref, 'resolved')
    expect(ref.value()).toBe('from-observable')
  })

  it('captures Observable loader error in error signal', async () => {
    const boom = new Error('observable boom')
    const ref = TestBed.runInInjectionContext(() =>
      cachedResource<string, Record<string, never>>({
        cache,
        cacheKey: ['obs-error'],
        params: () => ({}),
        loader: () => throwError(() => boom),
      }),
    )

    await waitForStatus(ref, 'error')
    expect(ref.error()).toBe(boom)
    expect(ref.value()).toBeUndefined()
  })

  // --- Deduplication ---

  it('deduplicates concurrent fetches for same key', async () => {
    let fetchCount = 0

    const ref = TestBed.runInInjectionContext(() =>
      cachedResource<string, Record<string, never>>({
        cache,
        cacheKey: ['test'],
        params: () => ({}),
        loader: () => {
          fetchCount++
          return new Promise<string>(r => {
            setTimeout(() => {
              r('data')
            }, 10)
          })
        },
      }),
    )

    // Also prefetch the same key concurrently
    const prefetchPromise = cache.prefetch(['test'], () => {
      fetchCount++
      return new Promise<string>(r => {
        setTimeout(() => {
          r('data')
        }, 10)
      })
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
        cacheKey: ['test'],
        params: () => ({}),
        loader: () => Promise.resolve('original'),
      }),
    )

    await waitForStatus(ref, 'resolved')
    ref.set('overridden')
    TestBed.tick()
    expect(ref.value()).toBe('overridden')
  })

  it('update() transforms the value', async () => {
    const ref = TestBed.runInInjectionContext(() =>
      cachedResource<string, Record<string, never>>({
        cache,
        cacheKey: ['test'],
        params: () => ({}),
        loader: () => Promise.resolve('hello'),
      }),
    )

    await waitForStatus(ref, 'resolved')
    ref.update(v => (v ?? '') + ' world')
    TestBed.tick()
    expect(ref.value()).toBe('hello world')
  })

  // --- update / set during non-resolved states ---

  it('update() receives stale data during SWR revalidation (not undefined)', async () => {
    cache.set(['test'], 'stale-data')
    cache.invalidate(['test'])

    let resolveLoader!: (v: string) => void
    const loaderPromise = new Promise<string>(r => {
      resolveLoader = r
    })

    const ref = TestBed.runInInjectionContext(() =>
      cachedResource<string, Record<string, never>>({
        cache,
        cacheKey: ['test'],
        params: () => ({}),
        loader: () => loaderPromise,
      }),
    )

    await flushMicrotasks()
    TestBed.tick()

    // Verify SWR state: stale data visible, resource is loading
    expect(ref.value()).toBe('stale-data')
    expect(ref.isStale()).toBe(true)

    // Core bug assertion: updater must receive 'stale-data', not undefined
    let receivedValue: string | undefined
    ref.update(current => {
      receivedValue = current
      return (current ?? '') + '-updated'
    })
    TestBed.tick()

    expect(receivedValue).toBe('stale-data')
    expect(ref.value()).toBe('stale-data-updated')
    expect(ref.status()).toBe('local')

    // Cleanup: resolve the pending loader
    resolveLoader('fresh-data')
  })

  it('update() receives undefined during initial loading (cold cache)', async () => {
    let resolveLoader!: (v: string) => void
    const loaderPromise = new Promise<string>(r => {
      resolveLoader = r
    })

    const ref = TestBed.runInInjectionContext(() =>
      cachedResource<string, Record<string, never>>({
        cache,
        cacheKey: ['test'],
        params: () => ({}),
        loader: () => loaderPromise,
      }),
    )

    await flushMicrotasks()
    TestBed.tick()

    expect(ref.isInitialLoading()).toBe(true)

    let receivedValue: string | undefined = 'sentinel'
    ref.update(current => {
      receivedValue = current
      return current ?? 'fallback'
    })
    TestBed.tick()

    expect(receivedValue).toBeUndefined()
    expect(ref.value()).toBe('fallback')
    expect(ref.status()).toBe('local')

    // Cleanup: resolve the pending loader
    resolveLoader('data')
  })

  it('update() after invalidate() on resolved resource works', async () => {
    const ref = TestBed.runInInjectionContext(() =>
      cachedResource<string, Record<string, never>>({
        cache,
        cacheKey: ['test'],
        params: () => ({}),
        loader: () => Promise.resolve('original'),
      }),
    )

    await waitForStatus(ref, 'resolved')
    expect(ref.value()).toBe('original')

    // Invalidate — resource transitions to loading, stale data available
    cache.invalidate(['test'])
    await flushMicrotasks()
    TestBed.tick()

    ref.update(current => (current ?? '') + '-updated')
    TestBed.tick()

    expect(ref.value()).toBe('original-updated')
  })

  it('in-flight loader does not overwrite optimistic cache entry', async () => {
    cache.set(['test'], 'cached-data')
    cache.invalidate(['test'])

    let resolveLoader!: (v: string) => void
    const loaderPromise = new Promise<string>(r => {
      resolveLoader = r
    })

    const ref = TestBed.runInInjectionContext(() =>
      cachedResource<string, Record<string, never>>({
        cache,
        cacheKey: ['test'],
        params: () => ({}),
        loader: () => loaderPromise,
      }),
    )

    await flushMicrotasks()
    TestBed.tick()

    // During SWR: stale data visible, loader in-flight
    expect(ref.isStale()).toBe(true)

    // Optimistic update while loader is in-flight
    ref.set('optimistic')
    TestBed.tick()
    expect(ref.value()).toBe('optimistic')

    // Loader resolves with pre-mutation data
    resolveLoader('old-server-data')
    await flushMicrotasks()
    TestBed.tick()
    await flushMicrotasks()
    TestBed.tick()

    // Cache should still have 'optimistic', not 'old-server-data'
    expect(cache.get(['test'])?.data).toBe('optimistic')
    // Value should still be 'optimistic'
    expect(ref.value()).toBe('optimistic')
  })

  it('set() works during SWR revalidation', async () => {
    cache.set(['test'], 'stale-data')
    cache.invalidate(['test'])

    let resolveLoader!: (v: string) => void
    const loaderPromise = new Promise<string>(r => {
      resolveLoader = r
    })

    const ref = TestBed.runInInjectionContext(() =>
      cachedResource<string, Record<string, never>>({
        cache,
        cacheKey: ['test'],
        params: () => ({}),
        loader: () => loaderPromise,
      }),
    )

    await flushMicrotasks()
    TestBed.tick()

    expect(ref.isStale()).toBe(true)

    ref.set('optimistic-value')
    TestBed.tick()

    expect(ref.value()).toBe('optimistic-value')
    expect(ref.status()).toBe('local')

    // Cleanup: resolve the pending loader
    resolveLoader('fresh-data')
  })

  it('update() during error state with stale snapshot receives stale data', async () => {
    cache.set(['test'], 'cached-data')
    cache.invalidate(['test'])

    const ref = TestBed.runInInjectionContext(() =>
      cachedResource<string, Record<string, never>>({
        cache,
        cacheKey: ['test'],
        params: () => ({}),
        loader: () => Promise.reject(new Error('network error')),
      }),
    )

    await waitForStatus(ref, 'error')

    // value() should return stale data on error
    expect(ref.value()).toBe('cached-data')

    // update() should also receive stale data
    let receivedValue: string | undefined
    ref.update(current => {
      receivedValue = current
      return (current ?? '') + '-patched'
    })
    TestBed.tick()

    expect(receivedValue).toBe('cached-data')
    expect(ref.value()).toBe('cached-data-patched')
  })

  it('multiple update() calls during revalidation chain correctly', async () => {
    cache.set(['test'], 'v0')
    cache.invalidate(['test'])

    let resolveLoader!: (v: string) => void
    const loaderPromise = new Promise<string>(r => {
      resolveLoader = r
    })

    const ref = TestBed.runInInjectionContext(() =>
      cachedResource<string, Record<string, never>>({
        cache,
        cacheKey: ['test'],
        params: () => ({}),
        loader: () => loaderPromise,
      }),
    )

    await flushMicrotasks()
    TestBed.tick()

    ref.update(v => (v ?? '') + '-a')
    TestBed.tick()
    ref.update(v => (v ?? '') + '-b')
    TestBed.tick()

    expect(ref.value()).toBe('v0-a-b')
    expect(ref.status()).toBe('local')

    // Cleanup: resolve the pending loader
    resolveLoader('fresh')
  })

  it('update() survives cache version bump from unrelated invalidation', async () => {
    const ref = TestBed.runInInjectionContext(() =>
      cachedResource<string, { id: string }>({
        cache,
        cacheKey: p => ['details', p.id],
        params: () => ({ id: '1' }),
        loader: () => Promise.resolve('original'),
      }),
    )

    await waitForStatus(ref, 'resolved')
    expect(ref.value()).toBe('original')

    // Optimistic update
    ref.update(v => (v ?? '') + '-optimistic')
    TestBed.tick()
    expect(ref.value()).toBe('original-optimistic')

    // Seed an unrelated key and invalidate it → bumps cache.version()
    cache.set(['list'], 'list-data')
    cache.invalidate(['list'])

    // Flush so the resource reacts to the version bump
    await flushMicrotasks()
    TestBed.tick()
    await flushMicrotasks()
    TestBed.tick()

    // Value must still be the optimistic value, not reverted to 'original'
    expect(ref.value()).toBe('original-optimistic')
  })

  it('update() on idle resource (undefined params) receives undefined', async () => {
    const ref = TestBed.runInInjectionContext(() =>
      cachedResource<string, { id: string }>({
        cache,
        cacheKey: p => ['item', p.id],
        params: () => undefined,
        loader: () => Promise.resolve('data'),
      }),
    )

    await flushMicrotasks()
    TestBed.tick()

    expect(ref.status()).toBe('idle')

    let receivedValue: string | undefined = 'sentinel'
    ref.update(current => {
      receivedValue = current
      return current ?? 'idle-fallback'
    })
    TestBed.tick()

    expect(receivedValue).toBeUndefined()
    expect(ref.value()).toBe('idle-fallback')
  })

  // --- hasValue ---

  it('hasValue() returns false before load, true after', async () => {
    const ref = TestBed.runInInjectionContext(() =>
      cachedResource<string, Record<string, never>>({
        cache,
        cacheKey: ['test'],
        params: () => ({}),
        loader: () => Promise.resolve('data'),
      }),
    )

    expect(ref.hasValue()).toBe(false)

    await waitForStatus(ref, 'resolved')
    expect(ref.hasValue()).toBe(true)
  })

  // --- per-resource staleTime ---

  it('staleTime: 0 overrides cache default — data is always stale', async () => {
    cache.set(['test-zero'], 'cached-data')

    let loaderCalled = false
    const ref = TestBed.runInInjectionContext(() =>
      cachedResource<string, Record<string, never>>({
        cache,
        cacheKey: ['test-zero'],
        params: () => ({}),
        loader: () => {
          loaderCalled = true
          return Promise.resolve('fresh-data')
        },
        staleTime: 0,
      }),
    )

    await waitForStatus(ref, 'resolved')
    expect(loaderCalled).toBe(true)
    expect(ref.value()).toBe('fresh-data')
  })

  it('respects per-resource staleTime override', async () => {
    vi.useFakeTimers()
    try {
      cache.set(['test'], 'cached')

      // Wait for the entry to exceed the per-resource staleTime of 50ms
      await vi.advanceTimersByTimeAsync(200)

      let loaderCalled = false
      TestBed.runInInjectionContext(() =>
        cachedResource<string, Record<string, never>>({
          cache,
          cacheKey: ['test'],
          params: () => ({}),
          loader: () => {
            loaderCalled = true
            return Promise.resolve('fresh')
          },
          staleTime: 50, // entry is stale after 50ms (we waited 60ms)
        }),
      )

      // Advance to let the loader Promise.resolve() chain complete
      await vi.advanceTimersByTimeAsync(10)
      TestBed.tick()
      await vi.advanceTimersByTimeAsync(0)
      expect(loaderCalled).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })

  // --- error handling ---

  it('transitions to error on loader failure', async () => {
    const ref = TestBed.runInInjectionContext(() =>
      cachedResource<string, Record<string, never>>({
        cache,
        cacheKey: ['test'],
        params: () => ({}),
        loader: () => Promise.reject(new Error('network error')),
      }),
    )

    await waitForStatus(ref, 'error')
    expect(ref.error()).toBeInstanceOf(Error)
    expect((ref.error() as Error).message).toBe('network error')
  })

  it('preserves stale value on revalidation error', async () => {
    cache.set(['test'], 'cached-data')
    cache.invalidate(['test'])

    const ref = TestBed.runInInjectionContext(() =>
      cachedResource<string, Record<string, never>>({
        cache,
        cacheKey: ['test'],
        params: () => ({}),
        loader: () => Promise.reject(new Error('network error')),
      }),
    )

    await waitForStatus(ref, 'error')
    expect(ref.value()).toBe('cached-data')
    expect(ref.error()).toBeInstanceOf(Error)
    expect(ref.hasValue()).toBe(true)
  })

  it('returns undefined on error with cold cache', async () => {
    const ref = TestBed.runInInjectionContext(() =>
      cachedResource<string, Record<string, never>>({
        cache,
        cacheKey: ['test'],
        params: () => ({}),
        loader: () => Promise.reject(new Error('network error')),
      }),
    )

    await waitForStatus(ref, 'error')
    expect(ref.value()).toBeUndefined()
    expect(ref.error()).toBeInstanceOf(Error)
    expect(ref.hasValue()).toBe(false)
  })

  it('shows stale data during revalidation then preserves it on error', async () => {
    cache.set(['test'], 'cached-data')
    cache.invalidate(['test'])

    let rejectLoader!: (e: Error) => void
    let loaderPromise = new Promise<string>((_resolve, reject) => {
      rejectLoader = reject
    })

    const ref = TestBed.runInInjectionContext(() =>
      cachedResource<string, Record<string, never>>({
        cache,
        cacheKey: ['test'],
        params: () => ({}),
        loader: () => loaderPromise,
      }),
    )

    await flushMicrotasks()
    TestBed.tick()

    // During revalidation: stale data visible
    expect(ref.value()).toBe('cached-data')

    // Reject → error state
    rejectLoader(new Error('network error'))
    await waitForStatus(ref, 'error')

    // After error: stale data still visible
    expect(ref.value()).toBe('cached-data')

    // Reload with a succeeding loader
    loaderPromise = Promise.resolve('fresh-data')
    ref.reload()
    await waitForStatus(ref, 'resolved')
    expect(ref.value()).toBe('fresh-data')
    expect(ref.error()).toBeUndefined()
  })

  it('error then successful reload transitions to fresh data', async () => {
    cache.set(['test'], 'cached-data')
    cache.invalidate(['test'])

    let shouldReject = true

    const ref = TestBed.runInInjectionContext(() =>
      cachedResource<string, Record<string, never>>({
        cache,
        cacheKey: ['test'],
        params: () => ({}),
        loader: () =>
          shouldReject ? Promise.reject(new Error('network error')) : Promise.resolve('fresh-data'),
      }),
    )

    await waitForStatus(ref, 'error')
    expect(ref.value()).toBe('cached-data')

    shouldReject = false
    ref.reload()
    await waitForStatus(ref, 'resolved')
    expect(ref.value()).toBe('fresh-data')
    expect(ref.error()).toBeUndefined()
    expect(ref.isStale()).toBe(false)
  })

  it('params change during error state transitions to new key', async () => {
    cache.set(['item', 'A'], 'data-A')
    cache.invalidate(['item', 'A'])

    const activeId = signal('A')

    const ref = TestBed.runInInjectionContext(() =>
      cachedResource<string, { id: string }>({
        cache,
        cacheKey: p => ['item', p.id],
        params: () => ({ id: activeId() }),
        loader: ({ params }) =>
          params.id === 'A' ? Promise.reject(new Error('fail-A')) : Promise.resolve('fresh-B'),
      }),
    )

    await waitForStatus(ref, 'error')
    expect(ref.value()).toBe('data-A')

    // Switch params to key B (cold cache)
    activeId.set('B')
    TestBed.tick()
    await waitForStatus(ref, 'resolved')
    expect(ref.value()).toBe('fresh-B')
    expect(ref.error()).toBeUndefined()
  })

  // --- destroy ---

  it('destroy() stops the resource', async () => {
    const ref = TestBed.runInInjectionContext(() =>
      cachedResource<string, Record<string, never>>({
        cache,
        cacheKey: ['test'],
        params: () => ({}),
        loader: () => Promise.resolve('data'),
      }),
    )

    ref.destroy()
    await flushMicrotasks()
    TestBed.tick()
    expect(ref.status()).toBe('idle')
  })

  // --- Retry ---

  describe('retry', () => {
    it.each([1, 2, 3])('retries %i times then succeeds', async retries => {
      let attempt = 0

      const ref = TestBed.runInInjectionContext(() =>
        cachedResource<string, Record<string, never>>({
          cache,
          cacheKey: [`retry-${retries}`],
          params: () => ({}),
          loader: () => {
            attempt++
            if (attempt <= retries) return Promise.reject(new Error(`fail-${attempt}`))
            return Promise.resolve('success')
          },
          retry: { maxRetries: retries, baseDelay: 1, maxDelay: 1 },
        }),
      )

      await waitForStatus(ref, 'resolved')
      expect(ref.value()).toBe('success')
      expect(attempt).toBe(retries + 1)
    })

    it('exceeds maxRetries and errors', async () => {
      const ref = TestBed.runInInjectionContext(() =>
        cachedResource<string, Record<string, never>>({
          cache,
          cacheKey: ['retry-fail'],
          params: () => ({}),
          loader: () => Promise.reject(new Error('persistent-error')),
          retry: { maxRetries: 2, baseDelay: 1, maxDelay: 1 },
        }),
      )

      await waitForStatus(ref, 'error')
      expect((ref.error() as Error).message).toBe('persistent-error')
    })

    it('retryIf returning false stops retries immediately', async () => {
      let attempt = 0

      const ref = TestBed.runInInjectionContext(() =>
        cachedResource<string, Record<string, never>>({
          cache,
          cacheKey: ['retry-if'],
          params: () => ({}),
          loader: () => {
            attempt++
            return Promise.reject(new Error('nope'))
          },
          retry: {
            maxRetries: 5,
            baseDelay: 1,
            retryIf: () => false,
          },
        }),
      )

      await waitForStatus(ref, 'error')
      expect(attempt).toBe(1) // no retries
    })

    it('retry: 3 shorthand works with default delays', async () => {
      vi.useFakeTimers()
      try {
        let attempt = 0

        const ref = TestBed.runInInjectionContext(() =>
          cachedResource<string, Record<string, never>>({
            cache,
            cacheKey: ['retry-shorthand'],
            params: () => ({}),
            loader: () => {
              attempt++
              if (attempt <= 1) return Promise.reject(new Error('fail'))
              return Promise.resolve('ok')
            },
            retry: 3, // shorthand: { maxRetries: 3, baseDelay: 1000, maxDelay: 30000 }
          }),
        )

        // Advance past all possible backoff delays (max 30s)
        await vi.advanceTimersByTimeAsync(30000)
        TestBed.tick()
        await vi.advanceTimersByTimeAsync(0)

        expect(ref.value()).toBe('ok')
        expect(attempt).toBe(2) // 1 fail + 1 success
      } finally {
        vi.useRealTimers()
      }
    })

    it('AbortSignal cancels during retry delay', async () => {
      let attempt = 0

      const ref = TestBed.runInInjectionContext(() =>
        cachedResource<string, Record<string, never>>({
          cache,
          cacheKey: ['retry-abort'],
          params: () => ({}),
          loader: () => {
            attempt++
            return Promise.reject(new Error('fail'))
          },
          retry: { maxRetries: 10, baseDelay: 50_000, maxDelay: 50_000 },
        }),
      )

      // Let first attempt fail and enter retry delay
      await flushMicrotasks()
      TestBed.tick()
      await flushMicrotasks()

      // Destroy triggers abort
      ref.destroy()
      await flushMicrotasks()
      TestBed.tick()

      // Should have only attempted once before abort stopped it
      expect(attempt).toBe(1)
    })

    it('abort during retry delay does not surface original error as resolved value', async () => {
      let attempt = 0

      const ref = TestBed.runInInjectionContext(() =>
        cachedResource<string, Record<string, never>>({
          cache,
          cacheKey: ['retry-abort-error'],
          params: () => ({}),
          loader: () => {
            attempt++
            return Promise.reject(new Error('fetch-error'))
          },
          retry: { maxRetries: 10, baseDelay: 50_000, maxDelay: 50_000 },
        }),
      )

      // Let first attempt fail and enter retry delay
      await flushMicrotasks()
      TestBed.tick()
      await flushMicrotasks()

      // Destroy triggers abort during retry delay
      ref.destroy()
      await flushMicrotasks()
      TestBed.tick()

      // Should have only attempted once — abort stops retries
      expect(attempt).toBe(1)
      // Value should never have been set (abort kills the retry chain)
      expect(ref.value()).toBeUndefined()
    })

    it('pre-aborted signal stops retry immediately (no orphaned retries)', async () => {
      // Regression: if abortSignal is already aborted when the retry delay
      // Promise constructor runs, addEventListener('abort') never fires.
      // The guard at the top of the constructor must catch this.
      let attempt = 0

      const ref = TestBed.runInInjectionContext(() =>
        cachedResource<string, Record<string, never>>({
          cache,
          cacheKey: ['retry-pre-aborted'],
          params: () => ({}),
          loader: () => {
            attempt++
            return Promise.reject(new Error('fail'))
          },
          retry: { maxRetries: 10, baseDelay: 0, maxDelay: 0 },
        }),
      )

      // Let first attempt fail — baseDelay:0 means retry delay is 0ms,
      // so the abort guard in the Promise constructor is the only defense
      await flushMicrotasks()
      TestBed.tick()
      await flushMicrotasks()

      // Destroy triggers abort — subsequent retries must not fire
      ref.destroy()
      await flushMicrotasks()
      TestBed.tick()
      await flushMicrotasks()

      // With baseDelay:0 and 10 retries, without the guard ALL retries would fire.
      // With the guard, only a small number should have executed before abort propagated.
      expect(attempt).toBeLessThanOrEqual(3)
    })

    it('clears retry timer on abort — no further attempts after destroy', async () => {
      vi.useFakeTimers()
      try {
        let attempt = 0

        const ref = TestBed.runInInjectionContext(() =>
          cachedResource<string, Record<string, never>>({
            cache,
            cacheKey: ['retry-timer-cleared'],
            params: () => ({}),
            loader: () => {
              attempt++
              return Promise.reject(new Error('fail'))
            },
            retry: { maxRetries: 10, baseDelay: 10_000, maxDelay: 10_000 },
          }),
        )

        // Let first attempt fail and enter retry delay
        await vi.advanceTimersByTimeAsync(0)
        TestBed.tick()
        await vi.advanceTimersByTimeAsync(0)

        const attemptAfterFirst = attempt

        // Destroy while still in the retry delay window
        ref.destroy()

        // Advance past the full delay — timer should have been cleared, no further attempts
        await vi.advanceTimersByTimeAsync(20_000)
        TestBed.tick()

        expect(attempt).toBe(attemptAfterFirst)
      } finally {
        vi.useRealTimers()
      }
    })
  })

  // --- Background polling ---

  describe('refetchInterval', () => {
    it('static interval triggers reload periodically', async () => {
      vi.useFakeTimers()
      try {
        let loadCount = 0

        // Short staleTime so data goes stale before poll fires
        const pollCache = TestBed.runInInjectionContext(
          () => new DataCache({ staleTime: 10, expireTime: 300_000 }),
        )

        TestBed.runInInjectionContext(() =>
          cachedResource<string, Record<string, never>>({
            cache: pollCache,
            cacheKey: ['poll-test'],
            params: () => ({}),
            loader: () => {
              loadCount++
              return Promise.resolve(`data-${loadCount}`)
            },
            refetchInterval: 50,
            staleTime: 10,
          }),
        )

        // Let initial load complete
        await vi.advanceTimersByTimeAsync(10)
        TestBed.tick()
        const afterInitial = loadCount

        // Wait for data to go stale (10ms) + at least one poll cycle (50ms)
        await vi.advanceTimersByTimeAsync(400)
        TestBed.tick()

        expect(loadCount).toBeGreaterThan(afterInitial)
      } finally {
        vi.useRealTimers()
      }
    })

    it('no polling when option absent', async () => {
      vi.useFakeTimers()
      try {
        let loadCount = 0

        TestBed.runInInjectionContext(() =>
          cachedResource<string, Record<string, never>>({
            cache,
            cacheKey: ['no-poll'],
            params: () => ({}),
            loader: () => {
              loadCount++
              return Promise.resolve('data')
            },
          }),
        )

        // Let initial load complete
        await vi.advanceTimersByTimeAsync(10)
        TestBed.tick()
        const afterInitial = loadCount

        await vi.advanceTimersByTimeAsync(400)
        TestBed.tick()

        expect(loadCount).toBe(afterInitial)
      } finally {
        vi.useRealTimers()
      }
    })

    it('false return from function stops polling', async () => {
      vi.useFakeTimers()
      try {
        let loadCount = 0

        TestBed.runInInjectionContext(() =>
          cachedResource<string, Record<string, never>>({
            cache,
            cacheKey: ['poll-false'],
            params: () => ({}),
            loader: () => {
              loadCount++
              return Promise.resolve('data')
            },
            refetchInterval: () => false,
          }),
        )

        // Let initial load complete
        await vi.advanceTimersByTimeAsync(10)
        TestBed.tick()
        const afterInitial = loadCount

        await vi.advanceTimersByTimeAsync(400)
        TestBed.tick()

        expect(loadCount).toBe(afterInitial)
      } finally {
        vi.useRealTimers()
      }
    })

    it('signal change restarts timer (no stale timers pile up)', async () => {
      vi.useFakeTimers()
      try {
        let loadCount = 0
        const interval = signal<number>(200)

        const pollCache = TestBed.runInInjectionContext(
          () => new DataCache({ staleTime: 1, expireTime: 300_000 }),
        )

        TestBed.runInInjectionContext(() =>
          cachedResource<string, Record<string, never>>({
            cache: pollCache,
            cacheKey: ['poll-signal'],
            params: () => ({}),
            loader: () => {
              loadCount++
              return Promise.resolve(`data-${loadCount}`)
            },
            refetchInterval: () => interval(),
            staleTime: 1,
          }),
        )

        // Initial load.
        await vi.advanceTimersByTimeAsync(5)
        TestBed.tick()
        const afterInitial = loadCount

        // Tighten interval — should restart timer at 50ms cadence, not pile up on top of 200ms.
        interval.set(50)
        TestBed.tick()

        // Window of ~120ms — under the old 200ms tick we'd see 0 polls, with the new 50ms cadence
        // we see at least one. Bound the upper end so a runaway timer (e.g. both 200ms and 50ms
        // running) gets caught.
        await vi.advanceTimersByTimeAsync(120)
        TestBed.tick()
        await vi.advanceTimersByTimeAsync(20)
        TestBed.tick()

        const polls = loadCount - afterInitial
        expect(polls).toBeGreaterThan(0)
        expect(polls).toBeLessThanOrEqual(5)
      } finally {
        vi.useRealTimers()
      }
    })
  })

  // --- Cross-resource optimistic sync (D-38) ---

  describe('cross-resource sync via shared cache key', () => {
    it('propagates optimistic ref.set() to a sibling resource sharing the same cacheKey', async () => {
      let loadCount = 0
      const sharedKey = ['shared', 'one']

      const refA = TestBed.runInInjectionContext(() =>
        cachedResource<string, Record<string, never>>({
          cache,
          cacheKey: sharedKey,
          params: () => ({}),
          loader: () => {
            loadCount++
            return Promise.resolve('server-data')
          },
        }),
      )
      const refB = TestBed.runInInjectionContext(() =>
        cachedResource<string, Record<string, never>>({
          cache,
          cacheKey: sharedKey,
          params: () => ({}),
          loader: () => {
            loadCount++
            return Promise.resolve('server-data')
          },
        }),
      )

      await waitForStatus(refA, 'resolved')
      await waitForStatus(refB, 'resolved')
      expect(refA.value()).toBe('server-data')
      expect(refB.value()).toBe('server-data')

      // A optimistic-sets a new value.
      refA.set('optimistic')
      TestBed.tick()

      // A's own state shows the optimistic value.
      expect(refA.value()).toBe('optimistic')

      // B (sibling sharing the same cache key) also shows the optimistic value
      // without performing any new fetch.
      expect(refB.value()).toBe('optimistic')
    })

    it('propagates optimistic ref.update() to a sibling resource', async () => {
      const sharedKey = ['shared', 'two']

      const refA = TestBed.runInInjectionContext(() =>
        cachedResource<number, Record<string, never>>({
          cache,
          cacheKey: sharedKey,
          params: () => ({}),
          loader: () => Promise.resolve(10),
        }),
      )
      const refB = TestBed.runInInjectionContext(() =>
        cachedResource<number, Record<string, never>>({
          cache,
          cacheKey: sharedKey,
          params: () => ({}),
          loader: () => Promise.resolve(10),
        }),
      )

      await waitForStatus(refA, 'resolved')
      await waitForStatus(refB, 'resolved')

      refA.update(v => (v ?? 0) + 5)
      TestBed.tick()

      expect(refA.value()).toBe(15)
      expect(refB.value()).toBe(15)
    })

    it('does not trigger a reload on the resource that performed the optimistic set', async () => {
      let loadCount = 0
      const sharedKey = ['shared', 'three']

      const refA = TestBed.runInInjectionContext(() =>
        cachedResource<string, Record<string, never>>({
          cache,
          cacheKey: sharedKey,
          params: () => ({}),
          loader: () => {
            loadCount++
            return Promise.resolve('initial')
          },
        }),
      )

      await waitForStatus(refA, 'resolved')
      const loadsAfterInitial = loadCount

      refA.set('optimistic')
      TestBed.tick()
      await flushMicrotasks()
      TestBed.tick()

      // Status must remain `local` after optimistic set: no params re-eval,
      // no reload triggered. Loader call count stays put.
      expect(refA.status()).toBe('local')
      expect(loadCount).toBe(loadsAfterInitial)
    })

    it('does not cascade reload sibling resources when a loader writes to cache', async () => {
      let loadCountA = 0
      let loadCountB = 0
      const keyA = ['cascade', 'a']
      const keyB = ['cascade', 'b']

      TestBed.runInInjectionContext(() =>
        cachedResource<string, Record<string, never>>({
          cache,
          cacheKey: keyA,
          params: () => ({}),
          loader: () => {
            loadCountA++
            return Promise.resolve('data-a')
          },
        }),
      )
      const refB = TestBed.runInInjectionContext(() =>
        cachedResource<string, Record<string, never>>({
          cache,
          cacheKey: keyB,
          params: () => ({}),
          loader: () => {
            loadCountB++
            return Promise.resolve('data-b')
          },
        }),
      )

      // Wait for both initial loads (different keys, no sharing).
      await waitForStatus(refB, 'resolved')
      await flushMicrotasks()
      TestBed.tick()

      // Each loader fired exactly once on initial load.
      // A's loader writing to cache must NOT cause B to reload (no version bump on set).
      expect(loadCountA).toBe(1)
      expect(loadCountB).toBe(1)
    })
  })
})

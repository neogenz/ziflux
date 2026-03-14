import { describe, it, expect, beforeEach, vi } from 'vitest'
import { signal, type ResourceStatus } from '@angular/core'
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
  })
})

import { describe, it, expect, beforeEach } from 'vitest'
import type { ResourceStatus } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { DataCache } from './data-cache'
import { cachedResource } from './cached-resource'
import { cachedMutation } from './cached-mutation'
import { provideZiflux } from './provide-ziflux'
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

describe('Integration — SWR lifecycle', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZiflux({ staleTime: 5000, expireTime: 60_000 })],
    })
  })

  it('provideZiflux() config flows to DataCache instances', () => {
    const cache = TestBed.runInInjectionContext(() => new DataCache<string>())
    expect(cache.staleTime).toBe(5000)
    expect(cache.expireTime).toBe(60_000)
  })

  it('cold cache → loader → cache populated → fresh on revisit', async () => {
    let loaderCalls = 0
    const cache = TestBed.runInInjectionContext(() => new DataCache<string>())

    const ref = TestBed.runInInjectionContext(() =>
      cachedResource({
        cache,
        cacheKey: ['todos'],
        params: () => ({}),
        loader: () => {
          loaderCalls++
          return Promise.resolve('server-data')
        },
      }),
    )

    await waitForStatus(ref, 'resolved')
    expect(ref.value()).toBe('server-data')
    expect(loaderCalls).toBe(1)

    // Cache should be populated and fresh
    const entry = cache.get(['todos'])
    expect(entry?.data).toBe('server-data')
    expect(entry?.fresh).toBe(true)

    // Second resource with same key should NOT call loader (fresh cache hit)
    let secondLoaderCalls = 0
    const ref2 = TestBed.runInInjectionContext(() =>
      cachedResource({
        cache,
        cacheKey: ['todos'],
        params: () => ({}),
        loader: () => {
          secondLoaderCalls++
          return Promise.resolve('should-not-reach')
        },
      }),
    )

    await waitForStatus(ref2, 'resolved')
    expect(ref2.value()).toBe('server-data')
    expect(secondLoaderCalls).toBe(0)
  })

  it('mutation → invalidation → revalidation (full SWR cycle)', async () => {
    const cache = TestBed.runInInjectionContext(() => new DataCache<string>())

    let fetchCount = 0
    const ref = TestBed.runInInjectionContext(() =>
      cachedResource({
        cache,
        cacheKey: ['items'],
        params: () => ({}),
        loader: () => {
          fetchCount++
          return Promise.resolve(fetchCount === 1 ? 'initial' : 'refreshed')
        },
      }),
    )

    await waitForStatus(ref, 'resolved')
    expect(ref.value()).toBe('initial')
    expect(fetchCount).toBe(1)

    // Mutate with invalidation
    const mutation = cachedMutation({
      cache,
      mutationFn: () => Promise.resolve('mutated'),
      invalidateKeys: () => [['items']],
    })

    await mutation.mutate()

    // After invalidation, cache entry should be stale
    const entry = cache.get(['items'])
    expect(entry?.fresh).toBe(false)

    // Wait for revalidation
    await waitForStatus(ref, 'resolved')
    expect(ref.value()).toBe('refreshed')
    expect(fetchCount).toBe(2)
  })

  it('stale data shown during revalidation (SWR behavior)', async () => {
    const cache = TestBed.runInInjectionContext(() => new DataCache<string>())

    // Pre-populate cache
    cache.set(['data'], 'cached-value')

    // Invalidate to make it stale
    cache.invalidate(['data'])
    expect(cache.get(['data'])?.fresh).toBe(false)

    let resolveLoader!: (v: string) => void
    const ref = TestBed.runInInjectionContext(() =>
      cachedResource({
        cache,
        cacheKey: ['data'],
        params: () => ({}),
        loader: () => new Promise<string>(r => (resolveLoader = r)),
      }),
    )

    // Wait for the resource to start loading with stale snapshot
    await flushMicrotasks()
    TestBed.tick()
    await flushMicrotasks()
    TestBed.tick()

    // Should show stale data during revalidation
    expect(ref.value()).toBe('cached-value')
    expect(ref.isStale()).toBe(true)
    expect(ref.isInitialLoading()).toBe(false)

    // Resolve the loader with fresh data
    resolveLoader('fresh-value')
    await waitForStatus(ref, 'resolved')
    expect(ref.value()).toBe('fresh-value')
    expect(ref.isStale()).toBe(false)
  })

  it('optimistic update + rollback on error', async () => {
    const cache = TestBed.runInInjectionContext(() => new DataCache<string[]>())

    const ref = TestBed.runInInjectionContext(() =>
      cachedResource({
        cache,
        cacheKey: ['list'],
        params: () => ({}),
        loader: () => Promise.resolve(['item-1', 'item-2']),
      }),
    )

    await waitForStatus(ref, 'resolved')
    expect(ref.value()).toEqual(['item-1', 'item-2'])

    // eslint-disable-next-line @typescript-eslint/no-invalid-void-type -- void-arg pattern for no-arg mutations
    const mutation = cachedMutation<string, void, string[] | undefined>({
      mutationFn: () => Promise.reject(new Error('server-error')),
      onMutate: () => {
        const prev = ref.value()
        // Optimistic: remove item-2
        ref.update(list => (list ? list.filter(i => i !== 'item-2') : []))
        return prev
      },
      onError: (_err, _args, context) => {
        if (context) ref.set(context)
      },
    })

    await mutation.mutate('item-2')

    // After error, value should be rolled back
    expect(ref.value()).toEqual(['item-1', 'item-2'])
    expect(mutation.status()).toBe('error')
  })
})

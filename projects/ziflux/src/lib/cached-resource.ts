import { computed, linkedSignal, resource } from '@angular/core'
import { firstValueFrom, isObservable } from 'rxjs'
import type { CachedResourceOptions, CachedResourceRef } from './types'

export function cachedResource<T, P extends object>(
  options: CachedResourceOptions<T, P>,
): CachedResourceRef<T> {
  const { cache, key, params, loader, staleTime, gcTime } = options

  const resolveKey = (p: P): string[] => (typeof key === 'function' ? key(p) : key)

  const cacheGetOptions = staleTime || gcTime ? { staleTime, gcTime } : undefined

  // Captures cached data whenever params or cache version change.
  // Used to display stale data during background revalidation.
  const staleSnapshot = linkedSignal({
    source: () => {
      const p = params?.()
      if (p === undefined) return undefined
      cache.version() // react to invalidations
      return resolveKey(p)
    },
    computation: (currentKey: string[] | undefined) => {
      if (!currentKey) return undefined as T | undefined
      const entry = cache.get(currentKey, cacheGetOptions)
      return entry ? entry.data : undefined
    },
  })

  const res = resource<T, P | undefined>({
    params: () => {
      const p = params?.()
      if (p === undefined) return undefined
      cache.version() // trigger reload on invalidation
      return p
    },
    loader: async ({ params: reqParams, abortSignal }) => {
      // Safe cast: when params() returns undefined the loader never runs,
      // so `reqParams` is guaranteed to be P at this point.
      const p = reqParams as P
      const k = resolveKey(p)
      const entry = cache.get(k, cacheGetOptions)
      if (entry?.fresh) return entry.data

      const data = await cache.deduplicate(k, async () => {
        const result = loader({ params: p, abortSignal })
        return isObservable(result) ? firstValueFrom(result) : result
      })

      cache.set(k, data)
      return data
    },
  })

  // SWR value: stale data during loading, otherwise resource value.
  const value = computed(() => {
    const status = res.status()
    if (status === 'loading' || status === 'reloading') {
      const snapshot = staleSnapshot()
      if (snapshot !== undefined) return snapshot
    }
    return res.value()
  })

  const isStale = computed(() => {
    const status = res.status()
    return (status === 'loading' || status === 'reloading') && staleSnapshot() !== undefined
  })

  const isInitialLoading = computed(
    () => res.status() === 'loading' && staleSnapshot() === undefined,
  )

  return {
    value,
    status: res.status,
    error: res.error,
    isLoading: res.isLoading,
    reload: () => res.reload(),
    destroy: () => res.destroy(),
    set: (v: T) => res.set(v),
    update: (fn: (prev: T | undefined) => T) => res.update(fn),
    hasValue: () => value() !== undefined,
    isStale,
    isInitialLoading,
  }
}

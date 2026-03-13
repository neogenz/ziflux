import { computed, effect, linkedSignal, resource } from '@angular/core'
import { firstValueFrom, isObservable } from 'rxjs'
import type { CachedResourceOptions, CachedResourceRef, RetryConfig } from './types'

const NO_VALUE = Symbol('NO_VALUE')

function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: Required<RetryConfig>,
  abortSignal: AbortSignal,
): Promise<T> {
  const attempt = (n: number): Promise<T> =>
    fn().catch((error: unknown) => {
      if (n >= config.maxRetries || !config.retryIf(error) || abortSignal.aborted) {
        throw error
      }
      const delay = Math.random() * Math.min(config.maxDelay, config.baseDelay * 2 ** n)
      return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => {
          resolve(attempt(n + 1))
        }, delay)
        abortSignal.addEventListener(
          'abort',
          () => {
            clearTimeout(timer)
            reject(error as Error)
          },
          { once: true },
        )
      })
    })
  return attempt(0)
}

function normalizeRetryConfig(retry: number | RetryConfig): Required<RetryConfig> {
  const config = typeof retry === 'number' ? { maxRetries: retry } : retry
  return {
    maxRetries: config.maxRetries,
    baseDelay: config.baseDelay ?? 1000,
    maxDelay: config.maxDelay ?? 30_000,
    retryIf: config.retryIf ?? (() => true),
  }
}

/**
 * Creates an Angular `resource()` with SWR (stale-while-revalidate) caching.
 *
 * On each `params` change or cache invalidation, previously cached data is
 * served immediately while a background fetch refreshes the entry. The loader
 * runs only when the cache entry is missing or stale.
 *
 * Supports Promises and Observables in the `loader`. Pass `retry` (number or
 * `RetryConfig`) to enable exponential-backoff retries. Pass `refetchInterval`
 * to poll in the background — the interval is reactive: if you pass a signal,
 * changing it restarts the timer automatically.
 *
 * @remarks
 * Must be called inside an injection context (constructor, `inject()` call, or
 * `runInInjectionContext()`). The underlying `resource()` and the polling
 * `effect()` are destroyed with the owning injector.
 *
 * @example
 * ```ts
 * readonly todos = cachedResource({
 *   cache: this.todoApi.cache,
 *   cacheKey: (p) => ['todos', p.userId],
 *   params: () => ({ userId: this.userId() }),
 *   loader: ({ params }) => this.http.get<Todo[]>(`/api/todos?userId=${params.userId}`),
 *   staleTime: 30_000,
 * });
 * ```
 */
export function cachedResource<T, P extends object>(
  options: CachedResourceOptions<T, P>,
): CachedResourceRef<T> {
  const { cache, cacheKey, loader, staleTime, expireTime, retry, refetchInterval } = options
  const params = options.params ?? (() => ({}) as P)

  const resolveKey = (p: P): string[] => (typeof cacheKey === 'function' ? cacheKey(p) : cacheKey)

  const cacheGetOptions =
    staleTime !== undefined || expireTime !== undefined ? { staleTime, expireTime } : undefined

  // Captures cached data whenever params or cache version change.
  // Used to display stale data during background revalidation.
  const staleSnapshot = linkedSignal({
    source: () => {
      const p = params()
      if (p === undefined) return undefined
      cache.version() // react to invalidations
      return resolveKey(p)
    },
    computation: (currentKey: string[] | undefined) => {
      if (!currentKey) return NO_VALUE
      const entry = cache.get<T>(currentKey, cacheGetOptions)
      return entry ? entry.data : NO_VALUE
    },
  })

  const retryConfig = retry !== undefined ? normalizeRetryConfig(retry) : undefined

  const res = resource<T, P | undefined>({
    params: () => {
      const p = params()
      if (p === undefined) return undefined
      cache.version() // trigger reload on invalidation
      return p
    },
    loader: async ({ params: reqParams, abortSignal }) => {
      // Safe cast: when params() returns undefined the loader never runs,
      // so `reqParams` is guaranteed to be P at this point.
      const p = reqParams as P
      const k = resolveKey(p)
      const entry = cache.get<T>(k, cacheGetOptions)
      if (entry?.fresh) return entry.data

      const data = await cache.deduplicate(k, () => {
        const invoke = () => {
          const result = loader({ params: p, abortSignal })
          return isObservable(result) ? firstValueFrom(result) : result
        }
        return retryConfig ? retryWithBackoff(invoke, retryConfig, abortSignal) : invoke()
      })

      if (!abortSignal.aborted) {
        cache.set(k, data)
      }
      return data
    },
  })

  // Background polling
  if (refetchInterval !== undefined) {
    effect(onCleanup => {
      const interval = typeof refetchInterval === 'function' ? refetchInterval() : refetchInterval
      if (!interval || interval <= 0) return
      const id = setInterval(() => res.reload(), interval)
      onCleanup(() => {
        clearInterval(id)
      })
    })
  }

  // SWR value: stale data during loading, otherwise resource value.
  const value = computed(() => {
    const status = res.status()
    if (status === 'loading' || status === 'reloading') {
      const snapshot = staleSnapshot()
      if (snapshot !== NO_VALUE) return snapshot
    }
    return res.value()
  })

  const isStale = computed(() => {
    const status = res.status()
    return (status === 'loading' || status === 'reloading') && staleSnapshot() !== NO_VALUE
  })

  const isInitialLoading = computed(
    () => res.status() === 'loading' && staleSnapshot() === NO_VALUE,
  )

  return {
    value,
    status: res.status,
    error: res.error,
    isLoading: res.isLoading,
    reload: () => res.reload(),
    destroy: () => {
      res.destroy()
    },
    set: (v: T) => {
      res.set(v)
    },
    update: (fn: (prev: T | undefined) => T) => {
      res.update(fn)
    },
    hasValue: () =>
      staleSnapshot() !== NO_VALUE || res.status() === 'resolved' || res.status() === 'local',
    isStale,
    isInitialLoading,
  }
}

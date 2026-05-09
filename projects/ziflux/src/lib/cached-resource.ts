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
        // Guard: signal may already be aborted before the listener is registered
        if (abortSignal.aborted) {
          // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- DOMException is the standard AbortError type
          reject(abortSignal.reason ?? new DOMException('The operation was aborted', 'AbortError'))
          return
        }
        const timer = setTimeout(() => {
          resolve(attempt(n + 1))
        }, delay)
        abortSignal.addEventListener(
          'abort',
          () => {
            clearTimeout(timer)
            // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- DOMException is the standard AbortError type
            reject(
              abortSignal.reason ?? new DOMException('The operation was aborted', 'AbortError'),
            )
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

  // Captures cached data whenever params change or any cache write happens
  // (set, invalidate, clear). Reads `_dataVersion` rather than `version` so
  // a sibling resource's optimistic `set()` propagates here without
  // triggering a reload via `params` re-eval (D-38).
  const staleSnapshot = linkedSignal({
    source: () => {
      const p = params()
      if (p === undefined) return undefined
      cache._dataVersion() // react to any cache content change
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
    loader: async ({ params: reqParams, abortSignal }): Promise<T> => {
      // Safe cast: when params() returns undefined the loader never runs,
      // so `reqParams` is guaranteed to be P at this point.
      const p = reqParams as P
      const k = resolveKey(p)
      const entry = cache.get<T>(k, cacheGetOptions)
      if (entry?.fresh) return entry.data

      const doFetch = () => {
        const invoke = () => {
          const result = loader({ params: p, abortSignal })
          return isObservable(result) ? firstValueFrom(result) : result
        }
        return retryConfig ? retryWithBackoff(invoke, retryConfig, abortSignal) : invoke()
      }

      // When invalidate() preserves in-flight promises, a dedup hit may return
      // a promise whose underlying fetch was aborted by Angular (previous loader
      // abort on param change). Catch that stale AbortError and retry with the
      // current loader's (non-aborted) signal.
      const data = await cache.deduplicate(k, doFetch).catch((err: unknown) => {
        if (!abortSignal.aborted && err instanceof DOMException && err.name === 'AbortError') {
          return cache.deduplicate(k, doFetch)
        }
        throw err
      })

      if (!abortSignal.aborted) {
        if (res.status() === 'local') {
          return res.value() as T
        }
        cache.set(k, data)
        cache.clearDirty(k)
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

  // SWR value: prefer the cache snapshot whenever it exists, except when this
  // resource is in `local` state (the user just called `set()`/`update()` and
  // their value is the source of truth on this instance). Reading the snapshot
  // in `resolved` state is what makes a sibling resource sharing the same
  // cacheKey see another instance's optimistic write (D-38). In normal flow
  // the snapshot tracks `res.value()` because the loader writes the same data
  // to the cache, so behavior is unchanged.
  const value = computed(() => {
    const status = res.status()
    if (status === 'local') return res.value()
    const snapshot = staleSnapshot()
    if (snapshot !== NO_VALUE) return snapshot
    if (status === 'error') return undefined as T
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
    // Write-through to DataCache + Angular resource. The DataCache write makes
    // the optimistic value visible to any sibling resource sharing the same
    // cacheKey via _dataVersion (D-38), and survives staleSnapshot recomputes
    // triggered by unrelated invalidations (D-33).
    set: (v: T) => {
      const p = params()
      if (p !== undefined) cache.set(resolveKey(p), v)
      res.set(v)
    },
    update: (fn: (prev: T | undefined) => T) => {
      const newValue = fn(value())
      const p = params()
      if (p !== undefined) cache.set(resolveKey(p), newValue)
      res.set(newValue)
    },
    hasValue: () =>
      staleSnapshot() !== NO_VALUE || res.status() === 'resolved' || res.status() === 'local',
    isStale,
    isInitialLoading,
  }
}

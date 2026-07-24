import {
  computed,
  DestroyRef,
  effect,
  inject,
  linkedSignal,
  PLATFORM_ID,
  resource,
  type Signal,
} from '@angular/core'
import { isPlatformBrowser } from '@angular/common'
import { isObservable, type Observable, take } from 'rxjs'
import type { CachedResourceOptions, CachedResourceRef, RetryConfig } from './types'

const NO_VALUE = Symbol('NO_VALUE')

/** The error an aborted operation rejects with, normalized to an `Error`. */
function abortReason(abortSignal: AbortSignal): Error {
  const reason: unknown = abortSignal.reason
  return reason instanceof Error
    ? reason
    : new DOMException('The operation was aborted', 'AbortError')
}

/**
 * Resolves with an Observable's first value, then unsubscribes.
 *
 * Unlike `firstValueFrom()`, aborting the signal tears the subscription down —
 * which is what cancels the underlying `HttpClient` request when Angular aborts
 * a superseded loader.
 */
function firstValueWithAbort<T>(source: Observable<T>, abortSignal: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    if (abortSignal.aborted) {
      reject(abortReason(abortSignal))
      return
    }

    const onAbort = (): void => {
      subscription.unsubscribe()
      reject(abortReason(abortSignal))
    }
    const stopListening = (): void => {
      abortSignal.removeEventListener('abort', onAbort)
    }

    abortSignal.addEventListener('abort', onAbort, { once: true })

    // take(1) tears the source down after the first value, so only the abort
    // path needs an explicit unsubscribe.
    const subscription = source.pipe(take(1)).subscribe({
      next: value => {
        stopListening()
        resolve(value)
      },
      error: (error: unknown) => {
        stopListening()
        reject(error instanceof Error ? error : new Error(String(error)))
      },
      complete: () => {
        stopListening()
        reject(new Error('cachedResource: the loader Observable completed without emitting'))
      },
    })
  })
}

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
          reject(abortReason(abortSignal))
          return
        }
        const timer = setTimeout(() => {
          resolve(attempt(n + 1))
        }, delay)
        abortSignal.addEventListener(
          'abort',
          () => {
            clearTimeout(timer)
            reject(abortReason(abortSignal))
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
 * runs only when the cache entry is missing or stale — except through
 * `reload()` and `refetchInterval`, which always hit the network.
 *
 * Supports Promises and Observables in the `loader`. An Observable loader is
 * unsubscribed when Angular aborts the request, which cancels the underlying
 * `HttpClient` call. Pass `retry` (number or `RetryConfig`) to enable
 * exponential-backoff retries. Pass `refetchInterval` to poll in the background
 * — the interval is reactive: if you pass a signal, changing it restarts the
 * timer automatically.
 *
 * @remarks
 * Must be called inside an injection context (constructor, `inject()` call, or
 * `runInInjectionContext()`). The underlying `resource()` and the polling
 * `effect()` are destroyed with the owning injector. Polling is browser-only:
 * no interval is scheduled during server-side rendering.
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
  options: CachedResourceOptions<T, P> & { defaultValue: NoInfer<T> },
): Omit<CachedResourceRef<T>, 'value'> & { readonly value: Signal<T> }
export function cachedResource<T, P extends object>(
  options: CachedResourceOptions<T, P>,
): CachedResourceRef<T>
export function cachedResource<T, P extends object>(
  options: CachedResourceOptions<T, P>,
): CachedResourceRef<T> {
  const {
    cache,
    cacheKey,
    loader,
    staleTime,
    expireTime,
    retry,
    refetchInterval,
    refetchOnWindowFocus,
    refetchOnReconnect,
    defaultValue,
  } = options
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

  // Set by reload() and by polling: the next loader run must hit the network even
  // if the cached entry is still inside its staleTime window.
  let force = false

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
      const forced = force
      force = false
      const entry = cache.get<T>(k, cacheGetOptions)
      if (!forced && entry?.fresh) return entry.data

      const doFetch = () => {
        const invoke = () => {
          const result = loader({ params: p, abortSignal })
          return isObservable(result) ? firstValueWithAbort(result, abortSignal) : result
        }
        return retryConfig ? retryWithBackoff(invoke, retryConfig, abortSignal) : invoke()
      }

      // A dedup hit may return a promise whose underlying fetch was aborted by
      // Angular (a sibling resource's loader aborted on param change or destroy).
      // Catch that stale AbortError and retry with the current loader's
      // (non-aborted) signal.
      const result = await cache._fetch(k, doFetch).catch((err: unknown) => {
        if (!abortSignal.aborted && err instanceof DOMException && err.name === 'AbortError') {
          return cache._fetch(k, doFetch)
        }
        throw err
      })

      if (!abortSignal.aborted) {
        if (res.status() === 'local') {
          return res.value() as T
        }
        cache._settle(k, result)
      }
      return result.data
    },
  })

  /** `reload()` bypasses the freshness check — its contract is "refetch now". */
  const forceReload = (): boolean => {
    force = true
    const started = res.reload()
    if (!started) force = false
    return started
  }

  const isBrowser = isPlatformBrowser(inject(PLATFORM_ID, { optional: true }) ?? 'browser')

  // Revalidation triggers. These call `res.reload()` rather than `forceReload()`
  // so the loader's freshness check still applies: an entry inside its staleTime
  // is served from cache, and returning to a tab costs no request.
  const revalidateListeners: Array<() => void> = []
  if (isBrowser && (refetchOnWindowFocus === true || refetchOnReconnect === true)) {
    const destroyRef = inject(DestroyRef)
    const listen = (target: EventTarget, event: string, shouldReload: () => boolean): void => {
      const handler = (): void => {
        if (shouldReload()) res.reload()
      }
      target.addEventListener(event, handler)
      revalidateListeners.push(() => {
        target.removeEventListener(event, handler)
      })
    }

    if (refetchOnWindowFocus === true) {
      listen(document, 'visibilitychange', () => document.visibilityState === 'visible')
    }
    if (refetchOnReconnect === true) {
      listen(window, 'online', () => true)
    }
    destroyRef.onDestroy(() => {
      for (const stop of revalidateListeners) stop()
    })
  }

  // Background polling. Browser-only: a recurring timer keeps an SSR render from
  // ever stabilizing, and each tick would reload a resource nobody will hydrate.
  if (refetchInterval !== undefined && isBrowser) {
    effect(onCleanup => {
      const interval = typeof refetchInterval === 'function' ? refetchInterval() : refetchInterval
      if (!interval || interval <= 0) return
      const id = setInterval(() => forceReload(), interval)
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
    if (status === 'error') return defaultValue
    const current = res.value()
    // Explicit undefined check, not `??`: `null` is a legitimate cached value.
    return current === undefined ? defaultValue : current
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
    reload: forceReload,
    destroy: () => {
      for (const stop of revalidateListeners) stop()
      revalidateListeners.length = 0
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
    hasValue(): this is Omit<CachedResourceRef<T>, 'value'> & { readonly value: Signal<T> } {
      return value() !== undefined
    },
    isStale,
    isInitialLoading,
  }
}

import type { EnvironmentProviders, ResourceStatus, Signal } from '@angular/core'
import type { Observable } from 'rxjs'
import type { DataCache } from './data-cache'

// --- Cache ---

/** Raw entry stored in the cache map. */
export interface CacheEntry<T> {
  data: T
  createdAt: number
}

/** Global freshness and eviction policy for a `DataCache` instance. */
export interface ZifluxConfig {
  staleTime: number // ms before fresh → stale (default: 30s)
  expireTime: number // ms before stale → evicted (default: 5min)
  /**
   * Milliseconds between automatic eviction sweeps.
   * When `undefined`, expired entries are never removed proactively — only on next access.
   * In long-running SPAs, leaving this disabled can cause unbounded memory growth
   * if many unique cache keys accumulate over the session lifetime.
   */
  cleanupInterval?: number // ms between auto-cleanup sweeps (undefined = disabled)
  /**
   * Maximum number of entries. When exceeded, the least recently used entry is evicted on write.
   * When `undefined`, no limit is enforced.
   */
  maxEntries?: number
}

// --- Cache inspection ---

/** Point-in-time snapshot of a single cache entry, enriched with derived freshness metadata. */
export interface CacheEntryInfo<T> {
  /** The cache key segments that identify this entry. */
  key: string[]
  data: T
  /** Unix timestamp (ms) when the entry was written. */
  createdAt: number
  /** Milliseconds since the entry was written. */
  age: number
  /** `true` when `age < staleTime`. */
  fresh: boolean
  /** `true` when `age >= expireTime`. */
  expired: boolean
  /** Milliseconds until the entry transitions from fresh to stale. Negative when already stale. */
  timeToStale: number
  /** Milliseconds until the entry is evicted. Negative when already expired. */
  timeToExpire: number
  state: 'fresh' | 'stale' | 'expired'
}

/** Full inspection snapshot of a `DataCache` instance, used by devtools. */
export interface CacheInspection<T> {
  /** Number of entries currently in the cache. */
  size: number
  entries: CacheEntryInfo<T>[]
  /** Keys of requests currently in-flight (deduplicated). */
  inFlightKeys: string[][]
  /** Incremented on every write or invalidation — useful for change detection. */
  version: number
  config: ZifluxConfig
}

/** Options accepted by the `DataCache` constructor. All freshness fields are optional overrides. */
export interface DataCacheOptions extends Partial<ZifluxConfig> {
  /** Human-readable label shown in devtools. */
  name?: string
}

/** Configuration for the ziflux devtools feature. */
export interface DevtoolsConfig {
  /** When `true`, cache reads, writes, and invalidations are logged to the console. */
  logOperations?: boolean
}

/** Opaque token returned by `withDevtools()` and consumed by `provideZiflux()`. */
export type ZifluxFeature = EnvironmentProviders & { readonly ɵzifluxFeature: never }

// --- Retry ---

/** Exponential-backoff retry policy for failed resource loaders. */
export interface RetryConfig {
  maxRetries: number
  baseDelay?: number // default: 1000ms
  maxDelay?: number // default: 30_000ms
  retryIf?: (error: unknown) => boolean // default: () => true
}

// --- cachedResource ---

/**
 * Returned by `cachedResource()`. Mirrors Angular's `ResourceRef<T>` signals
 * and adds SWR-specific signals: `isStale` and `isInitialLoading`.
 *
 * `value` is read-only — use `set()` / `update()` to write local optimistic state.
 * Writing does NOT persist to the cache; call `invalidate()` to trigger a fresh fetch.
 */
export interface CachedResourceRef<T> {
  /** Current cached value. `undefined` before the first successful load. */
  readonly value: Signal<T | undefined>
  /** Mirrors Angular's `ResourceStatus` string union. */
  readonly status: Signal<ResourceStatus>
  /** Last error thrown by the loader, or `undefined` when not in error state. */
  readonly error: Signal<unknown>
  /** `true` while a fetch is in-flight (initial load or background revalidation). */
  readonly isLoading: Signal<boolean>
  /** `true` when the cached value exists but has exceeded `staleTime`. A background refetch is in-flight. */
  readonly isStale: Signal<boolean>
  /** `true` only during the very first fetch — no cached value exists yet. */
  readonly isInitialLoading: Signal<boolean>
  /** Returns `true` if `value()` is not `undefined`. */
  hasValue(): boolean
  /** Triggers an immediate refetch, bypassing staleness checks. Returns `false` if already loading. */
  reload(): boolean
  /** Destroys the underlying Angular resource and cancels any in-flight request. */
  destroy(): void
  /** Optimistically overwrites the local value without touching the cache. */
  set(value: T): void
  /** Optimistically updates the local value without touching the cache. */
  update(updater: (value: T | undefined) => T): void
}

/** Options passed to `cachedResource()`. */
export interface CachedResourceOptions<T, P extends object> {
  /** The `DataCache` instance that stores and revalidates data for this resource. */
  cache: DataCache<T>
  /** Static key array or a function that derives the key from current params. */
  cacheKey: string[] | ((params: NoInfer<P>) => string[])
  /** Reactive params factory. Returning `undefined` suspends the resource. */
  params?: () => P | undefined
  /** Async data fetcher. Receives params and an `AbortSignal` for cancellation. */
  loader: (context: { params: P; abortSignal: AbortSignal }) => Observable<T> | Promise<T>
  /** Per-resource override for `ZifluxConfig.staleTime` (ms). */
  staleTime?: number
  /** Per-resource override for `ZifluxConfig.expireTime` (ms). */
  expireTime?: number
  /** Retry policy: pass a number for fixed retry count, or a `RetryConfig` for backoff. */
  retry?: number | RetryConfig
  /** Auto-refetch interval in ms, or a function returning ms / `false` to disable. */
  refetchInterval?: number | (() => number | false)
}

// --- cachedMutation ---

/** Lifecycle status of a `cachedMutation`. */
export type CachedMutationStatus = 'idle' | 'pending' | 'success' | 'error'

/** Options passed to `cachedMutation()`. `A` = args, `R` = result, `C` = optimistic context. */
export interface CachedMutationOptions<A = void, R = void, C = void> {
  /** The async operation to perform. */
  mutationFn: (args: A) => Observable<R> | Promise<R>
  /** Cache instance to invalidate after a successful mutation. */
  cache?: { invalidate(prefix: string[]): void }
  /** Returns the key prefixes to invalidate after a successful mutation. */
  invalidateKeys?: (args: A, result: R) => string[][]
  /** Called before `mutationFn`. Return value is passed as `context` to `onError`. */
  onMutate?: (args: A) => C | Promise<C>
  /** Called after a successful mutation. */
  onSuccess?: (result: R, args: A) => void
  /** Called when `mutationFn` throws. Receives the optimistic context for rollback. */
  onError?: (error: unknown, args: A, context: C | undefined) => void
}

/**
 * Returned by `cachedMutation()`. Holds the reactive state of the latest mutation call.
 *
 * `A` = argument type (`void` for no-arg mutations), `R` = resolved result type.
 */
export interface CachedMutationRef<A, R> {
  /**
   * Triggers the mutation. Never rejects — errors are captured in `error` instead.
   * Returns `undefined` when the mutation errors.
   */
  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type -- void-arg pattern for no-arg mutations
  mutate(...args: A extends void ? [] : [args: A]): Promise<R | undefined>
  /** Current lifecycle status of the mutation. */
  readonly status: Signal<CachedMutationStatus>
  /** `true` while `mutationFn` is in-flight. */
  readonly isPending: Signal<boolean>
  /** Error thrown by the last failed mutation, or `undefined`. */
  readonly error: Signal<unknown>
  /** Result of the last successful mutation, or `undefined`. */
  readonly data: Signal<R | undefined>
  /** Resets `status`, `error`, and `data` back to their initial idle state. */
  reset(): void
}

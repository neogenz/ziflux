import { DestroyRef, inject, signal } from '@angular/core'
import { type Observable, tap } from 'rxjs'
import { CacheRegistry } from './cache-registry'
import { DevtoolsLogger } from './devtools-logger'
import { ZIFLUX_CONFIG } from './provide-ziflux'
import type {
  CacheEntry,
  CacheEntryInfo,
  CacheInspection,
  DataCacheOptions,
  ZifluxConfig,
} from './types'

let cacheCounter = 0

/**
 * In-memory SWR cache scoped to an Angular injection context.
 *
 * Keys are serialized string arrays; entries transition through
 * `fresh → stale → expired` states based on `staleTime` and `expireTime`.
 *
 * @remarks
 * When `maxEntries` is configured, entries are evicted in LRU order on write.
 * `get()` promotes accessed entries to most-recently-used position.
 * Without `maxEntries`, memory is bounded only by `expireTime` and `cleanup()`.
 * Cleanup is entirely opt-in.
 */
export class DataCache<T> {
  readonly #entries = new Map<string, CacheEntry<T>>()
  readonly #inFlight = new Map<string, Promise<T>>()
  readonly #version = signal(0)
  readonly #config: ZifluxConfig
  readonly #logger: DevtoolsLogger | null

  /** Human-readable identifier, used by devtools. Auto-generated if not provided in config. */
  readonly name: string
  /** Monotonically incrementing signal that bumps on every `invalidate()` or `clear()`. */
  readonly version = this.#version.asReadonly()

  /**
   * Must be called inside an Angular injection context (constructor, factory, or `runInInjectionContext`).
   * Merges global config from `provideZiflux()` with local overrides.
   */
  constructor(config?: DataCacheOptions) {
    const globalConfig = inject(ZIFLUX_CONFIG, { optional: true })
    const defaults: ZifluxConfig = { staleTime: 30_000, expireTime: 300_000 }
    this.#config = { ...defaults, ...globalConfig, ...config }
    this.name = config?.name ?? `cache-${cacheCounter++}`

    this.#logger = inject(DevtoolsLogger, { optional: true })
    const registry = inject(CacheRegistry, { optional: true })
    const destroyRef = inject(DestroyRef, { optional: true })

    if (registry) {
      registry.register(this as DataCache<unknown>)
      destroyRef?.onDestroy(() => {
        registry.unregister(this as DataCache<unknown>)
      })
    }

    if (this.#config.cleanupInterval) {
      const id = setInterval(() => this.cleanup(), this.#config.cleanupInterval)
      destroyRef?.onDestroy(() => {
        clearInterval(id)
      })
    }
  }

  /** Resolved stale threshold in milliseconds. */
  get staleTime(): number {
    return this.#config.staleTime
  }

  /** Resolved expiry threshold in milliseconds. */
  get expireTime(): number {
    return this.#config.expireTime
  }

  /**
   * Returns the cached entry for `key`, or `null` if absent or expired.
   * Per-call `staleTime`/`expireTime` overrides take precedence over the instance config.
   * An expired entry is deleted on read.
   */
  get(
    key: string[],
    options?: { staleTime?: number; expireTime?: number },
  ): { data: T; fresh: boolean } | null {
    const serialized = this.#serialize(key)
    const entry = this.#entries.get(serialized)
    if (!entry) return null

    const expireTime = options?.expireTime ?? this.#config.expireTime
    const staleTime = options?.staleTime ?? this.#config.staleTime
    const age = Date.now() - entry.createdAt

    if (age > expireTime) {
      this.#entries.delete(serialized)
      return null
    }

    // LRU: move to end of iteration order (most recently used)
    if (this.#config.maxEntries) {
      this.#entries.delete(serialized)
      this.#entries.set(serialized, entry)
    }

    return { data: entry.data, fresh: age < staleTime }
  }

  /** Writes or overwrites an entry. Resets the entry's `createdAt` timestamp. */
  set(key: string[], data: T): void {
    this.#entries.set(this.#serialize(key), { data, createdAt: Date.now() })
    this.#evictOverflow()
    this.#logger?.logSet(this.name, key, data)
  }

  #evictOverflow(): void {
    const max = this.#config.maxEntries
    if (!max || this.#entries.size <= max) return
    const oldest = this.#entries.keys().next().value
    if (oldest !== undefined) {
      this.#entries.delete(oldest)
      this.#logger?.logEvict(this.name, JSON.parse(oldest) as string[])
    }
  }

  /**
   * Marks all entries whose key starts with `prefix` as stale.
   *
   * Matching is performed on the JSON-serialized key: `prefix` is serialized
   * with `JSON.stringify` and the closing `]` is stripped, so `['todos']`
   * matches any key whose serialization begins with `["todos"` — e.g.
   * `['todos', '1']`, `['todos', 'all']`, etc.
   *
   * Entries are not deleted; their timestamp is shifted back so that
   * `get()` returns `fresh: false`, triggering a background revalidation.
   * Bumps `version` to notify reactive consumers.
   */
  invalidate(prefix: string[]): void {
    if (prefix.length === 0) return
    const prefixStr = JSON.stringify(prefix).slice(0, -1)
    for (const [key, entry] of this.#entries) {
      if (key.startsWith(prefixStr)) {
        // Shift timestamp backward so age exceeds staleTime → entry reads as stale
        entry.createdAt -= this.#config.staleTime + 1
      }
    }
    this.#version.update(v => v + 1)
    this.#logger?.logInvalidate(this.name, prefix)
  }

  /**
   * Low-level primitive for Observable-based loaders.
   * Returns the source Observable with a side-effect that writes emitted
   * values into the cache via `set()`. Intended for bridging RxJS
   * data sources (e.g. `HttpClient`) into the cache without breaking the
   * Observable chain.
   */
  wrap(key: string[], obs$: Observable<T>): Observable<T> {
    return obs$.pipe(
      tap(data => {
        this.set(key, data)
      }),
    )
  }

  /**
   * Ensures at most one in-flight request per key at any time.
   * If a request for `key` is already pending, returns the existing promise
   * instead of calling `fn` again. The in-flight record is cleared when
   * the promise settles.
   */
  deduplicate(key: string[], fn: () => Promise<T>): Promise<T> {
    const serialized = this.#serialize(key)
    const existing = this.#inFlight.get(serialized)
    if (existing) {
      this.#logger?.logDeduplicate(this.name, key, true)
      return existing
    }

    this.#logger?.logDeduplicate(this.name, key, false)
    const promise = fn().finally(() => this.#inFlight.delete(serialized))
    this.#inFlight.set(serialized, promise)
    return promise
  }

  /**
   * Eagerly fetches and stores data before it is requested.
   * Uses `deduplicate()` internally, so concurrent prefetch calls for the
   * same key are collapsed into one request.
   */
  async prefetch(key: string[], fn: () => Promise<T>): Promise<void> {
    const data = await this.deduplicate(key, fn)
    this.set(key, data)
  }

  /** Removes all entries and cancels in-flight deduplication. Bumps `version`. */
  clear(): void {
    this.#entries.clear()
    this.#inFlight.clear()
    this.#version.update(v => v + 1)
    this.#logger?.logClear(this.name)
  }

  /**
   * Returns a point-in-time snapshot of cache internals.
   * Intended for devtools and debugging; do not use in production data flows.
   */
  inspect(): CacheInspection<T> {
    const now = Date.now()
    const entries = [...this.#entries].map(([serialized, entry]) => {
      const age = now - entry.createdAt
      const fresh = age < this.#config.staleTime
      const expired = age > this.#config.expireTime
      const state: CacheEntryInfo<T>['state'] = fresh ? 'fresh' : expired ? 'expired' : 'stale'
      return {
        key: JSON.parse(serialized) as string[],
        data: entry.data,
        createdAt: entry.createdAt,
        age,
        fresh,
        expired,
        timeToStale: Math.max(0, this.#config.staleTime - age),
        timeToExpire: Math.max(0, this.#config.expireTime - age),
        state,
      }
    })

    return {
      size: this.#entries.size,
      entries,
      inFlightKeys: [...this.#inFlight.keys()].map(k => JSON.parse(k) as string[]),
      version: this.#version(),
      config: { ...this.#config },
    }
  }

  /**
   * Evicts all entries whose age exceeds `expireTime`.
   * Called automatically on the interval set by `cleanupInterval` (if configured).
   * Returns the number of entries removed.
   */
  cleanup(): number {
    const now = Date.now()
    let evicted = 0
    for (const [key, entry] of this.#entries) {
      if (now - entry.createdAt > this.#config.expireTime) {
        this.#entries.delete(key)
        this.#logger?.logEvict(this.name, JSON.parse(key) as string[])
        evicted++
      }
    }
    return evicted
  }

  #serialize(key: string[]): string {
    return JSON.stringify(key)
  }
}

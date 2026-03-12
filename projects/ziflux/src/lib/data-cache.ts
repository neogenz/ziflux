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

export class DataCache<T> {
  readonly #entries = new Map<string, CacheEntry<T>>()
  readonly #inFlight = new Map<string, Promise<T>>()
  readonly #version = signal(0)
  readonly #config: ZifluxConfig
  readonly #logger: DevtoolsLogger | null

  readonly name: string
  readonly version = this.#version.asReadonly()

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

  get staleTime(): number {
    return this.#config.staleTime
  }

  get expireTime(): number {
    return this.#config.expireTime
  }

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

    return { data: entry.data, fresh: age < staleTime }
  }

  set(key: string[], data: T): void {
    this.#entries.set(this.#serialize(key), { data, createdAt: Date.now() })
    this.#logger?.logSet(this.name, key, data)
  }

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

  wrap(key: string[], obs$: Observable<T>): Observable<T> {
    return obs$.pipe(
      tap(data => {
        this.set(key, data)
      }),
    )
  }

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

  async prefetch(key: string[], fn: () => Promise<T>): Promise<void> {
    const data = await this.deduplicate(key, fn)
    this.set(key, data)
  }

  clear(): void {
    this.#entries.clear()
    this.#inFlight.clear()
    this.#version.update(v => v + 1)
    this.#logger?.logClear(this.name)
  }

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

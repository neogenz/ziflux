import { inject, signal } from '@angular/core'
import { type Observable, tap } from 'rxjs'
import { ZIFLUX_CONFIG } from './provide-ziflux'
import type { CacheEntry, ZifluxConfig } from './types'

export class DataCache<T> {
  readonly #entries = new Map<string, CacheEntry<T>>()
  readonly #inFlight = new Map<string, Promise<T>>()
  readonly #version = signal(0)
  readonly #config: ZifluxConfig

  readonly version = this.#version.asReadonly()

  constructor(config?: Partial<ZifluxConfig>) {
    const globalConfig = inject(ZIFLUX_CONFIG, { optional: true })
    const defaults: ZifluxConfig = { staleTime: 30_000, gcTime: 300_000 }
    this.#config = { ...defaults, ...globalConfig, ...config }
  }

  get staleTime(): number {
    return this.#config.staleTime
  }

  get gcTime(): number {
    return this.#config.gcTime
  }

  get(
    key: string[],
    options?: { staleTime?: number; gcTime?: number },
  ): { data: T; fresh: boolean } | null {
    const serialized = this.#serialize(key)
    const entry = this.#entries.get(serialized)
    if (!entry) return null

    const gcTime = options?.gcTime ?? this.#config.gcTime
    const staleTime = options?.staleTime ?? this.#config.staleTime
    const age = Date.now() - entry.createdAt

    if (age > gcTime) {
      this.#entries.delete(serialized)
      return null
    }

    return { data: entry.data, fresh: age <= staleTime }
  }

  set(key: string[], data: T): void {
    this.#entries.set(this.#serialize(key), { data, createdAt: Date.now() })
  }

  invalidate(prefix: string[]): void {
    const prefixStr = JSON.stringify(prefix).slice(0, -1)
    for (const [key, entry] of this.#entries) {
      if (key.startsWith(prefixStr)) {
        entry.createdAt -= this.#config.staleTime + 1
      }
    }
    this.#version.update(v => v + 1)
  }

  wrap(key: string[], obs$: Observable<T>): Observable<T> {
    return obs$.pipe(tap(data => this.set(key, data)))
  }

  deduplicate(key: string[], fn: () => Promise<T>): Promise<T> {
    const serialized = this.#serialize(key)
    const existing = this.#inFlight.get(serialized)
    if (existing) return existing

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
  }

  #serialize(key: string[]): string {
    return JSON.stringify(key)
  }
}

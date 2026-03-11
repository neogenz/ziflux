import { signal } from '@angular/core'
import type { DataCache } from './data-cache'
import type { CacheInspection } from './types'

export class CacheRegistry {
  readonly #caches = signal(new Map<string, DataCache<unknown>>())
  readonly caches = this.#caches.asReadonly()

  register(cache: DataCache<unknown>): void {
    const next = new Map(this.#caches())
    next.set(cache.name, cache)
    this.#caches.set(next)
  }

  unregister(cache: DataCache<unknown>): void {
    const next = new Map(this.#caches())
    next.delete(cache.name)
    this.#caches.set(next)
  }

  inspectAll(): { name: string; inspection: CacheInspection<unknown> }[] {
    return [...this.#caches().entries()].map(([name, cache]) => ({
      name,
      inspection: cache.inspect(),
    }))
  }
}

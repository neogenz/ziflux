import { describe, it, expect, beforeEach } from 'vitest'
import { Injector, runInInjectionContext } from '@angular/core'
import { CacheRegistry } from './cache-registry'
import { DataCache } from './data-cache'

function createCacheWithName(name: string): DataCache<string> {
  const injector = Injector.create({ providers: [] })
  return runInInjectionContext(injector, () => new DataCache<string>({ name }))
}

describe('CacheRegistry', () => {
  let registry: CacheRegistry

  beforeEach(() => {
    registry = new CacheRegistry()
  })

  it('starts empty', () => {
    expect(registry.caches().size).toBe(0)
  })

  it('registers a cache', () => {
    const cache = createCacheWithName('orders')
    registry.register(cache as DataCache<unknown>)
    expect(registry.caches().size).toBe(1)
    expect(registry.caches().get('orders')).toBe(cache)
  })

  it('registers multiple caches', () => {
    const c1 = createCacheWithName('orders')
    const c2 = createCacheWithName('users')
    registry.register(c1 as DataCache<unknown>)
    registry.register(c2 as DataCache<unknown>)
    expect(registry.caches().size).toBe(2)
  })

  it('unregisters a cache', () => {
    const cache = createCacheWithName('orders')
    registry.register(cache as DataCache<unknown>)
    registry.unregister(cache as DataCache<unknown>)
    expect(registry.caches().size).toBe(0)
  })

  it('creates new Map reference on register (signal reactivity)', () => {
    const before = registry.caches()
    const cache = createCacheWithName('orders')
    registry.register(cache as DataCache<unknown>)
    expect(registry.caches()).not.toBe(before)
  })

  it('creates new Map reference on unregister', () => {
    const cache = createCacheWithName('orders')
    registry.register(cache as DataCache<unknown>)
    const before = registry.caches()
    registry.unregister(cache as DataCache<unknown>)
    expect(registry.caches()).not.toBe(before)
  })

  // --- inspectAll ---

  it('inspectAll returns empty array when no caches', () => {
    expect(registry.inspectAll()).toEqual([])
  })

  it('inspectAll returns named inspections', () => {
    const cache = createCacheWithName('orders')
    cache.set(['order', 'list'], 'data')
    registry.register(cache as DataCache<unknown>)

    const results = registry.inspectAll()
    expect(results).toHaveLength(1)
    expect(results[0].name).toBe('orders')
    expect(results[0].inspection.size).toBe(1)
    expect(results[0].inspection.entries[0].data).toBe('data')
  })

  it('inspectAll returns all registered caches', () => {
    const c1 = createCacheWithName('orders')
    const c2 = createCacheWithName('users')
    c1.set(['order'], 'o')
    c2.set(['user'], 'u')
    registry.register(c1 as DataCache<unknown>)
    registry.register(c2 as DataCache<unknown>)

    const results = registry.inspectAll()
    expect(results).toHaveLength(2)
    const names = results.map(r => r.name)
    expect(names).toContain('orders')
    expect(names).toContain('users')
  })
})

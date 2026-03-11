import { describe, it, expect } from 'vitest'
import {
  Injector,
  EnvironmentInjector,
  createEnvironmentInjector,
  runInInjectionContext,
} from '@angular/core'
import { provideZiflux, withDevtools, ZIFLUX_CONFIG } from './provide-ziflux'
import { CacheRegistry } from './cache-registry'
import { DataCache } from './data-cache'
import { DevtoolsLogger } from './devtools-logger'

function createInjectorWith(...args: Parameters<typeof provideZiflux>): EnvironmentInjector {
  const parent = Injector.create({ providers: [] }) as EnvironmentInjector
  return createEnvironmentInjector([provideZiflux(...args)], parent)
}

describe('provideZiflux', () => {
  it('provides default config when called without args', () => {
    const injector = createInjectorWith()
    const config = injector.get(ZIFLUX_CONFIG)
    expect(config).toEqual({ staleTime: 30_000, expireTime: 300_000 })
  })

  it('overrides staleTime', () => {
    const injector = createInjectorWith({ staleTime: 5_000 })
    const config = injector.get(ZIFLUX_CONFIG)
    expect(config.staleTime).toBe(5_000)
    expect(config.expireTime).toBe(300_000)
  })

  it('overrides expireTime', () => {
    const injector = createInjectorWith({ expireTime: 60_000 })
    const config = injector.get(ZIFLUX_CONFIG)
    expect(config.staleTime).toBe(30_000)
    expect(config.expireTime).toBe(60_000)
  })

  it('overrides both', () => {
    const injector = createInjectorWith({ staleTime: 1_000, expireTime: 10_000 })
    const config = injector.get(ZIFLUX_CONFIG)
    expect(config).toEqual({ staleTime: 1_000, expireTime: 10_000 })
  })
})

describe('withDevtools', () => {
  it('provides CacheRegistry', () => {
    const injector = createInjectorWith(undefined, withDevtools())
    const registry = injector.get(CacheRegistry, null)
    expect(registry).not.toBeNull()
    expect(registry).toBeInstanceOf(CacheRegistry)
  })

  it('provides DevtoolsLogger', () => {
    const injector = createInjectorWith(undefined, withDevtools())
    const logger = injector.get(DevtoolsLogger, null)
    expect(logger).not.toBeNull()
    expect(logger).toBeInstanceOf(DevtoolsLogger)
  })

  it('does not provide registry when withDevtools is not used', () => {
    const injector = createInjectorWith()
    const registry = injector.get(CacheRegistry, null)
    expect(registry).toBeNull()
  })

  it('does not provide logger when withDevtools is not used', () => {
    const injector = createInjectorWith()
    const logger = injector.get(DevtoolsLogger, null)
    expect(logger).toBeNull()
  })

  it('passes config to DevtoolsLogger', () => {
    const injector = createInjectorWith(undefined, withDevtools({ logOperations: false }))
    const logger = injector.get(DevtoolsLogger)
    // Logger is created — config is internal, but we can verify it exists
    expect(logger).toBeInstanceOf(DevtoolsLogger)
  })

  it('works alongside config', () => {
    const injector = createInjectorWith({ staleTime: 5_000 }, withDevtools())
    const config = injector.get(ZIFLUX_CONFIG)
    const registry = injector.get(CacheRegistry, null)
    expect(config.staleTime).toBe(5_000)
    expect(registry).not.toBeNull()
  })

  it('auto-registers DataCache when withDevtools is active', () => {
    const injector = createInjectorWith(undefined, withDevtools())
    const registry = injector.get(CacheRegistry)
    runInInjectionContext(injector, () => new DataCache<string>({ name: 'test' }))

    expect(registry.caches().has('test')).toBe(true)
  })
})

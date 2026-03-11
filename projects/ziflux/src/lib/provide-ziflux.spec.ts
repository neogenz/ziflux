import { describe, it, expect } from 'vitest'
import { Injector, EnvironmentInjector, createEnvironmentInjector } from '@angular/core'
import { provideZiflux, ZIFLUX_CONFIG } from './provide-ziflux'

function createInjectorWith(config?: Parameters<typeof provideZiflux>[0]): EnvironmentInjector {
  const parent = Injector.create({ providers: [] }) as EnvironmentInjector
  return createEnvironmentInjector([provideZiflux(config)], parent)
}

describe('provideZiflux', () => {
  it('provides default config when called without args', () => {
    const injector = createInjectorWith()
    const config = injector.get(ZIFLUX_CONFIG)
    expect(config).toEqual({ staleTime: 30_000, gcTime: 300_000 })
  })

  it('overrides staleTime', () => {
    const injector = createInjectorWith({ staleTime: 5_000 })
    const config = injector.get(ZIFLUX_CONFIG)
    expect(config.staleTime).toBe(5_000)
    expect(config.gcTime).toBe(300_000)
  })

  it('overrides gcTime', () => {
    const injector = createInjectorWith({ gcTime: 60_000 })
    const config = injector.get(ZIFLUX_CONFIG)
    expect(config.staleTime).toBe(30_000)
    expect(config.gcTime).toBe(60_000)
  })

  it('overrides both', () => {
    const injector = createInjectorWith({ staleTime: 1_000, gcTime: 10_000 })
    const config = injector.get(ZIFLUX_CONFIG)
    expect(config).toEqual({ staleTime: 1_000, gcTime: 10_000 })
  })
})

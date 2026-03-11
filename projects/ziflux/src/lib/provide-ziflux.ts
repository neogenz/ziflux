import { type EnvironmentProviders, InjectionToken, makeEnvironmentProviders } from '@angular/core'
import type { ZifluxConfig } from './types'

const ZIFLUX_DEFAULTS: ZifluxConfig = {
  staleTime: 30_000,
  expireTime: 300_000,
}

export const ZIFLUX_CONFIG = new InjectionToken<ZifluxConfig>('ZIFLUX_CONFIG')

export function provideZiflux(config?: Partial<ZifluxConfig>): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: ZIFLUX_CONFIG, useValue: { ...ZIFLUX_DEFAULTS, ...config } },
  ])
}

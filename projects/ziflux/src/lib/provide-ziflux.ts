import { type EnvironmentProviders, InjectionToken, makeEnvironmentProviders } from '@angular/core'
import { CacheRegistry } from './cache-registry'
import { DevtoolsLogger } from './devtools-logger'
import type { DevtoolsConfig, ZifluxConfig, ZifluxFeature } from './types'

const ZIFLUX_DEFAULTS: ZifluxConfig = {
  staleTime: 30_000,
  expireTime: 300_000,
}

export const ZIFLUX_CONFIG = new InjectionToken<ZifluxConfig>('ZIFLUX_CONFIG')

export function provideZiflux(
  config?: Partial<ZifluxConfig>,
  ...features: ZifluxFeature[]
): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: ZIFLUX_CONFIG, useValue: { ...ZIFLUX_DEFAULTS, ...config } },
    ...features,
  ])
}

export function withDevtools(config?: DevtoolsConfig): ZifluxFeature {
  return makeEnvironmentProviders([
    CacheRegistry,
    { provide: DevtoolsLogger, useFactory: () => new DevtoolsLogger(config) },
  ]) as ZifluxFeature
}

import { type EnvironmentProviders, InjectionToken, makeEnvironmentProviders } from '@angular/core'
import { CacheRegistry } from './cache-registry'
import { DevtoolsLogger } from './devtools-logger'
import type { DevtoolsConfig, ZifluxConfig, ZifluxFeature } from './types'

const ZIFLUX_DEFAULTS: ZifluxConfig = {
  staleTime: 30_000,
  expireTime: 300_000,
}

/** Injection token that holds the resolved global `ZifluxConfig`. */
export const ZIFLUX_CONFIG = new InjectionToken<ZifluxConfig>('ZIFLUX_CONFIG')

/**
 * Registers ziflux global configuration and optional features in the Angular
 * environment injector. Call once in `app.config.ts`.
 *
 * Defaults: `staleTime = 30 000 ms`, `expireTime = 300 000 ms`.
 *
 * @example
 * ```ts
 * // app.config.ts
 * export const appConfig: ApplicationConfig = {
 *   providers: [
 *     provideZiflux({ staleTime: 60_000 }, withDevtools()),
 *   ],
 * };
 * ```
 */
export function provideZiflux(
  config?: Partial<ZifluxConfig>,
  ...features: ZifluxFeature[]
): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: ZIFLUX_CONFIG, useValue: { ...ZIFLUX_DEFAULTS, ...config } },
    ...features,
  ])
}

/**
 * Enables the ziflux devtools: a floating cache-inspector overlay and
 * structured console logging for cache reads, writes, and invalidations.
 *
 * Pass to `provideZiflux()` as a feature — has no effect in production builds
 * unless explicitly configured.
 */
export function withDevtools(config?: DevtoolsConfig): ZifluxFeature {
  return makeEnvironmentProviders([
    CacheRegistry,
    { provide: DevtoolsLogger, useFactory: () => new DevtoolsLogger(config) },
  ]) as ZifluxFeature
}

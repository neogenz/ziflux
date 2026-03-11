import { isDevMode } from '@angular/core'
import type { DevtoolsConfig } from './types'

const BADGE = 'padding:2px 6px;border-radius:3px;font-weight:600;font-size:11px;'
const ZIFLUX = `background:#f97316;color:#fff;${BADGE}`
const NAME = `background:#334155;color:#fff;${BADGE}`
const GREEN = `background:#22c55e;color:#fff;${BADGE}`
const ORANGE = `background:#f59e0b;color:#fff;${BADGE}`
const RED = `background:#ef4444;color:#fff;${BADGE}`
const BLUE = `background:#3b82f6;color:#fff;${BADGE}`
const RESET = 'color:inherit'

export class DevtoolsLogger {
  readonly #enabled: boolean

  constructor(config?: DevtoolsConfig) {
    this.#enabled = (config?.logOperations ?? true) && isDevMode()
  }

  logSet(cacheName: string, key: string[], data: unknown): void {
    if (!this.#enabled) return
    console.log(
      `%c ziflux %c ${cacheName} %c SET %c ${key.join(' > ')}`,
      ZIFLUX,
      NAME,
      GREEN,
      RESET,
      data,
    )
  }

  logInvalidate(cacheName: string, prefix: string[]): void {
    if (!this.#enabled) return
    console.warn(
      `%c ziflux %c ${cacheName} %c INVALIDATE %c ${prefix.join(' > ')}`,
      ZIFLUX,
      NAME,
      ORANGE,
      RESET,
    )
  }

  logEvict(cacheName: string, key: string[]): void {
    if (!this.#enabled) return
    console.log(
      `%c ziflux %c ${cacheName} %c EVICT %c ${key.join(' > ')}`,
      ZIFLUX,
      NAME,
      RED,
      RESET,
    )
  }

  logClear(cacheName: string): void {
    if (!this.#enabled) return
    console.warn(`%c ziflux %c ${cacheName} %c CLEAR`, ZIFLUX, NAME, RED)
  }

  logDeduplicate(cacheName: string, key: string[], hit: boolean): void {
    if (!this.#enabled) return
    console.debug(
      `%c ziflux %c ${cacheName} %c ${hit ? 'DEDUP HIT' : 'DEDUP MISS'} %c ${key.join(' > ')}`,
      ZIFLUX,
      NAME,
      BLUE,
      RESET,
    )
  }
}

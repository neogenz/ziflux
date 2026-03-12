import { computed, type Signal } from '@angular/core'

/**
 * Combines multiple boolean loading signals into a single `Signal<boolean>`
 * that is `true` when at least one of the inputs is `true`.
 *
 * Does not require an injection context.
 */
export function anyLoading(...signals: Signal<boolean>[]): Signal<boolean> {
  return computed(() => signals.some(s => s()))
}

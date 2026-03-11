import { computed, type Signal } from '@angular/core'

export function anyLoading(...signals: Signal<boolean>[]): Signal<boolean> {
  return computed(() => signals.some(s => s()))
}

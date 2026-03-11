import { signal } from '@angular/core'
import { describe, it, expect } from 'vitest'
import { anyLoading } from './any-loading'

describe('anyLoading', () => {
  it('returns false when all signals are false', () => {
    const a = signal(false)
    const b = signal(false)
    expect(anyLoading(a, b)()).toBe(false)
  })

  it('returns true when one signal is true', () => {
    const a = signal(false)
    const b = signal(true)
    expect(anyLoading(a, b)()).toBe(true)
  })

  it('returns true when multiple signals are true', () => {
    const a = signal(true)
    const b = signal(true)
    expect(anyLoading(a, b)()).toBe(true)
  })

  it('returns false with no arguments', () => {
    expect(anyLoading()()).toBe(false)
  })

  it('reacts to signal changes', () => {
    const a = signal(false)
    const b = signal(false)
    const result = anyLoading(a, b)

    expect(result()).toBe(false)
    a.set(true)
    expect(result()).toBe(true)
    a.set(false)
    expect(result()).toBe(false)
  })
})

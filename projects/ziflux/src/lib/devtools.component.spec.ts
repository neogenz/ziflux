import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { Component } from '@angular/core'
import { TestBed, type ComponentFixture } from '@angular/core/testing'
import { ZifluxDevtoolsComponent } from './devtools.component'
import { CacheRegistry } from './cache-registry'
import { DataCache } from './data-cache'
import { provideZiflux, withDevtools } from './provide-ziflux'

@Component({
  template: '<ziflux-devtools />',
  imports: [ZifluxDevtoolsComponent],
})
class TestHostComponent {} // eslint-disable-line @typescript-eslint/no-extraneous-class

describe('ZifluxDevtoolsComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>
  let el: HTMLElement

  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function setup(withRegistry = true) {
    TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: withRegistry ? [provideZiflux(undefined, withDevtools())] : [provideZiflux()],
    })
    fixture = TestBed.createComponent(TestHostComponent)
    el = fixture.nativeElement as HTMLElement
    fixture.detectChanges()
  }

  /** Query and assert element exists, returns narrowed HTMLElement */
  function qr(selector: string): HTMLElement {
    const result = el.querySelector<HTMLElement>(selector)
    if (!result) throw new Error(`Expected element "${selector}" to exist`)
    return result
  }

  function q(selector: string): HTMLElement | null {
    return el.querySelector(selector)
  }

  function click(selector: string): void {
    qr(selector).click()
    fixture.detectChanges()
  }

  function openPanel(): void {
    click('.toggle-btn')
  }

  function registerCache(name: string, entries?: [string[], string][]): DataCache<string> {
    const registry = TestBed.inject(CacheRegistry)
    const cache = TestBed.runInInjectionContext(() => new DataCache<string>({ name }))
    for (const [key, val] of entries ?? []) {
      cache.set(key, val)
    }
    registry.register(cache as DataCache<unknown>)
    return cache
  }

  function refreshAndDetect(): void {
    vi.advanceTimersByTime(1000)
    fixture.detectChanges()
  }

  it('renders toggle button in dev mode', () => {
    setup()
    const btn = qr('.toggle-btn')
    expect(btn.textContent.trim()).toBe('Z')
  })

  it('shows "No caches registered" when no caches exist', () => {
    setup()
    openPanel()
    expect(qr('.empty').textContent).toContain('No caches registered')
  })

  it('opens panel on toggle click', () => {
    setup()
    expect(q('.panel')).toBeNull()
    openPanel()
    expect(q('.panel')).not.toBeNull()
  })

  it('closes panel on backdrop click', () => {
    setup()
    openPanel()
    expect(q('.panel')).not.toBeNull()
    click('.backdrop')
    expect(q('.panel')).toBeNull()
  })

  it('closes panel on close button click', () => {
    setup()
    openPanel()
    click('.close-btn')
    expect(q('.panel')).toBeNull()
  })

  it('displays cache entries after interval refresh', () => {
    setup()
    registerCache('test', [[['key', 'one'], 'hello']])
    openPanel()
    refreshAndDetect()

    expect(qr('.cache-name').textContent).toBe('test')
  })

  it('expands cache section on header click', () => {
    setup()
    registerCache('orders', [[['order', 'list'], 'data']])
    openPanel()
    refreshAndDetect()
    click('.cache-header')

    expect(qr('.entry-key').textContent).toBe('order > list')
  })

  it('shows state badges with correct state', () => {
    setup()
    registerCache('test', [[['fresh-key'], 'fresh-data']])
    openPanel()
    refreshAndDetect()
    click('.cache-header')

    const badge = qr('.state-badge')
    expect(badge.textContent.trim()).toBe('FRESH')
    expect(badge.getAttribute('data-state')).toBe('fresh')
  })

  it('shows data preview on entry click', () => {
    setup()
    registerCache('test', [[['key'], 'preview-data']])
    openPanel()
    refreshAndDetect()
    click('.cache-header')
    click('.entry-row')

    expect(qr('.data-preview').textContent).toContain('preview-data')
  })

  it('gracefully handles missing registry', () => {
    setup(false)
    expect(q('.toggle-btn')).not.toBeNull()
    openPanel()
    expect(q('.empty')).not.toBeNull()
  })

  it('toggles panel with keyboard shortcut', () => {
    setup()
    expect(q('.panel')).toBeNull()

    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Z', ctrlKey: true, shiftKey: true }),
    )
    fixture.detectChanges()
    expect(q('.panel')).not.toBeNull()

    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Z', ctrlKey: true, shiftKey: true }),
    )
    fixture.detectChanges()
    expect(q('.panel')).toBeNull()
  })

  it('displays stats in header', () => {
    setup()
    registerCache('test', [
      [['a'], 'val-a'],
      [['b'], 'val-b'],
    ])
    openPanel()
    refreshAndDetect()

    const stats = qr('.stats')
    expect(stats.textContent).toContain('2 entries')
    expect(stats.textContent).toContain('fresh')
  })
})

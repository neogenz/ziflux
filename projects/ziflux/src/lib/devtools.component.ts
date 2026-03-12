import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  isDevMode,
  PLATFORM_ID,
  signal,
} from '@angular/core'
import { isPlatformBrowser } from '@angular/common'
import { CacheRegistry } from './cache-registry'
import type { CacheInspection } from './types'

interface InspectionEntry {
  name: string
  inspection: CacheInspection<unknown>
}

function formatMs(ms: number): string {
  if (ms <= 0) return '—'
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`
  return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`
}

function previewData(data: unknown): string {
  const json = JSON.stringify(data, null, 2)
  return json.length > 200 ? json.slice(0, 200) + '…' : json
}

@Component({
  selector: 'ziflux-devtools',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown)': 'onKeydown($event)',
  },
  template: `
    @if (devMode) {
      @if (!panelOpen()) {
        <button class="toggle-btn" (click)="panelOpen.set(true)">Z</button>
      }

      @if (panelOpen()) {
        <button
          class="backdrop"
          aria-label="Close devtools"
          (click)="panelOpen.set(false)"
        ></button>
        <div class="panel">
          <div class="header">
            <span class="title">Ziflux Devtools</span>
            <span class="stats">{{ stats() }}</span>
            <button class="close-btn" (click)="panelOpen.set(false)">&times;</button>
          </div>

          <div class="content">
            @for (cache of inspections(); track cache.name) {
              <div class="cache-section">
                <button class="cache-header" (click)="toggleCache(cache.name)">
                  <span class="cache-name">{{ cache.name }}</span>
                  <span class="version-badge">v{{ cache.inspection.version }}</span>
                  <span class="entry-count">{{ cache.inspection.size }} entries</span>
                  <span class="chevron">{{ isCacheExpanded(cache.name) ? '▾' : '▸' }}</span>
                </button>

                @if (isCacheExpanded(cache.name)) {
                  <div class="entries">
                    <div class="entry-header-row">
                      <span class="col-key">Key</span>
                      <span class="col-state">State</span>
                      <span class="col-ttl">TTL Stale</span>
                      <span class="col-ttl">TTL Expire</span>
                      <span class="col-ttl">Age</span>
                    </div>

                    @for (entry of cache.inspection.entries; track $index) {
                      <button
                        class="entry-row"
                        (click)="toggleEntry(cache.name + ':' + entry.key.join('>'))"
                      >
                        <span class="col-key entry-key">{{ entry.key.join(' > ') }}</span>
                        <span class="col-state">
                          <span class="state-badge" [attr.data-state]="entry.state">
                            {{ entry.state.toUpperCase() }}
                          </span>
                        </span>
                        <span class="col-ttl">{{ fmtMs(entry.timeToStale) }}</span>
                        <span class="col-ttl">{{ fmtMs(entry.timeToExpire) }}</span>
                        <span class="col-ttl">{{ fmtMs(entry.age) }}</span>
                      </button>

                      @if (isEntryExpanded(cache.name + ':' + entry.key.join('>'))) {
                        <pre class="data-preview">{{ preview(entry.data) }}</pre>
                      }
                    }

                    @if (cache.inspection.inFlightKeys.length > 0) {
                      <div class="in-flight-section">
                        <span class="in-flight-label">In-flight</span>
                        @for (key of cache.inspection.inFlightKeys; track $index) {
                          <span class="flight-key">{{ key.join(' > ') }}</span>
                        }
                      </div>
                    }
                  </div>
                }
              </div>
            } @empty {
              <div class="empty">No caches registered</div>
            }
          </div>
        </div>
      }
    }
  `,
  styles: `
    :host {
      --zf-orange: #f97316;
      --zf-bg: #1a1a2e;
      --zf-surface: #16213e;
      --zf-text: #e2e8f0;
      --zf-text-dim: #94a3b8;
      --zf-border: #334155;
      --zf-fresh: #22c55e;
      --zf-stale: #f59e0b;
      --zf-expired: #ef4444;
      --zf-blue: #3b82f6;
      font-family: ui-monospace, 'Cascadia Code', 'Fira Code', Menlo, Monaco, monospace;
      font-size: 12px;
      line-height: 1.4;
    }

    @media (prefers-color-scheme: light) {
      :host {
        --zf-bg: #f8fafc;
        --zf-surface: #ffffff;
        --zf-text: #1e293b;
        --zf-text-dim: #64748b;
        --zf-border: #e2e8f0;
      }
    }

    .toggle-btn {
      position: fixed;
      bottom: 16px;
      right: 16px;
      z-index: 99999;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: none;
      background: var(--zf-orange);
      color: #fff;
      font-weight: 700;
      font-size: 16px;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      transition:
        transform 0.15s,
        box-shadow 0.15s;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .toggle-btn:hover {
      transform: scale(1.1);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
    }

    .backdrop {
      position: fixed;
      inset: 0;
      z-index: 99998;
      background: rgba(0, 0, 0, 0.3);
      border: none;
      cursor: default;
    }

    .panel {
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      width: 380px;
      max-width: 90vw;
      z-index: 99999;
      background: var(--zf-bg);
      color: var(--zf-text);
      display: flex;
      flex-direction: column;
      box-shadow: -4px 0 24px rgba(0, 0, 0, 0.3);
      overflow: hidden;
    }

    .header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      border-bottom: 1px solid var(--zf-border);
      background: var(--zf-surface);
      flex-shrink: 0;
    }
    .title {
      font-weight: 700;
      font-size: 13px;
      color: var(--zf-orange);
    }
    .stats {
      flex: 1;
      color: var(--zf-text-dim);
      font-size: 11px;
      text-align: right;
    }
    .close-btn {
      background: none;
      border: none;
      color: var(--zf-text-dim);
      font-size: 18px;
      cursor: pointer;
      padding: 0 4px;
      line-height: 1;
    }
    .close-btn:hover {
      color: var(--zf-text);
    }

    .content {
      flex: 1;
      overflow-y: auto;
      padding: 8px 0;
    }

    .cache-section {
      border-bottom: 1px solid var(--zf-border);
    }
    .cache-header {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 8px 16px;
      background: none;
      border: none;
      color: var(--zf-text);
      cursor: pointer;
      font-family: inherit;
      font-size: 12px;
      text-align: left;
    }
    .cache-header:hover {
      background: var(--zf-surface);
    }
    .cache-name {
      font-weight: 600;
    }
    .version-badge {
      background: var(--zf-border);
      color: var(--zf-text-dim);
      padding: 1px 6px;
      border-radius: 3px;
      font-size: 10px;
    }
    .entry-count {
      color: var(--zf-text-dim);
      font-size: 11px;
      flex: 1;
      text-align: right;
    }
    .chevron {
      color: var(--zf-text-dim);
      font-size: 10px;
    }

    .entries {
      padding: 0 8px 8px;
    }
    .entry-header-row {
      display: flex;
      gap: 4px;
      padding: 4px 8px;
      color: var(--zf-text-dim);
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .entry-row {
      display: flex;
      align-items: center;
      gap: 4px;
      width: 100%;
      padding: 4px 8px;
      background: none;
      border: none;
      border-radius: 4px;
      color: var(--zf-text);
      cursor: pointer;
      font-family: inherit;
      font-size: 11px;
      text-align: left;
    }
    .entry-row:hover {
      background: var(--zf-surface);
    }
    .col-key {
      flex: 2;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .col-state {
      flex: 0 0 60px;
      text-align: center;
    }
    .col-ttl {
      flex: 0 0 56px;
      text-align: right;
      color: var(--zf-text-dim);
    }
    .entry-key {
      font-weight: 500;
    }
    .state-badge {
      display: inline-block;
      padding: 1px 6px;
      border-radius: 3px;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.3px;
    }
    .state-badge[data-state='fresh'] {
      background: color-mix(in srgb, var(--zf-fresh) 20%, transparent);
      color: var(--zf-fresh);
    }
    .state-badge[data-state='stale'] {
      background: color-mix(in srgb, var(--zf-stale) 20%, transparent);
      color: var(--zf-stale);
    }
    .state-badge[data-state='expired'] {
      background: color-mix(in srgb, var(--zf-expired) 20%, transparent);
      color: var(--zf-expired);
    }

    .data-preview {
      margin: 4px 8px 8px;
      padding: 8px;
      background: var(--zf-surface);
      border: 1px solid var(--zf-border);
      border-radius: 4px;
      font-size: 10px;
      color: var(--zf-text-dim);
      overflow-x: auto;
      white-space: pre-wrap;
      word-break: break-all;
    }

    .in-flight-section {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 8px;
      margin-top: 4px;
    }
    .in-flight-label {
      font-size: 10px;
      font-weight: 600;
      color: var(--zf-blue);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .flight-key {
      font-size: 10px;
      color: var(--zf-text-dim);
      background: var(--zf-surface);
      padding: 2px 6px;
      border-radius: 3px;
    }

    .empty {
      padding: 32px 16px;
      text-align: center;
      color: var(--zf-text-dim);
      font-size: 13px;
    }
  `,
})
export class ZifluxDevtoolsComponent {
  readonly devMode = isDevMode()
  readonly panelOpen = signal(false)
  readonly inspections = signal<InspectionEntry[]>([])

  readonly #registry = inject(CacheRegistry, { optional: true })
  readonly #isBrowser = isPlatformBrowser(inject(PLATFORM_ID))
  readonly #expandedCaches = signal(new Set<string>())
  readonly #expandedEntries = signal(new Set<string>())

  readonly stats = computed(() => {
    const all = this.inspections()
    const entries = all.flatMap(c => c.inspection.entries)
    const fresh = entries.filter(e => e.state === 'fresh').length
    const stale = entries.filter(e => e.state === 'stale').length
    const inFlight = all.reduce((sum, c) => sum + c.inspection.inFlightKeys.length, 0)
    return `${entries.length} entries · ${fresh} fresh · ${stale} stale · ${inFlight} in-flight`
  })

  constructor() {
    if (!this.devMode || !this.#isBrowser) return

    const destroyRef = inject(DestroyRef)
    const id = setInterval(() => {
      this.#refresh()
    }, 1000)
    destroyRef.onDestroy(() => {
      clearInterval(id)
    })
    this.#refresh()
  }

  #refresh(): void {
    if (this.#registry) {
      this.inspections.set(this.#registry.inspectAll())
    }
  }

  toggleCache(name: string): void {
    const next = new Set(this.#expandedCaches())
    if (next.has(name)) next.delete(name)
    else next.add(name)
    this.#expandedCaches.set(next)
  }

  isCacheExpanded(name: string): boolean {
    return this.#expandedCaches().has(name)
  }

  toggleEntry(id: string): void {
    const next = new Set(this.#expandedEntries())
    if (next.has(id)) next.delete(id)
    else next.add(id)
    this.#expandedEntries.set(next)
  }

  isEntryExpanded(id: string): boolean {
    return this.#expandedEntries().has(id)
  }

  fmtMs(ms: number): string {
    return formatMs(ms)
  }

  preview(data: unknown): string {
    return previewData(data)
  }

  onKeydown(event: KeyboardEvent): void {
    if (!this.#isBrowser) return
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'Z') {
      event.preventDefault()
      this.panelOpen.update(v => !v)
    }
  }
}

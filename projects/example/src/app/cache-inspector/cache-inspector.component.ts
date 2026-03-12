import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core'
import { CacheRegistry } from 'ziflux'
import type { CacheEntryInfo, CacheInspection } from 'ziflux'
import { TodoApi } from '../todo/todo.api'

@Component({
  selector: 'app-cache-inspector',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: block;
    }

    h1 {
      font-size: 1.5rem;
      font-weight: 700;
      margin: 0 0 8px;
      color: var(--color-text);
    }

    .header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 12px;
    }

    .global-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .empty-state {
      text-align: center;
      padding: 48px 24px;
      color: var(--color-text-muted);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 8px;
    }

    .cache-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      margin-bottom: 16px;
      overflow: hidden;
    }

    .cache-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: var(--color-surface);
      border-bottom: 1px solid var(--color-border);
      flex-wrap: wrap;
    }

    .cache-name {
      font-weight: 700;
      font-size: 1rem;
      font-family: monospace;
      color: var(--color-text);
    }

    .version-badge {
      font-size: 0.75rem;
      padding: 2px 8px;
      border-radius: 12px;
      background: var(--color-primary);
      color: #fff;
      font-weight: 600;
    }

    .entry-count {
      font-size: 0.8rem;
      color: var(--color-text-muted);
    }

    .cache-actions {
      display: flex;
      gap: 8px;
      margin-left: auto;
      flex-wrap: wrap;
    }

    .cache-config {
      display: flex;
      gap: 20px;
      padding: 8px 16px;
      font-size: 0.8rem;
      color: var(--color-text-muted);
      border-bottom: 1px solid var(--color-border);
    }

    .config-item span {
      font-weight: 600;
      color: var(--color-text);
    }

    .no-entries {
      padding: 16px;
      font-size: 0.85rem;
      color: var(--color-text-muted);
      font-style: italic;
    }

    .entry-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.82rem;
    }

    .entry-table th {
      text-align: left;
      padding: 8px 12px;
      font-weight: 600;
      color: var(--color-text-muted);
      border-bottom: 1px solid var(--color-border);
      white-space: nowrap;
    }

    .entry-table td {
      padding: 8px 12px;
      border-bottom: 1px solid var(--color-border);
      vertical-align: top;
    }

    .entry-table tr:last-child td {
      border-bottom: none;
    }

    .key-cell {
      font-family: monospace;
      color: var(--color-text);
    }

    .data-preview {
      font-family: monospace;
      font-size: 0.78rem;
      color: var(--color-text-muted);
      max-width: 200px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .state-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .state-fresh {
      background: rgba(34, 197, 94, 0.15);
      color: var(--color-success, #16a34a);
    }

    .state-stale {
      background: rgba(234, 179, 8, 0.15);
      color: var(--color-warning, #ca8a04);
    }

    .state-expired {
      background: rgba(239, 68, 68, 0.15);
      color: var(--color-danger, #dc2626);
    }

    .inflight-section {
      padding: 8px 16px 12px;
      border-top: 1px solid var(--color-border);
    }

    .inflight-title {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--color-text-muted);
      margin-bottom: 4px;
    }

    .inflight-key {
      font-family: monospace;
      font-size: 0.78rem;
      color: var(--color-text);
    }

    .cleanup-msg {
      font-size: 0.8rem;
      color: var(--color-success, #16a34a);
      font-weight: 600;
    }

    button {
      padding: 6px 12px;
      border: 1px solid var(--color-border);
      border-radius: 6px;
      background: var(--color-surface);
      color: var(--color-text);
      font-size: 0.82rem;
      cursor: pointer;
      transition:
        background 0.15s,
        border-color 0.15s;
    }

    button:hover {
      background: var(--color-border);
    }

    button.primary {
      background: var(--color-primary);
      color: #fff;
      border-color: var(--color-primary);
    }

    button.primary:hover {
      opacity: 0.85;
    }

    button.danger {
      border-color: var(--color-danger, #dc2626);
      color: var(--color-danger, #dc2626);
    }

    button.danger:hover {
      background: rgba(239, 68, 68, 0.08);
    }
  `,
  template: `
    <div class="header-row">
      <h1>Cache Inspector</h1>
      <div class="global-actions">
        <button class="primary" (click)="prefetchTodo1()">Prefetch Todo #1</button>
        <button (click)="refresh()">Refresh</button>
      </div>
    </div>

    @if (inspections().length === 0) {
      <div class="empty-state">
        No caches registered. Navigate to Todos first to populate caches.
      </div>
    }

    @for (entry of inspections(); track entry.name) {
      <div class="cache-card">
        <div class="cache-header">
          <span class="cache-name">{{ entry.name }}</span>
          <span class="version-badge">v{{ entry.inspection.version }}</span>
          <span class="entry-count"
            >{{ entry.inspection.size }}
            {{ entry.inspection.size === 1 ? 'entry' : 'entries' }}</span
          >
          <div class="cache-actions">
            @if (cleanupMessages()[entry.name]; as msg) {
              <span class="cleanup-msg">{{ msg }}</span>
            }
            <button (click)="invalidateAll(entry.name)">Invalidate All</button>
            <button (click)="cleanup(entry.name)">Cleanup Expired</button>
            <button class="danger" (click)="clear(entry.name)">Clear</button>
          </div>
        </div>

        <div class="cache-config">
          <div class="config-item">
            staleTime: <span>{{ formatMs(entry.inspection.config.staleTime) }}</span>
          </div>
          <div class="config-item">
            expireTime: <span>{{ formatMs(entry.inspection.config.expireTime) }}</span>
          </div>
          @if (entry.inspection.config.cleanupInterval) {
            <div class="config-item">
              cleanupInterval: <span>{{ formatMs(entry.inspection.config.cleanupInterval) }}</span>
            </div>
          }
        </div>

        @if (entry.inspection.entries.length) {
          <table class="entry-table">
            <thead>
              <tr>
                <th>Key</th>
                <th>State</th>
                <th>Age</th>
                <th>Time to Stale</th>
                <th>Time to Expire</th>
                <th>Data Preview</th>
              </tr>
            </thead>
            <tbody>
              @for (e of entry.inspection.entries; track e.key) {
                <tr>
                  <td class="key-cell">{{ formatKey(e.key) }}</td>
                  <td>
                    <span class="state-badge" [class]="stateBadgeClass(e)">{{ e.state }}</span>
                  </td>
                  <td>{{ formatMs(e.age) }}</td>
                  <td>{{ e.fresh ? formatMs(e.timeToStale) : '—' }}</td>
                  <td>{{ e.expired ? '—' : formatMs(e.timeToExpire) }}</td>
                  <td class="data-preview" [title]="fullPreview(e.data)">{{ preview(e.data) }}</td>
                </tr>
              }
            </tbody>
          </table>
        } @else {
          <div class="no-entries">No entries cached.</div>
        }

        @if (entry.inspection.inFlightKeys.length) {
          <div class="inflight-section">
            <div class="inflight-title">In-flight ({{ entry.inspection.inFlightKeys.length }})</div>
            @for (k of entry.inspection.inFlightKeys; track k) {
              <div class="inflight-key">{{ formatKey(k) }}</div>
            }
          </div>
        }
      </div>
    }
  `,
})
export class CacheInspectorComponent {
  readonly #registry = inject(CacheRegistry)
  readonly #todoApi = inject(TodoApi)
  readonly #destroyRef = inject(DestroyRef)

  readonly #refreshTick = signal(0)
  readonly cleanupMessages = signal<Record<string, string>>({})

  readonly inspections = computed(() => {
    this.#refreshTick()
    return this.#registry.inspectAll()
  })

  constructor() {
    afterNextRender(() => {
      const id = setInterval(() => {
        this.#refreshTick.update(v => v + 1)
      }, 1000)
      this.#destroyRef.onDestroy(() => clearInterval(id))
    })
  }

  refresh(): void {
    this.#refreshTick.update(v => v + 1)
  }

  invalidateAll(cacheName: string): void {
    const cache = this.#registry.caches().get(cacheName)
    cache?.invalidate([])
    this.refresh()
  }

  clear(cacheName: string): void {
    const cache = this.#registry.caches().get(cacheName)
    cache?.clear()
    this.refresh()
  }

  cleanup(cacheName: string): void {
    const cache = this.#registry.caches().get(cacheName)
    if (!cache) return
    const evicted = cache.cleanup()
    this.cleanupMessages.update(msgs => ({
      ...msgs,
      [cacheName]: `Evicted ${evicted} expired ${evicted === 1 ? 'entry' : 'entries'}`,
    }))
    setTimeout(() => {
      this.cleanupMessages.update(msgs => {
        const next = { ...msgs }
        delete next[cacheName]
        return next
      })
    }, 3000)
    this.refresh()
  }

  async prefetchTodo1(): Promise<void> {
    await this.#todoApi.prefetchById(1)
    this.refresh()
  }

  formatMs(ms: number): string {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
    const minutes = Math.floor(ms / 60_000)
    const seconds = Math.floor((ms % 60_000) / 1000)
    return `${minutes}m ${seconds}s`
  }

  formatKey(key: string[]): string {
    return key.join(' -> ')
  }

  preview(data: unknown): string {
    const json = JSON.stringify(data)
    return json.length > 100 ? json.slice(0, 100) + '...' : json
  }

  fullPreview(data: unknown): string {
    return JSON.stringify(data, null, 2)
  }

  stateBadgeClass(entry: CacheEntryInfo<unknown>): string {
    return `state-${entry.state}`
  }
}

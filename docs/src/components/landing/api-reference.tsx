"use client"

import { useState } from "react"
import { CodeBlock } from "./code-block"

const tabs = [
  {
    id: "data-cache",
    label: "DataCache",
    description: "Own one per domain, in your API service (singleton).",
    code: `class DataCache {
  readonly version: Signal<number>  // auto-increments on invalidate()

  get<T>(key: string[], options?: { staleTime?: number; expireTime?: number }): { data: T; fresh: boolean } | null
  set<T>(key: string[], data: T): void
  invalidate(prefix: string[]): void  // marks stale + bumps version
  wrap<T>(key: string[], obs$: Observable<T>): Observable<T>
  deduplicate<T>(key: string[], fn: () => Promise<T>): Promise<T>
  prefetch<T>(key: string[], fn: () => Promise<T>): Promise<void>
  clear(): void
}`,
    usage: `readonly cache = new DataCache()

// Read from cache
const entry = this.cache.get(['order', 'details', '42'])
if (entry?.fresh) return entry.data

// Invalidate all "order" entries
this.cache.invalidate(['order'])  // prefix match`,
  },
  {
    id: "cached-resource",
    label: "cachedResource()",
    description: "resource() extended with cache awareness. Same mental model.",
    code: `function cachedResource<T, P extends object>(options: {
  cache: DataCache
  cacheKey: string[] | ((params: P) => string[])
  params?: () => P | undefined     // undefined = idle
  loader: (ctx: { params: P; abortSignal: AbortSignal }) => Observable<T> | Promise<T>
  staleTime?: number
  expireTime?: number
  retry?: number | RetryConfig          // auto-retry with exponential backoff
  refetchInterval?: number | (() => number | false)  // polling
}): CachedResourceRef<T>`,
    usage: `interface CachedResourceRef<T> {
  readonly value: Signal<T | undefined>
  readonly status: Signal<ResourceStatus>
  readonly error: Signal<unknown>
  readonly isLoading: Signal<boolean>
  readonly isStale: Signal<boolean>            // SWR in progress
  readonly isInitialLoading: Signal<boolean>   // true only on cold cache
  hasValue(): boolean
  reload(): boolean
  destroy(): void
  set(value: T): void
  update(updater: (prev: T | undefined) => T): void
}

interface RetryConfig {
  maxRetries: number
  baseDelay?: number              // default: 1_000 ms
  maxDelay?: number               // default: 30_000 ms
  retryIf?: (error: unknown) => boolean  // default: retry all
}`,
  },
  {
    id: "cached-mutation",
    label: "cachedMutation()",
    description: "Wraps any mutation with signal-based lifecycle, optimistic updates, and automatic cache invalidation.",
    code: `function cachedMutation<A = void, R = void, C = void>(options: {
  mutationFn: (args: A) => Observable<R> | Promise<R>
  cache?: { invalidate(prefix: string[]): void }
  invalidateKeys?: (args: A, result: R) => string[][]
  onMutate?: (args: A) => C | Promise<C>       // snapshot for rollback
  onSuccess?: (result: R, args: A) => void
  onError?: (error: unknown, args: A, context: C | undefined) => void
}): CachedMutationRef<A, R>`,
    usage: `interface CachedMutationRef<A, R> {
  mutate(...args: A extends void ? [] : [args: A]): Promise<R | undefined>
  readonly status: Signal<CachedMutationStatus>  // 'idle' | 'pending' | 'success' | 'error'
  readonly isPending: Signal<boolean>
  readonly error: Signal<unknown>
  readonly data: Signal<R | undefined>
  reset(): void
}

// Usage — optimistic delete with rollback
readonly deleteMutation = cachedMutation({
  mutationFn: (id: string) => this.#api.delete$(id),
  cache: this.#api.cache,
  invalidateKeys: (id) => [['order']],
  onMutate: (id) => {
    const prev = this.orders.value()
    this.orders.update(list => list?.filter(o => o.id !== id))
    return prev
  },
  onError: (_err, _id, prev) => { if (prev) this.orders.set(prev) },
})`,
  },
  {
    id: "any-loading",
    label: "anyLoading()",
    description: "Aggregate loading state from multiple signals. Returns true if any signal is true.",
    code: `function anyLoading(...signals: Signal<boolean>[]): Signal<boolean>
// Implementation: computed(() => signals.some(s => s()))`,
    usage: `// Combine loading states from multiple resources
readonly isLoading = anyLoading(
  this.orders.isLoading,
  this.products.isLoading,
  this.deleteMutation.isPending,
)

// In template
@if (store.isLoading()) {
  <app-progress-bar />
}`,
  },
  {
    id: "provide-ziflux",
    label: "provideZiflux()",
    description: "Global configuration. One line in app.config.ts.",
    code: `provideZiflux({
  staleTime: 30_000,  // ms before fresh → stale   (default: 30s)
  expireTime: 300_000,    // ms before stale → evicted  (default: 5min)
})`,
    usage: `// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideZiflux({ staleTime: 30_000, expireTime: 300_000 }),
  ],
}

// Priority: constructor arg > global provider > defaults
readonly cache = new DataCache({ staleTime: 60_000 })`,
  },
  {
    id: "with-devtools",
    label: "withDevtools()",
    description: "Enables cache inspector and structured console logging. Only active in dev mode.",
    code: `function withDevtools(config?: DevtoolsConfig): ZifluxFeature

interface DevtoolsConfig {
  logOperations?: boolean  // default: true in dev mode
}`,
    usage: `// app.config.ts
provideZiflux(
  { staleTime: 30_000, expireTime: 300_000 },
  withDevtools()                    // no config needed
)

// Or with custom config
provideZiflux(
  { staleTime: 30_000 },
  withDevtools({ logOperations: false })
)`,
  },
  {
    id: "devtools-component",
    label: "ZifluxDevtoolsComponent",
    description: "Floating overlay for inspecting live cache state. Standalone component.",
    code: `@Component({
  selector: 'ziflux-devtools',
  standalone: true,
})
export class ZifluxDevtoolsComponent`,
    usage: `// In your root component template
<ziflux-devtools />

// Toggle with Ctrl+Shift+Z (Cmd+Shift+Z on Mac)
// Shows per-cache entries, freshness state, TTL, and in-flight requests`,
  },
  {
    id: "cache-registry",
    label: "CacheRegistry",
    description: "Advanced — most apps won't need this directly. Global registry of all DataCache instances.",
    code: `class CacheRegistry {
  readonly caches: Signal<Map<string, DataCache>>
  inspectAll(): { name: string; inspection: CacheInspection<unknown> }[]
}`,
    usage: `// Auto-managed when withDevtools() is enabled
// Useful for building custom monitoring dashboards

const registry = inject(CacheRegistry)
const allCaches = registry.inspectAll()`,
  },
] as const

export function ApiReference() {
  const [activeTab, setActiveTab] = useState<string>("data-cache")
  const active = tabs.find((t) => t.id === activeTab)!

  return (
    <section id="api" className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
      <h2 className="group text-2xl font-bold tracking-tight sm:text-3xl">
        <a href="#api" className="hover:no-underline">API Reference <span className="text-muted-foreground/0 transition-colors group-hover:text-muted-foreground">#</span></a>
      </h2>
      <p className="mt-2 text-muted-foreground">All runtime exports — signatures and usage examples.</p>

      {/* Tabs */}
      <div className="mt-8 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-lg px-3.5 py-2 text-sm font-mono transition-colors ${
              activeTab === tab.id
                ? "bg-accent text-white"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="mt-6">
        <p className="mb-4 text-sm text-muted-foreground">{active.description}</p>

        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Signature
            </p>
            <CodeBlock code={active.code} />
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Usage
            </p>
            <CodeBlock code={active.usage} />
          </div>
        </div>
      </div>
    </section>
  )
}

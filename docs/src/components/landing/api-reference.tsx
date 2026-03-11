"use client"

import { useState } from "react"
import { CodeBlock } from "./code-block"

const tabs = [
  {
    id: "data-cache",
    label: "DataCache<T>",
    description: "Own one per domain, in your API service (singleton).",
    code: `class DataCache<T> {
  readonly version: Signal<number>  // auto-increments on invalidate()

  get(key: string[], options?: { staleTime?: number; gcTime?: number }): { data: T; fresh: boolean } | null
  set(key: string[], data: T): void
  invalidate(prefix: string[]): void  // marks stale + bumps version
  wrap(key: string[], obs$: Observable<T>): Observable<T>
  deduplicate(key: string[], fn: () => Promise<T>): Promise<T>
  prefetch(key: string[], fn: () => Promise<T>): Promise<void>
  clear(): void
}`,
    usage: `readonly cache = new DataCache<Order>()

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
  cache: DataCache<T>
  key: string[] | ((params: P) => string[])
  params?: () => P | undefined     // undefined = idle
  loader: (ctx: { params: P; abortSignal: AbortSignal }) => Observable<T> | Promise<T>
  staleTime?: number
  gcTime?: number
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
}`,
  },
  {
    id: "inject-cached-http",
    label: "injectCachedHttp()",
    description: "HTTP client that auto-populates the cache on GET responses.",
    code: `function injectCachedHttp<T>(cache: DataCache<T>): CachedHttpClient<T>

interface CachedHttpClient<T> {
  get(url: string, key: string[], options?): Observable<T>     // fetches + caches
  post(url: string, body: unknown, options?): Observable<T>    // pass-through
  put(url: string, body: unknown, options?): Observable<T>     // pass-through
  patch(url: string, body: unknown, options?): Observable<T>   // pass-through
  delete(url: string, options?): Observable<T>                 // pass-through
}`,
    usage: `@Injectable({ providedIn: 'root' })
export class ProductApi {
  readonly cache = new DataCache<Product>()
  readonly #http = injectCachedHttp(this.cache)  // must be in injection context

  getAll$(): Observable<Product[]> {
    return this.#http.get('/products', ['product', 'list'])
  }
}`,
  },
  {
    id: "provide-ziflux",
    label: "provideZiflux()",
    description: "Global configuration. One line in app.config.ts.",
    code: `provideZiflux({
  staleTime: 30_000,  // ms before fresh → stale   (default: 30s)
  gcTime: 300_000,    // ms before stale → evicted  (default: 5min)
})`,
    usage: `// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideZiflux({ staleTime: 30_000, gcTime: 300_000 }),
  ],
}

// Priority: constructor arg > global provider > defaults
readonly cache = new DataCache<Order>({ staleTime: 60_000 })`,
  },
] as const

export function ApiReference() {
  const [activeTab, setActiveTab] = useState<string>("data-cache")
  const active = tabs.find((t) => t.id === activeTab)!

  return (
    <section id="api" className="mx-auto max-w-4xl px-6 py-16 sm:py-20">
      <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">API Reference</h2>
      <p className="mt-2 text-muted-foreground">Four exports. Nothing else.</p>

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

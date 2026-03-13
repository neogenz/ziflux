import { CodeBlock } from "./code-block"

const FACTORY_SERVICE_CODE = `@Injectable({ providedIn: 'root' })
export class OrderApiCached {
  readonly #http = inject(HttpClient)
  readonly #cache = new DataCache()

  getAll(params: () => OrderFilters | undefined) {
    return cachedResource({
      cache: this.#cache,
      cacheKey: p => ['order', 'list', p.status],
      params,
      loader: ({ params: p }) => this.#http.get<Order[]>('/orders', { params: { ...p } }),
    })
  }

  getById(id: () => string | null) {
    return cachedResource({
      cache: this.#cache,
      cacheKey: p => ['order', 'details', p.id],
      params: () => { const v = id(); return v ? { id: v } : undefined },
      loader: ({ params: p }) => this.#http.get<Order>(\`/orders/\${p.id}\`),
    })
  }
}`

const FACTORY_CONSUMER_CODE = `readonly #api = inject(OrderApiCached)
readonly filters = signal<OrderFilters>({ status: 'all' })
readonly orders = this.#api.getAll(() => this.filters())`

export function AdvancedUsage() {
  return (
    <section id="advanced-usage" className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
      <h2 className="group text-2xl font-bold tracking-tight sm:text-3xl">
        <a href="#advanced-usage" className="hover:no-underline">Alternative Patterns <span className="text-muted-foreground/0 transition-colors group-hover:text-muted-foreground">#</span></a>
      </h2>
      <p className="mt-2 text-muted-foreground">
        The Guide shows the recommended 3-file pattern. Here&apos;s a leaner alternative for simpler use cases.
      </p>

      {/* Factory Pattern */}
      <div className="mt-10">
        <h3 className="mb-2 text-lg font-semibold">Factory Pattern</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          A singleton service that owns HTTP + cache + factory methods, returning <code>CachedResourceRef</code> directly. The consumer provides reactive params, Angular manages lifecycle. No separate Store needed.
        </p>
        <CodeBlock code={FACTORY_SERVICE_CODE} filename="order.api-cached.ts" />
        <div className="mt-4">
          <p className="mb-2 text-sm font-semibold">Consumer</p>
          <CodeBlock code={FACTORY_CONSUMER_CODE} filename="order-list.component.ts" />
        </div>
        <div className="mt-4 rounded-lg border border-border bg-muted/30 px-5 py-4">
          <p className="text-sm font-semibold">What this gives you</p>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            <li>HTTP + cache + keys in one place (real cohesion)</li>
            <li>Consumer doesn&apos;t wire <code>cache:</code> or <code>cacheKey:</code></li>
            <li><code>CachedResourceRef</code> still returned &mdash; all SWR signals preserved</li>
            <li>Lifecycle managed by Angular&apos;s injection context</li>
          </ul>
        </div>
      </div>

      {/* When to Use Which */}
      <div className="mt-10">
        <h3 className="mb-4 text-lg font-semibold">When to Use Which</h3>
        <div className="grid gap-x-8 gap-y-6 text-sm sm:grid-cols-2">
          <div className="border-l-2 border-accent pl-4">
            <p className="mb-2 font-semibold text-accent">3-file pattern (API + Store + Component)</p>
            <ul className="space-y-1.5 text-muted-foreground">
              <li>Mutations + optimistic updates</li>
              <li>Derived state, complex UI logic</li>
              <li>Multiple resources coordinated</li>
            </ul>
          </div>
          <div className="border-l-2 border-emerald-500 pl-4">
            <p className="mb-2 font-semibold text-emerald-500">Factory pattern (ApiCached + Component)</p>
            <ul className="space-y-1.5 text-muted-foreground">
              <li>Read-only data fetching</li>
              <li>Simple list / detail views</li>
              <li>Fewer files, less boilerplate</li>
            </ul>
          </div>
        </div>
        <p className="mt-6 text-sm text-muted-foreground italic">
          Both patterns use the same library API. <code>cachedResource()</code> works identically in both cases &mdash; this is purely an organizational choice.
        </p>
      </div>
    </section>
  )
}

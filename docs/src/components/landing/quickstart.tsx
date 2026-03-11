import { CodeBlock } from "./code-block"

const CONFIG_CODE = `export const appConfig: ApplicationConfig = {
  providers: [
    provideZiflux({
      staleTime: 30_000,   // 30s — data considered fresh
      gcTime:   300_000,   // 5min — stale data evicted
    }),
  ],
}`

const API_CODE = `@Injectable({ providedIn: 'root' })
export class OrderApi {
  readonly cache = new DataCache<Order>()
  readonly #http = injectCachedHttp(this.cache)

  getAll$(filters: OrderFilters): Observable<Order[]> {
    return this.#http.get('/orders', ['order', 'list', filters.status], {
      params: { ...filters },
    })
  }

  getById$(id: string): Observable<Order> {
    return this.#http.get(\`/orders/\${id}\`, ['order', 'details', id])
  }

  delete$(id: string): Observable<void> {
    return this.#http
      .delete<void>(\`/orders/\${id}\`)
      .pipe(tap(() => this.cache.invalidate(['order'])))
  }
}`

const STORE_CODE = `@Injectable()
export class OrderListStore {
  readonly #api = inject(OrderApi)

  readonly filters = signal<OrderFilters>({ status: 'all', search: '' })

  readonly orders = cachedResource({
    cache: this.#api.cache,
    key: p => ['order', 'list', p.status, p.search],
    params: () => this.filters(),
    loader: ({ params }) => this.#api.getAll$(params),
  })

  setFilters(filters: Partial<OrderFilters>) {
    this.filters.update(f => ({ ...f, ...filters }))
  }
}`

const COMPONENT_CODE = `@Component({
  providers: [OrderListStore],
  template: \`
    @if (store.orders.isInitialLoading()) {
      <app-spinner />
    } @else if (store.orders.value(); as list) {
      <app-order-list [orders]="list" [stale]="store.orders.isStale()" />
    } @else {
      <app-empty-state />
    }
  \`,
})
export class OrderListComponent {
  readonly store = inject(OrderListStore)
}`

const ARCH_BOXES = [
  { label: "Component", scope: "view scope", color: "bg-blue-500/25 border-blue-500/50 text-blue-500" },
  { label: "Store", scope: "route scope", color: "bg-purple-500/25 border-purple-500/50 text-purple-500" },
  { label: "API Service", scope: "root singleton", color: "bg-accent/25 border-accent/50 text-accent" },
  { label: "DataCache", scope: "root singleton", color: "bg-accent/25 border-accent/50 text-accent" },
  { label: "Server", scope: "remote", color: "bg-neutral-500/20 border-neutral-400/40 text-neutral-400" },
]

export function QuickStart() {
  return (
    <section id="quickstart" className="mx-auto max-w-4xl px-6 py-16 sm:py-20">
      <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Quick Start</h2>
      <p className="mt-2 text-muted-foreground">
        ziflux plugs into Angular&apos;s service &rarr; store &rarr; component pattern. Here&apos;s what each layer gets.
      </p>

      {/* Architecture diagram — visual boxes */}
      <div id="architecture" className="mt-8 overflow-x-auto rounded-xl border border-border bg-muted/50 p-6">
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          {ARCH_BOXES.map((box, i) => (
            <div key={box.label} className="flex items-center gap-2 sm:gap-3">
              <div className={`flex flex-col items-center gap-1.5 rounded-lg border px-4 py-3 ${box.color}`}>
                <span className="text-sm font-bold whitespace-nowrap">{box.label}</span>
                <span className="text-[11px] font-medium opacity-60 whitespace-nowrap">{box.scope}</span>
              </div>
              {i < ARCH_BOXES.length - 1 && (
                <span className="text-foreground/40 text-lg font-bold">&rarr;</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step 0: Setup */}
      <div className="mt-10">
        <div className="mb-3 flex items-center gap-3">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">
            0
          </span>
          <h3 className="text-lg font-semibold">Setup</h3>
          <span className="text-xs text-muted-foreground">
            <code>provideZiflux()</code> &mdash; global cache durations
          </span>
        </div>
        <CodeBlock code={CONFIG_CODE} filename="app.config.ts" />
      </div>

      {/* Step 1: API */}
      <div className="mt-10">
        <div className="mb-3 flex items-center gap-3">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">
            1
          </span>
          <h3 className="text-lg font-semibold">API Service</h3>
          <span className="text-xs text-muted-foreground">
            <code>DataCache</code> + <code>injectCachedHttp()</code> &mdash; auto-populates cache on GET
          </span>
        </div>
        <CodeBlock code={API_CODE} filename="order.api.ts" />
      </div>

      {/* Step 2: Store */}
      <div className="mt-10">
        <div className="mb-3 flex items-center gap-3">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">
            2
          </span>
          <h3 className="text-lg font-semibold">Store</h3>
          <span className="text-xs text-muted-foreground">
            <code>cachedResource()</code> &mdash; returns stale data instantly, re-fetches in background
          </span>
        </div>
        <CodeBlock code={STORE_CODE} filename="order-list.store.ts" />
      </div>

      {/* Step 3: Component */}
      <div className="mt-10">
        <div className="mb-3 flex items-center gap-3">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">
            3
          </span>
          <h3 className="text-lg font-semibold">Component</h3>
          <span className="text-xs text-muted-foreground">
            <code>isInitialLoading()</code> + <code>isStale()</code> &mdash; spinner only on first visit
          </span>
        </div>
        <CodeBlock code={COMPONENT_CODE} filename="order-list.component.ts" />
      </div>

      {/* Rules */}
      <div className="mt-10 rounded-xl border border-accent/20 bg-accent/5 p-6">
        <h4 className="mb-3 text-sm font-semibold text-accent">
          Hard rules
        </h4>
        <ol className="space-y-2 text-sm text-muted-foreground">
          <li className="flex gap-2">
            <span className="font-mono text-accent">1.</span>
            Components <span className="font-medium text-foreground">never</span> inject API services directly
          </li>
          <li className="flex gap-2">
            <span className="font-mono text-accent">2.</span>
            HTTP logic lives in the API service, <span className="font-medium text-foreground">never</span> in the store
          </li>
          <li className="flex gap-2">
            <span className="font-mono text-accent">3.</span>
            The store <span className="font-medium text-foreground">never</span> instantiates a DataCache — it reads{" "}
            <code>api.cache</code>
          </li>
          <li className="flex gap-2">
            <span className="font-mono text-accent">4.</span>
            Mutations: store calls API → API invalidates cache
          </li>
        </ol>
      </div>
    </section>
  )
}

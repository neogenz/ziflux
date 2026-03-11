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
  { label: "Component", scope: "view scope", color: "bg-blue-500/25 border-blue-500/50 text-blue-500", ziflux: false },
  { label: "Store", scope: "cachedResource()", color: "bg-purple-500/25 border-purple-500/50 text-purple-500", ziflux: true },
  { label: "API Service", scope: "injectCachedHttp()", color: "bg-accent/25 border-accent/50 text-accent", ziflux: true },
  { label: "DataCache", scope: "root singleton", color: "bg-accent/25 border-accent/50 text-accent", ziflux: true },
  { label: "Server", scope: "remote", color: "bg-neutral-500/20 border-neutral-400/40 text-neutral-400", ziflux: false },
]

export function QuickStart() {
  return (
    <section id="quickstart" className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
      <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Quick Start</h2>
      <p className="mt-2 text-muted-foreground">
        Three files to add SWR caching to any feature.
      </p>

      {/* Architecture diagram — visual boxes */}
      <div id="architecture" className="mt-8 overflow-x-auto rounded-xl border border-border bg-muted/50 p-6">
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          {ARCH_BOXES.map((box, i) => (
            <div key={box.label} className="flex items-center gap-2 sm:gap-3">
              <div className={`relative flex flex-col items-center gap-1.5 rounded-lg border px-4 py-3 ${box.color}`}>
                {box.ziflux && (
                  <span className="absolute -top-2 -right-1 rounded bg-accent px-1.5 py-0.5 text-[9px] font-bold text-white leading-none">
                    ziflux
                  </span>
                )}
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

      {/* Setup */}
      <div className="mt-10">
        <h3 className="mb-3 text-sm font-semibold">
          <code className="text-accent">provideZiflux()</code>
          <span className="ml-2 font-normal text-muted-foreground">— global cache durations</span>
        </h3>
        <CodeBlock code={CONFIG_CODE} filename="app.config.ts" />
      </div>

      {/* API */}
      <div className="mt-8">
        <h3 className="mb-3 text-sm font-semibold">
          <code className="text-accent">DataCache</code> + <code className="text-accent">injectCachedHttp()</code>
          <span className="ml-2 font-normal text-muted-foreground">— auto-populates cache on GET</span>
        </h3>
        <CodeBlock code={API_CODE} filename="order.api.ts" />
      </div>

      {/* Store */}
      <div className="mt-8">
        <h3 className="mb-3 text-sm font-semibold">
          <code className="text-accent">cachedResource()</code>
          <span className="ml-2 font-normal text-muted-foreground">— returns stale data instantly, re-fetches in background</span>
        </h3>
        <CodeBlock code={STORE_CODE} filename="order-list.store.ts" />
      </div>

      {/* Component */}
      <div className="mt-8">
        <h3 className="mb-3 text-sm font-semibold">
          <code className="text-accent">isInitialLoading()</code> + <code className="text-accent">isStale()</code>
          <span className="ml-2 font-normal text-muted-foreground">— spinner only on first visit</span>
        </h3>
        <CodeBlock code={COMPONENT_CODE} filename="order-list.component.ts" />
      </div>

    </section>
  )
}

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
  { label: "Component", scope: "view scope", ziflux: false },
  { label: "Store", scope: "cachedResource()", ziflux: true },
  { label: "API Service", scope: "injectCachedHttp()", ziflux: true },
  { label: "DataCache", scope: "root singleton", ziflux: true },
  { label: "Server", scope: "remote", ziflux: false },
]

export function QuickStart() {
  return (
    <section id="quickstart" className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
      <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Quick Start</h2>
      <p className="mt-2 text-muted-foreground">
        Three files to add SWR caching to any feature.
      </p>

      {/* Architecture diagram — inline text flow */}
      <p id="architecture" className="mt-8 text-sm text-muted-foreground">
        {ARCH_BOXES.map((box, i) => (
          <span key={box.label}>
            <span className="font-medium text-foreground">{box.label}</span>
            {" "}
            <span className={box.ziflux ? "font-mono text-accent" : ""}>{box.scope}</span>
            {i < ARCH_BOXES.length - 1 && <span className="mx-2">&rarr;</span>}
          </span>
        ))}
      </p>

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

import { CodeBlock } from "./code-block"

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

export function QuickStart() {
  return (
    <section id="quickstart" className="mx-auto max-w-4xl px-6 py-16 sm:py-20">
      <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Quick Start</h2>
      <p className="mt-2 text-muted-foreground">
        Every feature follows the same 3-file pattern. Always. No exceptions.
      </p>

      {/* Architecture diagram */}
      <div className="mt-8 overflow-x-auto rounded-xl border border-border bg-muted/50 p-6 font-mono text-sm">
        <pre className="!bg-transparent !border-0 !p-0 text-muted-foreground">
{`Component  →  Store  →  API Service  →  DataCache  →  Server
view scope    route      root             root          remote
              scope      singleton        singleton`}
        </pre>
      </div>

      {/* Step 1: API */}
      <div className="mt-10">
        <div className="mb-3 flex items-center gap-3">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">
            1
          </span>
          <h3 className="text-lg font-semibold">API Service</h3>
          <span className="text-xs text-muted-foreground">
            singleton &middot; owns the cache &middot; owns HTTP
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
            route-scoped &middot; reads api.cache &middot; no HTTP
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
            injects the store &middot; reads signals &middot; zero logic
          </span>
        </div>
        <CodeBlock code={COMPONENT_CODE} filename="order-list.component.ts" />
      </div>

      {/* Rules */}
      <div className="mt-10 rounded-xl border border-accent/20 bg-accent/5 p-6">
        <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-accent">
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

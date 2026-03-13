import { CodeBlock } from "./code-block"

const CONFIG_CODE = `export const appConfig: ApplicationConfig = {
  providers: [
    provideZiflux({
      staleTime: 30_000,   // 30s — data considered fresh
      expireTime:   300_000,   // 5min — stale data evicted
    }),
  ],
}`

const API_CODE = `@Injectable({ providedIn: 'root' })
export class OrderApi {
  readonly cache = new DataCache()
  readonly #http = inject(HttpClient)

  getAll$(filters: OrderFilters): Observable<Order[]> {
    return this.#http.get<Order[]>('/orders', { params: { ...filters } })
  }

  getById$(id: string): Observable<Order> {
    return this.#http.get<Order>(\`/orders/\${id}\`)
  }

  delete$(id: string): Observable<void> {
    return this.#http.delete<void>(\`/orders/\${id}\`)
  }
}`

const STORE_CODE = `@Injectable()
export class OrderListStore {
  readonly #api = inject(OrderApi)

  readonly filters = signal<OrderFilters>({ status: 'all', search: '' })

  readonly orders = cachedResource({
    cache: this.#api.cache,
    cacheKey: params => ['order', 'list', params.status, params.search],
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
    <section id="quickstart" className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
      <h2 className="group text-2xl font-bold tracking-tight sm:text-3xl">
        <a href="#quickstart" className="hover:no-underline">Quick Start <span className="text-muted-foreground/0 transition-colors group-hover:text-muted-foreground">#</span></a>
      </h2>

      {/* Setup */}
      <p className="mt-8 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Setup</p>

      <div className="mt-4">
        <h3 className="mb-3 text-sm font-semibold">
          <code className="text-accent">provideZiflux()</code>
          <span className="ml-2 font-normal text-muted-foreground">— global cache durations</span>
        </h3>
        <CodeBlock code={CONFIG_CODE} filename="app.config.ts" />
      </div>

      {/* Per feature */}
      <p className="mt-10 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Per feature</p>

      <div className="mt-4">
        <h3 className="mb-3 text-sm font-semibold">
          <code className="text-accent">DataCache</code> + <code className="text-accent">HttpClient</code>
          <span className="ml-2 font-normal text-muted-foreground">— cache lives in the API service</span>
        </h3>
        <CodeBlock code={API_CODE} filename="order.api.ts" />
      </div>

      <div className="mt-8">
        <h3 className="mb-3 text-sm font-semibold">
          <code className="text-accent">cachedResource()</code>
          <span className="ml-2 font-normal text-muted-foreground">— returns stale data instantly, re-fetches in background</span>
        </h3>
        <CodeBlock code={STORE_CODE} filename="order-list.store.ts" />
      </div>

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

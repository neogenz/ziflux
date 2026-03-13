import { CodeBlock } from "./code-block"

const INSTALL_CODE = `npm install ziflux`

const CONFIG_CODE = `import { provideZiflux } from 'ziflux'

export const appConfig: ApplicationConfig = {
  providers: [
    provideZiflux({
      staleTime: 30_000,   // 30s — data considered fresh
      expireTime: 300_000, // 5min — stale data evicted
    }),
  ],
}`

const API_CODE = `import { inject, Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { DataCache } from 'ziflux'

@Injectable({ providedIn: 'root' })
export class OrderApi {
  readonly cache = new DataCache()      // ← this is new
  readonly #http = inject(HttpClient)

  getAll$(filters: OrderFilters) {
    return this.#http.get<Order[]>('/orders', { params: { ...filters } })
  }
}`

const STORE_CODE = `import { cachedResource } from 'ziflux'

@Injectable()
export class OrderListStore {
  readonly #api = inject(OrderApi)

  readonly filters = signal<OrderFilters>({ status: 'all' })

  readonly orders = cachedResource({
    cache: this.#api.cache,
    cacheKey: params => ['order', 'list', params.status],
    params: () => this.filters(),
    loader: ({ params }) => this.#api.getAll$(params),
  })
}`

const COMPONENT_CODE = `@Component({
  providers: [OrderListStore],
  template: \`
    @if (store.orders.isInitialLoading()) {
      <app-spinner />
    } @else {
      <app-order-list [orders]="store.orders.value()" />
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

      {/* Step 1 */}
      <p className="mt-8 text-sm font-semibold uppercase tracking-wider text-muted-foreground">1 · Install & configure</p>
      <p className="mt-2 mb-4 text-sm text-muted-foreground">One provider, two durations.</p>
      <div className="space-y-4">
        <CodeBlock code={INSTALL_CODE} language="bash" />
        <CodeBlock code={CONFIG_CODE} filename="app.config.ts" />
      </div>

      {/* Step 2 */}
      <p className="mt-10 text-sm font-semibold uppercase tracking-wider text-muted-foreground">2 · Add a cache to your API service</p>
      <p className="mt-2 mb-4 text-sm text-muted-foreground">Add a DataCache instance to your existing API service. One line.</p>
      <CodeBlock code={API_CODE} filename="order.api.ts" />

      {/* Step 3 */}
      <p className="mt-10 text-sm font-semibold uppercase tracking-wider text-muted-foreground">3 · Use cachedResource()</p>
      <p className="mt-2 mb-4 text-sm text-muted-foreground">Same shape as resource(), plus cache and cacheKey. Returns stale data instantly, re-fetches in background.</p>
      <CodeBlock code={STORE_CODE} filename="order-list.store.ts" />

      {/* Step 4 */}
      <p className="mt-10 text-sm font-semibold uppercase tracking-wider text-muted-foreground">4 · Template</p>
      <p className="mt-2 mb-4 text-sm text-muted-foreground">isInitialLoading() is true only when there's no cached data. Subsequent visits skip the spinner entirely.</p>
      <CodeBlock code={COMPONENT_CODE} filename="order-list.component.ts" />

      {/* Closing */}
      <p className="mt-8 text-sm text-muted-foreground">That's it. Navigate away, come back — data loads instantly from cache.</p>

    </section>
  )
}

import { CodeBlock } from "@/components/shared/code-block"
import { SectionHeading } from "@/components/docs/section-heading"

const INSTALL_CODE = `npm install ngx-ziflux`

const CONFIG_CODE = `import { provideZiflux } from 'ngx-ziflux'

export const appConfig: ApplicationConfig = {
  providers: [
    provideZiflux({
      staleTime: 30_000,   // 30s, data considered fresh
      expireTime: 300_000, // 5min, stale data evicted
    }),
  ],
}`

const API_CODE = `import { inject, Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { DataCache } from 'ngx-ziflux'

@Injectable({ providedIn: 'root' })
export class OrderApi {
  readonly cache = new DataCache()      // ← this is new
  readonly #http = inject(HttpClient)

  getAll$(filters: OrderFilters) {
    return this.#http.get<Order[]>('/orders', { params: { ...filters } })
  }
}`

const STORE_CODE = `import { cachedResource } from 'ngx-ziflux'

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
    <section className="py-10 first:pt-4 sm:py-12">
      <SectionHeading level={2} id="quickstart" label="Quick start">
        Quick start
      </SectionHeading>

      {/* Step 1 */}
      <SectionHeading level={3} id="quickstart-install" label="Install & configure" className="mt-8 text-muted-foreground">
        1 · Install & configure
      </SectionHeading>
      <p className="mt-2 mb-4 text-sm text-muted-foreground">One provider, two durations.</p>
      <div className="space-y-4">
        <CodeBlock code={INSTALL_CODE} language="bash" />
        <CodeBlock code={CONFIG_CODE} filename="app.config.ts" />
      </div>

      {/* Step 2 */}
      <SectionHeading level={3} id="quickstart-cache" label="Add a cache to your API service" className="mt-10 text-muted-foreground">
        2 · Add a cache to your API service
      </SectionHeading>
      <p className="mt-2 mb-4 text-sm text-muted-foreground">Add a DataCache instance to your existing API service. One line.</p>
      <CodeBlock code={API_CODE} filename="order.api.ts" />

      {/* Step 3 */}
      <SectionHeading level={3} id="quickstart-resource" label="Use cachedResource()" className="mt-10 text-muted-foreground">
        3 · Use cachedResource()
      </SectionHeading>
      <p className="mt-2 mb-4 text-sm text-muted-foreground">Same shape as resource(), plus cache and cacheKey. Returns stale data instantly, re-fetches in background.</p>
      <CodeBlock code={STORE_CODE} filename="order-list.store.ts" />

      {/* Step 4 */}
      <SectionHeading level={3} id="quickstart-template" label="Template" className="mt-10 text-muted-foreground">
        4 · Template
      </SectionHeading>
      <p className="mt-2 mb-4 text-sm text-muted-foreground">isInitialLoading() is true only when there&apos;s no cached data, so a return visit skips the spinner as long as the entry has not passed expireTime.</p>
      <CodeBlock code={COMPONENT_CODE} filename="order-list.component.ts" />

      {/* Closing */}
      <p className="mt-8 text-sm text-muted-foreground">That&apos;s it. Navigate away, come back, and data loads instantly from cache.</p>

      <p className="mt-4 text-sm text-muted-foreground italic">
        For read-only use cases, you can skip the Store layer entirely, see{" "}
        <a href="#advanced-usage" className="underline underline-offset-4 transition-colors hover:text-foreground">
          Factory pattern
        </a>.
      </p>

    </section>
  )
}

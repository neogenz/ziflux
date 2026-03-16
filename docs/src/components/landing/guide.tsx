import { CodeBlock } from "./code-block"
import { Callout } from "./callout"

const DETAIL_STORE_CODE = `@Injectable()
export class OrderDetailStore {
  readonly #api = inject(OrderApi)

  readonly #id = signal<string | null>(null)

  readonly order = cachedResource({
    cache: this.#api.cache,
    cacheKey: params => ['order', 'details', params.id],
    params: () => {
      const id = this.#id()
      return id ? { id } : undefined // undefined = idle, loader doesn't run
    },
    loader: ({ params }) => this.#api.getById$(params.id),
  })

  load(id: string) {
    this.#id.set(id)
  }
}`

const TEMPLATE_CODE = `@if (store.orders.isInitialLoading()) {
  <app-spinner />
} @else {
  <app-order-list [orders]="store.orders.value()" />
}`

const ERROR_TEMPLATE_CODE = `@if (store.orders.error()) {
  <div class="error-banner">Failed to refresh. Showing cached data.</div>
}
@if (store.orders.isInitialLoading()) {
  <app-spinner />
} @else {
  @let list = store.orders.value();
  @if (list) {
    <app-order-list [orders]="list" [stale]="store.orders.isStale()" />
  } @else {
    <app-empty-state />
  }
}`

const MUTATION_CODE = `@Injectable()
export class OrderListStore {
  readonly #api = inject(OrderApi)

  readonly orders = cachedResource({ /* ... */ })

  readonly deleteOrder = cachedMutation({
    cache: this.#api.cache,
    mutationFn: (id: string) => this.#api.delete$(id),
    invalidateKeys: (id) => [['order', 'details', id], ['order', 'list']],
  })
}`

const MUTATION_TEMPLATE_CODE = `<button
  (click)="store.deleteOrder.mutate(order.id)"
  [disabled]="store.deleteOrder.isPending()"
>
  @if (store.deleteOrder.isPending()) { Deleting... } @else { Delete }
</button>

@if (store.deleteOrder.error()) {
  <div class="error-banner">
    Delete failed. Please try again.
    <button (click)="store.deleteOrder.reset()">Dismiss</button>
  </div>
}`

const MUTATION_COMPONENT_CODE = `@Component({
  template: \`
    <button (click)="onDelete(order.id)" [disabled]="store.deleteOrder.isPending()">
      Delete
    </button>
  \`,
})
export class OrderListComponent {
  readonly store = inject(OrderListStore)

  async onDelete(id: string) {
    const result = await this.store.deleteOrder.mutate(id)

    if (result !== undefined) {
      this.toast.show('Order deleted')
    }
    // No try/catch needed — errors land in store.deleteOrder.error()
  }
}`

const OPTIMISTIC_CODE = `readonly updateOrder = cachedMutation({
  cache: this.#api.cache,
  mutationFn: (args) => this.#api.update$(args.id, args.data),
  invalidateKeys: (args) => [['order', 'details', args.id], ['order', 'list']],

  // 1. Runs BEFORE the API call
  onMutate: (args) => {
    const prev = this.orders.value()              // snapshot current state
    this.orders.update(list =>                     // apply change to UI immediately
      list?.map(o => (o.id === args.id ? { ...o, ...args.data } : o)),
    )
    return prev                                    // → becomes "context" in onError
  },

  // 2. Only runs if the API call fails
  onError: (_err, _args, context) => {
    if (context) this.orders.set(context)          // restore the snapshot → UI rolls back
  },
})`

const OPTIMISTIC_TEMPLATE_CODE = `@for (order of store.orders.value(); track order.id) {
  <div class="order-row">
    <span>{{ order.name }}</span>
    <button
      (click)="store.updateOrder.mutate({ id: order.id, data: { name: newName } })"
      [disabled]="store.updateOrder.isPending()"
    >
      Save
    </button>
  </div>
}

@if (store.updateOrder.error()) {
  <div class="error-banner">Update failed — changes have been rolled back.</div>
}`

const ANY_LOADING_CODE = `readonly isAnythingLoading = anyLoading(
  this.orders.isLoading,
  this.deleteOrder.isPending,
)`

function ArrowCell() {
  return (
    <div className="flex items-center justify-center">
      <svg className="w-5 text-border" viewBox="0 0 20 12" fill="none">
        <line x1="0" y1="6" x2="14" y2="6" stroke="currentColor" strokeWidth="1.5" />
        <path d="M12 2l5 4-5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

function Tag({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <span className={`rounded-md px-2 py-0.5 font-mono text-[11px] leading-relaxed ${
      accent
        ? "bg-accent/10 text-accent"
        : "bg-muted text-muted-foreground"
    }`}>
      {children}
    </span>
  )
}

function DomainCard({ step, file, role, scope }: { step: number; file: string; role: string; scope: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-5">
      <div className="flex items-center gap-2.5">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">
          {step}
        </span>
        <code className="text-[13px] font-semibold">{file}</code>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{role}</p>
      <p className="mt-1 text-[11px] text-muted-foreground/60">{scope}</p>
    </div>
  )
}

export function Guide() {
  return (
    <section id="guide" className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
      <h2 className="group text-2xl font-bold tracking-tight sm:text-3xl">
        <a href="#guide" className="hover:no-underline">Guide <span className="text-muted-foreground/0 transition-colors group-hover:text-muted-foreground">#</span></a>
      </h2>
      <p className="mt-2 text-muted-foreground">
        Quick Start gave you the basics. Now: detail views, error handling, mutations, and optimistic updates.
      </p>

      {/* Architecture overview — collapsible */}
      <details className="group/arch mt-10" open>
        <summary className="mb-6 flex cursor-pointer list-none items-center gap-2 text-lg font-semibold [&::-webkit-details-marker]:hidden">
          <svg className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open/arch:rotate-90" viewBox="0 0 16 16" fill="none">
            <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Architecture
          <span className="text-sm font-normal text-muted-foreground">(skip if you just want recipes <a href="#usage" className="underline underline-offset-4 transition-colors hover:text-foreground">&darr;</a>)</span>
        </summary>

        <div data-md-visual className="overflow-x-auto">
          <div
            className="grid min-w-[580px] items-center"
            style={{
              gridTemplateColumns: "1fr 2rem 1fr 2rem 1fr 2rem 1fr",
              gridTemplateRows: "auto auto auto auto",
            }}
          >
            {/* Row 1 — ziflux pill spanning Store + API Service */}
            <div />
            <div />
            <div className="text-center pb-3" style={{ gridColumn: "3 / 6" }}>
              <span className="inline-block rounded-full border border-accent/20 bg-accent/5 px-3 py-0.5 text-[11px] font-medium text-accent">ziflux</span>
            </div>
            <div />
            <div />

            {/* Row 2 — blocks + arrows */}
            {/* Component */}
            <div className="rounded-xl border border-border bg-muted/40 px-5 py-5 text-center">
              <p className="text-[13px] font-semibold tracking-tight">Component</p>
              <p className="mt-1.5 text-[11px] text-muted-foreground">view scope</p>
            </div>

            <ArrowCell />

            {/* Store */}
            <div className="rounded-xl border border-accent/15 bg-accent/[0.03] px-5 py-5 text-center">
              <p className="text-[13px] font-semibold tracking-tight">Store</p>
              <p className="mt-1.5 text-[11px] text-muted-foreground">route scope</p>
            </div>

            <ArrowCell />

            {/* API Service containing DataCache */}
            <div className="rounded-xl border border-border bg-muted/40 p-3 text-center">
              <p className="text-[11px] font-medium text-muted-foreground">API Service <span className="text-muted-foreground/50">(root scope)</span></p>
              <div className="mt-2 rounded-lg border border-accent/20 bg-accent/[0.06] px-4 py-3">
                <p className="text-[13px] font-semibold tracking-tight">DataCache</p>
                <p className="mt-1 text-[11px] text-muted-foreground/80">SWR &middot; dedup &middot; invalidation</p>
              </div>
            </div>

            <ArrowCell />

            {/* Server */}
            <div className="rounded-xl border border-border/50 bg-muted/20 px-5 py-5 text-center">
              <p className="text-[13px] font-semibold tracking-tight text-muted-foreground">Server</p>
              <p className="mt-1.5 text-[11px] text-muted-foreground/60">via loader</p>
            </div>

            {/* Row 3 — tags below Store */}
            <div />
            <div />
            <div className="flex flex-wrap justify-center gap-1.5 pt-2.5">
              <Tag accent>cachedResource()</Tag>
              <Tag accent>cachedMutation()</Tag>
            </div>
            <div />
            <div />
            <div />
            <div />

            {/* Row 4 — return flow */}
            <div className="flex items-center pt-4" style={{ gridColumn: "1 / -1" }}>
              <svg className="h-3 w-3 text-muted-foreground/30" viewBox="0 0 12 12" fill="none">
                <path d="M10 6H2M5 3L2 6l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="mx-2 h-px flex-1 bg-gradient-to-r from-muted-foreground/25 via-muted-foreground/10 to-transparent" />
              <span className="text-[11px] text-muted-foreground/50">Signals flow back to Component</span>
            </div>
          </div>
        </div>

      {/* Domain pattern */}
      <div className="mt-14">
        <h3 className="mb-3 text-lg font-semibold">Domain pattern</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          A recommended structure for most features:
        </p>

        <div data-md-visual className="grid gap-3 sm:grid-cols-3">
          <DomainCard step={1} file="order.api.ts" role="HTTP + cache" scope="singleton" />
          <DomainCard step={2} file="order-list.store.ts" role="cachedResource + mutations" scope="route-scoped" />
          <DomainCard step={3} file="order-list.component.ts" role="inject(Store), read signals" scope="view scope" />
        </div>

        {/* Why singleton */}
        <div className="mt-6">
          <Callout variant="important" title="Why the cache must be a singleton">
            <p>Two things need different lifetimes, and that tension drives the architecture:</p>
            <ul className="mt-2 space-y-1.5">
              <li>
                <strong className="text-foreground">Cache</strong> must be <code>providedIn: &apos;root&apos;</code> &mdash; it survives route navigations so SWR works across pages.
              </li>
              <li>
                <strong className="text-foreground">Reactive params</strong> (filters, IDs) are route-scoped &mdash; each route instance gets its own independent state.
              </li>
            </ul>
            <p className="mt-2">
              You can&apos;t merge both lifetimes without losing one or the other. The 3-file pattern solves this by separating the cache host (API service, root) from the reactive state (Store, route-scoped).
              The API service is a natural choice — but <code>DataCache</code> works anywhere with an injection context. A dedicated <code>OrderCache</code> service works just as well.
            </p>
          </Callout>
        </div>

        <div className="mt-4">
          <Callout variant="tip">
            The library works without a store layer — use <code>cachedResource</code> directly in a component if your use case is simple.
          </Callout>
        </div>

        {/* Guidelines */}
        <div className="mt-6">
          <p className="mb-3 text-sm font-semibold">Guidelines</p>
          <ol className="list-decimal list-inside space-y-1.5 text-sm text-muted-foreground">
            <li>Components <strong>shouldn&apos;t</strong> inject an API service directly</li>
            <li>Keep HTTP logic in the API service, not the store</li>
            <li>The store <strong>shouldn&apos;t</strong> instantiate a <code>DataCache</code> — it reads <code>this.#api.cache</code></li>
            <li>Mutations invalidate the cache via <code>invalidateKeys</code> — the store handles this, not the API service</li>
          </ol>
        </div>

        {/* Naming conventions */}
        <div className="mt-6">
          <p className="mb-3 text-sm font-semibold">Naming conventions</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Recommended naming conventions for API services, list stores, and detail stores</caption>
              <thead>
                <tr className="border-b border-border text-left text-xs font-semibold text-muted-foreground">
                  <th className="px-4 py-2">Concept</th>
                  <th className="px-4 py-2">Class name</th>
                  <th className="px-4 py-2">File name</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="px-4 py-2 font-medium">API service</td>
                  <td className="px-4 py-2 font-mono text-muted-foreground">OrderApi</td>
                  <td className="px-4 py-2 font-mono text-muted-foreground">order.api.ts</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-medium">List store</td>
                  <td className="px-4 py-2 font-mono text-muted-foreground">OrderListStore</td>
                  <td className="px-4 py-2 font-mono text-muted-foreground">order-list.store.ts</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-medium">Detail store</td>
                  <td className="px-4 py-2 font-mono text-muted-foreground">OrderDetailStore</td>
                  <td className="px-4 py-2 font-mono text-muted-foreground">order-detail.store.ts</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      </details>

      {/* Usage walkthrough */}
      <div id="usage" className="mt-10">
        <h3 className="mb-2 text-lg font-semibold">Recipes</h3>
        <p className="mt-2 mb-4 text-sm text-muted-foreground">
          Picks up where Quick Start left off — using the same API service and list store from there.
        </p>

        {/* 1. Detail Store */}
        <div className="mt-6">
          <h4 className="mb-2 text-sm font-semibold">1. Fetch a single resource by ID</h4>
          <CodeBlock code={DETAIL_STORE_CODE} filename="order-detail.store.ts" />
        </div>

        {/* 2. Templates */}
        <div className="mt-8">
          <h4 className="mb-2 text-sm font-semibold">2. Display cached data in templates</h4>
          <CodeBlock code={TEMPLATE_CODE} filename="order-list.component.html" />
          <p className="mt-3 text-sm text-muted-foreground">
            When the server fails but stale data exists, show both:
          </p>
          <div className="mt-2">
            <CodeBlock code={ERROR_TEMPLATE_CODE} filename="order-list.component.html" />
          </div>
        </div>

        {/* 3. Mutations */}
        <div className="mt-8">
          <h4 className="mb-2 text-sm font-semibold">3. Invalidate cache after a mutation</h4>
          <p className="mb-3 text-sm text-muted-foreground">
            Replaces ~13 lines of boilerplate per mutation with a declarative definition.
          </p>
          <CodeBlock code={MUTATION_CODE} filename="order-list.store.ts" />
          <div className="mt-3">
            <CodeBlock code={MUTATION_TEMPLATE_CODE} filename="order-list.component.html" />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            When you need to react to the result in TypeScript:
          </p>
          <div className="mt-2">
            <CodeBlock code={MUTATION_COMPONENT_CODE} filename="order-list.component.ts" />
          </div>
        </div>

        {/* 4. Optimistic updates */}
        <div className="mt-8">
          <h4 className="mb-2 text-sm font-semibold">4. Update the UI before the server responds</h4>
          <p className="mb-3 text-sm text-muted-foreground">
            Optimistic updates make the UI feel instant: update the screen <em>before</em> the server responds, then roll back if it fails.
          </p>

          <div className="mb-4">
            <Callout variant="important" title="Mutation lifecycle">
              <ol className="mt-1 space-y-2">
                <li>
                  <code className="text-foreground">onMutate(args)</code> — Runs <strong>before</strong> the API call. Snapshot the current state, apply the optimistic change, and <strong>return the snapshot</strong>.
                </li>
                <li>
                  <code className="text-foreground">mutationFn(args)</code> — The actual API call.
                </li>
                <li>
                  <strong className="text-foreground">Success:</strong> <code>onSuccess</code> fires, then <code>invalidateKeys</code> marks cache entries stale so <code>cachedResource</code> refetches from the server.
                </li>
                <li>
                  <strong className="text-foreground">Error:</strong> <code>onError</code> receives the snapshot as its third argument (<code>context</code>). Use it to restore the UI.
                </li>
              </ol>
            </Callout>
          </div>

          <CodeBlock code={OPTIMISTIC_CODE} filename="order-list.store.ts" />
          <p className="mt-3 text-sm text-muted-foreground">
            In the template:
          </p>
          <div className="mt-2">
            <CodeBlock code={OPTIMISTIC_TEMPLATE_CODE} filename="order-list.component.html" />
          </div>
        </div>

        {/* 5. Aggregate loading */}
        <div className="mt-8">
          <h4 className="mb-2 text-sm font-semibold">5. Combine loading states</h4>
          <CodeBlock code={ANY_LOADING_CODE} filename="order-list.store.ts" />
          <p className="mt-3 text-sm text-muted-foreground">
            <code>isLoading</code> is for <code>cachedResource</code> — true while fetching data (initial load or background revalidation).{" "}
            <code>isPending</code> is for <code>cachedMutation</code> — true while the mutation is in-flight.{" "}
            Both are <code>Signal&lt;boolean&gt;</code>, so <code>anyLoading()</code> combines them seamlessly.
          </p>
        </div>
      </div>
    </section>
  )
}

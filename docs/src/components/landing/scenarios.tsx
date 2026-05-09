import { CodeBlock } from "./code-block"

const ADMIN_TABS_CODE = `// Each tab is a route. Each route's store reads from a shared cache.
@Injectable() export class OrdersStore {
  readonly orders = cachedResource({
    cache: this.api.cache,
    cacheKey: ['orders', 'list'],
    loader: () => this.api.getOrders$(),
  })
}

// Tab switch → store destroyed → cache survives in the API service.
// Switch back → cachedResource reads cache → instant. Background refetch
// kicks off if the entry is stale.`

const ECOM_LIST_DETAIL_CODE = `// List + detail share a key prefix. One mutation invalidates both.
cacheKey: params => ['product', 'list', params.status, params.sortBy]
cacheKey: params => ['product', 'details', params.id]

// After a mutation:
cache.invalidate(['product'])  // marks BOTH list and details stale
// Background refetch on the visible view, untouched cache for the rest.`

const DEPENDENT_FORM_CODE = `// Step 2's params depend on Step 1's selection.
readonly categoryId = signal<string | null>(null)

readonly products = cachedResource({
  cache: this.api.cache,
  cacheKey: p => ['product', 'by-category', p.categoryId],
  params: () => {
    const id = this.categoryId()
    return id ? { categoryId: id } : undefined  // idle until set
  },
  loader: ({ params }) => this.api.getByCategory$(params.categoryId),
})

// User backs to Step 1, picks a different category → resource refetches.
// Re-picks the original category → instant from cache.`

interface Scenario {
  key: string
  title: string
  pain: string
  fix: string
  code: string
}

const SCENARIOS: Scenario[] = [
  {
    key: "admin-tabs",
    title: "Admin dashboard with tabs",
    pain: "User flips between Orders / Invoices / Customers tabs. Spinner on every switch, even when the data hasn't changed.",
    fix: "Tabs read from a shared cache. First visit fetches; every return is instant. Background refresh kicks in only when data is stale.",
    code: ADMIN_TABS_CODE,
  },
  {
    key: "ecom-list-detail",
    title: "E-commerce list → detail → back",
    pain: "User filters a list, opens a product, edits something, navigates back. List reloads from scratch. Filter state survives, network roundtrip doesn't.",
    fix: "Hierarchical keys (`['product', 'list', filters]` and `['product', 'details', id]`). One `invalidate(['product'])` after the mutation refreshes both views.",
    code: ECOM_LIST_DETAIL_CODE,
  },
  {
    key: "dependent-form",
    title: "Multi-step form with dependent data",
    pain: "Step 2 depends on Step 1. User backs up, changes Step 1, returns to Step 2. The dependent fetch fires every single time.",
    fix: "`params` returns `undefined` until ready (idle state). Once a value is picked, fetch fires once and caches per-key. Re-picking an earlier value is instant.",
    code: DEPENDENT_FORM_CODE,
  },
]

export function Scenarios() {
  return (
    <section id="scenarios" className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
      <h2 className="group text-2xl font-bold tracking-tight sm:text-3xl">
        <a href="#scenarios" className="hover:no-underline">When ziflux pays off <span className="text-muted-foreground/0 transition-colors group-hover:text-muted-foreground">#</span></a>
      </h2>
      <p className="mt-2 text-muted-foreground">
        Three patterns where SWR caching on <code>resource()</code> earns its keep.
      </p>

      <div className="mt-8 space-y-6">
        {SCENARIOS.map((scenario) => (
          <div key={scenario.key} className="rounded-xl border border-border bg-muted/30 p-5">
            <h3 className="text-base font-semibold">{scenario.title}</h3>
            <p className="mt-3 text-sm">
              <span className="mr-2 inline-block rounded-md bg-red-400/10 px-2 py-0.5 font-mono text-[11px] text-red-400">Pain</span>
              <span className="text-muted-foreground">{scenario.pain}</span>
            </p>
            <p className="mt-2 text-sm">
              <span className="mr-2 inline-block rounded-md bg-emerald-500/10 px-2 py-0.5 font-mono text-[11px] text-emerald-500">Fix</span>
              <span className="text-muted-foreground">{scenario.fix}</span>
            </p>
            <div className="mt-4">
              <CodeBlock code={scenario.code} />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

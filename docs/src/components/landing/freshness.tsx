import { CodeBlock } from "./code-block"

const CACHE_KEYS_CODE = `cache.invalidate(['order'])   // ← one call, everything refreshes`

const OPTIMISTIC_CODE = `// In your store — cachedMutation handles the full lifecycle
readonly deleteMutation = cachedMutation({
  mutationFn: (id: string) => this.#api.delete$(id),
  cache: this.#api.cache,
  invalidateKeys: (id) => [['order']],
  onMutate: (id) => {
    const prev = this.orders.value()                             // snapshot
    this.orders.update(list => list?.filter(o => o.id !== id))   // optimistic
    return prev                                                  // context
  },
  onError: (_err, _id, prev) => {
    if (prev) this.orders.set(prev)                              // rollback
  },
})`

export function Freshness() {
  return (
    <section id="freshness" className="mx-auto max-w-4xl px-6 py-16 sm:py-20">
      <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">How Caching Works</h2>
      <p className="mt-2 text-muted-foreground">
        Every cached entry goes through three phases. <code>invalidate()</code> marks entries stale &mdash; it never deletes them.
      </p>

      {/* Timeline */}
      <div className="mt-8 rounded-xl border border-border bg-muted/50 p-6">
        <div className="space-y-5">
          {/* Phase bars */}
          <div className="flex gap-1">
            <div className="flex-[3] rounded-l-md bg-emerald-500/80 py-3 px-4">
              <p className="text-sm font-bold text-white">FRESH</p>
            </div>
            <div className="flex-[3] bg-amber-500/80 py-3 px-4">
              <p className="text-sm font-bold text-white">STALE</p>
            </div>
            <div className="flex-[2] rounded-r-md bg-red-400/80 py-3 px-4">
              <p className="text-sm font-bold text-white">EVICTED</p>
            </div>
          </div>

          {/* Descriptions */}
          <div className="flex gap-1 text-xs">
            <div className="flex-[3]">
              <p className="font-semibold text-emerald-500">Return cached data</p>
              <p className="mt-0.5 text-muted-foreground">No network request</p>
            </div>
            <div className="flex-[3]">
              <p className="font-semibold text-amber-500">Return cached + re-fetch</p>
              <p className="mt-0.5 text-muted-foreground">User sees data instantly, refresh in background</p>
            </div>
            <div className="flex-[2]">
              <p className="font-semibold text-red-400">Fetch from server</p>
              <p className="mt-0.5 text-muted-foreground">Cache entry removed</p>
            </div>
          </div>

          {/* Markers */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground border-t border-border pt-4">
            <div className="flex-[3] flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-foreground/30" />
              <span>Data written to cache</span>
            </div>
            <div className="flex-[3] flex items-center gap-2">
              <span className="font-mono font-semibold text-foreground">staleTime</span>
              <span>elapsed &mdash; data may be outdated</span>
            </div>
            <div className="flex-[2] flex items-center gap-2">
              <span className="font-mono font-semibold text-foreground">gcTime</span>
              <span>elapsed &mdash; garbage collected</span>
            </div>
          </div>
        </div>
      </div>

      {/* Loading states table */}
      <div className="mt-10">
        <h3 className="mb-4 text-lg font-semibold">What the user sees</h3>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left text-xs font-semibold text-muted-foreground">
                <th className="px-4 py-3">Scenario</th>
                <th className="px-4 py-3">Cache</th>
                <th className="px-4 py-3">UI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 font-medium">First visit ever</td>
                <td className="px-4 py-3"><span className="rounded bg-red-500/10 px-1.5 py-0.5 text-xs text-red-400">MISS</span></td>
                <td className="px-4 py-3 text-muted-foreground">Spinner &rarr; data</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium">Return visit (data &lt; staleTime)</td>
                <td className="px-4 py-3"><span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-xs text-emerald-500">FRESH</span></td>
                <td className="px-4 py-3 text-muted-foreground">Data instantly, no fetch</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium">Return visit (data &gt; staleTime)</td>
                <td className="px-4 py-3"><span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-xs text-amber-500">STALE</span></td>
                <td className="px-4 py-3 text-muted-foreground">Stale data instantly &rarr; silent refresh &rarr; fresh data</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium">After mutation</td>
                <td className="px-4 py-3"><span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-xs text-amber-500">STALE</span></td>
                <td className="px-4 py-3 text-muted-foreground">Data + silent refresh (cache invalidated by mutation)</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium">Network error, had cache</td>
                <td className="px-4 py-3"><span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-xs text-amber-500">STALE</span></td>
                <td className="px-4 py-3 text-muted-foreground">Stale data shown, no crash</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Cache keys */}
      <div className="mt-10">
        <h3 className="mb-2 text-lg font-semibold">Cache Keys</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          You delete an order. The list, the detail page, every filtered view — all need to refresh.
          Cache keys make this one line:
        </p>

        {/* Visual tree */}
        <div className="rounded-xl border border-border bg-muted/50 p-5 font-mono text-sm">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-accent font-bold">{`['order']`}</span>
              <span className="text-xs text-muted-foreground">&larr; invalidate here, everything below becomes stale</span>
            </div>
            <div className="ml-4 space-y-1 border-l-2 border-border pl-4">
              <div className="flex items-center gap-2">
                <span className="text-foreground/80">{`['order', 'list']`}</span>
                <span className="text-xs text-muted-foreground">all orders page</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-foreground/80">{`['order', 'list', 'pending']`}</span>
                <span className="text-xs text-muted-foreground">filtered view</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-foreground/80">{`['order', 'details', '42']`}</span>
                <span className="text-xs text-muted-foreground">detail page</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3">
          <CodeBlock code={CACHE_KEYS_CODE} />
        </div>
      </div>

      {/* Optimistic updates */}
      <div className="mt-10">
        <h3 className="mb-2 text-lg font-semibold">Optimistic Updates</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          <code>cachedMutation()</code> handles the full lifecycle: snapshot before, optimistic update, rollback on error, cache invalidation on success.
        </p>
        <CodeBlock code={OPTIMISTIC_CODE} filename="order-list.store.ts" />
      </div>
    </section>
  )
}

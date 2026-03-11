import { CodeBlock } from "./code-block"

const CACHE_KEYS_CODE = `['order', 'list', 'pending']    // filtered list
['order', 'details', '42']      // single entity
['order']                        // matches ALL of the above

cache.invalidate(['order'])      // prefix match → invalidates everything`

const OPTIMISTIC_CODE = `async delete(id: string) {
  const snapshot = this.orders.value()
  this.orders.update(list => list?.filter(o => o.id !== id))  // optimistic
  try {
    await firstValueFrom(this.#api.delete$(id))
  } catch {
    this.orders.set(snapshot)  // rollback
  }
}`

export function Freshness() {
  return (
    <section id="freshness" className="mx-auto max-w-4xl px-6 py-16 sm:py-20">
      <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Freshness Model</h2>
      <p className="mt-2 text-muted-foreground">
        Golden rule: <code>invalidate()</code> marks entries stale. It never deletes them.
      </p>

      {/* Timeline */}
      <div className="mt-8 overflow-x-auto rounded-xl border border-border bg-muted/50 p-6">
        <div className="min-w-[400px] font-mono text-sm">
          {/* Labels */}
          <div className="flex items-end text-xs text-muted-foreground">
            <span className="w-4" />
            <span className="flex-[3] text-left">write</span>
            <span className="flex-[3] text-left">staleTime</span>
            <span className="flex-[2] text-left">gcTime</span>
          </div>
          {/* Tick marks */}
          <div className="mt-2 flex items-center">
            <span className="w-4 text-muted-foreground">│</span>
            <span className="flex-[3]" />
            <span className="w-4 text-muted-foreground">│</span>
            <span className="flex-[3]" />
            <span className="w-4 text-muted-foreground">│</span>
          </div>
          {/* Bars */}
          <div className="mt-1 flex items-center text-xs">
            <span className="w-4 text-muted-foreground">├</span>
            <span className="flex-[3] h-2 rounded-sm bg-emerald-500/80" />
            <span className="w-4 text-muted-foreground">├</span>
            <span className="flex-[3] h-2 rounded-sm bg-amber-500/80" />
            <span className="w-4 text-muted-foreground">├</span>
            <span className="flex-[2] h-2 rounded-sm bg-red-400/80" />
            <span className="text-muted-foreground">▶</span>
          </div>
          {/* State labels */}
          <div className="mt-3 flex items-center text-xs">
            <span className="w-4" />
            <span className="flex-[3] text-center text-emerald-500 font-semibold">FRESH</span>
            <span className="w-4" />
            <span className="flex-[3] text-center text-amber-500 font-semibold">STALE</span>
            <span className="w-4" />
            <span className="flex-[2] text-center text-red-400 font-semibold">EVICTED</span>
          </div>
          {/* Descriptions */}
          <div className="mt-1 flex items-center text-xs text-muted-foreground">
            <span className="w-4" />
            <span className="flex-[3] text-center">return directly</span>
            <span className="w-4" />
            <span className="flex-[3] text-center">return + bg fetch</span>
            <span className="w-4" />
            <span className="flex-[2] text-center">fetch server</span>
          </div>
        </div>
      </div>

      {/* Loading states table */}
      <div className="mt-10">
        <h3 className="mb-4 text-lg font-semibold">Loading States</h3>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left text-xs font-semibold text-muted-foreground">
                <th className="px-4 py-3">Situation</th>
                <th className="px-4 py-3">Cache</th>
                <th className="px-4 py-3 font-mono">isInitialLoading</th>
                <th className="px-4 py-3">Display</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 font-medium">First visit, cold cache</td>
                <td className="px-4 py-3"><span className="rounded bg-red-500/10 px-1.5 py-0.5 text-xs text-red-400">MISS</span></td>
                <td className="px-4 py-3 font-mono text-xs text-emerald-500">true</td>
                <td className="px-4 py-3 text-muted-foreground">Spinner</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium">First visit, prefetched</td>
                <td className="px-4 py-3"><span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-xs text-emerald-500">FRESH</span></td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">false</td>
                <td className="px-4 py-3 text-muted-foreground">Data instantly</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium">Return visit</td>
                <td className="px-4 py-3"><span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-xs text-amber-500">STALE</span></td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">false</td>
                <td className="px-4 py-3 text-muted-foreground">Stale data → fresh</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium">After mutation</td>
                <td className="px-4 py-3"><span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-xs text-amber-500">STALE</span></td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">false</td>
                <td className="px-4 py-3 text-muted-foreground">Data + silent refresh</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium">Network error, had cache</td>
                <td className="px-4 py-3"><span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-xs text-amber-500">STALE</span></td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">false</td>
                <td className="px-4 py-3 text-muted-foreground">Stale data, no crash</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium">Network error, cold cache</td>
                <td className="px-4 py-3"><span className="rounded bg-red-500/10 px-1.5 py-0.5 text-xs text-red-400">MISS</span></td>
                <td className="px-4 py-3 font-mono text-xs text-emerald-500">true</td>
                <td className="px-4 py-3 text-muted-foreground">Error state</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Cache keys */}
      <div className="mt-10">
        <h3 className="mb-2 text-lg font-semibold">Cache Keys</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Hierarchical arrays. Serialized with <code>JSON.stringify</code>. Prefix-based invalidation.
        </p>
        <CodeBlock code={CACHE_KEYS_CODE} />
      </div>

      {/* Optimistic updates */}
      <div className="mt-10">
        <h3 className="mb-2 text-lg font-semibold">Optimistic Updates</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          No new API. Angular&apos;s native <code>set()</code> / <code>update()</code> handle it.
        </p>
        <CodeBlock code={OPTIMISTIC_CODE} />
      </div>
    </section>
  )
}

import { CodeBlock } from "./code-block"

const CACHE_KEYS_CODE = `cache.invalidate(['order'])   // ← one call, everything refreshes`

export function Freshness() {
  return (
    <section id="freshness" className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
      <h2 className="group text-2xl font-bold tracking-tight sm:text-3xl">
        <a href="#freshness" className="hover:no-underline">How caching works <span className="text-muted-foreground/0 transition-colors group-hover:text-muted-foreground">#</span></a>
      </h2>
      <p className="mt-2 text-muted-foreground">
        Every cached entry goes through three phases. <code>invalidate()</code> marks entries stale &mdash; it never deletes them.
      </p>

      {/* Timeline — phase bars */}
      <div data-md-visual className="mt-8 flex gap-1">
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
      <div data-md-visual className="mt-3 flex gap-1 text-xs">
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
      <div data-md-visual className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
        <div className="flex-[3]">Data written to cache</div>
        <div className="flex-[3]"><code className="font-semibold text-foreground">staleTime</code> elapsed &mdash; data may be outdated</div>
        <div className="flex-[2]"><code className="font-semibold text-foreground">expireTime</code> elapsed &mdash; entry evicted</div>
      </div>

      {/* Loading states table */}
      <div className="mt-10">
        <h3 className="mb-4 text-lg font-semibold">What the user sees</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Cache state and corresponding UI behavior for each navigation scenario</caption>
            <thead>
              <tr className="border-b border-border text-left text-xs font-semibold text-muted-foreground">
                <th className="px-4 py-3">Scenario</th>
                <th className="px-4 py-3">Cache</th>
                <th className="px-4 py-3">UI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 font-medium">First visit ever</td>
                <td className="px-4 py-3 text-muted-foreground">miss</td>
                <td className="px-4 py-3 text-muted-foreground">Spinner &rarr; data</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium">Return visit (data &lt; staleTime)</td>
                <td className="px-4 py-3 text-emerald-500">fresh</td>
                <td className="px-4 py-3 text-muted-foreground">Data instantly, no fetch</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium">Return visit (data &gt; staleTime)</td>
                <td className="px-4 py-3 text-amber-500">stale</td>
                <td className="px-4 py-3 text-muted-foreground">Stale data instantly &rarr; silent refresh &rarr; fresh data</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium">After mutation</td>
                <td className="px-4 py-3 text-amber-500">stale</td>
                <td className="px-4 py-3 text-muted-foreground">Data + silent refresh (cache invalidated by mutation)</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium">Network error, had cache</td>
                <td className="px-4 py-3 text-amber-500">stale</td>
                <td className="px-4 py-3 text-muted-foreground">Stale data shown, no crash</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Cache keys */}
      <div className="mt-10">
        <h3 className="mb-2 text-lg font-semibold">Cache keys</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          You delete an order. The list, the detail page, every filtered view — all need to refresh.
          Cache keys make this one line:
        </p>

        {/* Visual tree */}
        <div data-md-visual className="font-mono text-sm">
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
        <p className="mt-3 text-sm text-muted-foreground">
          See the <a href="#guide" className="underline underline-offset-4 hover:text-foreground transition-colors">Guide</a> for full optimistic update and mutation examples.
        </p>
      </div>

      {/* When to cache */}
      <div className="mt-10">
        <h3 className="mb-4 text-lg font-semibold">When to cache</h3>
        <div className="grid gap-x-8 gap-y-6 text-sm sm:grid-cols-2">
          <div className="border-l-2 border-emerald-500 pl-4">
            <p className="mb-2 font-semibold text-emerald-500">Cache</p>
            <ul className="space-y-1.5 text-muted-foreground">
              <li>GET — entity lists</li>
              <li>GET — entity details</li>
              <li>Data shared across multiple screens</li>
              <li>Predictable access patterns (tabs, navigation)</li>
            </ul>
          </div>
          <div className="border-l-2 border-red-400 pl-4">
            <p className="mb-2 font-semibold text-red-400">Don&apos;t cache</p>
            <ul className="space-y-1.5 text-muted-foreground">
              <li>POST / PUT / DELETE</li>
              <li>Search results with volatile params</li>
              <li>Real-time data (WebSocket, SSE)</li>
              <li>Large binaries</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}

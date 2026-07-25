import { CodeBlock } from "@/components/shared/code-block"

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

      {/* Timeline. Below sm each phase stacks as one group; at sm the wrappers
          dissolve so the nine cells align on real grid tracks. */}
      <div
        data-md-visual
        className="mt-8 grid gap-x-1 gap-y-6 sm:grid-flow-col sm:grid-cols-[3fr_3fr_2fr] sm:grid-rows-[auto_auto_auto] sm:gap-y-3"
      >
        <div className="sm:contents">
          <div className="rounded-md bg-ok/80 px-4 py-3 sm:rounded-r-none">
            <p className="text-sm font-bold text-status-foreground">FRESH</p>
          </div>
          <div className="mt-2 text-xs sm:mt-0">
            <p className="font-semibold text-ok-strong">Return cached data</p>
            <p className="mt-0.5 text-muted-foreground">No network request</p>
          </div>
          <div className="mt-1.5 text-xs text-muted-foreground sm:mt-0">Data written to cache</div>
        </div>

        <div className="sm:contents">
          <div className="rounded-md bg-caution/80 px-4 py-3 sm:rounded-none">
            <p className="text-sm font-bold text-status-foreground">STALE</p>
          </div>
          <div className="mt-2 text-xs sm:mt-0">
            <p className="font-semibold text-caution-strong">Return cached + re-fetch</p>
            <p className="mt-0.5 text-muted-foreground">User sees data instantly, refresh in background</p>
          </div>
          <div className="mt-1.5 text-xs text-muted-foreground sm:mt-0"><code className="font-semibold text-foreground">staleTime</code> elapsed &mdash; data may be outdated</div>
        </div>

        <div className="sm:contents">
          <div className="rounded-md bg-danger/80 px-4 py-3 sm:rounded-l-none">
            <p className="text-sm font-bold text-status-foreground">EVICTED</p>
          </div>
          <div className="mt-2 text-xs sm:mt-0">
            <p className="font-semibold text-danger-strong">Fetch from server</p>
            <p className="mt-0.5 text-muted-foreground">Cache entry removed</p>
          </div>
          <div className="mt-1.5 text-xs text-muted-foreground sm:mt-0"><code className="font-semibold text-foreground">expireTime</code> elapsed &mdash; entry evicted</div>
        </div>
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
                <td className="px-4 py-3 text-ok-strong">fresh</td>
                <td className="px-4 py-3 text-muted-foreground">Data instantly, no fetch</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium">Return visit (data &gt; staleTime)</td>
                <td className="px-4 py-3 text-caution-strong">stale</td>
                <td className="px-4 py-3 text-muted-foreground">Stale data instantly &rarr; silent refresh &rarr; fresh data</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium">After mutation</td>
                <td className="px-4 py-3 text-caution-strong">stale</td>
                <td className="px-4 py-3 text-muted-foreground">Data + silent refresh (cache invalidated by mutation)</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium">Network error, had cache</td>
                <td className="px-4 py-3 text-caution-strong">stale</td>
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
          You delete an order. The list, the detail page and every filtered view all need to refresh.
          Cache keys make this one line:
        </p>

        {/* Visual tree */}
        <div data-md-visual className="font-mono text-sm">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-accent-strong font-bold">{`['order']`}</span>
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
        <div className="grid text-sm sm:grid-cols-2">
          <div className="pb-6 sm:pb-0 sm:pr-8">
            <p className="mb-2 font-semibold">Cache</p>
            <ul className="space-y-1.5 text-muted-foreground">
              <li>GET, entity lists</li>
              <li>GET, entity details</li>
              <li>Data shared across multiple screens</li>
              <li>Predictable access patterns (tabs, navigation)</li>
            </ul>
          </div>
          <div className="border-t border-border pt-6 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-8">
            <p className="mb-2 font-semibold">Don&apos;t cache</p>
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

export function FreshnessSummary() {
  return (
    <section id="freshness-summary" className="mx-auto max-w-3xl px-6 pt-10 pb-24 sm:pt-12 sm:pb-36">
      <h2 className="group text-2xl font-bold tracking-tight sm:text-3xl">
        <a href="#freshness-summary" className="hover:no-underline">How caching works <span className="text-muted-foreground/0 transition-colors group-hover:text-muted-foreground">#</span></a>
      </h2>
      <p className="mt-2 max-w-[68ch] text-muted-foreground">
        Two timers, three phases. <code>invalidate()</code> marks entries stale &mdash; it never deletes them.
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

      <p className="mt-10 max-w-[68ch] text-sm text-muted-foreground">
        The{" "}
        <a href="/docs#freshness" className="underline underline-offset-4 hover:text-foreground transition-colors">
          docs
        </a>
        {" "}add the loading-state table, cache keys and when to cache.
      </p>
    </section>
  )
}

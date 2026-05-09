interface Limit {
  key: string
  title: string
  reason: string
  alternative: string
}

const LIMITS: Limit[] = [
  {
    key: "realtime",
    title: "Real-time data (WebSocket / SSE)",
    reason: "SWR assumes data ages on a wall clock. Push streams update on events, not on staleness.",
    alternative: "Subscribe to the stream directly. Cache the snapshot if you need offline display.",
  },
  {
    key: "ssr-transfer",
    title: "SSR transfer state",
    reason: "ziflux is in-memory and does not serialize across the server/client boundary.",
    alternative: "Use Angular's TransferState for SSR hydration; layer ziflux on top after rehydration.",
  },
  {
    key: "persistence",
    title: "Persistence across browser reloads",
    reason: "The cache lives in process memory and is gone on refresh.",
    alternative: "Persist explicitly with localStorage / IndexedDB; ziflux handles the in-memory layer above.",
  },
  {
    key: "volatile-search",
    title: "Volatile search-as-you-type",
    reason: "New params on every keystroke means new cache keys. LRU thrashes; the cache becomes overhead.",
    alternative: "Debounce the input; cache only the stable result keys you actually want to revisit.",
  },
  {
    key: "ng-pre-21",
    title: "Angular before v21",
    reason: "ziflux is built on Angular's `resource()` API.",
    alternative: "Stay on whatever cache pattern you have today; revisit when you upgrade.",
  },
  {
    key: "global-state",
    title: "Global state orchestration",
    reason: "ziflux caches data; it does not coordinate workflows, side-effects, or cross-feature actions.",
    alternative: "NgRx, NgRx SignalStore, or a state machine. Pair it with ziflux for the data layer.",
  },
]

export function NotAFit() {
  return (
    <section id="not-a-fit" className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
      <h2 className="group text-2xl font-bold tracking-tight sm:text-3xl">
        <a href="#not-a-fit" className="hover:no-underline">When ziflux is the wrong tool <span className="text-muted-foreground/0 transition-colors group-hover:text-muted-foreground">#</span></a>
      </h2>
      <p className="mt-2 text-muted-foreground">
        SWR caching is narrow on purpose. If your problem looks like one of these, reach for something else.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {LIMITS.map((limit) => (
          <div key={limit.key} className="rounded-xl border border-border bg-muted/30 p-5">
            <h3 className="text-sm font-semibold">{limit.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              <span className="text-foreground/80">Why not: </span>
              {limit.reason}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              <span className="text-foreground/80">Use instead: </span>
              {limit.alternative}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

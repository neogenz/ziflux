import { withInlineCode } from "@/components/shared/inline-code"
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
    key: "ng-pre-22",
    title: "Angular before v22",
    reason: "ziflux declares `@angular/core ^22.0.0` as its peer range, so npm will refuse to install it on older majors. The code itself only needs `resource()`, which shipped earlier, but v22 is the supported floor.",
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
    <section id="not-a-fit" className="mx-auto max-w-6xl px-6 pt-16 pb-16 sm:pt-20 sm:pb-20">
      <h2 className="group text-2xl font-bold tracking-tight sm:text-3xl">
        <a href="#not-a-fit" className="hover:no-underline">When ziflux is the wrong tool <span className="text-muted-foreground/0 transition-colors group-hover:text-muted-foreground">#</span></a>
      </h2>
      <p className="mt-2 max-w-[68ch] text-muted-foreground">
        SWR caching is narrow on purpose. If your problem looks like one of these, reach for something else.
      </p>

      <table role="table" className="mt-8 w-full border-b border-border text-sm max-sm:block sm:table-fixed">
        <caption className="sr-only">Cases where ziflux is the wrong tool, and what to use instead.</caption>
        <thead role="rowgroup" className="max-sm:sr-only">
          <tr role="row">
            <th role="columnheader" scope="col" className="w-[22%] pb-3 pr-6 text-left align-bottom text-xs font-semibold text-muted-foreground">Limit</th>
            <th role="columnheader" scope="col" className="w-[41%] pb-3 pr-6 text-left align-bottom text-xs font-semibold text-muted-foreground">Why not</th>
            <th role="columnheader" scope="col" className="w-[37%] pb-3 text-left align-bottom text-xs font-semibold text-muted-foreground">Use instead</th>
          </tr>
        </thead>
        <tbody role="rowgroup" className="max-sm:block">
          {LIMITS.map((limit) => (
            <tr role="row" key={limit.key} className="border-t border-border max-sm:block max-sm:py-5">
              <th role="rowheader" scope="row" className="text-left align-top font-semibold max-sm:block sm:py-4 sm:pr-6">
                {limit.title}
              </th>
              <td role="cell" className="align-top text-muted-foreground max-sm:mt-3 max-sm:block sm:py-4 sm:pr-6">
                <span aria-hidden="true" className="mb-1 block text-xs font-medium text-foreground sm:hidden">Why not</span>
                {withInlineCode(limit.reason)}
              </td>
              <td role="cell" className="align-top text-muted-foreground max-sm:mt-3 max-sm:block sm:py-4">
                <span aria-hidden="true" className="mb-1 block text-xs font-medium text-foreground sm:hidden">Use instead</span>
                {withInlineCode(limit.alternative)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

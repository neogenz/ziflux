import { CodeBlock } from "@/components/shared/code-block"

export function PriorArt() {
  return (
    <section id="prior-art" className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
      <h2 className="group text-center text-2xl font-bold tracking-tight sm:text-3xl">
        <a href="#prior-art" className="hover:no-underline">How ziflux compares <span className="text-muted-foreground/0 transition-colors group-hover:text-muted-foreground">#</span></a>
      </h2>
      <p className="mt-2 text-center text-muted-foreground">
        You&apos;ll compare anyway, so here is the honest positioning.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-muted/30 p-5">
          <p className="text-sm font-semibold">TanStack Query (Angular)</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Full data-fetching framework. Infinite queries, SSR hydration, persistence, cross-framework. Pick this if your data layer needs the whole toolbox. Its Angular adapter still ships as <code>@tanstack/angular-query-experimental</code>.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-muted/30 p-5">
          <p className="text-sm font-semibold">NgRx</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Two things under one name: the classic Redux store (reducers, effects, selectors, time-travel) and <code>@ngrx/signals</code> SignalStore, which is signal-first. Pick either when caching is a side-effect of complex global state, not the goal. ziflux has no integration layer for it and does not need one: <code>cachedResource()</code> and <code>DataCache</code> only require an Angular injection context, so anything that provides one can host them.
          </p>
        </div>
        <div className="rounded-xl border border-accent/20 bg-accent/[0.03] p-5">
          <p className="text-sm font-semibold text-accent-strong">ziflux</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Caches <code>resource()</code>. That&apos;s the entire scope. Signal-native, no new mental model. Pick this when SWR on top of Angular&apos;s built-in primitives is all you need.
          </p>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Mutation lifecycle (<code>onMutate → mutationFn → onSuccess → invalidateKeys</code>) is modeled on React Query: a proven shape with signal-native execution.
      </p>

      <div className="mt-10">
        <CodeBlock code="npm install ngx-ziflux" language="bash" />
        <p className="mt-4 text-center text-sm text-muted-foreground">
          <a
            href="https://github.com/neogenz/ziflux"
            className="underline underline-offset-4 hover:text-foreground transition-colors"
          >
            GitHub
          </a>
          {" "}&middot;{" "}MIT License{" "}&middot;{" "}Zero dependencies
        </p>
      </div>
    </section>
  )
}

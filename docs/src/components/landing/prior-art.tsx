export function PriorArt() {
  return (
    <section id="prior-art" className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
      <h2 className="group text-center text-2xl font-bold tracking-tight sm:text-3xl">
        <a href="#prior-art" className="hover:no-underline">How ziflux compares <span className="text-muted-foreground/0 transition-colors group-hover:text-muted-foreground">#</span></a>
      </h2>
      <p className="mt-2 text-center text-muted-foreground">
        You&apos;ll compare anyway — here&apos;s the honest positioning.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-muted/30 p-5">
          <p className="text-sm font-semibold">TanStack Query (Angular)</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Full data-fetching framework. Infinite queries, SSR hydration, persistence, cross-framework. Pick this if your data layer needs the whole toolbox.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-muted/30 p-5">
          <p className="text-sm font-semibold">NgRx</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Full state container. Reducers, effects, selectors, time-travel. Pick this when caching is a side-effect of complex global state, not the goal.
          </p>
        </div>
        <div className="rounded-xl border border-accent/20 bg-accent/[0.03] p-5">
          <p className="text-sm font-semibold text-accent">ziflux</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Caches <code>resource()</code>. That&apos;s the entire scope. Signal-native, no new mental model. Pick this when SWR on top of Angular&apos;s built-in primitives is what you need — nothing more.
          </p>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground/80">
        Mutation lifecycle (<code>onMutate → mutationFn → onSuccess → invalidateKeys</code>) is modeled on React Query — proven shape, signal-native execution.
      </p>

      <div className="mt-10 text-center">
        <pre className="inline-block"><code>npm install ngx-ziflux</code></pre>
        <p className="mt-4 text-sm text-muted-foreground">
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

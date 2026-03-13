export function PriorArt() {
  return (
    <section id="prior-art" className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
      <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">How ziflux compares</h2>
      <p className="mt-2 text-center text-muted-foreground">
        You&apos;ll compare anyway — here&apos;s the honest positioning.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-muted/30 p-5">
          <p className="text-sm font-semibold">TanStack Query (Angular)</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Full-featured, framework-agnostic. More concepts to learn (query keys, observers, query client). Great if you need advanced features like infinite queries or SSR hydration.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-muted/30 p-5">
          <p className="text-sm font-semibold">NgRx</p>
          <p className="mt-2 text-sm text-muted-foreground">
            State management + effects, much larger scope. Reducers, actions, selectors — powerful for complex global state, but heavy for just caching HTTP responses.
          </p>
        </div>
        <div className="rounded-xl border border-accent/20 bg-accent/[0.03] p-5">
          <p className="text-sm font-semibold text-accent">ziflux</p>
          <p className="mt-2 text-sm text-muted-foreground">
            SWR caching only. Signal-native. Zero learning curve if you know <code>resource()</code>. Fewer concepts, less API surface, more clarity.
          </p>
        </div>
      </div>

      <div className="mt-10 text-center">
        <pre className="inline-block"><code>npm install ziflux</code></pre>
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

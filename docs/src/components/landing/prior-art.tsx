export function PriorArt() {
  const references = [
    {
      name: "RFC 5861",
      description: "stale-while-revalidate HTTP cache-control extension",
    },
    {
      name: "TanStack Query",
      description: "staleTime, gcTime, structured query keys",
    },
    {
      name: "SWR by Vercel",
      description: "Popularized SWR in the frontend ecosystem",
    },
    {
      name: "Angular resource()",
      description: "The foundation this library builds on",
    },
  ]

  return (
    <section className="mx-auto max-w-4xl px-6 py-16 sm:py-20">
      <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Prior Art</h2>
      <p className="mt-2 text-muted-foreground">
        Standing on the shoulders of giants. Zero external dependencies.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {references.map((ref) => (
          <div
            key={ref.name}
            className="rounded-xl border border-border px-5 py-4 transition-colors hover:bg-muted/50"
          >
            <p className="font-medium">{ref.name}</p>
            <p className="mt-1 text-sm text-muted-foreground">{ref.description}</p>
          </div>
        ))}
      </div>

      {/* Final CTA */}
      <div className="mt-16 rounded-xl border border-accent/20 bg-accent/5 p-8 text-center">
        <h3 className="text-xl font-bold">
          100% Angular signals + resource() + in-memory Map
        </h3>
        <p className="mt-2 text-muted-foreground">
          Zero dependencies. Just the cache layer Angular forgot to ship.
        </p>
        <div className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[var(--code-bg)] px-5 py-2.5 font-mono text-sm text-[var(--code-fg)]">
          npm install ziflux
        </div>
      </div>
    </section>
  )
}

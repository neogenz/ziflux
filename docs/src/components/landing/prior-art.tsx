export function PriorArt() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-16 sm:py-20">
      <div className="rounded-xl border border-accent/20 bg-accent/5 p-8 text-center">
        <h3 className="text-xl font-bold">
          Angular signals + resource() + in-memory Map
        </h3>
        <p className="mt-2 text-muted-foreground">
          Zero dependencies. The cache layer Angular forgot to ship.
        </p>
        <div className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[var(--code-bg)] px-5 py-2.5 font-mono text-sm text-[var(--code-fg)]">
          npm install ziflux
        </div>
      </div>
    </section>
  )
}

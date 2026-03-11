export function PriorArt() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
      <div className="rounded-xl border border-border bg-muted/50 p-8 text-center">
        <div className="inline-flex items-center gap-2 rounded-lg bg-[var(--code-bg)] px-5 py-2.5 font-mono text-sm text-[var(--code-fg)]">
          npm install ziflux
        </div>
        <div className="mt-4 flex items-center justify-center gap-4 text-sm text-muted-foreground">
          <a
            href="https://github.com/nicormusic/ziflux"
            className="underline underline-offset-4 hover:text-foreground transition-colors"
          >
            GitHub
          </a>
          <span>&middot;</span>
          <span>MIT License</span>
          <span>&middot;</span>
          <span>Zero dependencies</span>
        </div>
      </div>
    </section>
  )
}

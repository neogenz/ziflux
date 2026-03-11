import { CodeBlock } from "./code-block"

const INSTALL_CODE = `npm install ziflux`

const HERO_CODE = `// app.config.ts — one line setup
export const appConfig: ApplicationConfig = {
  providers: [provideZiflux({ staleTime: 30_000, gcTime: 300_000 })],
}`

export function Hero() {
  return (
    <section className="mx-auto max-w-4xl px-6 pt-20 pb-16 sm:pt-28 sm:pb-20">
      {/* Badge */}
      <div className="mb-6 flex items-center gap-2">
        <span className="inline-flex items-center rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
          Angular 21+
        </span>
        <span className="text-xs text-muted-foreground">
          Zero dependencies &middot; Signal-native
        </span>
      </div>

      {/* Headline */}
      <h1 className="text-4xl font-bold leading-[1.15] tracking-tight sm:text-5xl">
        SWR caching for Angular{" "}
        <span className="text-accent">resource()</span>
      </h1>

      {/* Pain point */}
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
        <code>resource()</code> re-fetches on every navigation. Your users see spinners on data they already had.
      </p>

      {/* Solution */}
      <p className="mt-2 max-w-2xl text-lg leading-relaxed text-muted-foreground">
        ziflux adds a cache layer. Instant returns, background refreshes, zero spinners on return visits.{" "}
        <span className="text-foreground font-medium">Four exports. That&apos;s the entire API.</span>
      </p>

      {/* What it is — the "why" */}
      <div className="mt-10 rounded-xl border border-border bg-muted/50 p-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <h3 className="mb-1 text-sm font-semibold text-muted-foreground">
              resource() alone
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Fetch lifecycle &mdash; <code>loading</code> | <code>resolved</code> | <code>error</code>
            </p>
            <p className="mt-1 text-sm font-mono text-muted-foreground">
              spinner &rarr; data &rarr; spinner &rarr; data
            </p>
          </div>
          <div>
            <h3 className="mb-1 text-sm font-semibold text-accent">
              resource() + DataCache
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Data lifecycle &mdash; <code>fresh</code> | <code>stale</code> | <code>expired</code>
            </p>
            <p className="mt-1 text-sm font-mono text-accent">
              spinner &rarr; data &rarr; instant &rarr; instant
            </p>
          </div>
        </div>
      </div>

      {/* Install */}
      <div className="mt-8">
        <CodeBlock code={INSTALL_CODE} language="bash" />
      </div>

      {/* Config */}
      <div className="mt-4">
        <CodeBlock code={HERO_CODE} filename="app.config.ts" />
      </div>
    </section>
  )
}

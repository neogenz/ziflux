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

      {/* Subtitle */}
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
        Instant navigations, background refreshes, no spinners on return visits.{" "}
        <span className="text-foreground font-medium">Four exports. That&apos;s the entire API.</span>
      </p>

      {/* Install */}
      <div className="mt-8 max-w-md">
        <CodeBlock code={INSTALL_CODE} language="bash" />
      </div>

      {/* Config */}
      <div className="mt-4 max-w-xl">
        <CodeBlock code={HERO_CODE} filename="app.config.ts" />
      </div>

      {/* What it is */}
      <div className="mt-12 rounded-xl border border-border bg-muted/50 p-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <h3 className="mb-1 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              resource()
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Fetch lifecycle &mdash; <code>loading</code> | <code>resolved</code> | <code>error</code>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Knows <span className="font-medium text-foreground">how</span> to fetch.
            </p>
          </div>
          <div>
            <h3 className="mb-1 text-sm font-semibold uppercase tracking-wider text-accent">
              DataCache
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Data lifecycle &mdash; <code>fresh</code> | <code>stale</code> | <code>expired</code>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Knows <span className="font-medium text-foreground">when</span> to re-fetch and{" "}
              <span className="font-medium text-foreground">what</span> to keep.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

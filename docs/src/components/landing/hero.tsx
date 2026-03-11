import { CodeBlock } from "./code-block"

const INSTALL_CODE = `npm install ziflux`

const USAGE_CODE = `const todos = cachedResource({
  cache: this.api.cache,
  key: p => ['todos', p.status],
  params: () => this.filters(),
  loader: ({ params }) => this.api.getAll$(params),
})`

export function Hero() {
  return (
    <section className="mx-auto max-w-4xl px-6 pt-20 pb-10 sm:pt-28 sm:pb-14">
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

      {/* One-liner subtitle */}
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
        Instant navigations, background refreshes, zero spinners.{" "}
        <span className="text-foreground font-medium">Six exports.</span>
      </p>

      {/* Install */}
      <div className="mt-8">
        <CodeBlock code={INSTALL_CODE} language="bash" />
      </div>

      {/* Usage — the signature code */}
      <div className="mt-4">
        <CodeBlock code={USAGE_CODE} filename="order-list.store.ts" />
      </div>

      {/* Comparison card — compact */}
      <div className="mt-8 rounded-xl border border-border bg-muted/50 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <h3 className="mb-1.5 text-sm font-semibold text-muted-foreground">
              Without ziflux
            </h3>
            <p className="text-sm font-mono text-muted-foreground">
              spinner &rarr; data &rarr; spinner &rarr; data
            </p>
          </div>
          <div>
            <h3 className="mb-1.5 text-sm font-semibold text-accent">
              With cachedResource()
            </h3>
            <p className="text-sm font-mono text-accent">
              spinner &rarr; data &rarr; instant &rarr; instant
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

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
      <p className="mb-6 text-xs text-muted-foreground">
        Angular 21+ &middot; Zero dependencies &middot; Signal-native
      </p>

      {/* Headline */}
      <h1 className="text-4xl font-bold leading-[1.15] tracking-tight sm:text-5xl">
        SWR caching for Angular{" "}
        <span className="text-accent">resource()</span>
      </h1>

      {/* One-liner subtitle */}
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
        Instant navigations, background refreshes, zero spinners.
      </p>

      {/* Install */}
      <div className="mt-8">
        <CodeBlock code={INSTALL_CODE} language="bash" />
      </div>

      {/* Usage — the signature code */}
      <div className="mt-4">
        <CodeBlock code={USAGE_CODE} filename="order-list.store.ts" />
      </div>

      {/* Comparison — inline */}
      <div className="mt-8 grid gap-4 text-sm sm:grid-cols-2">
        <p className="text-muted-foreground">
          <span className="font-semibold">Without ziflux</span><br />
          <span className="font-mono">spinner &rarr; data &rarr; spinner &rarr; data</span>
        </p>
        <p>
          <span className="font-semibold text-accent">With cachedResource()</span><br />
          <span className="font-mono text-accent">spinner &rarr; data &rarr; instant &rarr; instant</span>
        </p>
      </div>
    </section>
  )
}

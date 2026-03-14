import { CodeBlock } from "./code-block"
import { NavigationDemo } from "./navigation-demo"
import { CopyPageDropdown } from "./copy-page-dropdown"

const INSTALL_CODE = `npm install ngx-ziflux`

const USAGE_CODE = `const todos = cachedResource({
  cache: this.#api.cache,
  cacheKey: params => ['todos', params.status],
  params: () => this.filters(),
  loader: ({ params }) => this.#api.getAll$(params),
})`

export function Hero() {
  return (
    <section className="relative mx-auto max-w-4xl px-6 pt-20 pb-10 sm:pt-28 sm:pb-14">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-x-0 -top-20 h-[500px] bg-[radial-gradient(ellipse_at_50%_0%,rgba(249,115,22,0.08)_0%,transparent_60%)]" />

      <div className="relative">
        <div className="mb-6 flex items-start justify-between">
          <p className="inline-flex items-center rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
            Angular 21+ &middot; Zero dependencies &middot; Signal-native &middot; Tree-shakeable
          </p>
          <div className="hidden sm:block">
            <CopyPageDropdown />
          </div>
        </div>

        {/* Headline */}
        <h1 className="text-4xl font-bold leading-[1.15] tracking-tight sm:text-5xl">
          SWR caching for Angular{" "}
          <span className="text-accent glow-accent">resource()</span>
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

        {/* Animated comparison */}
        <h2 className="mt-10 text-lg font-semibold">What it feels like</h2>
        <p className="mt-1 text-sm text-muted-foreground">Same app, same actions. One caches.</p>
        <NavigationDemo />
      </div>
    </section>
  )
}
